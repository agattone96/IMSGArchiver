import json
import sqlite3
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from .diff_engine import compute_fingerprint, detect_edit

SCHEMA_SQL = """
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS message_mirror (
  guid TEXT PRIMARY KEY,
  latest_revision_id INTEGER,
  latest_fingerprint TEXT NOT NULL,
  last_synced_timestamp INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(latest_revision_id) REFERENCES message_revisions(id)
) STRICT;

CREATE TABLE IF NOT EXISTS message_revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guid TEXT NOT NULL,
  source_message_row_id INTEGER,
  revision_timestamp INTEGER NOT NULL,
  text TEXT,
  attributed_body BLOB,
  metadata_json TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(guid, fingerprint)
) STRICT;

CREATE TABLE IF NOT EXISTS attachment_mirror (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guid TEXT NOT NULL,
  message_guid TEXT NOT NULL,
  transfer_name TEXT,
  mime_type TEXT,
  file_size INTEGER,
  checksum TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(guid, message_guid)
) STRICT;

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_key TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  guid TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
) STRICT;

CREATE VIRTUAL TABLE IF NOT EXISTS message_revisions_fts USING fts5(
  text,
  content='message_revisions',
  content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS message_revisions_ai AFTER INSERT ON message_revisions BEGIN
  INSERT INTO message_revisions_fts(rowid, text) VALUES (new.id, new.text);
END;

CREATE TRIGGER IF NOT EXISTS message_revisions_ad AFTER DELETE ON message_revisions BEGIN
  INSERT INTO message_revisions_fts(message_revisions_fts, rowid, text) VALUES('delete', old.id, old.text);
END;

CREATE INDEX IF NOT EXISTS idx_message_revisions_guid_ts ON message_revisions(guid, revision_timestamp);
CREATE INDEX IF NOT EXISTS idx_message_revisions_fingerprint ON message_revisions(fingerprint);
CREATE INDEX IF NOT EXISTS idx_attachment_mirror_message_guid ON attachment_mirror(message_guid);
CREATE INDEX IF NOT EXISTS idx_audit_log_guid_created_at ON audit_log(guid, created_at);
"""


class MirrorRepository:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self._init_schema()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_schema(self) -> None:
        conn = self._get_connection()
        try:
            conn.executescript(SCHEMA_SQL)
            conn.commit()
        finally:
            conn.close()

    @staticmethod
    def _now() -> str:
        return datetime.now(timezone.utc).isoformat()

    def upsert_message_revision(
        self,
        guid: str,
        revision_timestamp: int,
        text: Optional[str],
        attributed_body: Any,
        metadata: Optional[Dict[str, Any]],
        source_message_row_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Atomically insert revision + mirror state + audit log, with idempotency protections."""
        metadata_json = json.dumps(metadata or {}, sort_keys=True, separators=(",", ":"))
        fingerprint = compute_fingerprint(text, attributed_body, metadata or {})
        event_key = f"rev:{guid}:{fingerprint}"
        now = self._now()

        conn = self._get_connection()
        try:
            conn.execute("BEGIN IMMEDIATE")
            previous = conn.execute(
                "SELECT latest_fingerprint FROM message_mirror WHERE guid = ?", (guid,)
            ).fetchone()
            previous_fingerprint = previous[0] if previous else None

            revision_insert = conn.execute(
                """
                INSERT INTO message_revisions (
                  guid, source_message_row_id, revision_timestamp, text, attributed_body,
                  metadata_json, fingerprint, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(guid, fingerprint) DO NOTHING
                """,
                (
                    guid,
                    source_message_row_id,
                    revision_timestamp,
                    text,
                    attributed_body,
                    metadata_json,
                    fingerprint,
                    now,
                ),
            )

            revision = conn.execute(
                "SELECT id, fingerprint FROM message_revisions WHERE guid = ? AND fingerprint = ?",
                (guid, fingerprint),
            ).fetchone()
            revision_id = revision["id"]

            conn.execute(
                """
                INSERT INTO message_mirror (guid, latest_revision_id, latest_fingerprint, last_synced_timestamp, updated_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(guid) DO UPDATE SET
                    latest_revision_id = excluded.latest_revision_id,
                    latest_fingerprint = excluded.latest_fingerprint,
                    last_synced_timestamp = excluded.last_synced_timestamp,
                    updated_at = excluded.updated_at
                """,
                (guid, revision_id, fingerprint, revision_timestamp, now),
            )

            audit_insert = conn.execute(
                """
                INSERT INTO audit_log (event_key, event_type, guid, payload_json, created_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(event_key) DO NOTHING
                """,
                (
                    event_key,
                    "message_revision_upserted",
                    guid,
                    json.dumps(
                        {
                            "revision_id": revision_id,
                            "fingerprint": fingerprint,
                            "edited": detect_edit(previous_fingerprint, fingerprint),
                        },
                        sort_keys=True,
                    ),
                    now,
                ),
            )

            conn.commit()
            return {
                "guid": guid,
                "revision_id": revision_id,
                "fingerprint": fingerprint,
                "edited": detect_edit(previous_fingerprint, fingerprint),
                "idempotent": revision_insert.rowcount == 0 and audit_insert.rowcount == 0,
            }
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def get_message_timeline(self, guid: str) -> List[Dict[str, Any]]:
        conn = self._get_connection()
        try:
            rows = conn.execute(
                """
                SELECT id, guid, source_message_row_id, revision_timestamp, text, metadata_json,
                       fingerprint, created_at
                FROM message_revisions
                WHERE guid = ?
                ORDER BY revision_timestamp ASC, id ASC
                """,
                (guid,),
            ).fetchall()
            return [dict(row) for row in rows]
        finally:
            conn.close()
