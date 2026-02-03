import uvicorn
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import sys
import os

# Add project root to sys.path so 'backend' package is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.src import engine, db
from backend.src.config import OUT_DIR

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
    handle_id: Optional[int] = None
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

# --- API Endpoints ---

@app.get("/system/status")
def get_status():
    return {"status": "ok", "version": "1.0.0", "storage": OUT_DIR}

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
            "storage_path": OUT_DIR
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/chats/recent", response_model=List[Chat])
def get_recent_chats(search: Optional[str] = None, limit: int = 50):
    try:
        chats = db.get_recent_chats(limit=limit, search_filter=search)
        return chats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
            from backend.helpers import decode_body, mac_timestamp_to_iso
            text_decoded = decode_body(r['text'], r['attributedBody'])
            
            sender_name = "Me" if r['is_from_me'] else db.resolve_name(r['handle_id'], h_map)
            
            results.append({
                "row_id": r['row_id'],
                "text": text_decoded or "",
                "is_from_me": bool(r['is_from_me']),
                "date": mac_timestamp_to_iso(r['date']),
                "handle_id": r['handle_id'],
                "sender_name": sender_name
            })
            
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
        path, count = engine.archive_chat(guid, req.format, req.incremental)
        return {"status": "ok", "path": path, "count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
