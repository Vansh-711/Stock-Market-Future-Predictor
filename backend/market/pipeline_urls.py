from django.urls import path

from . import pipeline_views

urlpatterns = [
    path("upload/", pipeline_views.upload_file, name="pipeline-upload"),
    path("jobs/", pipeline_views.create_job, name="pipeline-job-create"),
    path("jobs/<uuid:job_id>/", pipeline_views.job_detail, name="pipeline-job-detail"),
    path("jobs/<uuid:job_id>/events/", pipeline_views.job_events, name="pipeline-job-events"),
    path("jobs/<uuid:job_id>/cancel/", pipeline_views.cancel_job, name="pipeline-job-cancel"),
]
