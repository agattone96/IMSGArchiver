import os
import shutil
import concurrent.futures
import subprocess
import datetime
import csv
import json
from .config import OUT_DIR, OCR_BIN, TRANSCRIBE_BIN, REACTION_MAP, OCR_HASH, TRANSCRIBE_HASH
from .helpers import get_file_hash, mac_timestamp_to_iso, decode_body
from .db import load_metadata, save_metadata, get_handle_map, resolve_name, get_db_connection
import cProfile
import pstats
import io
import hashlib

def verify_binary(path, expected_hash):
    if not path or not os.path.exists(path): return False
    try:
        with open(path, "rb") as f:
            h = hashlib.sha256(f.read()).hexdigest()
        return h == expected_hash
    except: return False

def check_db_access(db_path=None):
    if not db_path:
        # Default Mac path
        db_path = os.path.expanduser("~/Library/Messages/chat.db")
    
    if not os.path.exists(db_path):
        return False, f"Database not found at {db_path}"
        
    try:
        # Try to read 16 bytes to ensure we have read permission
        with open(db_path, "rb") as f:
            f.read(16)
        return True, "Access granted"
    except PermissionError:
        return False, "Permission denied. Please grant Full Disk Access."
    except Exception as e:
        return False, f"Error accessing database: {str(e)}"

def process_attachment_task(row_id, raw_path, mime, ts_iso, contact_dir, metadata):
    metadata = metadata or {}
    metadata.setdefault("cache", {})
    if not os.path.exists(raw_path): 
        return row_id, "", f" [Missing Attachment: {os.path.basename(raw_path)}]"
    
    file_hash = get_file_hash(raw_path)
    cached_data = metadata["cache"].get(file_hash) if file_hash else None
    extra_text = ""
    
    subfolder = "Files"
    if mime:
        if "image" in mime.lower(): subfolder = "Photos"
        elif "video" in mime.lower(): subfolder = "Videos"
        elif "audio" in mime.lower(): subfolder = "Audio"
    
    media_dir = os.path.join(contact_dir, "Media", subfolder)
    ocr_dir = os.path.join(contact_dir, "Media", "OCR")
    trans_dir = os.path.join(contact_dir, "Media", "Transcriptions")
    
    os.makedirs(media_dir, exist_ok=True)

    safe_orig = "".join(c for c in os.path.basename(raw_path) if c.isalnum() or c in "._-")
    file_ts = ts_iso.replace(':','').replace('-','').replace(' ','_')
    new_name = f"{file_ts}_{safe_orig}"
    dest = os.path.join(media_dir, new_name)
    
    if cached_data: 
        extra_text = cached_data
    else:
        # OCR
        verified_ocr = verify_binary(OCR_BIN, OCR_HASH)
        if subfolder == "Photos" and verified_ocr:
            try: 
                res = subprocess.check_output([OCR_BIN, raw_path], text=True, stderr=subprocess.DEVNULL).strip()
                if res: 
                    extra_text = f"\n[OCR: {res}]"
                    os.makedirs(ocr_dir, exist_ok=True)
                    with open(os.path.join(ocr_dir, f"{new_name}.txt"), "w") as f: f.write(res)
            except: pass
        # Transcribe
        verified_trans = verify_binary(TRANSCRIBE_BIN, TRANSCRIBE_HASH)
        if subfolder == "Audio" and verified_trans:
            try: 
                res = subprocess.check_output([TRANSCRIBE_BIN, raw_path], text=True, stderr=subprocess.DEVNULL).strip()
                if res: 
                    extra_text = f"\n[Transcription: {res}]"
                    os.makedirs(trans_dir, exist_ok=True)
                    with open(os.path.join(trans_dir, f"{new_name}.txt"), "w") as f: f.write(res)
            except: pass
        
        if file_hash and extra_text: metadata["cache"][file_hash] = extra_text
    
    try:
        shutil.copy2(raw_path, dest)
        rel_path = os.path.join("Media", subfolder, new_name)
        return row_id, rel_path, extra_text
    except: return row_id, "", extra_text

def archive_chat(chat_guid, format_ext, is_incremental, metadata=None, h_map=None, progress_callback=None):
    if metadata is None: metadata = load_metadata()
    metadata.setdefault("cache", {})
    metadata.setdefault("chats", {})
    metadata.setdefault("ui_defaults", {})
    if h_map is None: h_map = get_handle_map()

    start_ts = 0
    if is_incremental:
        last_meta = metadata.get("chats", {}).get(chat_guid)
        if last_meta: start_ts = last_meta.get("ts", 0) + 1000

    conn = get_db_connection()
    cur = conn.cursor()
    
    c_sql = """
    SELECT c.display_name,
    (SELECT GROUP_CONCAT(h2.id) FROM handle h2 JOIN chat_handle_join chj ON h2.ROWID = chj.handle_id WHERE chj.chat_id = c.ROWID) as participant_handles
    FROM chat c WHERE c.guid = ?
    """
    c_row = cur.execute(c_sql, (chat_guid,)).fetchone()
    folder_name = "Unknown_Chat"
    if c_row:
        handles = (c_row[1] or "").split(",")
        names = [resolve_name(h, h_map) for h in handles if h]
        p_names = ", ".join(names)
        folder_name = c_row[0] or p_names or "Unknown_Chat"
    
    safe_folder_name = "".join(c for c in folder_name if c.isalnum() or c in " ._-")
    safe_folder_name = safe_folder_name.strip()[:100]
    
    contact_out_dir = os.path.join(OUT_DIR, safe_folder_name)
    os.makedirs(contact_out_dir, exist_ok=True)

    sql = """
    SELECT m.ROWID as row_id, m.date as message_date, m.date_read, m.date_delivered, m.is_from_me,
           m.text, m.attributedBody, m.service, m.associated_message_type, m.guid,
           h.id as handle_id, a.filename as att_path, a.mime_type as att_mime, m.is_audio_message
    FROM message m
    JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
    JOIN chat c ON cmj.chat_id = c.ROWID
    LEFT JOIN handle h ON m.handle_id = h.ROWID
    LEFT JOIN message_attachment_join maj ON m.ROWID = maj.message_id
    LEFT JOIN attachment a ON maj.attachment_id = a.ROWID
    WHERE c.guid = ? AND m.date >= ? ORDER BY m.date ASC
    """
    rows_raw = [dict(r) for r in cur.execute(sql, (chat_guid, start_ts))]
    conn.close()
    
    if not rows_raw: return None, 0

    messages = {}
    for r in rows_raw:
        rid = r["row_id"]
        if rid not in messages:
            messages[rid] = r
            messages[rid]["attachments"] = []
        if r["att_path"]: 
            messages[rid]["attachments"].append({
                "path": r["att_path"].replace("~", os.path.expanduser("~")), 
                "mime": r["att_mime"]
            })
    
    msg_list = sorted(messages.values(), key=lambda x: x["message_date"])
    
    results_map = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        futures = []
        for m in msg_list:
            iso = mac_timestamp_to_iso(m["message_date"])
            for att in m["attachments"]:
                futures.append(executor.submit(process_attachment_task, m["row_id"], att["path"], att["mime"], iso, contact_out_dir, metadata))
        
        for f in concurrent.futures.as_completed(futures):
            rid, path, xtra = f.result()
            if rid not in results_map: results_map[rid] = []
            results_map[rid].append((path, xtra))

    final_data = []
    total = len(msg_list)
    for i, m in enumerate(msg_list):
        if progress_callback: progress_callback(i, total)

        att_res = results_map.get(m["row_id"], [])
        rel_paths = [r[0] for r in att_res if r[0]]
        extras = "".join([r[1] for r in att_res if r[1]])
        
        is_me = m["is_from_me"]
        sender = "Me" if is_me else resolve_name(m["handle_id"], h_map)
        text_content = (decode_body(m["text"], m["attributedBody"]) + extras).strip()
        
        reaction = REACTION_MAP.get(m["associated_message_type"] or 0, "")
        
        entry = {
            "timestamp": mac_timestamp_to_iso(m["message_date"]),
            "sender": sender,
            "sender_handle": m["handle_id"] or "",
            "text": text_content,
            "attachments": " | ".join(rel_paths),
            "guid": m["guid"],
            "service": m["service"],
            "is_from_me": bool(is_me),
            "reaction_type": reaction,
        }
        final_data.append(entry)

    use_ts_name = os.environ.get("TIMESTAMP_FILENAME") == "1"
    ts_suffix = f"_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}" if use_ts_name else ""
    out_file = os.path.join(contact_out_dir, f"chat_export{ts_suffix}." + format_ext)

    if format_ext == "csv":
        with open(out_file, "w", newline="", encoding="utf-8") as f:
            fields = ["timestamp", "sender", "text", "attachments", "guid", "service", "reaction_type", "sender_handle", "is_from_me"]
            w = csv.DictWriter(f, fieldnames=fields, extrasaction='ignore')
            w.writeheader()
            w.writerows(final_data)
    elif format_ext == "json":
        with open(out_file, "w", encoding="utf-8") as f: json.dump(final_data, f, indent=2)
    elif format_ext == "md":
        with open(out_file, "w", encoding="utf-8") as f:
            f.write(f"# Chat: {folder_name}\n\n")
            for d in final_data: 
                f.write(f"**[{d['timestamp']}] {d['sender']}:** {d['text']}\n\n")

    last_msg = msg_list[-1]
    metadata["chats"][chat_guid] = {"ts": last_msg["message_date"], "iso": mac_timestamp_to_iso(last_msg["message_date"])}
    save_metadata(metadata)
    
    return out_file, len(final_data)

def archive_chat_profiled(*args, **kwargs):
    """Wrapper to run archive_chat with a profiler."""
    pr = cProfile.Profile()
    pr.enable()
    result = archive_chat(*args, **kwargs)
    pr.disable()
    
    s = io.StringIO()
    sortby = 'cumulative'
    ps = pstats.Stats(pr, stream=s).sort_stats(sortby)
    ps.print_stats(20) # Top 20 functions
    
    profile_log = os.path.join(OUT_DIR, "backend_profile.txt")
    with open(profile_log, "w", encoding="utf-8") as f:
        f.write(s.getvalue())
    
    print(f"Profile saved to {profile_log}")
    return result

def get_global_stats():
    """Calculates global statistics from the database."""
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Total messages
    cur.execute("SELECT COUNT(*) FROM message")
    total_messages = cur.fetchone()[0]
    
    # Total chats
    cur.execute("SELECT COUNT(*) FROM chat")
    total_chats = cur.fetchone()[0]
    
    # Top contact
    sql_top = """
    SELECT h.id, COUNT(*) as cnt 
    FROM message m 
    JOIN handle h ON m.handle_id = h.ROWID 
    WHERE m.is_from_me = 0 
    GROUP BY h.id 
    ORDER BY cnt DESC 
    LIMIT 1
    """
    row = cur.execute(sql_top).fetchone()
    top_contact = row[0] if row else "N/A"
    top_count = row[1] if row else 0
    
    conn.close()
    
    return {
        "total_messages": total_messages,
        "total_chats": total_chats,
        "top_contact_handle": top_contact,
        "top_contact_count": top_count
    }
