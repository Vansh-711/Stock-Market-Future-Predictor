import os
import logging
import requests
from datetime import datetime, timedelta
from django.db import IntegrityError
from django.utils import timezone as dj_timezone
from market.models import Company, NewsEvent, PipelineJob
from market.pipeline import update_job, add_log
from accounts.models import UserSettings
from .ingest import classify_event_type_gemini, classify_event_type_keyword, looks_like_hard_event, looks_like_advice

logger = logging.getLogger("signal_chain.live_ingest")

SENTIMENT_MAP = {"positive": 0.6, "negative": -0.6, "neutral": 0.0}

def get_finnhub_news(ticker, start_date, end_date, api_key):
    url = f"https://finnhub.io/api/v1/company-news"
    params = {
        "symbol": ticker,
        "from": start_date.strftime("%Y-%m-%d"),
        "to": end_date.strftime("%Y-%m-%d"),
        "token": api_key
    }
    resp = requests.get(url, params=params, timeout=15)
    resp.raise_for_status()
    return resp.json()

def run_live_ingest(user, existing_job=None, limit=None):
    """
    Fetch recent Finnhub headlines for all companies in the user's graph,
    classify via Gemini, and save to NewsEvent.

    Returns a dict: {"created": int, "skipped": int, "errors": list[str]}
    """
    result = {"created": 0, "skipped": 0, "errors": []}

    finnhub_api_key = os.environ.get("FINNHUB_API_KEY")
    if not finnhub_api_key:
        msg = "No FINNHUB_API_KEY in environment. Skipping live ingest."
        logger.warning(msg)
        result["errors"].append(msg)
        return result
        
    user_settings = UserSettings.objects.filter(user=user).first()
    gemini_api_key = None
    if user_settings and user_settings.gemini_api_key_encrypted:
        from cryptography.fernet import Fernet
        from django.conf import settings
        cipher = Fernet(settings.FIELD_ENCRYPTION_KEY.encode())
        try:
            gemini_api_key = cipher.decrypt(user_settings.gemini_api_key_encrypted.encode()).decode()
        except Exception:
            pass

    gemini_model = user_settings.gemini_model if user_settings else "gemini-3.1-flash-lite"
    prefer_events = user_settings.prefer_events if user_settings else True

    # Pull headlines for the last 3 days
    end_date = datetime.now()
    start_date = end_date - timedelta(days=3)

    if existing_job:
        job = existing_job
        update_job(job, current_step="Fetching live news from Finnhub", progress_percent=10)
    else:
        job = PipelineJob.objects.create(
            user=user,
            job_type="scheduled",
            status="running",
            current_phase="ingest",
            current_step="Fetching live news from Finnhub",
            progress_percent=10
        )

    companies = Company.objects.filter(user=user)
    if companies.count() == 0:
        add_log(job, "Graph is empty. Auto-syncing graph before live ingest...")
        from market.services.graph import seed_graph
        seed_graph(user=user)
        companies = Company.objects.filter(user=user)
        
    total_companies = companies.count()
    logger.info(f"Live ingest starting for {total_companies} companies (user={user.username})")

    update_job(job, items_total=total_companies, items_done=0)

    all_articles = []
    for idx, company in enumerate(companies):
        update_job(job, items_done=idx, progress_percent=(idx / max(total_companies, 1) * 50), current_step=f"Fetching {company.symbol} from Finnhub")
        ticker = company.symbol
        try:
            articles = get_finnhub_news(ticker, start_date, end_date, finnhub_api_key)
        except Exception as e:
            msg = f"Finnhub API failed for {ticker}: {e}"
            logger.error(msg)
            result["errors"].append(msg)
            continue
            
        if limit:
            articles = articles[:limit]
            
        for a in articles:
            a["_company"] = company
        all_articles.extend(articles)

    total_articles = len(all_articles)
    update_job(job, items_total=total_articles, items_done=0, current_step=f"Processing {total_articles} headlines")

    for idx, article in enumerate(all_articles):
        job.refresh_from_db()
        if job.cancel_requested:
            update_job(job, status="cancelled", current_step="Cancelled by user")
            add_log(job, "Live ingest cancelled.")
            return result
            
        company = article["_company"]
        ticker = company.symbol
        title = article.get("headline", "").strip()
        
        update_job(job, items_done=idx, progress_percent=50 + (idx / max(total_articles, 1) * 50), current_step=f"Classifying {ticker}")

        if not title:
            continue
            
        # Convert timestamp to aware datetime
        pub_ts = article.get("datetime")
        if not pub_ts:
            continue
        published_at = datetime.fromtimestamp(pub_ts)
        published_at = dj_timezone.make_aware(published_at)
        
        # --- DEDUP: hash check BEFORE any Gemini call ---
        pub_date_str = published_at.strftime("%Y-%m-%d")
        dedup_hash = NewsEvent.compute_dedup_hash(ticker, title, pub_date_str)
        if NewsEvent.objects.filter(dedup_hash=dedup_hash).exists():
            result["skipped"] += 1
            add_log(job, f"SKIP|Duplicate|{title[:80]}")
            continue

        summary = article.get("summary", "")
        combined_text = f"{title}. {summary}"
        
        if prefer_events:
            hard = looks_like_hard_event(combined_text)
            advice = looks_like_advice(title)
            if advice and not hard:
                result["skipped"] += 1
                add_log(job, f"SKIP|Advice|{title[:80]}")
                continue
            if not hard:
                result["skipped"] += 1
                add_log(job, f"SKIP|Soft/Opinion|{title[:80]}")
                continue

        # Classify — only reached if the headline is genuinely new
        if gemini_api_key:
            try:
                event_type, magnitude = classify_event_type_gemini(combined_text, gemini_api_key, model=gemini_model, job=job)
            except Exception as e:
                msg = f"Gemini failed for '{title[:60]}': {e}"
                logger.warning(msg)
                result["errors"].append(msg)
                event_type, magnitude = classify_event_type_keyword(combined_text)
        else:
            event_type, magnitude = classify_event_type_keyword(combined_text)

        add_log(job, f"GEMINI|{event_type}|{title[:80]}")
        source = article.get("source", "")[:100]

        try:
            event_obj = NewsEvent.objects.create(
                user=user,
                company=company,
                headline=title[:500],
                event_type=event_type,
                sentiment_score=0.0,
                magnitude=magnitude,
                published_at=published_at,
                source=source,
                dedup_hash=dedup_hash,
                is_live=True,
            )
            result["created"] += 1
            
            # --- LAYER 4: LIVE SCORING ---
            try:
                from market.services.chains import score_live_event
                chains_created = score_live_event(event_obj)
                if chains_created > 0:
                    logger.info(f"Live scored '{title[:40]}': generated {chains_created} chains")
            except Exception as e:
                logger.warning(f"Failed to score live event '{title[:40]}': {e}")
                
        except IntegrityError:
            # Race condition: another process inserted this hash between our check and create
            result["skipped"] += 1
            continue
        except Exception as e:
            msg = f"DB write failed for '{title[:60]}': {e}"
            logger.error(msg)
            result["errors"].append(msg)
            continue

    logger.info(
        f"Live ingest complete for user={user.username}: "
        f"created={result['created']}, skipped={result['skipped']}, errors={len(result['errors'])}"
    )
    
    update_job(
        job,
        status="completed" if not result["errors"] else "completed",  # even with some errors, it completes
        progress_percent=100,
        current_step=f"Found {result['created']} new events",
        items_done=total_companies,
    )
    
    return result
