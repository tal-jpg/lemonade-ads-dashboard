"""Meta Graph API send layer — the part that actually delivers the DM.

Covers the three outbound moves the bot makes:

  * `send_private_reply`  — comment → DM. The one that matters. Meta lets you
    open a DM thread by addressing a *comment id* instead of a user id, which
    is exactly what ManyChat does. Allowed once per comment, within 7 days.
  * `send_message`        — reply inside an existing DM thread (24h window).
  * `reply_to_comment`    — the public "check your DMs 📩" nudge.

Platform note on documents: Messenger accepts a real file attachment
(`type: file`), Instagram messaging does not — IG only takes text, media, and
templates. So on Instagram a "document" is delivered as a link, which is also
what ManyChat does under the hood. `send_document` handles that split.
"""
from __future__ import annotations

import os
from typing import Any

import requests

API_VERSION = os.environ.get("META_API_VERSION", "v21.0")
BASE_URL = f"https://graph.facebook.com/{API_VERSION}"
TIMEOUT = 20

# Meta error codes worth retrying: transient API failures and rate limits.
# Everything else (permissions, closed messaging window, blocked user) is
# permanent — retrying just burns quota.
RETRYABLE_CODES = {1, 2, 4, 17, 32, 341, 613}


class SendError(RuntimeError):
    """A Graph API call failed. `retryable` decides whether we let Meta retry."""

    def __init__(self, message: str, *, retryable: bool = False, code: int | None = None):
        super().__init__(message)
        self.retryable = retryable
        self.code = code


def _post(path: str, token: str, payload: dict[str, Any]) -> dict[str, Any]:
    url = f"{BASE_URL}/{path}"
    try:
        resp = requests.post(
            url, params={"access_token": token}, json=payload, timeout=TIMEOUT
        )
    except requests.RequestException as exc:
        raise SendError(f"network error calling {path}: {exc}", retryable=True) from exc

    if resp.ok:
        try:
            return resp.json()
        except ValueError:
            return {}

    code = None
    message = resp.text
    try:
        error = resp.json().get("error", {})
        code = error.get("code")
        message = error.get("message") or message
        if error.get("error_user_msg"):
            message = f"{message} ({error['error_user_msg']})"
    except ValueError:
        pass

    retryable = resp.status_code >= 500 or code in RETRYABLE_CODES
    raise SendError(
        f"Graph API {resp.status_code} on {path}: {message}", retryable=retryable, code=code
    )


def send_private_reply(
    sender_id: str, comment_id: str, text: str, token: str
) -> dict[str, Any]:
    """Open a DM in response to a comment.

    `sender_id` is the IG user id (Instagram) or page id (Facebook). This is
    the only way to message someone who has not messaged you first, and Meta
    permits exactly one private reply per comment.
    """
    return _post(
        f"{sender_id}/messages",
        token,
        {"recipient": {"comment_id": comment_id}, "message": {"text": text}},
    )


def send_message(sender_id: str, recipient_id: str, text: str, token: str) -> dict[str, Any]:
    """Send text into an existing DM thread (inside the 24h messaging window)."""
    return _post(
        f"{sender_id}/messages",
        token,
        {
            "recipient": {"id": recipient_id},
            "messaging_type": "RESPONSE",
            "message": {"text": text},
        },
    )


def send_file_attachment(
    sender_id: str, recipient_id: str, url: str, token: str
) -> dict[str, Any]:
    """Messenger-only: attach an actual file to the DM."""
    return _post(
        f"{sender_id}/messages",
        token,
        {
            "recipient": {"id": recipient_id},
            "messaging_type": "RESPONSE",
            "message": {
                "attachment": {
                    "type": "file",
                    "payload": {"url": url, "is_reusable": True},
                }
            },
        },
    )


def send_document(
    *,
    platform: str,
    sender_id: str,
    recipient_id: str,
    url: str,
    name: str | None,
    token: str,
) -> dict[str, Any]:
    """Deliver the document, using the best method the platform supports.

    Messenger gets a real file attachment, falling back to a plain link if
    Meta rejects the upload (unreachable URL, unsupported type, too large).
    Instagram always gets a link — it has no file attachment type.
    """
    label = name or "your document"
    if platform == "facebook":
        try:
            return send_file_attachment(sender_id, recipient_id, url, token)
        except SendError as exc:
            if exc.retryable:
                raise
            # Fall through to the link so the person still gets the doc.
    return send_message(sender_id, recipient_id, f"{label}: {url}", token)


def reply_to_comment(comment_id: str, text: str, token: str) -> dict[str, Any]:
    """Public reply under the original comment."""
    return _post(f"{comment_id}/replies", token, {"message": text})
