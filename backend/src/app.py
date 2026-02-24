import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator
from typing import Optional, List
import sys
import os
import threading
import time
from uuid import uuid4

# Add project root to sys.path so 'backend' package is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.src import engine, db
from backend.src.config import OUT_DIR
from backend.src.helpers import decode_body, mac_timestamp_to_iso, redact_path

def _safe_detail(err: Exception) -> str:
    detail = redact_path(str(err))
    return detail or "Internal error"

app = FastAPI(title="Archiver API", version="1.0.0")

# CORS - Allow local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "app://."],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models ---
class Chat(BaseModel):
    chat_guid: str
    display_names: str
    msg_count: int
    last_date: Optional[str] = None
    badges: str

class Message(BaseModel):
    row_id: int
    text: str
    is_from_me: bool
    date: str # ISO
    handle_id: Optional[str] = None
    sender_name: Optional[str] = None

class GlobalStats(BaseModel):
    total_messages: int
    total_chats: int
    top_contact_handle: str
    top_contact_count: int
    storage_path: str

class OnboardingCheckResponse(BaseModel):
    success: bool
    message: str

class ArchiveRequest(BaseModel):
    chat_guid: str
    format: str = "csv" # csv, json, md
    incremental: bool = True

    @validator("format")
    def validate_format(cls, v):
        v = (v or "").lower().strip()
        if v not in {"csv", "json", "md"}:
            raise ValueError("Unsupported format")
        return v

class ArchiveJob(BaseModel):
    id: str
    chat_guid: str
    status: str
    progress: int = 0
    processed: int = 0
    total: int = 0
    error: Optional[str] = None
    result: Optional[dict] = None


_jobs_lock = threading.Lock()
_archive_jobs: dict[str, ArchiveJob] = {}


def _set_job(job_id: str, **fields):
    with _jobs_lock:
        job = _archive_jobs.get(job_id)
        if not job:
            return
        updated = job.copy(update=fields)
        _archive_jobs[job_id] = updated


def _run_archive_job(job_id: str, guid: str, req: ArchiveRequest):
    _set_job(job_id, status="running", progress=10)
    try:
        for p in (25, 45, 70):
            time.sleep(0.2)
            with _jobs_lock:
                curr = _archive_jobs.get(job_id)
            if not curr or curr.status == "canceled":
                return
            _set_job(job_id, progress=p)

        path, count = engine.archive_chat(guid, req.format, req.incremental)
        safe_path = None
        if path:
            try:
                rel = os.path.relpath(path, OUT_DIR)
                safe_path = rel if not rel.startswith("..") else os.path.basename(path)
            except Exception:
                safe_path = os.path.basename(path)

        _set_job(
            job_id,
            status="completed",
            progress=100,
            processed=count,
            total=count,
            result={"status": "ok", "path": safe_path, "count": count},
            error=None,
        )
    except Exception as e:
        _set_job(job_id, status="failed", error=_safe_detail(e))

# --- API Endpoints ---

@app.get("/system/status")
def get_status():
    return {"status": "ok", "version": "1.0.0", "storage": redact_path(OUT_DIR)}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/stats/global")
def get_global_stats():
    try:
        stats = engine.get_global_stats() # Verify engine has this or add it
        # Polyfill if engine doesn't return everything
        return {
            "total_messages": stats.get("total_messages", 0),
            "total_chats": stats.get("total_chats", 0),
            "top_contact_handle": stats.get("top_contact_handle", "N/A"),
            "top_contact_count": stats.get("top_contact_count", 0),
            "storage_path": redact_path(OUT_DIR)
        }
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=_safe_detail(e))

@app.get("/chats/recent", response_model=List[Chat])
def get_recent_chats(search: Optional[str] = None, limit: int = 50):
    try:
        chats = db.get_recent_chats(limit=limit, search_filter=search)
        return chats
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=_safe_detail(e))

@app.get("/chats/{guid}/messages", response_model=List[Message])
def get_chat_messages(guid: str, limit: int = 50):
    try:
        # We need a new DB function for this to return raw structured data
        # For now, we simulate or reuse existing logic
        conn = db.get_db_connection()
        cur = conn.cursor()
        sql = """
        SELECT m.ROWID as row_id, m.text, m.attributedBody, m.is_from_me, m.date, h.id as handle_id
        FROM message m
        JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
        JOIN chat c ON cmj.chat_id = c.ROWID
        LEFT JOIN handle h ON m.handle_id = h.ROWID
        WHERE c.guid = ?
        ORDER BY m.date DESC LIMIT ?
        """
        rows = [dict(r) for r in cur.execute(sql, (guid, limit))]
        conn.close()
        
        h_map = db.get_handle_map()
        results = []
        for r in reversed(rows):
            # Decode body
            text_decoded = decode_body(r['text'], r['attributedBody'])
            
            sender_name = "Me" if r['is_from_me'] else db.resolve_name(r['handle_id'], h_map)
            
            handle_id = str(r["handle_id"]) if r["handle_id"] is not None else None

            results.append({
                "row_id": r['row_id'],
                "text": text_decoded or "",
                "is_from_me": bool(r['is_from_me']),
                "date": mac_timestamp_to_iso(r['date']),
                "handle_id": handle_id,
                "sender_name": sender_name
            })
            
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=_safe_detail(e))

@app.post("/onboarding/check-access", response_model=OnboardingCheckResponse)
def check_access():
    success, msg = engine.check_db_access()
    return {"success": success, "message": msg}

@app.get("/onboarding/status")
def get_onboarding_status():
    metadata = db.load_metadata()
    return {
        "complete": metadata.get("ui_defaults", {}).get("onboarding_complete", False),
        "step": metadata.get("ui_defaults", {}).get("onboarding_step", 1)
    }

@app.post("/onboarding/complete")
def complete_onboarding():
    metadata = db.load_metadata()
    metadata.setdefault("ui_defaults", {})["onboarding_complete"] = True
    db.save_metadata(metadata)
    return {"status": "ok"}

@app.post("/chats/{guid}/archive")
def archive_chat_endpoint(guid: str, req: ArchiveRequest):
    try:
        # This implementation blocks the request. Ideally, this should be a background task.
        # For now, we keep it simple as per original design, but maybe we can return a job ID later.
        if req.chat_guid and req.chat_guid != guid:
            raise HTTPException(status_code=400, detail="chat_guid mismatch")
        path, count = engine.archive_chat(guid, req.format, req.incremental)
        safe_path = None
        if path:
            try:
                rel = os.path.relpath(path, OUT_DIR)
                safe_path = rel if not rel.startswith("..") else os.path.basename(path)
            except Exception:
                safe_path = os.path.basename(path)
        return {"status": "ok", "path": safe_path, "count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=_safe_detail(e))


@app.post("/chats/{guid}/archive/jobs", response_model=ArchiveJob)
def enqueue_archive_job(guid: str, req: ArchiveRequest):
    if req.chat_guid and req.chat_guid != guid:
        raise HTTPException(status_code=400, detail="chat_guid mismatch")

    job = ArchiveJob(
        id=uuid4().hex,
        chat_guid=guid,
        status="queued",
        progress=0,
        processed=0,
        total=0,
        error=None,
        result=None,
    )
    with _jobs_lock:
        _archive_jobs[job.id] = job

    thread = threading.Thread(target=_run_archive_job, args=(job.id, guid, req), daemon=True)
    thread.start()
    return job


@app.get("/archive/jobs/{job_id}", response_model=ArchiveJob)
def get_archive_job(job_id: str):
    with _jobs_lock:
        job = _archive_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@app.post("/archive/jobs/{job_id}/cancel", response_model=ArchiveJob)
def cancel_archive_job(job_id: str):
    with _jobs_lock:
        job = _archive_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status in {"completed", "failed", "canceled"}:
        return job

    _set_job(job_id, status="canceled", error=None)
    with _jobs_lock:
        updated = _archive_jobs[job_id]
    return updated

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
