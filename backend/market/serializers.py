from rest_framework import serializers
from .models import Company, Relationship, NewsEvent, BacktestPattern, GeneratedChain


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ["id", "symbol", "name", "sector", "description"]


class RelationshipSerializer(serializers.ModelSerializer):
    company_symbol = serializers.CharField(source="company.symbol", read_only=True)
    related_symbol = serializers.CharField(source="related_company.symbol", read_only=True)

    class Meta:
        model = Relationship
        fields = ["id", "company", "related_company", "company_symbol",
                  "related_symbol", "relationship_type", "notes"]


class NewsEventSerializer(serializers.ModelSerializer):
    company_symbol = serializers.CharField(source="company.symbol", read_only=True)

    class Meta:
        model = NewsEvent
        fields = ["id", "company", "company_symbol", "headline", "event_type",
                  "sentiment_score", "magnitude", "published_at", "source"]


class BacktestPatternSerializer(serializers.ModelSerializer):
    class Meta:
        model = BacktestPattern
        fields = ["id", "trigger_event_type", "relationship_type", "window_days",
                  "sample_size", "hit_rate", "avg_move_pct", "predicted_direction", "computed_at"]


class GeneratedChainSerializer(serializers.ModelSerializer):
    trigger_headline = serializers.CharField(source="trigger_event.headline", read_only=True)
    trigger_symbol = serializers.CharField(source="trigger_event.company.symbol", read_only=True)
    affected_symbol = serializers.CharField(source="affected_company.symbol", read_only=True)

    class Meta:
        model = GeneratedChain
        fields = ["id", "trigger_event", "trigger_headline", "trigger_symbol",
                  "affected_company", "affected_symbol", "relationship_type",
                  "predicted_direction", "model_confidence", "backtest_hit_rate",
                  "explanation", "source", "created_at"]
