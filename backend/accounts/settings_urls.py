from django.urls import path

from . import views

urlpatterns = [
    path("llm/", views.llm_settings, name="llm-settings"),
    path("llm/test/", views.test_llm_connection, name="llm-settings-test"),
]
