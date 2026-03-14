from .helpers import mac_timestamp_to_iso
from .db import get_db_connection


def get_chat_activity_trend(chat_guid, limit_days=30):
    try:
        conn = get_db_connection()
    except Exception: return []
    
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
