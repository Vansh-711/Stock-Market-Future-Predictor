import json
import os
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import joblib

from market.models import NewsEvent, Relationship, PipelineJob

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "_model")

def run_train(job_id):
    from market.pipeline import update_job, add_log
    
    try:
        job = PipelineJob.objects.get(id=job_id)
        update_job(job, status="running", current_step="Preparing data for training", progress_percent=10)
        
        # NOTE: circular import avoidance
        from market.data.prices import get_price_change
        
        os.makedirs(MODEL_DIR, exist_ok=True)
        rows = []
        
        events = NewsEvent.objects.filter(user=job.user).select_related("company")
        total_events = events.count()
        
        for idx, event in enumerate(events):
            if idx % 10 == 0:
                job.refresh_from_db()
                if job.cancel_requested:
                    update_job(job, status="cancelled", current_step="Cancelled by user")
                    add_log(job, "Train cancelled.", "warning")
                    return
                pct = 10 + (idx / max(total_events, 1) * 40)
                update_job(job, progress_percent=pct, items_done=idx, items_total=total_events)
                
            for rel in Relationship.objects.filter(company=event.company, company__user=job.user).select_related("related_company"):
                change_pct = get_price_change(rel.related_company.symbol, event.published_at, 5)
                if change_pct is None:
                    continue
                rows.append({
                    "event_type": event.event_type,
                    "relationship_type": rel.relationship_type,
                    "sentiment_score": event.sentiment_score,
                    "magnitude": event.magnitude,
                    "sector_match": int(event.company.sector == rel.related_company.sector),
                    "moved_up": int(change_pct > 0),
                })
        
        update_job(job, current_step="Training logistic regression model", progress_percent=60)
        
        if len(rows) < 30:
            add_log(job, f"Only {len(rows)} labeled rows found (need >= 30). Skipping training.", "warning")
            update_job(job, status="completed", current_step="Train skipped (insufficient data)", progress_percent=100)
            return

        df = pd.DataFrame(rows)
        X = pd.get_dummies(df[["event_type", "relationship_type"]], drop_first=True)
        X["sentiment_score"] = df["sentiment_score"]
        X["magnitude"] = df["magnitude"]
        X["sector_match"] = df["sector_match"]
        y = df["moved_up"]

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.25, random_state=42, stratify=y if y.nunique() > 1 else None
        )

        update_job(job, progress_percent=70)
        
        model = LogisticRegression(max_iter=1000)
        model.fit(X_train, y_train)
        preds = model.predict(X_test)

        update_job(job, current_step="Computing metrics", progress_percent=85)
        
        report = classification_report(y_test, preds, output_dict=True)
        matrix = confusion_matrix(y_test, preds).tolist()
        coefficients = dict(zip(X.columns, model.coef_[0].round(4).tolist()))

        joblib.dump({"model": model, "columns": list(X.columns)}, os.path.join(MODEL_DIR, "model.joblib"))
        
        with open(os.path.join(MODEL_DIR, "metrics.json"), "w") as f:
            json.dump({
                "n_samples": len(rows),
                "classification_report": report,
                "confusion_matrix": matrix,
                "feature_coefficients": coefficients,
            }, f, indent=2)

        add_log(job, f"Trained on {len(rows)} samples. Accuracy: {report['accuracy']:.2%}.")
        update_job(job, status="completed", current_step="Train complete", progress_percent=100, items_done=len(rows), items_total=len(rows))
        
    except Exception as exc:
        job = PipelineJob.objects.filter(id=job_id).first()
        if job:
            update_job(job, status="failed", current_step="Train failed", error_message=str(exc))
            add_log(job, f"Train error: {type(exc).__name__}", "error")
