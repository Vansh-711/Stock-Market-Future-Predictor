from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r"companies", views.CompanyViewSet, basename="company")
router.register(r"relationships", views.RelationshipViewSet, basename="relationship")
router.register(r"events", views.NewsEventViewSet, basename="event")
router.register(r"patterns", views.BacktestPatternViewSet, basename="pattern")
router.register(r"chains", views.GeneratedChainViewSet, basename="chain")

urlpatterns = [
    path("", include(router.urls)),
    path("graph/", views.company_graph, name="company-graph"),
    path('model/metrics/', views.get_model_metrics, name='model_metrics'),
    path('verify/', views.verify_pipeline, name='verify_pipeline'),
    path("graph/stats/", views.graph_stats, name="company-graph-stats"),
    path("clear/", views.clear_data, name="clear-data"),
]
