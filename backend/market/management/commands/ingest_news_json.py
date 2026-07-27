"""
Ingests a JSON news feed shaped like:
{
  "title": "...", "description": "...", "published_utc": "2023-06-29T12:50:06Z",
  "tickers": ["ALGT"],
  "insights": [{"ticker": "ALGT", "sentiment": "positive", "sentiment_reasoning": "..."}],
  "publisher": {"name": "..."}
}
Accepts either a JSON array of these objects, or one-per-line JSON (JSONL).

Sentiment comes straight from the dataset's own "insights" field (already
computed for you) -- this script's job is just to (a) match tickers to
companies already in the database, and (b) classify the EVENT TYPE
(earnings beat, supply disruption, etc.), which the dataset doesn't provide.

Usage:
  python manage.py ingest_news_json --file path/to/news.json --no-llm
  python manage.py ingest_news_json --file path/to/news.json --limit 400
"""
import os
import re
import json
import time
from datetime import datetime

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone as dj_timezone

from market.models import Company, NewsEvent

SENTIMENT_MAP = {"positive": 0.6, "negative": -0.6, "neutral": 0.0}

# gemini-2.5-flash is blocked for new API users (404). Flash-Lite is the right
# fit for short classification calls and usually has the most generous free-tier RPM.
DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite"

KEYWORD_RULES = [
    (["beats", "beat estimates", "tops estimates", "exceeds expectations", "surges past"], "earnings_beat", 0.6),
    (["misses", "miss estimates", "falls short", "disappoints"], "earnings_miss", 0.6),
    (["cuts guidance", "lowers guidance", "lowers forecast", "cuts forecast", "slashes outlook"], "guidance_cut", 0.5),
    (["raises guidance", "raises forecast", "boosts outlook", "raises outlook"], "guidance_raise", 0.5),
    (["shortage", "supply chain disruption", "production halt", "recall", "chip shortage"], "supply_disruption", 0.5),
    (["lawsuit", "sues", "sued", "legal action", "class action"], "lawsuit", 0.4),
    (["unveils", "launches", "announces new", "debuts"], "product_launch", 0.4),
    (["antitrust", "regulator", "probe", "investigation", "fined", "fine"], "regulatory", 0.5),
]

# This Polygon/Motley-Fool-style feed is mostly "should you buy?" opinion pieces.
# Those correctly classify as event_type=other and waste Gemini quota + dilute the backtest.
# --prefer-events keeps only articles that already contain hard-event language.
HARD_EVENT_MARKERS = [
    "earnings", "beat", "beats", "miss", "misses", "guidance", "outlook",
    "lawsuit", "sues", "sued", "class action", "settlement",
    "launches", "unveils", "debuts", "announces new",
    "recall", "shortage", "supply chain", "production halt",
    "antitrust", "regulator", "probe", "investigation", "fined", "fine",
    "acquires", "acquisition", "merger", "deal to", "wins $", "contract",
    "cuts jobs", "layoffs", "dividend cut", "dividend hike",
    "q1", "q2", "q3", "q4", "fiscal",
]

ADVICE_MARKERS = [
    "buy now", "to buy", "should you", "is a buy", "stocks to buy", "stock to buy",
    "best dividend", "worth buying", "hand over fist", "buying opportunity",
    "top stocks", "top stock", "what you should know", "analyst blog",
    "is it time to buy", "better buy", "screaming buy", "once-in-a-decade",
]


def looks_like_hard_event(text):
    h = (text or "").lower()
    return any(m in h for m in HARD_EVENT_MARKERS)


def looks_like_advice(text):
    h = (text or "").lower()
    return any(m in h for m in ADVICE_MARKERS)


def classify_event_type_keyword(text):
    h = text.lower()
    for keywords, event_type, magnitude in KEYWORD_RULES:
        if any(k in h for k in keywords):
            return event_type, magnitude
    return "other", 0.25


def classify_event_type_llm(text, client):
    prompt = (
        "Classify the type and significance of this financial news snippet. "
        "Respond with ONLY a JSON object, no other text, no markdown fences.\n"
        f'Text: "{text[:600]}"\n'
        'Return exactly this shape: {"event_type": one of '
        "[earnings_beat, earnings_miss, guidance_cut, guidance_raise, supply_disruption, "
        'regulatory, product_launch, lawsuit, other], "magnitude": float from 0.0 to 1.0 '
        'for how significant this event is}'
    )
    resp = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=100,
        messages=[{"role": "user", "content": prompt}],
    )
    text_out = resp.content[0].text.strip()
    return _parse_llm_json(text_out)


def _parse_llm_json(text_out):
    text_out = (text_out or "").strip()
    text_out = re.sub(r"^```(?:json)?\s*", "", text_out)
    text_out = re.sub(r"\s*```$", "", text_out)
    # If the model still wraps JSON in prose, pull the first {...} block.
    if not text_out.startswith("{"):
        match = re.search(r"\{.*\}", text_out, re.DOTALL)
        if match:
            text_out = match.group(0)
    data = json.loads(text_out)
    return data["event_type"], float(data["magnitude"])


def classify_event_type_gemini(text, client, model=DEFAULT_GEMINI_MODEL, max_retries=4):
    prompt = (
        "Classify the CORPORATE EVENT in this financial news snippet.\n"
        "Use 'other' for stock tips, buy/sell opinions, analyst ratings, price "
        "moves with no concrete company action, or vague market commentary.\n"
        "Use a specific type ONLY when the text describes a concrete event "
        "(reported earnings beat/miss, guidance change, lawsuit, product launch, "
        "regulatory action, supply disruption).\n"
        "Respond with ONLY a JSON object, no other text, no markdown fences.\n"
        f'Text: "{text[:600]}"\n'
        'Return exactly this shape: {"event_type": one of '
        "[earnings_beat, earnings_miss, guidance_cut, guidance_raise, supply_disruption, "
        'regulatory, product_launch, lawsuit, other], "magnitude": float from 0.0 to 1.0 '
        'for how significant this event is}'
    )
    last_error = None
    for attempt in range(max_retries):
        try:
            resp = client.models.generate_content(model=model, contents=prompt)
            return _parse_llm_json(resp.text)
        except Exception as e:
            last_error = e
            err = str(e)
            # Free-tier RPM is low; wait and retry instead of immediately
            # falling back to the keyword classifier (which dumps most rows into "other").
            if "429" in err or "RESOURCE_EXHAUSTED" in err:
                wait_s = 50
                retry_match = re.search(r"retry in (\d+(?:\.\d+)?)s", err, re.IGNORECASE)
                if retry_match:
                    wait_s = min(90, float(retry_match.group(1)) + 2)
                time.sleep(wait_s)
                continue
            raise
    raise last_error


def load_articles(path):
    with open(path) as f:
        raw = f.read().strip()
    try:
        parsed = json.loads(raw)
        return [parsed] if isinstance(parsed, dict) else parsed
    except json.JSONDecodeError:
        return [json.loads(line) for line in raw.splitlines() if line.strip()]


def parse_published_at(article):
    raw = article.get("published_utc")
    if raw:
        try:
            dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            return dt
        except Exception:
            pass
    return datetime.now()


class Command(BaseCommand):
    help = "Ingest a Polygon-style JSON news feed and create classified NewsEvent rows."

    def add_arguments(self, parser):
        parser.add_argument("--file", required=True, help="Path to the JSON or JSONL news file")
        parser.add_argument("--limit", type=int, default=400, help="Max matched (article, ticker) pairs to ingest")
        parser.add_argument("--no-llm", action="store_true", help="Use fast keyword classification instead of an LLM")
        parser.add_argument("--provider", choices=["claude", "gemini"], default="claude", help="Which LLM to use for classification (ignored if --no-llm)")
        parser.add_argument(
            "--model",
            default=DEFAULT_GEMINI_MODEL,
            help=f"Gemini model id (default: {DEFAULT_GEMINI_MODEL}). Ignored unless --provider gemini.",
        )
        parser.add_argument(
            "--delay",
            type=float,
            default=4.5,
            help="Seconds to wait between Gemini API calls (free tier is ~5–15 RPM). Ignored for --no-llm / claude.",
        )
        parser.add_argument(
            "--prefer-events",
            action="store_true",
            help=(
                "Skip buy/sell opinion articles and keep only headlines/reasoning that "
                "already look like hard corporate events. Strongly recommended for this dataset."
            ),
        )

    def handle(self, *args, **opts):
        path = opts["file"]
        if not os.path.exists(path):
            raise CommandError(f"File not found: {path}")

        try:
            articles = load_articles(path)
        except Exception as e:
            raise CommandError(f"Could not parse file as JSON or JSONL: {e}")

        self.stdout.write(f"Loaded {len(articles)} articles from file.")

        known_companies = {c.symbol: c for c in Company.objects.all()}

        client = None
        provider = opts["provider"]
        gemini_model = opts["model"]
        gemini_delay = opts["delay"]
        if not opts["no_llm"]:
            if provider == "gemini":
                try:
                    from google import genai
                    api_key = os.environ.get("GEMINI_API_KEY")
                    if not api_key:
                        raise RuntimeError("GEMINI_API_KEY environment variable is not set")
                    client = genai.Client(api_key=api_key)
                    self.stdout.write(f"Using Gemini model: {gemini_model} (delay {gemini_delay}s between calls)")
                except Exception as e:
                    self.stdout.write(self.style.WARNING(
                        f"Could not initialize Gemini client ({e}) -- falling back to keyword classification for this run."
                    ))
            else:
                try:
                    import anthropic
                    client = anthropic.Anthropic()
                except Exception as e:
                    self.stdout.write(self.style.WARNING(
                        f"Could not initialize Anthropic client ({e}) -- falling back to keyword classification for this run."
                    ))

        matched, created, failed, skipped_soft = 0, 0, 0, 0
        gemini_calls = 0
        prefer_events = opts["prefer_events"]
        if prefer_events:
            self.stdout.write("Prefer-events ON: skipping buy/sell opinion pieces; keeping hard-event candidates only.")

        for article in articles:
            if created >= opts["limit"]:
                break

            title = (article.get("title") or "").strip()
            description = (article.get("description") or "").strip()
            if not title:
                continue

            published_at = parse_published_at(article)
            if dj_timezone.is_naive(published_at):
                published_at = dj_timezone.make_aware(published_at)

            insights_by_ticker = {
                i.get("ticker"): i for i in (article.get("insights") or []) if i.get("ticker")
            }
            all_tickers = article.get("tickers") or list(insights_by_ticker.keys())
            # Only the FIRST ticker is treated as the actual subject of the event.
            # Datasets like this one often list secondary tickers because they're
            # affected by the primary company's news -- but that ripple effect is
            # exactly what our own relationship graph + backtest engine should
            # derive independently, not something we should copy from the source
            # dataset as if it were a second, separate event.
            tickers = all_tickers[:1]

            combined_text = f"{title}. {description}"
            event_type_cache = None  # classify once per article, reuse for every matched ticker

            for raw_ticker in tickers:
                if created >= opts["limit"]:
                    break
                ticker = str(raw_ticker).strip().upper()
                if ticker not in known_companies:
                    continue

                matched += 1
                if NewsEvent.objects.filter(company__symbol=ticker, headline=title).exists():
                    continue

                insight = insights_by_ticker.get(ticker, {})
                sentiment_label = insight.get("sentiment", "neutral")
                sentiment_score = SENTIMENT_MAP.get(sentiment_label, 0.0)
                reasoning = insight.get("sentiment_reasoning", "")
                # the reasoning field is usually far more concrete than the
                # headline (e.g. "Beat on earnings and revenue" vs a clickbait
                # title), so it's the primary signal for event-type classification
                classification_text = f"{reasoning}. {combined_text}" if reasoning else combined_text

                if prefer_events:
                    hard = looks_like_hard_event(classification_text)
                    advice = looks_like_advice(title)
                    # Keep hard-event language; drop pure advice with no event signal.
                    if advice and not hard:
                        skipped_soft += 1
                        continue
                    if not hard:
                        skipped_soft += 1
                        continue

                if event_type_cache is None:
                    if client and provider == "gemini":
                        try:
                            if gemini_calls > 0 and gemini_delay > 0:
                                time.sleep(gemini_delay)
                            event_type_cache = classify_event_type_gemini(
                                classification_text, client, model=gemini_model
                            )
                            gemini_calls += 1
                            self.stdout.write(f"  Gemini OK: {title[:55]} -> {event_type_cache[0]}")
                        except Exception as e:
                            self.stdout.write(self.style.WARNING(f"Gemini call failed ({e}), using keyword fallback: {title[:60]}"))
                            event_type_cache = classify_event_type_keyword(classification_text)
                    elif client:
                        try:
                            event_type_cache = classify_event_type_llm(classification_text, client)
                        except Exception as e:
                            self.stdout.write(self.style.WARNING(f"Claude call failed ({e}), using keyword fallback: {title[:60]}"))
                            event_type_cache = classify_event_type_keyword(classification_text)
                    else:
                        event_type_cache = classify_event_type_keyword(classification_text)
                event_type, magnitude = event_type_cache

                try:
                    NewsEvent.objects.create(
                        company=known_companies[ticker],
                        headline=title[:500],
                        event_type=event_type,
                        sentiment_score=sentiment_score,
                        magnitude=magnitude,
                        published_at=published_at,
                        source=(article.get("publisher") or {}).get("name", "")[:100],
                    )
                    created += 1
                except Exception as e:
                    failed += 1
                    self.stdout.write(self.style.WARNING(f"Row failed to save ({e}): {title[:60]}"))

        self.stdout.write(self.style.SUCCESS(
            f"Scanned {matched} matched company articles. Created {created} new NewsEvent rows "
            f"({skipped_soft} soft/opinion skipped, {failed} failed)."
        ))
