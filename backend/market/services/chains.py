import json
import os
import re
import time
import joblib
import pandas as pd

from market.models import (
    NewsEvent,
    Relationship,
    BacktestPattern,
    GeneratedChain,
    PipelineJob,
)
from market.services.backtest import EXPECTED_DIRECTION
from accounts.models import UserSettings

MODEL_PATH = os.path.join(
    os.path.dirname(__file__), "..", "data", "_model", "model.joblib"
)

def _parse_json_text(text_out):
    text_out = (text_out or "").strip()
    text_out = re.sub(r"^```(?:json)?\s*", "", text_out)
    text_out = re.sub(r"\s*```$", "", text_out)
    if not text_out.startswith("{"):
        match = re.search(r"\{.*\}", text_out, re.DOTALL)
        if match:
            text_out = match.group(0)
    try:
        return json.loads(text_out)
    except Exception:
        return {"explanation": text_out}

def template_explanation(event, rel, direction, hit_rate, confidence):
    hit = f"{hit_rate:.0%}" if hit_rate is not None else "n/a"
    return (
        f"{event.company.symbol} reported a {event.event_type.replace('_', ' ')}. "
        f"{rel.related_company.symbol} is a {rel.relationship_type} of "
        f"{event.company.symbol}, so the historical pattern suggests a move "
        f"{direction}. Backtest hit rate: {hit} (model confidence {confidence:.0%})."
    )

def gemini_explanation(event, rel, direction, hit_rate, confidence, client, model, max_retries=4):
    hit = f"{hit_rate:.0%}" if hit_rate is not None else "unknown"
    prompt = (
        "Write ONE short plain-English causal hypothesis for a finance research tool. "
        "Do NOT claim you can predict stock prices. Do NOT use hype or emojis. "
        "State the trigger event, the relationship, the historically suggested direction, "
        "and cite the backtest hit rate and model confidence as supporting evidence.\n"
        "Respond with ONLY a JSON object: {\"explanation\": \"...\"}\n"
        f"Trigger company: {event.company.symbol} ({event.company.name})\n"
        f"Event type: {event.event_type}\n"
        f"Headline: {event.headline[:200]}\n"
        f"Affected company: {rel.related_company.symbol} ({rel.related_company.name})\n"
        f"Relationship: {rel.related_company.symbol} is a {rel.relationship_type} "
        f"relative to {event.company.symbol}\n"
        f"Suggested direction for affected company: {direction}\n"
        f"Backtest hit rate: {hit}\n"
        f"Model confidence: {confidence:.0%}\n"
    )
    last_error = None
    for _ in range(max_retries):
        try:
            resp = client.models.generate_content(model=model, contents=prompt)
            data = _parse_json_text(resp.text)
            explanation = (data.get("explanation") or "").strip()
            if not explanation:
                raise ValueError("empty explanation")
            return explanation
        except Exception as e:
            last_error = e
            err = str(e)
            if "429" in err or "RESOURCE_EXHAUSTED" in err:
                wait_s = 50
                retry_match = re.search(r"retry in (\d+(?:\.\d+)?)s", err, re.IGNORECASE)
                if retry_match:
                    wait_s = min(90, float(retry_match.group(1)) + 2)
                time.sleep(wait_s)
                continue
            raise
    raise last_error

def model_confidence(bundle, event, rel, predicted_direction):
    model = bundle["model"]
    columns = bundle["columns"]
    row = pd.DataFrame([{
        "event_type": event.event_type,
        "relationship_type": rel.relationship_type,
        "sentiment_score": event.sentiment_score,
        "magnitude": event.magnitude,
        "sector_match": int(event.company.sector == rel.related_company.sector),
    }])
    X = pd.get_dummies(row[["event_type", "relationship_type"]], drop_first=True)
    X["sentiment_score"] = row["sentiment_score"]
    X["magnitude"] = row["magnitude"]
    X["sector_match"] = row["sector_match"]
    X = X.reindex(columns=columns, fill_value=0)

    classes = list(model.classes_)
    proba = model.predict_proba(X)[0]
    p_up = float(proba[classes.index(1)]) if 1 in classes else float(proba[-1])
    if predicted_direction == "up":
        return p_up
    return 1.0 - p_up

def run_chains(job_id):
    from market.pipeline import update_job, add_log
    
    try:
        job = PipelineJob.objects.get(id=job_id)
        update_job(job, status="running", current_step="Initializing chain generation", progress_percent=5)
        
        if not os.path.exists(MODEL_PATH):
            add_log(job, "Trained model not found. Generating chains without model confidence.", "warning")
            bundle = None
        else:
            bundle = joblib.load(MODEL_PATH)

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
        
        client = None
        if api_key:
            try:
                from google import genai
                client = genai.Client(api_key=api_key)
            except Exception as e:
                add_log(job, f"Gemini initialization failed: {e}", "warning")

        # Get limit and prefer_patterns from options
        limit = int(job.options_json.get("chains_limit", 40))
        window = int(job.options_json.get("chains_window", 5))
        prefer_patterns = bool(job.options_json.get("chains_prefer_patterns", True))

        events = (
            NewsEvent.objects.filter(user=job.user)
            .exclude(event_type="other")
            .select_related("company")
            .order_by("-published_at")
        )

        update_job(job, items_total=limit, items_done=0, current_step="Generating causal hypotheses")
        
        created = 0
        skipped = 0
        gemini_calls = 0

        for event in events:
            if created >= limit:
                break

            relationships = Relationship.objects.filter(
                company=event.company,
                company__user=job.user
            ).select_related("related_company")

            for rel in relationships:
                if created >= limit:
                    break

                expected = EXPECTED_DIRECTION.get((event.event_type, rel.relationship_type))
                if not expected:
                    skipped += 1
                    continue

                pattern = BacktestPattern.objects.filter(
                    user=job.user,
                    trigger_event_type=event.event_type,
                    relationship_type=rel.relationship_type,
                    window_days=window,
                ).first()
                if pattern is None:
                    pattern = (
                        BacktestPattern.objects.filter(
                            user=job.user,
                            trigger_event_type=event.event_type,
                            relationship_type=rel.relationship_type,
                        )
                        .order_by("-sample_size")
                        .first()
                    )

                if prefer_patterns and pattern is None:
                    skipped += 1
                    continue

                direction = pattern.predicted_direction if pattern else expected
                hit_rate = pattern.hit_rate if pattern else None

                if GeneratedChain.objects.filter(
                    user=job.user,
                    trigger_event=event,
                    affected_company=rel.related_company,
                    relationship_type=rel.relationship_type,
                ).exists():
                    skipped += 1
                    continue

                confidence = 0.5
                if bundle:
                    try:
                        confidence = model_confidence(bundle, event, rel, direction)
                    except Exception as e:
                        add_log(job, f"Model score failed: {e}", "warning")
                        skipped += 1
                        continue

                try:
                    if client:
                        if gemini_calls > 0 and gemini_delay > 0:
                            time.sleep(gemini_delay)
                        update_job(job, current_step=f"Writing explanation {created + 1}/{limit}")
                        
                        explanation = gemini_explanation(
                            event, rel, direction, hit_rate, confidence,
                            client, gemini_model,
                        )
                        gemini_calls += 1
                        add_log(job, f"API CALL [Gemini]: Wrote hypothesis for {event.company.symbol}->{rel.related_company.symbol}")
                    else:
                        explanation = template_explanation(
                            event, rel, direction, hit_rate, confidence
                        )
                except Exception as e:
                    add_log(job, f"Explanation failed ({e}); using template.", "warning")
                    explanation = template_explanation(
                        event, rel, direction, hit_rate, confidence
                    )

                GeneratedChain.objects.create(
                    user=job.user,
                    trigger_event=event,
                    affected_company=rel.related_company,
                    relationship_type=rel.relationship_type,
                    predicted_direction=direction,
                    model_confidence=round(confidence, 4),
                    backtest_hit_rate=hit_rate,
                    explanation=explanation,
                )
                created += 1
                
                pct = 5 + (created / max(limit, 1) * 90)
                update_job(job, items_done=created, progress_percent=pct)
                
                job.refresh_from_db()
                if job.cancel_requested:
                    update_job(job, status="cancelled", current_step="Cancelled by user")
                    add_log(job, "Chains generation cancelled.", "warning")
                    return

        update_job(job, status="completed", current_step="Chains generation complete", progress_percent=100, items_done=created)
        add_log(job, f"Created {created} GeneratedChain rows ({skipped} skipped).")
        
    except Exception as exc:
        job = PipelineJob.objects.filter(id=job_id).first()
        if job:
            update_job(job, status="failed", current_step="Chains generation failed", error_message=str(exc))
            add_log(job, f"Chains error: {type(exc).__name__}", "error")
