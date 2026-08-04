from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.authentication import SpaSessionAuthentication
from market.models import PipelineJob, PipelineLog
from market.pipeline import add_log, start_job, update_job
import os
from django.core.files.storage import default_storage
from market.services.ingest import detect_file_format, preview_file
from market.services.live_ingest import run_live_ingest


def serialize_log(log):
    return {"id": log.id, "level": log.level, "message": log.message, "created_at": log.created_at.isoformat()}


def serialize_job(job, include_logs=True):
    options = job.options_json or {}
    payload = {
        "job_id": str(job.id), "status": job.status, "phase": job.current_phase,
        "progress_percent": job.progress_percent, "current_step": job.current_step,
        "items_total": job.items_total, "items_done": job.items_done,
        "records_created": options.get("records_created", 0),
        "records_target": options.get("ingest_limit", 0),
        "error": job.error_message or None, "cancel_requested": job.cancel_requested,
        "created_at": job.created_at.isoformat(), "updated_at": job.updated_at.isoformat(),
    }
    if include_logs:
        logs_queryset = job.logs.order_by("-created_at")[:1000]
        payload["logs"] = [serialize_log(log) for log in reversed(logs_queryset)]
    return payload


def user_job_or_404(request, job_id):
    return get_object_or_404(PipelineJob.objects.prefetch_related("logs"), id=job_id, user=request.user)


@csrf_exempt
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@authentication_classes([SpaSessionAuthentication])
def create_job(request):
    phases = request.data.get("phases", ["seed"])
    upload_path = request.data.get("upload_path", "")
    adapter_id = request.data.get("adapter_id", "")
    ingest_limit = request.data.get("ingest_limit")
    
    options = {"phases": phases}
    if ingest_limit is not None:
        options["ingest_limit"] = int(ingest_limit)
        
    job = PipelineJob.objects.create(
        user=request.user, 
        current_phase=phases[0] if phases else "seed", 
        current_step="Queued for execution", 
        options_json=options,
        upload_path=upload_path,
        adapter_id=adapter_id
    )
    add_log(job, f"Run queued for phases: {', '.join(phases)}.")
    start_job(job)
    return Response(serialize_job(job), status=201)

@csrf_exempt
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@authentication_classes([SpaSessionAuthentication])
def upload_file(request):
    file = request.FILES.get("file")
    if not file:
        return Response({"detail": "No file provided."}, status=400)
    path = default_storage.save(f"pipeline_uploads/{file.name}", file)
    full_path = default_storage.path(path)
    adapter = detect_file_format(full_path)
    preview, total_rows = preview_file(full_path, adapter)
    return Response({"file_path": full_path, "adapter": adapter, "preview": preview, "total_rows": total_rows})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@authentication_classes([SpaSessionAuthentication])
def job_detail(request, job_id):
    return Response(serialize_job(user_job_or_404(request, job_id)))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@authentication_classes([SpaSessionAuthentication])
def job_events(request, job_id):
    job = user_job_or_404(request, job_id)
    after_id = request.query_params.get("after", "0")
    try:
        after_id = int(after_id)
    except ValueError:
        after_id = 0
    logs = job.logs.filter(id__gt=after_id)
    return Response({"job_id": str(job.id), "status": job.status, "logs": [serialize_log(log) for log in logs]})


@csrf_exempt
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@authentication_classes([SpaSessionAuthentication])
def cancel_job(request, job_id):
    job = user_job_or_404(request, job_id)
    if job.status in {"completed", "failed", "cancelled"}:
        return Response(serialize_job(job))
    update_job(job, cancel_requested=True, current_step="Cancellation requested")
    add_log(job, "Cancellation requested by user.", "warning")
    return Response(serialize_job(job))

@api_view(["GET"])
@permission_classes([IsAuthenticated])
@authentication_classes([SpaSessionAuthentication])
def latest_job(request):
    job_type = request.query_params.get("type", "manual")
    if job_type == "any":
        job = PipelineJob.objects.filter(user=request.user).order_by("-created_at").first()
    else:
        job = PipelineJob.objects.filter(user=request.user, job_type=job_type).order_by("-created_at").first()
    if not job:
        return Response(None)
    return Response(serialize_job(job))

import threading

@csrf_exempt
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@authentication_classes([SpaSessionAuthentication])
def trigger_live_ingest(request):
    limit = request.data.get("limit")
    if limit is not None:
        try:
            limit = int(limit)
        except ValueError:
            limit = None
            
    job = PipelineJob.objects.create(
        user=request.user,
        job_type="scheduled",
        status="running",
        current_phase="ingest",
        current_step="Starting live fetch...",
        progress_percent=0
    )
    def bg_run():
        run_live_ingest(request.user, existing_job=job, limit=limit)
    thread = threading.Thread(target=bg_run)
    thread.daemon = True
    thread.start()
    return Response(serialize_job(job))
