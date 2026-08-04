import os
import re
import json
import time
from datetime import datetime

from django.utils import timezone as dj_timezone
from market.models import Company, NewsEvent, PipelineJob
from accounts.models import UserSettings

SENTIMENT_MAP = {"positive": 0.6, "negative": -0.6, "neutral": 0.0}

KEYWORD_RULES = [
    (["beats", "beat estimates", "tops estimates", "exceeds expectations", "surges past"], "earnings_beat", 0.6),
    (["misses", "miss estimates", "falls short", "disappoints"], "earnings_miss", -0.6),
    (["cuts guidance", "lowers guidance", "lowers forecast", "cuts forecast", "slashes outlook"], "guidance_cut", -0.5),
    (["raises guidance", "raises forecast", "boosts outlook", "raises outlook"], "guidance_raise", 0.5),
    (["shortage", "supply chain disruption", "production halt", "recall", "chip shortage"], "supply_disruption", -0.4),
    (["lawsuit", "sues", "sued", "legal action", "class action"], "lawsuit", -0.3),
    (["unveils", "launches", "announces new", "debuts"], "product_launch", 0.3),
    (["antitrust", "regulator", "probe", "investigation", "fined", "fine"], "regulatory", -0.4),
]

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
    for keywords, event_type, sentiment_default in KEYWORD_RULES:
        if any(k in h for k in keywords):
            return event_type, abs(sentiment_default)
    return "other", 0.25

def _parse_llm_json(text_out):
    text_out = (text_out or "").strip()
    text_out = re.sub(r"^```(?:json)?\s*", "", text_out)
    text_out = re.sub(r"\s*```$", "", text_out)
    if not text_out.startswith("{"):
        match = re.search(r"\{.*\}", text_out, re.DOTALL)
        if match:
            text_out = match.group(0)
    data = json.loads(text_out)
    return data.get("event_type", "other"), float(data.get("magnitude", 0.2))

def classify_event_type_gemini(text, api_key, model="gemini-3.1-flash-lite", max_retries=4, job=None):
    try:
        from google import genai
        client = genai.Client(api_key=api_key)
    except Exception:
        raise RuntimeError("google-genai not installed or key invalid")

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
            if "429" in err or "RESOURCE_EXHAUSTED" in err:
                wait_s = 50
                retry_match = re.search(r"retry in (\d+(?:\.\d+)?)s", err, re.IGNORECASE)
                if retry_match:
                    wait_s = min(90, float(retry_match.group(1)) + 2)
                if job:
                    from market.pipeline import add_log
                    add_log(job, f"SYSTEM|Rate Limit Hit|Sleeping {wait_s}s...", "warning")
                time.sleep(wait_s)
                continue
            raise
    raise last_error

def detect_file_format(file_path):
    # Peek at file to detect format
    with open(file_path, 'r', encoding='utf-8') as f:
        head = f.read(2048)
    
    if file_path.endswith('.csv'):
        import pandas as pd
        df = pd.read_csv(file_path, nrows=10)
        cols = [c.lower() for c in df.columns]
        if any(c in cols for c in ['ticker', 'symbol', 'stock_symbol']):
            return "csv_generic"
        return "csv_unknown"
    
    try:
        parsed = json.loads(head)
        if isinstance(parsed, dict) and "tickers" in parsed:
            return "polygon_jsonl" # actually could be jsonl
    except Exception:
        pass
        
    if "{" in head and "}" in head:
        return "polygon_json"
    
    return "unknown"

def preview_file(file_path, adapter_id):
    rows = []
    total_rows = 0
    if adapter_id.startswith("csv"):
        import pandas as pd
        df = pd.read_csv(file_path, nrows=10)
        total_rows = sum(1 for _ in open(file_path, 'r', encoding='utf-8')) - 1
        for _, r in df.iterrows():
            rows.append({
                "ticker": str(r.get("ticker", r.get("symbol", ""))),
                "headline": str(r.get("headline", r.get("title", ""))),
            })
    else:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            try:
                data = json.loads(content)
                if isinstance(data, dict):
                    data = [data]
            except Exception:
                data = [json.loads(line) for line in content.splitlines() if line.strip()]
            total_rows = len(data)
            for r in data[:10]:
                tickers = r.get("tickers", [])
                rows.append({
                    "ticker": tickers[0] if tickers else "",
                    "headline": r.get("title", r.get("headline", "")),
                })
        except Exception:
            pass
    return rows, total_rows

def parse_published_at(article):
    raw = article.get("published_utc")
    if raw:
        try:
            dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            return dt
        except Exception:
            pass
    return datetime.now()

def run_ingest(job_id, file_path, adapter_id):
    from market.pipeline import add_log, update_job
    try:
        job = PipelineJob.objects.get(id=job_id)
        update_job(job, status="running", current_step="Reading file", progress_percent=10)
        
        user_settings = UserSettings.objects.filter(user=job.user).first() if job.user else None
        api_key = None
        if user_settings and user_settings.gemini_api_key_encrypted:
            from cryptography.fernet import Fernet
            from django.conf import settings
            cipher = Fernet(settings.FIELD_ENCRYPTION_KEY.encode())
            try:
                api_key = cipher.decrypt(user_settings.gemini_api_key_encrypted.encode()).decode()
            except Exception:
                pass
        
        gemini_model = user_settings.gemini_model if user_settings else "gemini-3.1-flash-lite"
        gemini_delay = user_settings.ingest_delay_seconds if user_settings else 2.0
        prefer_events = user_settings.prefer_events if user_settings else True
        
        if adapter_id.startswith("csv"):
            import pandas as pd
            df = pd.read_csv(file_path)
            articles = df.to_dict('records')
            # standardize
            for a in articles:
                a['title'] = a.get('headline', a.get('title', ''))
                a['tickers'] = [a.get('ticker', a.get('symbol', ''))]
        else:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            try:
                articles = json.loads(content)
                if isinstance(articles, dict):
                    articles = [articles]
            except Exception:
                articles = [json.loads(line) for line in content.splitlines() if line.strip()]

        ingest_limit = job.options_json.get("ingest_limit")

        total_lines = len(articles)
        update_job(job, items_total=total_lines, items_done=0, current_step="Classifying headlines")
        
        # Initialize records_created in options
        options = job.options_json or {}
        options["records_created"] = 0
        job.options_json = options
        job.save(update_fields=["options_json"])
        
        known_companies = {c.symbol: c for c in Company.objects.filter(user=job.user)}
        matched, created, failed, skipped_soft = 0, 0, 0, 0
        gemini_calls = 0
        
        for idx, article in enumerate(articles):
            # Early exit as soon as we hit the target
            if ingest_limit and ingest_limit > 0 and created >= ingest_limit:
                add_log(job, f"Reached ingest limit of {ingest_limit} new records. Stopping.")
                break
            
            if idx % 10 == 0:
                job.refresh_from_db()
                if job.cancel_requested:
                    update_job(job, status="cancelled", current_step="Cancelled by user")
                    add_log(job, "Ingest cancelled.", "warning")
                    return
            
            pct = 10 + (idx / max(total_lines, 1) * 80)
            update_job(job, items_done=idx, progress_percent=pct)
            
            # Update records_created continuously so the UI progress bar is in perfect sync
            options = job.options_json or {}
            options["records_created"] = created
            job.options_json = options
            job.save(update_fields=["options_json"])
            
            title = (article.get("title") or "").strip()
            if not title:
                continue

            published_at = parse_published_at(article)
            if dj_timezone.is_naive(published_at):
                published_at = dj_timezone.make_aware(published_at)

            tickers = article.get("tickers", [])
            tickers = tickers[:1] 
            
            combined_text = f"{title}. {article.get('description', '')}"
            event_type_cache = None
            
            for raw_ticker in tickers:
                ticker = str(raw_ticker).strip().upper()
                if ticker not in known_companies:
                    add_log(job, f"SKIP|Unknown Company ({ticker})|{title[:100]}", "info")
                    continue
                    
                matched += 1
                pub_date_str = published_at.strftime("%Y-%m-%d")
                dedup_hash = NewsEvent.compute_dedup_hash(ticker, title, pub_date_str)
                if NewsEvent.objects.filter(dedup_hash=dedup_hash).exists():
                    add_log(job, f"SKIP|Duplicate Found|{title[:100]}", "info")
                    continue

                # Check limit FIRST — stop as soon as we've created enough
                if ingest_limit and ingest_limit > 0 and created >= ingest_limit:
                    break

                insight = {}
                if "insights" in article:
                    for i in article["insights"]:
                        if i.get("ticker") == ticker:
                            insight = i
                            break
                            
                sentiment_label = insight.get("sentiment", "neutral")
                sentiment_score = SENTIMENT_MAP.get(sentiment_label, 0.0)
                reasoning = insight.get("sentiment_reasoning", "")
                classification_text = f"{reasoning}. {combined_text}" if reasoning else combined_text

                if prefer_events:
                    hard = looks_like_hard_event(classification_text)
                    advice = looks_like_advice(title)
                    if advice and not hard:
                        skipped_soft += 1
                        add_log(job, f"SKIP|Opinion/Advice|{title[:100]}", "info")
                        continue
                    if not hard:
                        skipped_soft += 1
                        add_log(job, f"SKIP|No Hard Event|{title[:100]}", "info")
                        continue

                if event_type_cache is None:
                    if api_key:
                        try:
                            if gemini_calls > 0 and gemini_delay > 0:
                                time.sleep(gemini_delay)
                            event_type_cache = classify_event_type_gemini(
                                classification_text, api_key, model=gemini_model, job=job
                            )
                            gemini_calls += 1
                            add_log(job, f"GEMINI|{event_type_cache[0]}|{title[:100]}")
                        except Exception as e:
                            add_log(job, f"Gemini failed ({e}), fallback for: {title[:50]}", "warning")
                            event_type_cache = classify_event_type_keyword(classification_text)
                            add_log(job, f"GEMINI|[Fallback] {event_type_cache[0]}|{title[:100]}")
                    else:
                        event_type_cache = classify_event_type_keyword(classification_text)
                        add_log(job, f"GEMINI|[Keyword Mode] {event_type_cache[0]}|{title[:100]}")
                        
                event_type, magnitude = event_type_cache

                try:
                    pub_name = (article.get("publisher") or {}).get("name", "") if isinstance(article.get("publisher"), dict) else ""
                    NewsEvent.objects.create(
                        user=job.user,
                        company=known_companies[ticker],
                        headline=title[:500],
                        event_type=event_type,
                        sentiment_score=sentiment_score,
                        magnitude=magnitude,
                        published_at=published_at,
                        source=pub_name[:100],
                        dedup_hash=dedup_hash,
                    )
                    created += 1
                except Exception as e:
                    failed += 1
                    add_log(job, f"Row failed ({e}): {title[:50]}", "error")
                    
            if ingest_limit and ingest_limit > 0 and created >= ingest_limit:
                break
                
        # Final update
        options = job.options_json or {}
        options["records_created"] = created
        job.options_json = options
        job.save(update_fields=["options_json"])
        
        update_job(job, status="completed", current_step="Ingest complete", progress_percent=100, items_done=idx + 1)
        add_log(job, f"Ingested {created} new events (scanned {idx + 1}, matched {matched}, skipped {skipped_soft} opinion, failed {failed}).")
        
    except Exception as exc:
        job = PipelineJob.objects.filter(id=job_id).first()
        if job:
            update_job(job, status="failed", current_step="Ingest failed", error_message=str(exc))
            add_log(job, f"Ingest error: {type(exc).__name__}", "error")
