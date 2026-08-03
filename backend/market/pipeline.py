"""Small thread-backed pipeline runner for the V2 MVP.

The job state lives in the database so the browser can poll it. Threads are
intentionally a local-demo bridge; a later deployment can replace `start_job`
with Celery without changing the API contract.
"""
from threading import Thread

from django.db import close_old_connections

from market.models import PipelineJob, PipelineLog
from market.services.graph import seed_graph
from market.services.ingest import run_ingest


def add_log(job, message, level="info"):
    PipelineLog.objects.create(job=job, message=message, level=level)


def update_job(job, **fields):
    for field, value in fields.items():
        setattr(job, field, value)
    job.save(update_fields=[*fields.keys(), "updated_at"])


def _cancel_if_requested(job):
    job.refresh_from_db()
    if not job.cancel_requested:
        return False
    update_job(job, status="cancelled", current_step="Cancelled by user")
    add_log(job, "Pipeline run cancelled.", "warning")
    return True


def run_job(job_id):
    close_old_connections()
    try:
        job = PipelineJob.objects.get(id=job_id)
        phases = job.options_json.get("phases", ["seed"])
        
        if "seed" in phases:
            update_job(job, status="running", current_phase="seed", current_step="Preparing graph seed", progress_percent=5)
            add_log(job, "Pipeline runner started (seed phase).")
            if _cancel_if_requested(job):
                return

            update_job(job, current_step="Synchronizing companies and relationships", progress_percent=35)
            summary = seed_graph(user=job.user)
            if _cancel_if_requested(job):
                return

            add_log(job, f"Graph synchronized: {summary['companies_total']} companies and {summary['relationships_total']} relationships.")
            
        if "ingest" in phases:
            if not job.upload_path:
                raise ValueError("Ingest phase requested but no upload path provided.")
            update_job(job, status="running", current_phase="ingest", current_step="Starting ingestion", progress_percent=0)
            add_log(job, "Pipeline runner started (ingest phase).")
            if _cancel_if_requested(job):
                return
            
            run_ingest(str(job.id), job.upload_path, job.adapter_id)
            if _cancel_if_requested(job):
                return
                
        if "backtest" in phases:
            update_job(job, status="running", current_phase="backtest", current_step="Starting backtest", progress_percent=0)
            add_log(job, "Pipeline runner started (backtest phase).")
            if _cancel_if_requested(job):
                return
            
            from market.services.backtest import run_backtest
            run_backtest(str(job.id))
            if _cancel_if_requested(job):
                return

        if "train" in phases:
            update_job(job, status="running", current_phase="train", current_step="Starting model training", progress_percent=0)
            add_log(job, "Pipeline runner started (train phase).")
            if _cancel_if_requested(job):
                return
            
            from market.services.train import run_train
            run_train(str(job.id))
            if _cancel_if_requested(job):
                return

        if "chains" in phases:
            update_job(job, status="running", current_phase="chains", current_step="Starting chains generation", progress_percent=0)
            add_log(job, "Pipeline runner started (chains phase).")
            if _cancel_if_requested(job):
                return
            
            from market.services.chains import run_chains
            run_chains(str(job.id))
            if _cancel_if_requested(job):
                return

        update_job(
            job,
            status="completed",
            current_step="Run complete",
            progress_percent=100,
        )
        add_log(job, "Run complete.")
    except Exception as exc:
        job = PipelineJob.objects.filter(id=job_id).first()
        if job:
            update_job(job, status="failed", current_step="Run failed", error_message="The pipeline could not complete. Check the activity log.")
            add_log(job, f"Runner error: {type(exc).__name__}", "error")
    finally:
        close_old_connections()


def start_job(job):
    Thread(target=run_job, args=(str(job.id),), daemon=True, name=f"pipeline-{job.id}").start()
