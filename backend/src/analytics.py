from .helpers import mac_timestamp_to_iso
from .db import get_db_connection

def get_global_stats():
    """Return high-level stats for the dashboard info cards."""
    try:
        conn = get_db_connection()
    except Exception:
        return {"total_messages": 0, "total_chats": 0, "last_active": "N/A", "top_contact_handle": "N/A"}
    
    cur = conn.cursor()
    stats = {}
    try:
        cur.execute("SELECT COUNT(*) FROM message")
        stats["total_messages"] = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM chat")
        stats["total_chats"] = cur.fetchone()[0]
        cur.execute("SELECT MAX(date) FROM message")
        last_ts = cur.fetchone()[0]
        stats["last_active"] = mac_timestamp_to_iso(last_ts)
        sql_top = "SELECT count(*) as cnt, h.id FROM message m JOIN handle h ON m.handle_id = h.ROWID GROUP BY h.id ORDER BY cnt DESC LIMIT 1"
        cur.execute(sql_top)
        row = cur.fetchone()
        stats["top_contact_handle"] = row[1] if row else "N/A"
        stats["top_contact_count"] = row[0] if row else 0
    except:
        stats = {"total_messages": 0, "total_chats": 0, "last_active": "N/A", "top_contact_handle": "N/A"}
    finally:
        conn.close()
    return stats

def get_chat_activity_trend(chat_guid, limit_days=30):
    try:
        conn = get_db_connection()
    except: return []
    
    cur = conn.cursor()
    sql = """
    SELECT m.date 
    FROM message m
    JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
    JOIN chat c ON cmj.chat_id = c.ROWID
    WHERE c.guid = ?
    ORDER BY m.date DESC
    LIMIT 10000
    """
    dates = [r[0] for r in cur.execute(sql, (chat_guid,))]
    conn.close()
    
    from collections import Counter
    daily_counts = Counter()
    for ts in dates:
        iso = mac_timestamp_to_iso(ts)
        if iso:
            day = iso.split(" ")[0]
            daily_counts[day] += 1
            
    return sorted(daily_counts.items(), key=lambda x: x[0])[-limit_days:]
