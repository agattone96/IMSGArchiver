import datetime
import os
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, Optional

from . import db, engine
from .config import OUT_DIR


TERMINAL_STATUSES = {"completed", "failed", "canceled"}


def _utc_now_iso() -> str:
    return datetime.datetime.now(datetime.UTC).isoformat().replace("+00:00", "Z")


class ArchiveJobStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="archive-job")

    def _ensure_jobs(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        jobs = metadata.setdefault("jobs", {})
        if not isinstance(jobs, dict):
            jobs = {}
            metadata["jobs"] = jobs
        return jobs

    def _save_job(self, job_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            metadata = db.load_metadata()
            jobs = self._ensure_jobs(metadata)
            current = jobs.get(job_id, {})
            current.update(updates)
            jobs[job_id] = current
            db.save_metadata(metadata)
            return dict(current)

    def _get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        # Read under the same lock as writes to avoid races with file-based metadata
        with self._lock:
            metadata = db.load_metadata()
            jobs = self._ensure_jobs(metadata)
            job = jobs.get(job_id)
            return dict(job) if job else None

    def enqueue_archive_job(self, chat_guid: str, format_ext: str, incremental: bool) -> Dict[str, Any]:
        now = _utc_now_iso()
        job_id = str(uuid.uuid4())
        record = {
            "id": job_id,
            "type": "archive_chat",
            "chat_guid": chat_guid,
            "format": format_ext,
            "incremental": bool(incremental),
            "status": "queued",
            "progress": 0,
            "processed": 0,
            "total": 0,
            "result": None,
            "error": None,
            "cancel_requested": False,
            "created_at": now,
            "updated_at": now,
            "started_at": None,
            "completed_at": None,
        }
        self._save_job(job_id, record)
        self._executor.submit(self._run_archive_job, job_id)
        return record

    def _run_archive_job(self, job_id: str) -> None:
        job = self._get_job(job_id)
        if not job:
            return

        if job.get("cancel_requested"):
            now = _utc_now_iso()
            self._save_job(job_id, {"status": "canceled", "updated_at": now, "completed_at": now})
            return

        now = _utc_now_iso()
        self._save_job(job_id, {"status": "running", "started_at": now, "updated_at": now})

        def progress_callback(processed: int, total: int) -> None:
            pct = 0
            if total > 0:
                pct = int((processed / total) * 100)
            self._save_job(job_id, {
                "progress": max(0, min(100, pct)),
                "processed": processed,
                "total": total,
                "updated_at": _utc_now_iso(),
            })

        def should_cancel() -> bool:
            latest = self._get_job(job_id)
            return bool(latest and latest.get("cancel_requested"))

        try:
            out_path, count = engine.archive_chat(
                job["chat_guid"],
                job["format"],
                job["incremental"],
                progress_callback=progress_callback,
                cancel_check=should_cancel,
            )
            done = _utc_now_iso()
            safe_path = None
            if out_path:
                try:
                    rel = os.path.relpath(out_path, OUT_DIR)
                    safe_path = rel if not rel.startswith("..") else os.path.basename(out_path)
                except Exception:
                    safe_path = os.path.basename(out_path)

            self._save_job(job_id, {
                "status": "completed",
                "progress": 100,
                "result": {"path": safe_path, "count": count},
                "updated_at": done,
                "completed_at": done,
                "error": None,
            })
        except JobCanceledError:
            done = _utc_now_iso()
            self._save_job(job_id, {
                "status": "canceled",
                "updated_at": done,
                "completed_at": done,
                "error": None,
            })
            return
        except RuntimeError as err:
            done = _utc_now_iso()
            self._save_job(job_id, {
                "status": "failed",
                "error": str(err),
                "updated_at": done,
                "completed_at": done,
            })
        except Exception as err:
            done = _utc_now_iso()
            self._save_job(job_id, {
                "status": "failed",
                "error": str(err),
                "updated_at": done,
                "completed_at": done,
            })

    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        return self._get_job(job_id)

    def request_cancel(self, job_id: str) -> Optional[Dict[str, Any]]:
        job = self._get_job(job_id)
        if not job:
            return None
        if job.get("status") in TERMINAL_STATUSES:
            return job
        now = _utc_now_iso()
        if job.get("status") == "queued":
            return self._save_job(job_id, {
                "status": "canceled",
                "cancel_requested": True,
                "updated_at": now,
                "completed_at": now,
            })
        return self._save_job(job_id, {
            "cancel_requested": True,
            "updated_at": now,
        })


job_store = ArchiveJobStore()
