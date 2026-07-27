from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r"companies", views.CompanyViewSet)
router.register(r"relationships", views.RelationshipViewSet)
router.register(r"events", views.NewsEventViewSet, basename="event")
router.register(r"patterns", views.BacktestPatternViewSet, basename="pattern")
router.register(r"chains", views.GeneratedChainViewSet, basename="chain")

urlpatterns = [
    path("", include(router.urls)),
    path("graph/", views.company_graph, name="company-graph"),
]
