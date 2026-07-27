from rest_framework import viewsets, filters
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from .models import Company, Relationship, NewsEvent, BacktestPattern, GeneratedChain
from .serializers import (
    CompanySerializer, RelationshipSerializer, NewsEventSerializer,
    BacktestPatternSerializer, GeneratedChainSerializer,
)


class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all().order_by("symbol")
    serializer_class = CompanySerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["symbol", "name", "sector"]


class RelationshipViewSet(viewsets.ModelViewSet):
    queryset = Relationship.objects.select_related("company", "related_company").all()
    serializer_class = RelationshipSerializer


class NewsEventViewSet(viewsets.ModelViewSet):
    queryset = NewsEvent.objects.select_related("company").order_by("-published_at")
    serializer_class = NewsEventSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        symbol = self.request.query_params.get("symbol")
        if symbol:
            qs = qs.filter(company__symbol=symbol.upper())
        return qs


class BacktestPatternViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = BacktestPattern.objects.order_by("-hit_rate")
    serializer_class = BacktestPatternSerializer


class GeneratedChainViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = GeneratedChain.objects.select_related(
        "trigger_event", "trigger_event__company", "affected_company"
    ).order_by("-created_at")
    serializer_class = GeneratedChainSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        symbol = self.request.query_params.get("symbol")
        if symbol:
            qs = qs.filter(trigger_event__company__symbol=symbol.upper())
        return qs


@api_view(["GET"])
def company_graph(request):
    """Returns nodes + edges for the relationship graph view."""
    companies = Company.objects.all()
    relationships = Relationship.objects.select_related("company", "related_company").all()
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
