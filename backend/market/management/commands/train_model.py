"""
Trains a logistic regression on historical (event, relationship) pairs to
predict whether the RELATED company's price moves in the expected direction
within a fixed window. Saves the model + a metrics report to disk.

Features: event_type (one-hot), relationship_type (one-hot), sentiment_score,
magnitude, sector_match (bool).

This is intentionally a simple, explainable model -- for a presentation,
being able to show feature coefficients and a confusion matrix is worth far
more than a fancier black-box model you can't defend under questioning.

Usage: python manage.py train_model
"""
import json
import os
import numpy as np
import pandas as pd
from django.core.management.base import BaseCommand
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import joblib

from market.models import NewsEvent, Relationship
from market.data.prices import get_price_change

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data", "_model")


class Command(BaseCommand):
    help = "Train a logistic regression model on historical event/relationship/price data."

    def handle(self, *args, **options):
        os.makedirs(MODEL_DIR, exist_ok=True)
        rows = []

        events = NewsEvent.objects.select_related("company").all()
        for event in events:
            for rel in Relationship.objects.filter(company=event.company).select_related("related_company"):
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

        if len(rows) < 30:
            self.stdout.write(self.style.WARNING(
                f"Only {len(rows)} labeled rows found -- need more news events / relationships "
                "ingested before this model is meaningful. Run your ingestion pipeline first."
            ))
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

        model = LogisticRegression(max_iter=1000)
        model.fit(X_train, y_train)
        preds = model.predict(X_test)

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

        self.stdout.write(self.style.SUCCESS(
            f"Trained on {len(rows)} samples. Accuracy: {report['accuracy']:.2%}. "
            f"Metrics saved to market/data/_model/metrics.json"
        ))
