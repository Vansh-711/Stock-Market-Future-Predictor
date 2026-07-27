"""
Phase E — Generate causal chains for demo.

For each interesting NewsEvent, walks related companies, pulls the matching
BacktestPattern hit rate, scores the trained logistic regression, and asks
Gemini for a short plain-English explanation. Saves GeneratedChain rows.

Run once as a fixed batch before the presentation (not live-on-request).

Usage:
  export GEMINI_API_KEY=your_key_here
  python manage.py generate_chains --provider gemini --limit 40
  python manage.py generate_chains --prefer-patterns --no-llm --limit 40
"""
import json
import os
import re
import time

import joblib
import pandas as pd
from django.core.management.base import BaseCommand, CommandError

from market.models import (
    NewsEvent,
    Relationship,
    BacktestPattern,
    GeneratedChain,
)
from market.management.commands.run_backtest import EXPECTED_DIRECTION

MODEL_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "data", "_model", "model.joblib"
)
DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite"


def _parse_json_text(text_out):
    text_out = (text_out or "").strip()
    text_out = re.sub(r"^```(?:json)?\s*", "", text_out)
    text_out = re.sub(r"\s*```$", "", text_out)
    if not text_out.startswith("{"):
        match = re.search(r"\{.*\}", text_out, re.DOTALL)
        if match:
            text_out = match.group(0)
    return json.loads(text_out)


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
    """
    Returns probability that the related company moves in `predicted_direction`.
    The trained model predicts P(moved_up).
    """
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

    # predict_proba columns are [class0, class1] where class1 = moved_up
    classes = list(model.classes_)
    proba = model.predict_proba(X)[0]
    p_up = float(proba[classes.index(1)]) if 1 in classes else float(proba[-1])
    if predicted_direction == "up":
        return p_up
    return 1.0 - p_up


class Command(BaseCommand):
    help = "Generate GeneratedChain rows (backtest + model + explanation) for demo."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=40, help="Max chains to create")
        parser.add_argument("--window", type=int, default=5, help="Backtest window_days to prefer")
        parser.add_argument("--provider", choices=["gemini", "none"], default="gemini")
        parser.add_argument("--model", default=DEFAULT_GEMINI_MODEL, help="Gemini model id")
        parser.add_argument("--delay", type=float, default=2.0, help="Seconds between Gemini calls")
        parser.add_argument("--no-llm", action="store_true", help="Use template explanations (no API)")
        parser.add_argument(
            "--prefer-patterns",
            action="store_true",
            help="Only create chains that have a matching BacktestPattern (recommended for demo)",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete existing GeneratedChain rows before generating",
        )

    def handle(self, *args, **opts):
        if not os.path.exists(MODEL_PATH):
            raise CommandError(
                f"Trained model not found at {MODEL_PATH}. Run: python manage.py train_model"
            )
        bundle = joblib.load(MODEL_PATH)

        if opts["clear"]:
            deleted, _ = GeneratedChain.objects.all().delete()
            self.stdout.write(f"Cleared {deleted} existing GeneratedChain rows.")

        client = None
        use_llm = not opts["no_llm"] and opts["provider"] == "gemini"
        if use_llm:
            try:
                from google import genai
                api_key = os.environ.get("GEMINI_API_KEY")
                if not api_key:
                    raise RuntimeError("GEMINI_API_KEY environment variable is not set")
                client = genai.Client(api_key=api_key)
                self.stdout.write(
                    f"Using Gemini model: {opts['model']} (delay {opts['delay']}s)"
                )
            except Exception as e:
                self.stdout.write(self.style.WARNING(
                    f"Gemini unavailable ({e}); falling back to template explanations."
                ))
                use_llm = False

        events = (
            NewsEvent.objects.exclude(event_type="other")
            .select_related("company")
            .order_by("-published_at")
        )

        created = 0
        skipped = 0
        gemini_calls = 0

        for event in events:
            if created >= opts["limit"]:
                break

            relationships = Relationship.objects.filter(
                company=event.company
            ).select_related("related_company")

            for rel in relationships:
                if created >= opts["limit"]:
                    break

                expected = EXPECTED_DIRECTION.get((event.event_type, rel.relationship_type))
                if not expected:
                    skipped += 1
                    continue

                pattern = BacktestPattern.objects.filter(
                    trigger_event_type=event.event_type,
                    relationship_type=rel.relationship_type,
                    window_days=opts["window"],
                ).first()
                if pattern is None:
                    # fall back to any window for this pair
                    pattern = (
                        BacktestPattern.objects.filter(
                            trigger_event_type=event.event_type,
                            relationship_type=rel.relationship_type,
                        )
                        .order_by("-sample_size")
                        .first()
                    )

                if opts["prefer_patterns"] and pattern is None:
                    skipped += 1
                    continue

                direction = pattern.predicted_direction if pattern else expected
                hit_rate = pattern.hit_rate if pattern else None

                if GeneratedChain.objects.filter(
                    trigger_event=event,
                    affected_company=rel.related_company,
                    relationship_type=rel.relationship_type,
                ).exists():
                    skipped += 1
                    continue

                try:
                    confidence = model_confidence(bundle, event, rel, direction)
                except Exception as e:
                    self.stdout.write(self.style.WARNING(
                        f"Model score failed ({e}); skipping "
                        f"{event.company.symbol}->{rel.related_company.symbol}"
                    ))
                    skipped += 1
                    continue

                try:
                    if use_llm and client:
                        if gemini_calls > 0 and opts["delay"] > 0:
                            time.sleep(opts["delay"])
                        explanation = gemini_explanation(
                            event, rel, direction, hit_rate, confidence,
                            client, opts["model"],
                        )
                        gemini_calls += 1
                    else:
                        explanation = template_explanation(
                            event, rel, direction, hit_rate, confidence
                        )
                except Exception as e:
                    self.stdout.write(self.style.WARNING(
                        f"Explanation failed ({e}); using template: {event.headline[:50]}"
                    ))
                    explanation = template_explanation(
                        event, rel, direction, hit_rate, confidence
                    )

                GeneratedChain.objects.create(
                    trigger_event=event,
                    affected_company=rel.related_company,
                    relationship_type=rel.relationship_type,
                    predicted_direction=direction,
                    model_confidence=round(confidence, 4),
                    backtest_hit_rate=hit_rate,
                    explanation=explanation,
                )
                created += 1
                hit_txt = f"{hit_rate:.0%}" if hit_rate is not None else "n/a"
                self.stdout.write(
                    f"  Chain: {event.company.symbol} -{rel.relationship_type}-> "
                    f"{rel.related_company.symbol} | {direction} | "
                    f"hit={hit_txt} conf={confidence:.0%} | {event.event_type}"
                )

        self.stdout.write(self.style.SUCCESS(
            f"Created {created} GeneratedChain rows ({skipped} skipped)."
        ))
