"""Google Ads API client.

Fetches campaign-level metrics for a date range via the REST search
endpoint. Reads the OAuth refresh token + developer token from
auth/.env (populated by the OAuth flow at auth/app.py), exchanges the
refresh token for a fresh access token on each call, and runs a GAQL
query. Returns raw rows; metric_map.json (M1-T6) handles normalization.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv

ENV_PATH = Path(__file__).parent.parent / "auth" / ".env"
load_dotenv(ENV_PATH)

API_VERSION = os.environ.get("GOOGLE_ADS_API_VERSION", "v18")
BASE_URL = f"https://googleads.googleapis.com/{API_VERSION}"
TOKEN_URL = "https://oauth2.googleapis.com/token"

CAMPAIGN_QUERY = """
    SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        metrics.cost_micros,
        metrics.clicks,
        metrics.impressions,
        metrics.conversions,
        metrics.conversions_value
    FROM campaign
    WHERE segments.date BETWEEN '{since}' AND '{until}'
    AND campaign.status != 'REMOVED'
"""


def _refresh_access_token() -> str:
    refresh = os.environ.get("GOOGLE_REFRESH_TOKEN")
    if not refresh:
        raise RuntimeError(
            "GOOGLE_REFRESH_TOKEN not set. Run auth/app.py and click 'Connect Google'."
        )
    resp = requests.post(
        TOKEN_URL,
        data={
            "grant_type": "refresh_token",
            "client_id": os.environ["GOOGLE_CLIENT_ID"],
            "client_secret": os.environ["GOOGLE_CLIENT_SECRET"],
            "refresh_token": refresh,
        },
        timeout=15,
    )
    if not resp.ok:
        raise RuntimeError(f"Google token refresh failed: {resp.text}")
    return resp.json()["access_token"]


def fetch_campaign_insights(
    customer_id: str,
    since: str,
    until: str,
    *,
    login_customer_id: str | None = None,
) -> list[dict[str, Any]]:
    """Return campaign-level metric rows for [since, until] inclusive.

    customer_id and login_customer_id may include hyphens; they are
    stripped before the request.
    """
    access_token = _refresh_access_token()
    dev_token = os.environ.get("GOOGLE_DEVELOPER_TOKEN")
    if not dev_token:
        raise RuntimeError("GOOGLE_DEVELOPER_TOKEN not set.")

    manager = login_customer_id or os.environ.get("GOOGLE_ADS_CUSTOMER_ID")
    cid = customer_id.replace("-", "")
    url = f"{BASE_URL}/customers/{cid}/googleAds:search"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "developer-token": dev_token,
        "Content-Type": "application/json",
    }
    if manager:
        headers["login-customer-id"] = manager.replace("-", "")

    query = CAMPAIGN_QUERY.format(since=since, until=until)
    rows: list[dict[str, Any]] = []
    page_token: str | None = None
    while True:
        body: dict[str, Any] = {"query": query, "pageSize": 1000}
        if page_token:
            body["pageToken"] = page_token
        resp = requests.post(url, headers=headers, json=body, timeout=30)
        if not resp.ok:
            raise RuntimeError(f"Google Ads API {resp.status_code}: {resp.text}")
        payload = resp.json()
        rows.extend(payload.get("results", []))
        page_token = payload.get("nextPageToken")
        if not page_token:
            break
    return rows


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 4:
        print("Usage: python google_client.py <customer_id> <since> <until>", file=sys.stderr)
        sys.exit(1)
    rows = fetch_campaign_insights(sys.argv[1], sys.argv[2], sys.argv[3])
    print(f"{len(rows)} campaign(s)")
    for r in rows:
        c = r.get("campaign", {})
        m = r.get("metrics", {})
        cost = int(m.get("costMicros", 0)) / 1_000_000
        print(
            f"  {c.get('name', '?'):<40} "
            f"cost=${cost:.2f}  clicks={m.get('clicks', '0')}  "
            f"conv={m.get('conversions', '0')}  value=${m.get('conversionsValue', '0')}"
        )
