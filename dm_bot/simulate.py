"""Fire a fake Meta webhook at a locally running bot.

Lets you watch the whole flow — match, dedup, delivery log, admin page —
without a Meta app, an ngrok tunnel, or a real comment. Pair it with
DM_BOT_DRY_RUN=1 so nothing tries to leave the machine.

    # terminal 1
    DM_BOT_DRY_RUN=1 python app.py

    # terminal 2
    python simulate.py comment "GUIDE please" --account 17841400000000000
    python simulate.py dm "guide" --account 17841400000000000
"""
from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import os
import time
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")


def build_payload(kind: str, text: str, account_id: str, user_id: str) -> dict:
    stamp = str(int(time.time()))
    if kind == "comment":
        return {
            "object": "instagram",
            "entry": [
                {
                    "id": account_id,
                    "time": int(stamp),
                    "changes": [
                        {
                            "field": "comments",
                            "value": {
                                "id": f"sim_comment_{stamp}",
                                "text": text,
                                "from": {"id": user_id, "username": "sim_user"},
                                "media": {"id": "sim_media_1"},
                            },
                        }
                    ],
                }
            ],
        }
    return {
        "object": "instagram",
        "entry": [
            {
                "id": account_id,
                "time": int(stamp),
                "messaging": [
                    {
                        "sender": {"id": user_id},
                        "recipient": {"id": account_id},
                        "message": {"mid": f"sim_mid_{stamp}", "text": text},
                    }
                ],
            }
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Send a simulated Meta webhook.")
    parser.add_argument("kind", choices=["comment", "dm"])
    parser.add_argument("text", help="what the person said")
    parser.add_argument("--account", required=True, help="IG user id / page id from rules.json")
    parser.add_argument("--user", default="sim_user_1", help="the commenter's id")
    parser.add_argument("--url", default="http://localhost:5001/webhook")
    args = parser.parse_args()

    payload = build_payload(args.kind, args.text, args.account, args.user)
    body = json.dumps(payload).encode()

    headers = {"Content-Type": "application/json"}
    secret = os.environ.get("META_APP_SECRET")
    if secret:
        signature = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
        headers["X-Hub-Signature-256"] = f"sha256={signature}"
    else:
        print("META_APP_SECRET not set — the bot must run with DM_BOT_SKIP_SIGNATURE=1")

    resp = requests.post(args.url, data=body, headers=headers, timeout=10)
    print(f"{resp.status_code} {resp.text}")
    print("Check the server log and /admin for what the bot decided to do.")


if __name__ == "__main__":
    main()
