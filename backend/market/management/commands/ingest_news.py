"""
Ingests a news CSV file, matches each row's ticker to a Company already in
the database, classifies the headline (event type + sentiment + magnitude),
and creates NewsEvent rows.

Two classification modes:
  --no-llm   : instant, free, keyword-based -- good for testing the pipeline
               before you have an API key set up, or for a quick first pass.
  (default)  : calls the Claude API (needs ANTHROPIC_API_KEY set in your
               environment) for a real classification per headline.

Usage:
  python manage.py ingest_news --file path/to/news.csv --no-llm
  python manage.py ingest_news --file path/to/news.csv --limit 400

The command tries to auto-detect the ticker/headline/date columns from
common names used in public datasets. If it can't, it tells you exactly
what columns it found so you can pass --ticker-col / --headline-col by hand.
"""
import os
import re
import json
from datetime import datetime

import pandas as pd
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone as dj_timezone

from market.models import Company, NewsEvent

TICKER_CANDIDATES = ["ticker", "symbol", "stock_symbol", "Stock_symbol", "Ticker", "Symbol", "stock symbol"]
HEADLINE_CANDIDATES = ["headline", "title", "article_title", "Article_title", "Headline", "Title", "news_headline"]
DATE_CANDIDATES = ["date", "published_at", "Date", "Published", "publish_date", "Datetime", "datetime"]

KEYWORD_RULES = [
    (["beats", "beat estimates", "tops estimates", "exceeds expectations", "surges past"], "earnings_beat", 0.6, 0.6),
    (["misses", "miss estimates", "falls short", "disappoints"], "earnings_miss", -0.6, 0.6),
    (["cuts guidance", "lowers guidance", "lowers forecast", "cuts forecast", "slashes outlook"], "guidance_cut", -0.5, 0.5),
    (["raises guidance", "raises forecast", "boosts outlook", "raises outlook"], "guidance_raise", 0.5, 0.5),
    (["shortage", "supply chain disruption", "production halt", "recall", "chip shortage"], "supply_disruption", -0.4, 0.5),
    (["lawsuit", "sues", "sued", "legal action", "class action"], "lawsuit", -0.3, 0.4),
    (["unveils", "launches", "announces new", "debuts"], "product_launch", 0.3, 0.4),
    (["antitrust", "regulator", "probe", "investigation", "fined", "fine"], "regulatory", -0.4, 0.5),
]


def find_column(df, candidates):
    for c in candidates:
        if c in df.columns:
            return c
    lower_map = {c.lower(): c for c in df.columns}
    for c in candidates:
        if c.lower() in lower_map:
            return lower_map[c.lower()]
    return None


def classify_keyword(headline):
    h = headline.lower()
    for keywords, event_type, sentiment, magnitude in KEYWORD_RULES:
        if any(k in h for k in keywords):
            return event_type, sentiment, magnitude
    return "other", 0.0, 0.2


def classify_llm(headline, client):
    prompt = (
        "Classify this financial news headline. Respond with ONLY a JSON object, "
        "no other text, no markdown fences.\n"
        f'Headline: "{headline}"\n'
        'Return exactly this shape: {"event_type": one of '
        "[earnings_beat, earnings_miss, guidance_cut, guidance_raise, supply_disruption, "
        'regulatory, product_launch, lawsuit, other], "sentiment_score": float from -1.0 to 1.0, '
        '"magnitude": float from 0.0 to 1.0 for how significant this event is}'
    )
    resp = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=150,
        messages=[{"role": "user", "content": prompt}],
    )
    text = resp.content[0].text.strip()
    text = re.sub(r"^```(json)?|```$", "", text).strip()
    data = json.loads(text)
    return data["event_type"], float(data["sentiment_score"]), float(data["magnitude"])


class Command(BaseCommand):
    help = "Ingest a news CSV and create classified NewsEvent rows for companies already in the database."

    def add_arguments(self, parser):
        parser.add_argument("--file", required=True, help="Path to the news CSV file")
        parser.add_argument("--ticker-col", default=None)
        parser.add_argument("--headline-col", default=None)
        parser.add_argument("--date-col", default=None)
        parser.add_argument("--limit", type=int, default=400, help="Max matched rows to ingest")
        parser.add_argument("--no-llm", action="store_true", help="Use fast keyword classification instead of the Claude API")

    def handle(self, *args, **opts):
        path = opts["file"]
        if not os.path.exists(path):
            raise CommandError(f"File not found: {path}")

        df = pd.read_csv(path)

        ticker_col = opts["ticker_col"] or find_column(df, TICKER_CANDIDATES)
        headline_col = opts["headline_col"] or find_column(df, HEADLINE_CANDIDATES)
        date_col = opts["date_col"] or find_column(df, DATE_CANDIDATES)

        if not ticker_col or not headline_col:
            raise CommandError(
                f"Could not auto-detect required columns. Columns found in file: {list(df.columns)}. "
                f"Re-run with --ticker-col and --headline-col set explicitly, e.g. "
                f"--ticker-col Stock_symbol --headline-col Article_title"
            )

        self.stdout.write(
            f"Using columns -> ticker: '{ticker_col}', headline: '{headline_col}', "
            f"date: '{date_col or '(none found -- using ingestion time)'}'"
        )

        known_companies = {c.symbol: c for c in Company.objects.all()}

        client = None
        if not opts["no_llm"]:
            try:
                import anthropic
                client = anthropic.Anthropic()
            except Exception as e:
                self.stdout.write(self.style.WARNING(
                    f"Could not initialize Anthropic client ({e}) -- falling back to keyword classification for this run."
                ))

        matched, created, failed = 0, 0, 0
        for _, row in df.iterrows():
            if matched >= opts["limit"]:
                break

            raw_ticker = str(row.get(ticker_col, "")).strip().upper()
            if raw_ticker not in known_companies:
                continue

            headline = str(row.get(headline_col, "")).strip()
            if not headline or headline.lower() == "nan":
                continue

            matched += 1

            if NewsEvent.objects.filter(company__symbol=raw_ticker, headline=headline).exists():
                continue

            if client:
                try:
                    event_type, sentiment, magnitude = classify_llm(headline, client)
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f"LLM call failed ({e}), using keyword fallback: {headline[:60]}"))
                    event_type, sentiment, magnitude = classify_keyword(headline)
            else:
                event_type, sentiment, magnitude = classify_keyword(headline)

            published_at = None
            if date_col:
                try:
                    parsed = pd.to_datetime(row.get(date_col))
                    if pd.notna(parsed):
                        published_at = parsed.to_pydatetime()
                except Exception:
                    published_at = None
            if published_at is None:
                published_at = datetime.now()
            if dj_timezone.is_naive(published_at):
                published_at = dj_timezone.make_aware(published_at)

            try:
                NewsEvent.objects.create(
                    company=known_companies[raw_ticker],
                    headline=headline[:500],
                    event_type=event_type,
                    sentiment_score=sentiment,
                    magnitude=magnitude,
                    published_at=published_at,
                    source="ingested_dataset",
                )
                created += 1
            except Exception as e:
                failed += 1
                self.stdout.write(self.style.WARNING(f"Row failed to save ({e}): {headline[:60]}"))

        self.stdout.write(self.style.SUCCESS(
            f"Matched {matched} rows to known companies. Created {created} new NewsEvent rows "
            f"({matched - created - failed} were already ingested, {failed} failed)."
        ))
