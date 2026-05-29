"""Meta Marketing API client.

Fetches campaign-level insights for a date range. Reads the long-lived
access token from auth/.env (populated by the OAuth flow at
auth/app.py). Returns raw rows in Meta's native shape; metric_map.json
(M1-T6) handles field normalization downstream.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv

ENV_PATH = Path(__file__).parent.parent / "auth" / ".env"
load_dotenv(ENV_PATH)

API_VERSION = os.environ.get("META_API_VERSION", "v21.0")
BASE_URL = f"https://graph.facebook.com/{API_VERSION}"

INSIGHTS_FIELDS = [
    "campaign_id",
    "campaign_name",
    "spend",
    "clicks",
    "impressions",
    "actions",
    "action_values",
]


def fetch_campaign_insights(
    ad_account_id: str,
    since: str,
    until: str,
    *,
    access_token: str | None = None,
) -> list[dict[str, Any]]:
    """Return campaign-level insights for [since, until] inclusive.

    ad_account_id may be passed with or without the `act_` prefix.
    Dates are ISO strings (YYYY-MM-DD).
    """
    token = access_token or os.environ.get("META_ACCESS_TOKEN")
    if not token:
        raise RuntimeError(
            "META_ACCESS_TOKEN not set. Run auth/app.py and click 'Connect Meta'."
        )

    account = ad_account_id if ad_account_id.startswith("act_") else f"act_{ad_account_id}"
    url = f"{BASE_URL}/{account}/insights"
    params: dict[str, Any] | None = {
        "access_token": token,
        "level": "campaign",
        "fields": ",".join(INSIGHTS_FIELDS),
        "time_range": json.dumps({"since": since, "until": until}),
        "limit": 500,
    }

    rows: list[dict[str, Any]] = []
    next_url: str | None = url
    while next_url:
        resp = requests.get(next_url, params=params, timeout=30)
        if not resp.ok:
            raise RuntimeError(f"Meta API {resp.status_code}: {resp.text}")
        payload = resp.json()
        rows.extend(payload.get("data", []))
        next_url = payload.get("paging", {}).get("next")
        params = None  # access_token + filters are encoded in `next`
    return rows


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 4:
        print("Usage: python meta_client.py <ad_account_id> <since> <until>", file=sys.stderr)
        sys.exit(1)
    rows = fetch_campaign_insights(sys.argv[1], sys.argv[2], sys.argv[3])
    print(f"{len(rows)} campaign(s)")
    for r in rows:
        actions = {a["action_type"]: a["value"] for a in r.get("actions") or []}
        leads = actions.get("lead", "-")
        purchases = actions.get("purchase", "-")
        print(
            f"  {r.get('campaign_name', '?'):<40} "
            f"spend=${r.get('spend', '0')}  clicks={r.get('clicks', '0')}  "
            f"leads={leads}  purchases={purchases}"
        )
