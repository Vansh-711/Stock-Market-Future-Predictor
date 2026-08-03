from collections import Counter

from rest_framework import viewsets, filters
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt

from accounts.authentication import SpaSessionAuthentication

from .models import Company, Relationship, NewsEvent, BacktestPattern, GeneratedChain
from .serializers import (
    CompanySerializer, RelationshipSerializer, NewsEventSerializer,
    BacktestPatternSerializer, GeneratedChainSerializer,
)


class CompanyViewSet(viewsets.ModelViewSet):
    serializer_class = CompanySerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["symbol", "name", "sector"]

    def get_queryset(self):
        return Company.objects.filter(user=self.request.user).order_by("symbol")


class RelationshipViewSet(viewsets.ModelViewSet):
    serializer_class = RelationshipSerializer

    def get_queryset(self):
        return Relationship.objects.select_related("company", "related_company").filter(company__user=self.request.user)


class NewsEventViewSet(viewsets.ModelViewSet):
    serializer_class = NewsEventSerializer

    def get_queryset(self):
        qs = NewsEvent.objects.select_related("company").filter(user=self.request.user).order_by("-published_at")
        symbol = self.request.query_params.get("symbol")
        if symbol:
            qs = qs.filter(company__symbol=symbol.upper())
        return qs


class BacktestPatternViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = BacktestPatternSerializer

    def get_queryset(self):
        return BacktestPattern.objects.filter(user=self.request.user).order_by("-hit_rate")


class GeneratedChainViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = GeneratedChainSerializer

    def get_queryset(self):
        qs = GeneratedChain.objects.select_related(
            "trigger_event", "trigger_event__company", "affected_company"
        ).filter(user=self.request.user).order_by("-created_at")
        symbol = self.request.query_params.get("symbol")
        if symbol:
            qs = qs.filter(trigger_event__company__symbol=symbol.upper())
        return qs


@api_view(["GET"])
def company_graph(request):
    """Returns nodes + edges for the relationship graph view."""
    companies = Company.objects.filter(user=request.user)
    relationships = Relationship.objects.select_related("company", "related_company").filter(company__user=request.user)
    nodes = [{"id": c.symbol, "name": c.name, "sector": c.sector} for c in companies]
    edges = [
        {
            "source": r.company.symbol,
            "target": r.related_company.symbol,
            "type": r.relationship_type,
        }
        for r in relationships
    ]
    return Response({"nodes": nodes, "edges": edges})


@api_view(["GET"])
def graph_stats(request):
    """Compact graph-health summary for the pipeline and explorer surfaces."""
    companies = Company.objects.filter(user=request.user)
    relationships = Relationship.objects.filter(company__user=request.user)
    return Response({
        "company_count": companies.count(),
        "edge_count": relationships.count(),
        "by_sector": dict(sorted(Counter(companies.values_list("sector", flat=True)).items())),
        "by_relationship_type": dict(sorted(Counter(relationships.values_list("relationship_type", flat=True)).items())),
    })


@api_view(['GET'])
def get_model_metrics(request):
    import os
    import json
    from django.conf import settings
    
    MODEL_DIR = os.path.join(settings.BASE_DIR, "market", "data", "_model")
    metrics_path = os.path.join(MODEL_DIR, "metrics.json")
    
    if not os.path.exists(metrics_path):
        return Response({"error": "Model not trained yet"}, status=404)
        
    try:
        with open(metrics_path, "r") as f:
            data = json.load(f)
        return Response(data)
    except Exception as e:
        return Response({"error": f"Failed to read metrics: {str(e)}"}, status=500)


@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([SpaSessionAuthentication])
def verify_pipeline(request):
    """
    Runs lightweight checks to ensure the pipeline populated data correctly.
    Returns a list of checks with passed/failed status.
    """
    from .models import Company, Relationship, NewsEvent, BacktestPattern, GeneratedChain
    
    checks = []
    
    # 1. Graph Data
    company_count = Company.objects.filter(user=request.user).count()
    rel_count = Relationship.objects.filter(company__user=request.user).count()
    checks.append({
        "id": "graph_seeded",
        "name": "Graph database populated",
        "passed": company_count > 0 and rel_count > 0,
        "detail": f"{company_count} companies, {rel_count} relationships"
    })
    
    # 2. Ingestion
    event_count = NewsEvent.objects.filter(user=request.user).count()
    checks.append({
        "id": "news_ingested",
        "name": "News events ingested",
        "passed": event_count > 0,
        "detail": f"{event_count} events found"
    })
    
    # 3. Backtest
    pattern_count = BacktestPattern.objects.filter(user=request.user).count()
    checks.append({
        "id": "patterns_found",
        "name": "Backtest patterns generated",
        "passed": pattern_count > 0,
        "detail": f"{pattern_count} patterns identified"
    })
    
    # 4. Model
    import os
    from django.conf import settings
    MODEL_DIR = os.path.join(settings.BASE_DIR, "market", "data", "_model")
    model_exists = os.path.exists(os.path.join(MODEL_DIR, "model.joblib"))
    checks.append({
        "id": "model_trained",
        "name": "Confidence model trained",
        "passed": model_exists,
        "detail": "model.joblib exists on disk" if model_exists else "model.joblib missing"
    })
    
    # 5. Chains
    chain_count = GeneratedChain.objects.filter(user=request.user).count()
    checks.append({
        "id": "chains_generated",
        "name": "Causal chains generated",
        "passed": chain_count > 0,
        "detail": f"{chain_count} chains available"
    })
    
    all_passed = all(c["passed"] for c in checks)
    
    return Response({
        "all_passed": all_passed,
        "checks": checks
    })

@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([SpaSessionAuthentication])
def clear_data(request):
    """
    Completely wipes all data associated with the requesting user to start fresh.
    """
    from .models import Company, NewsEvent, BacktestPattern, GeneratedChain, PipelineJob
    
    # Deleting Company will cascade to Relationship
    Company.objects.filter(user=request.user).delete()
    NewsEvent.objects.filter(user=request.user).delete()
    BacktestPattern.objects.filter(user=request.user).delete()
    GeneratedChain.objects.filter(user=request.user).delete()
    PipelineJob.objects.filter(user=request.user).delete()
    
    return Response({"status": "success", "message": "All user data cleared."})
