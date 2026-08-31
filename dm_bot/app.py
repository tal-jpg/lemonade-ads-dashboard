"""Lemonade DM Bot — a ManyChat-style comment/DM autoresponder.

Someone comments a keyword on your Instagram or Facebook post (or DMs it to
you), and the bot replies in DM with your document.

    cd dm_bot
    pip install -r requirements.txt
    cp .env.example .env          # fill in app secret + page tokens
    cp rules.example.json rules.json
    python app.py                 # http://localhost:5001

Point the Meta app's webhook at https://<your-domain>/webhook. See README.md
for the full Meta app setup (permissions, subscriptions, review).

Webhook handling is deliberately split in two: the request handler verifies
the signature and returns 200 immediately, and the work happens on a worker
thread. Meta retries any webhook it doesn't get a fast 200 for, so doing the
Graph API round-trips inline is how you end up sending the same DM twice.
"""
from __future__ import annotations

import hashlib
import hmac
import logging
import os
import secrets
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from flask import Flask, Response, redirect, request, session
from markupsafe import escape

from rules import Account, Rule, RuleSet, RulesError, load_rules, render
from senders import SendError, reply_to_comment, send_document, send_message, send_private_reply
from store import (
    already_delivered,
    claim_event,
    init_db,
    log_delivery,
    recent_deliveries,
    release_event,
    stats,
)

ENV_PATH = Path(__file__).parent / ".env"
load_dotenv(ENV_PATH)

logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
log = logging.getLogger("dm_bot")

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or secrets.token_hex(32)

VERIFY_TOKEN = os.environ.get("WEBHOOK_VERIFY_TOKEN", "")
APP_SECRET = os.environ.get("META_APP_SECRET", "")
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "")
DRY_RUN = os.environ.get("DM_BOT_DRY_RUN", "").lower() in ("1", "true", "yes")
SKIP_SIGNATURE = os.environ.get("DM_BOT_SKIP_SIGNATURE", "").lower() in ("1", "true", "yes")

workers = ThreadPoolExecutor(max_workers=4, thread_name_prefix="dm-bot")

init_db()
RULESET: RuleSet = load_rules()
log.info(
    "loaded %d rule(s) across %d account(s)%s",
    len(RULESET.rules),
    len(RULESET.accounts),
    " [DRY RUN — nothing will be sent]" if DRY_RUN else "",
)


@dataclass
class Event:
    """A normalised inbound trigger — one shape for IG comments, FB comments,
    and DMs on either platform, so the delivery path has no per-platform forks."""

    account: Account
    trigger: str  # "comment" | "dm"
    text: str
    user_id: str
    username: str | None
    name: str | None
    event_key: str  # comment id / message mid — the dedup key
    comment_id: str | None = None
    media_id: str | None = None


# ---------------------------------------------------------------- webhook ---


@app.get("/webhook")
def verify_webhook() -> Response:
    """Meta's subscription handshake — echo hub.challenge if the token matches."""
    if request.args.get("hub.mode") == "subscribe" and request.args.get(
        "hub.verify_token"
    ) == VERIFY_TOKEN:
        return Response(request.args.get("hub.challenge", ""), mimetype="text/plain")
    log.warning("webhook verification failed from %s", request.remote_addr)
    return Response("verification failed", status=403)


@app.post("/webhook")
def receive_webhook() -> Response:
    raw = request.get_data()
    if not _valid_signature(raw, request.headers.get("X-Hub-Signature-256", "")):
        log.warning("rejected webhook with bad signature")
        return Response("bad signature", status=403)

    payload = request.get_json(silent=True) or {}
    # Always 200, always fast. Errors are handled (and logged) on the worker;
    # a 500 here would make Meta redeliver an event we may have acted on.
    workers.submit(_safe_process, payload)
    return Response("EVENT_RECEIVED", status=200)


def _valid_signature(raw: bytes, header: str) -> bool:
    if SKIP_SIGNATURE:
        return True
    if not APP_SECRET or not header.startswith("sha256="):
        return False
    expected = hmac.new(APP_SECRET.encode(), raw, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, header.split("=", 1)[1])


def _safe_process(payload: dict[str, Any]) -> None:
    try:
        process_payload(payload)
    except Exception:  # noqa: BLE001 — worker thread; never let it die silently
        log.exception("failed to process webhook payload")


def process_payload(payload: dict[str, Any]) -> None:
    obj = payload.get("object")
    platform = {"instagram": "instagram", "page": "facebook"}.get(obj)
    if not platform:
        log.debug("ignoring webhook for object=%s", obj)
        return

    for entry in payload.get("entry", []):
        account = RULESET.account_for_webhook(platform, str(entry.get("id", "")))
        if not account:
            log.debug("no configured account for %s entry %s", platform, entry.get("id"))
            continue
        for event in _parse_entry(entry, account, platform):
            handle_event(event)


def _parse_entry(entry: dict[str, Any], account: Account, platform: str) -> list[Event]:
    events: list[Event] = []

    # --- comments (entry.changes) ---
    for change in entry.get("changes", []):
        field = change.get("field")
        value = change.get("value", {}) or {}

        if platform == "instagram" and field == "comments":
            comment_id = str(value.get("id", ""))
            sender = value.get("from", {}) or {}
            media_id = str((value.get("media") or {}).get("id", "")) or None
        elif platform == "facebook" and field == "feed":
            # The page feed webhook carries every kind of activity; we only
            # want newly added comments, not edits, likes, or posts.
            if value.get("item") != "comment" or value.get("verb") != "add":
                continue
            comment_id = str(value.get("comment_id", ""))
            sender = value.get("from", {}) or {}
            media_id = str(value.get("post_id", "")) or None
        else:
            continue

        sender_id = str(sender.get("id", ""))
        if not comment_id or not sender_id:
            continue
        # Skip our own comments, or we reply to ourselves in a loop.
        if sender_id in (account.account_id, account.page_id):
            continue

        events.append(
            Event(
                account=account,
                trigger="comment",
                text=value.get("text") or value.get("message") or "",
                user_id=sender_id,
                username=sender.get("username"),
                name=sender.get("name"),
                event_key=f"comment:{comment_id}",
                comment_id=comment_id,
                media_id=media_id,
            )
        )

    # --- direct messages (entry.messaging) ---
    for messaging in entry.get("messaging", []):
        message = messaging.get("message") or {}
        # Echoes are our own outbound DMs coming back to us.
        if message.get("is_echo"):
            continue
        text = message.get("text")
        mid = message.get("mid")
        sender_id = str((messaging.get("sender") or {}).get("id", ""))
        if not text or not mid or not sender_id:
            continue
        if sender_id in (account.account_id, account.page_id):
            continue

        events.append(
            Event(
                account=account,
                trigger="dm",
                text=text,
                user_id=sender_id,
                username=None,
                name=None,
                event_key=f"message:{mid}",
            )
        )

    return events


# --------------------------------------------------------------- delivery ---


def handle_event(event: Event) -> None:
    match = RULESET.match(
        event.account.id, event.text, trigger=event.trigger, media_id=event.media_id
    )
    if not match:
        log.info(
            "no rule matched %s on %s: %r", event.trigger, event.account.id, event.text[:80]
        )
        return
    rule, keyword = match

    if rule.once_per_user and already_delivered(rule.id, event.user_id):
        log.info("rule %s already delivered to %s — skipping", rule.id, event.user_id)
        _log(event, rule, keyword, "skipped", "once_per_user")
        return

    # The dedup claim must come before any send: Meta redelivers on retry and
    # on comment edits, and this is the only thing standing between one
    # comment and three identical DMs.
    if not claim_event(event.event_key):
        log.info("duplicate event %s — skipping", event.event_key)
        return

    if DRY_RUN:
        log.info(
            "[dry run] would fire rule %s for %s (%s)", rule.id, event.user_id, keyword
        )
        _log(event, rule, keyword, "dry_run")
        return

    token = event.account.token
    if not token:
        _log(event, rule, keyword, "failed", f"{event.account.token_env} is not set")
        log.error("account %s has no token in %s", event.account.id, event.account.token_env)
        return

    try:
        _deliver(event, rule, token)
    except SendError as exc:
        # Retryable failures give the event key back so Meta's next delivery
        # attempt is allowed through; permanent ones stay claimed.
        if exc.retryable:
            release_event(event.event_key)
        _log(event, rule, keyword, "failed", str(exc))
        log.error("rule %s failed for %s: %s", rule.id, event.user_id, exc)
        return

    _log(event, rule, keyword, "sent")
    log.info("rule %s → %s (%s via %s)", rule.id, event.user_id, keyword, event.trigger)


def _deliver(event: Event, rule: Rule, token: str) -> None:
    account = event.account
    text = render(rule.dm_text, username=event.username, name=event.name)

    if event.trigger == "comment":
        # A comment-triggered DM gets exactly one private reply per comment,
        # so the document link rides along in that first message rather than
        # as a second send that Meta would reject.
        body = text
        if rule.document_url:
            label = rule.document_name or "Here's the link"
            body = f"{text}\n\n{label}: {rule.document_url}"
        response = send_private_reply(
            account.account_id, event.comment_id or "", body, token, login=account.login
        )
        # The Send API hands back the DM-scoped user id, which is what any
        # follow-up message has to be addressed to.
        recipient_id = str(response.get("recipient_id") or "") or None
    else:
        recipient_id = event.user_id
        send_message(account.account_id, recipient_id, text, token, login=account.login)
        if rule.document_url:
            send_document(
                platform=account.platform,
                sender_id=account.account_id,
                recipient_id=recipient_id,
                url=rule.document_url,
                name=rule.document_name,
                token=token,
                login=account.login,
            )

    if rule.follow_up and recipient_id:
        follow_up = render(rule.follow_up, username=event.username, name=event.name)
        send_message(
            account.account_id, recipient_id, follow_up, token, login=account.login
        )

    if rule.public_reply and event.comment_id:
        # Best-effort: the DM is the deliverable, so a failed public nudge
        # must not mark the whole delivery as failed.
        try:
            reply_to_comment(
                event.comment_id,
                render(rule.public_reply, username=event.username, name=event.name),
                token,
                login=account.login,
            )
        except SendError as exc:
            log.warning("public reply failed for comment %s: %s", event.comment_id, exc)


def _log(event: Event, rule: Rule, keyword: str, status: str, error: str | None = None) -> None:
    log_delivery(
        account_id=event.account.id,
        rule_id=rule.id,
        platform=event.account.platform,
        trigger=event.trigger,
        user_id=event.user_id,
        username=event.username,
        keyword=keyword,
        text=event.text,
        status=status,
        error=error,
    )


# ------------------------------------------------------------------ admin ---


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "rules": len(RULESET.rules),
        "accounts": len(RULESET.accounts),
        "dry_run": DRY_RUN,
    }


def _admin_ok() -> bool:
    if not ADMIN_TOKEN:
        return False
    if session.get("dm_bot_admin"):
        return True
    if secrets.compare_digest(request.args.get("token", ""), ADMIN_TOKEN):
        session["dm_bot_admin"] = True
        return True
    return False


@app.get("/admin")
def admin() -> Response:
    if not _admin_ok():
        message = (
            "ADMIN_TOKEN is not set in .env — the admin page is disabled."
            if not ADMIN_TOKEN
            else "Add ?token=… to the URL."
        )
        return Response(message, status=403, mimetype="text/plain")

    counts = stats()
    probe = request.args.get("probe", "")
    probe_html = _render_probe(probe) if probe else ""

    return Response(_admin_html(counts, probe, probe_html), mimetype="text/html")


@app.post("/admin/reload")
def admin_reload() -> Response:
    """Re-read rules.json without restarting the server."""
    if not _admin_ok():
        return Response("forbidden", status=403)
    global RULESET
    try:
        RULESET = load_rules()
    except RulesError as exc:
        return Response(f"rules.json is invalid: {escape(str(exc))}", status=400)
    log.info("reloaded %d rule(s)", len(RULESET.rules))
    return redirect("/admin")


def _render_probe(text: str) -> str:
    """Dry-match a phrase against every account, so you can check a keyword
    fires the rule you think it does before posting it publicly."""
    rows = []
    for account in RULESET.accounts.values():
        for trigger in ("comment", "dm"):
            match = RULESET.match(account.id, text, trigger=trigger)
            result = (
                f"<b>{escape(match[0].id)}</b> (matched “{escape(match[1] or 'any')}”)"
                if match
                else "<span class='muted'>no match</span>"
            )
            rows.append(
                f"<tr><td>{escape(account.id)}</td><td>{trigger}</td><td>{result}</td></tr>"
            )
    return (
        "<table><tr><th>Account</th><th>Trigger</th><th>Rule</th></tr>"
        + "".join(rows)
        + "</table>"
    )


def _admin_html(counts: dict[str, int], probe: str, probe_html: str) -> str:
    rule_rows = "".join(
        f"<tr>"
        f"<td><b>{escape(r.id)}</b></td>"
        f"<td>{escape(r.account_id)}</td>"
        f"<td>{escape(', '.join(r.keywords) or '(any)')}</td>"
        f"<td>{escape(r.match_mode)}</td>"
        f"<td>{escape(', '.join(r.triggers))}</td>"
        f"<td>{'📎' if r.document_url else '—'}</td>"
        f"<td>{'on' if r.enabled else '<span class=muted>off</span>'}</td>"
        f"</tr>"
        for r in RULESET.rules
    )

    badge = {"sent": "ok", "failed": "bad", "skipped": "muted", "dry_run": "muted"}
    delivery_rows = "".join(
        f"<tr>"
        f"<td class=muted>{_ts(d['created_at'])}</td>"
        f"<td>{escape(d['rule_id'])}</td>"
        f"<td>{escape(d['platform'])} / {escape(d['trigger'])}</td>"
        f"<td>{escape(d['username'] or d['user_id'])}</td>"
        f"<td>{escape((d['text'] or '')[:60])}</td>"
        f"<td class={badge.get(d['status'], 'muted')}>{escape(d['status'])}"
        f"{'<br><span class=muted>' + escape((d['error'] or '')[:120]) + '</span>' if d['error'] else ''}"
        f"</td>"
        f"</tr>"
        for d in recent_deliveries(50)
    )

    dry_banner = (
        "<p class='banner'>DRY RUN is on — matches are logged, nothing is sent.</p>"
        if DRY_RUN
        else ""
    )

    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Lemonade DM Bot</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            max-width: 980px; margin: 3rem auto; padding: 0 1.5rem; color: #222; }}
    h1 {{ font-size: 1.5rem; margin-bottom: 0.25rem; }}
    h2 {{ font-size: 1.05rem; margin: 2rem 0 0.75rem; }}
    table {{ width: 100%; border-collapse: collapse; font-size: 0.88rem; }}
    th, td {{ text-align: left; padding: 0.5rem 0.6rem; border-bottom: 1px solid #eee;
              vertical-align: top; }}
    th {{ color: #666; font-weight: 600; font-size: 0.78rem; text-transform: uppercase; }}
    .cards {{ display: flex; gap: 0.75rem; margin: 1.25rem 0; flex-wrap: wrap; }}
    .card {{ border: 1px solid #e3e3e3; border-radius: 10px; padding: 0.9rem 1.2rem;
             min-width: 110px; }}
    .card .n {{ font-size: 1.5rem; font-weight: 600; }}
    .card .l {{ font-size: 0.78rem; color: #666; text-transform: uppercase; }}
    .muted {{ color: #999; }}
    .ok {{ color: #1b8a3a; }}
    .bad {{ color: #c02626; }}
    .banner {{ background: #fff6d6; border: 1px solid #f0dfa0; padding: 0.6rem 0.9rem;
               border-radius: 8px; font-size: 0.9rem; }}
    form {{ margin: 0.5rem 0 1rem; }}
    input[type=text] {{ padding: 0.5rem 0.7rem; border: 1px solid #ddd; border-radius: 7px;
                        width: 320px; font-size: 0.9rem; }}
    button {{ padding: 0.5rem 1rem; border-radius: 7px; border: 1px solid #ddd;
              background: #fafafa; cursor: pointer; font-size: 0.9rem; }}
  </style>
</head>
<body>
  <h1>Lemonade DM Bot</h1>
  <p class="muted">Keyword → DM automation for Instagram &amp; Facebook.</p>
  {dry_banner}

  <div class="cards">
    <div class="card"><div class="n">{counts['sent']}</div><div class="l">Sent</div></div>
    <div class="card"><div class="n">{counts['failed']}</div><div class="l">Failed</div></div>
    <div class="card"><div class="n">{counts['people']}</div><div class="l">People</div></div>
    <div class="card"><div class="n">{len(RULESET.rules)}</div><div class="l">Rules</div></div>
  </div>

  <h2>Test a keyword</h2>
  <form method="get" action="/admin">
    <input type="text" name="probe" value="{escape(probe)}"
           placeholder="Type what someone would comment…">
    <button type="submit">Check</button>
  </form>
  {probe_html}

  <h2>Rules</h2>
  <form method="post" action="/admin/reload"><button type="submit">Reload rules.json</button></form>
  <table>
    <tr><th>Rule</th><th>Account</th><th>Keywords</th><th>Mode</th><th>Triggers</th>
        <th>Doc</th><th>Status</th></tr>
    {rule_rows}
  </table>

  <h2>Recent deliveries</h2>
  <table>
    <tr><th>When (UTC)</th><th>Rule</th><th>Source</th><th>Person</th><th>Said</th>
        <th>Status</th></tr>
    {delivery_rows or '<tr><td colspan="6" class="muted">Nothing yet.</td></tr>'}
  </table>
</body>
</html>"""


def _ts(epoch: int) -> str:
    return datetime.fromtimestamp(epoch, tz=timezone.utc).strftime("%b %d %H:%M")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=False)
