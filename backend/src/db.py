import sqlite3
import os
import json
import shutil
from .config import DEFAULT_DB_PATH, TMP_DB, METADATA_FILE, TMP_CONTACTS_DIR
from .helpers import mac_timestamp_to_iso, normalize_handle

def _normalize_metadata(data):
    if not isinstance(data, dict):
        data = {}
    data.setdefault("handles", {})
    data.setdefault("chats", {})
    data.setdefault("cache", {})
    data.setdefault("ui_defaults", {})
    return data

def load_metadata():
    if os.path.exists(METADATA_FILE):
        try:
            with open(METADATA_FILE, "r", encoding="utf-8") as f:
                return _normalize_metadata(json.load(f))
        except (IOError, json.JSONDecodeError):
            pass
    return _normalize_metadata({})

def save_metadata(data):
    try:
        data = _normalize_metadata(data)
        tmp = METADATA_FILE + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f: json.dump(data, f, indent=2)
        os.replace(tmp, METADATA_FILE)
    except IOError: pass

def get_handle_map():
    h_map = {}
    if TMP_CONTACTS_DIR and os.path.exists(TMP_CONTACTS_DIR):
        for db_file in os.listdir(TMP_CONTACTS_DIR):
            if not db_file.endswith(".abcddb"): continue
            db_path = os.path.join(TMP_CONTACTS_DIR, db_file)
            try:
                conn = sqlite3.connect(db_path)
                cur = conn.cursor()
                for r in cur.execute("SELECT r.ZFIRSTNAME, r.ZLASTNAME, r.ZORGANIZATION, p.ZFULLNUMBER FROM ZABCDPHONENUMBER p JOIN ZABCDRECORD r ON p.ZOWNER = r.Z_PK"):
                    name = " ".join(filter(None, [r[0], r[1]])) or r[2]
                    if name and r[3]: h_map[normalize_handle(r[3])] = name
                for r in cur.execute("SELECT r.ZFIRSTNAME, r.ZLASTNAME, r.ZORGANIZATION, e.ZADDRESS FROM ZABCDEMAILADDRESS e JOIN ZABCDRECORD r ON e.ZOWNER = r.Z_PK"):
                    c_name = " ".join(filter(None, [r[0], r[1]])) or r[2]
                    if c_name and r[3]: h_map[normalize_handle(r[3])] = c_name
                conn.close()
            except sqlite3.Error: continue
    return h_map

def resolve_name(handle, h_map=None):
    if not handle: return "Unknown"
    if h_map is None: h_map = get_handle_map()
    return h_map.get(normalize_handle(handle), handle)

def get_db_connection():
    target_db = TMP_DB
    if not target_db:
        temp_dir = os.environ.get("TMPDIR", "/tmp")
        target_db = os.path.join(temp_dir, "imessage_archiver_fallback.db")
        
        if not os.path.exists(target_db):
            if not os.path.exists(DEFAULT_DB_PATH):
                 raise RuntimeError(f"Original DB not found at {DEFAULT_DB_PATH}")
            try:
                shutil.copy2(DEFAULT_DB_PATH, target_db)
            except Exception as e:
                raise RuntimeError(f"Failed to create temp database copy at {target_db}: {e}")
    
    if not os.path.exists(target_db):
        raise RuntimeError(f"Database not found at {target_db}")
         
    conn = sqlite3.connect(target_db)
    conn.row_factory = sqlite3.Row
    return conn

def get_recent_chats(limit=100, groups_only=False, one_on_one_only=False, search_filter=None, h_map=None):
    conn = get_db_connection()
    cur = conn.cursor()
    
    filter_sql = ""
    params = []
    if groups_only: filter_sql += " AND c.style = 43"
    if one_on_one_only: filter_sql += " AND c.style = 45"
    if search_filter:
        filter_sql += " AND (h_filter.id LIKE ? OR c.display_name LIKE ?)"
        params.extend([f"%{search_filter}%", f"%{search_filter}%"])
    
    sql = f"""
    SELECT 
        c.guid as chat_guid,
        MAX(m.date) as last_date,
        COUNT(DISTINCT m.ROWID) as msg_count,
        MAX(CASE WHEN a.mime_type LIKE 'image/%' THEN 1 ELSE 0 END) as has_img,
        MAX(CASE WHEN a.mime_type LIKE 'video/%' THEN 1 ELSE 0 END) as has_vid,
        MAX(CASE WHEN a.mime_type LIKE 'audio/%' OR m.is_audio_message = 1 THEN 1 ELSE 0 END) as has_aud,
        c.display_name,
        (SELECT GROUP_CONCAT(h2.id) FROM handle h2 JOIN chat_handle_join chj ON h2.ROWID = chj.handle_id WHERE chj.chat_id = c.ROWID) as participant_handles
    FROM chat c
    JOIN chat_message_join cmj ON c.ROWID = cmj.chat_id
    JOIN message m ON cmj.message_id = m.ROWID
    LEFT JOIN chat_handle_join chj_filter ON c.ROWID = chj_filter.chat_id
    LEFT JOIN handle h_filter ON chj_filter.handle_id = h_filter.ROWID
    LEFT JOIN message_attachment_join maj ON m.ROWID = maj.message_id
    LEFT JOIN attachment a ON maj.attachment_id = a.ROWID
    WHERE 1=1 {{filter_sql}}
    GROUP BY c.guid
    ORDER BY last_date DESC
    LIMIT ?
    """
    params.append(limit)
    rows = [dict(r) for r in cur.execute(sql.format(filter_sql=filter_sql), params)]
    conn.close()

    if h_map is None: h_map = get_handle_map()

    results = []
    for r in rows:
        handles = (r["participant_handles"] or "").split(",")
        names = [resolve_name(h, h_map) for h in handles if h]
        p_names = ", ".join(names)
        display_names = r["display_name"] or p_names or "Unknown Chat"
        if r["display_name"] and p_names and r["display_name"] != p_names:
            display_names = f"[{r['display_name']}] {p_names}"
        
        badges = ""
        if r["has_img"]: badges += "📸"
        if r["has_vid"]: badges += "🎥"
        if r["has_aud"]: badges += "🎙️"
        
        results.append({
            "chat_guid": r["chat_guid"],
            "last_date": r["last_date"],
            "msg_count": r["msg_count"],
            "badges": badges,
            "display_names": display_names
        })
    return results

def get_message_preview(chat_guid, count=5, h_map=None):
    from .helpers import decode_body
    if h_map is None: h_map = get_handle_map()
    conn = get_db_connection()
    cur = conn.cursor()
    sql = """
    SELECT m.text, m.attributedBody, m.is_from_me, m.date, h.id as handle_id
    FROM message m
    JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
    JOIN chat c ON cmj.chat_id = c.ROWID
    LEFT JOIN handle h ON m.handle_id = h.ROWID
    WHERE c.guid = ?
    ORDER BY m.date DESC
    LIMIT ?;
    """
    rows = [dict(r) for r in cur.execute(sql, (chat_guid, count))]
    conn.close()
    
    preview_lines = []
    for r in reversed(rows):
        ts = mac_timestamp_to_iso(r["date"])
        sender = "Me" if r["is_from_me"] else resolve_name(r["handle_id"], h_map)
        body = decode_body(r["text"], r["attributedBody"]) or "[Media]"
        if len(body) > 60: body = body[:57] + "..."
        preview_lines.append(f"[{ts}] {sender}: {body}")
    return "\n".join(preview_lines)
