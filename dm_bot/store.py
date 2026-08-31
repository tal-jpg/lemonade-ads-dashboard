"""SQLite persistence: event de-duplication + a delivery log.

Two jobs:

1. **Dedup.** Meta retries a webhook until it gets a 200, and re-delivers the
   same comment on edits. Every event carries a stable id (comment id or
   message mid); we record it and refuse to act on it twice. Without this,
   one comment can turn into five DMs.
2. **Audit.** Every send attempt is logged with its outcome so the admin page
   can show what actually went out, and so `once_per_user` rules can be
   enforced across restarts.

The DB is a single file under dm_bot/data/ and is gitignored.
"""
from __future__ import annotations

import os
import sqlite3
import time
from pathlib import Path
from typing import Any

DB_PATH = Path(os.environ.get("DM_BOT_DB", Path(__file__).parent / "data" / "dm_bot.db"))

SCHEMA = """
CREATE TABLE IF NOT EXISTS processed_events (
    event_key   TEXT PRIMARY KEY,
    created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS deliveries (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id  TEXT NOT NULL,
    rule_id     TEXT NOT NULL,
    platform    TEXT NOT NULL,
    trigger     TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    username    TEXT,
    keyword     TEXT,
    text        TEXT,
    status      TEXT NOT NULL,
    error       TEXT,
    created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_deliveries_created ON deliveries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deliveries_user ON deliveries (rule_id, user_id, status);
"""


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    # WAL keeps the admin page readable while a webhook thread is writing.
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db() -> None:
    with _connect() as conn:
        conn.executescript(SCHEMA)


def claim_event(event_key: str) -> bool:
    """Atomically claim an event id. True = first time, act on it.

    The INSERT itself is the lock, so two concurrent webhook threads carrying
    the same retry cannot both win.
    """
    try:
        with _connect() as conn:
            conn.execute(
                "INSERT INTO processed_events (event_key, created_at) VALUES (?, ?)",
                (event_key, int(time.time())),
            )
        return True
    except sqlite3.IntegrityError:
        return False


def release_event(event_key: str) -> None:
    """Un-claim an event so Meta's retry can be processed.

    Called when a send fails for a transient reason — otherwise the dedup
    record would permanently swallow a DM that was never delivered.
    """
    with _connect() as conn:
        conn.execute("DELETE FROM processed_events WHERE event_key = ?", (event_key,))


def already_delivered(rule_id: str, user_id: str) -> bool:
    """Has this user already successfully received this rule's DM?"""
    with _connect() as conn:
        row = conn.execute(
            "SELECT 1 FROM deliveries WHERE rule_id = ? AND user_id = ? "
            "AND status = 'sent' LIMIT 1",
            (rule_id, user_id),
        ).fetchone()
    return row is not None


def log_delivery(
    *,
    account_id: str,
    rule_id: str,
    platform: str,
    trigger: str,
    user_id: str,
    username: str | None,
    keyword: str | None,
    text: str | None,
    status: str,
    error: str | None = None,
) -> None:
    with _connect() as conn:
        conn.execute(
            "INSERT INTO deliveries (account_id, rule_id, platform, trigger, user_id, "
            "username, keyword, text, status, error, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                account_id,
                rule_id,
                platform,
                trigger,
                user_id,
                username,
                keyword,
                (text or "")[:500],
                status,
                (error or "")[:1000] or None,
                int(time.time()),
            ),
        )


def recent_deliveries(limit: int = 50) -> list[dict[str, Any]]:
    with _connect() as conn:
        rows = conn.execute(
            # id breaks ties — several deliveries can land in the same second,
            # and created_at alone would show them oldest-first.
            "SELECT * FROM deliveries ORDER BY created_at DESC, id DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [dict(row) for row in rows]


def stats() -> dict[str, int]:
    with _connect() as conn:
        row = conn.execute(
            "SELECT "
            "  COUNT(*) AS total, "
            "  SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) AS sent, "
            "  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed, "
            "  COUNT(DISTINCT user_id) AS people "
            "FROM deliveries"
        ).fetchone()
    return {
        "total": row["total"] or 0,
        "sent": row["sent"] or 0,
        "failed": row["failed"] or 0,
        "people": row["people"] or 0,
    }
