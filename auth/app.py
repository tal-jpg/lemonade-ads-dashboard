"""Lemonade Ads OAuth server.

One-time setup tool. Run locally, click "Connect Meta" on the /connect
page, approve in the popup, and the long-lived access token is written
to auth/.env. The data layer reads from .env from then on.

    cd auth && pip install -r requirements.txt
    python app.py
    # open http://localhost:5000

Each platform handler is intentionally self-contained — Meta lives here
in full; Google (M1-T3), HubSpot (M3-T1), Shopify (M3-T2), and
Salesforce (M3-T3) will be appended as the same one-shot pattern.
"""
from __future__ import annotations

import os
import secrets
from pathlib import Path
from urllib.parse import urlencode

import requests
from dotenv import load_dotenv, set_key
from flask import Flask, redirect, request, session

ENV_PATH = Path(__file__).parent / ".env"
load_dotenv(ENV_PATH)

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or secrets.token_hex(32)

META_API_VERSION = "v21.0"
META_AUTH_URL = f"https://www.facebook.com/{META_API_VERSION}/dialog/oauth"
META_TOKEN_URL = f"https://graph.facebook.com/{META_API_VERSION}/oauth/access_token"
META_DEBUG_URL = f"https://graph.facebook.com/{META_API_VERSION}/debug_token"
META_SCOPES = "ads_read,business_management,read_insights"


def _require(var: str) -> str:
    value = os.environ.get(var)
    if not value:
        raise RuntimeError(
            f"{var} is not set. Copy auth/.env.example to auth/.env and fill it in."
        )
    return value


def _save_to_env(key: str, value: str) -> None:
    ENV_PATH.touch(exist_ok=True)
    set_key(str(ENV_PATH), key, value, quote_mode="never")
    os.environ[key] = value


@app.route("/")
def index():
    meta_token = os.environ.get("META_ACCESS_TOKEN")
    meta_status = "Connected ✓" if meta_token else "Not connected"
    meta_color = "#1b8a3a" if meta_token else "#666"
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Lemonade Ads — Connect Platforms</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            max-width: 640px; margin: 4rem auto; padding: 0 1.5rem; color: #222; }}
    h1 {{ font-size: 1.5rem; margin-bottom: 1.5rem; }}
    .platform {{ border: 1px solid #e3e3e3; padding: 1.25rem 1.5rem;
                  border-radius: 10px; margin-bottom: 1rem; }}
    .platform h2 {{ margin: 0 0 0.25rem; font-size: 1.05rem; }}
    .status {{ font-size: 0.9rem; margin: 0 0 0.75rem; }}
    .btn {{ display: inline-block; padding: 0.55rem 1.1rem; border-radius: 6px;
            text-decoration: none; font-weight: 500; }}
    .btn-meta {{ background: #1877F2; color: #fff; }}
    .btn-disabled {{ background: #eee; color: #888; pointer-events: none; }}
  </style>
</head>
<body>
  <h1>Lemonade Ads — Platform Connections</h1>
  <div class="platform">
    <h2>Meta Ads</h2>
    <p class="status" style="color: {meta_color};">{meta_status}</p>
    <a class="btn btn-meta" href="/auth/meta/login">Connect Meta</a>
  </div>
  <div class="platform">
    <h2>Google Ads</h2>
    <p class="status">Pending (M1-T3)</p>
    <span class="btn btn-disabled">Connect Google</span>
  </div>
</body>
</html>"""


@app.route("/auth/meta/login")
def meta_login():
    state = secrets.token_urlsafe(24)
    session["meta_oauth_state"] = state
    params = {
        "client_id": _require("META_APP_ID"),
        "redirect_uri": _require("META_REDIRECT_URI"),
        "scope": META_SCOPES,
        "response_type": "code",
        "state": state,
    }
    return redirect(f"{META_AUTH_URL}?{urlencode(params)}")


@app.route("/auth/meta/callback")
def meta_callback():
    if "error" in request.args:
        desc = request.args.get("error_description", request.args["error"])
        return f"<h1>Meta returned an error</h1><p>{desc}</p>", 400

    code = request.args.get("code")
    state = request.args.get("state")
    expected_state = session.pop("meta_oauth_state", None)
    if not code:
        return "<h1>Missing authorization code from Meta.</h1>", 400
    if not expected_state or state != expected_state:
        return "<h1>Invalid OAuth state — possible CSRF, aborting.</h1>", 400

    app_id = _require("META_APP_ID")
    app_secret = _require("META_APP_SECRET")
    redirect_uri = _require("META_REDIRECT_URI")

    short = requests.get(
        META_TOKEN_URL,
        params={
            "client_id": app_id,
            "client_secret": app_secret,
            "redirect_uri": redirect_uri,
            "code": code,
        },
        timeout=15,
    )
    if not short.ok:
        return f"<h1>Meta token exchange failed</h1><pre>{short.text}</pre>", 502
    short_token = short.json()["access_token"]

    long = requests.get(
        META_TOKEN_URL,
        params={
            "grant_type": "fb_exchange_token",
            "client_id": app_id,
            "client_secret": app_secret,
            "fb_exchange_token": short_token,
        },
        timeout=15,
    )
    if not long.ok:
        return f"<h1>Long-lived exchange failed</h1><pre>{long.text}</pre>", 502
    long_payload = long.json()
    long_token = long_payload["access_token"]
    expires_in = long_payload.get("expires_in")

    debug = requests.get(
        META_DEBUG_URL,
        params={"input_token": long_token, "access_token": f"{app_id}|{app_secret}"},
        timeout=15,
    )
    debug_info = debug.json().get("data", {}) if debug.ok else {}
    scopes = ", ".join(debug_info.get("scopes", [])) or "(unknown)"
    user_id = debug_info.get("user_id", "(unknown)")

    _save_to_env("META_ACCESS_TOKEN", long_token)

    ttl = f"~{expires_in // 86400} days" if expires_in else "long-lived (~60 days)"
    return f"""<!doctype html>
<html><head><title>Meta connected</title>
<style>body {{ font-family: -apple-system, sans-serif; max-width: 640px;
               margin: 4rem auto; padding: 0 1.5rem; }}
        code, pre {{ background: #f4f4f4; padding: 0.15rem 0.35rem; border-radius: 4px; }}</style>
</head><body>
  <h1>Meta connected ✓</h1>
  <p>Long-lived access token saved to <code>auth/.env</code>.</p>
  <ul>
    <li><strong>User ID:</strong> {user_id}</li>
    <li><strong>Scopes:</strong> {scopes}</li>
    <li><strong>Token lifetime:</strong> {ttl}</li>
  </ul>
  <p>The MCP layer will re-exchange this token for a fresh 60-day token
     before it expires (no user interaction needed).</p>
  <p><a href="/">← Back to connect page</a></p>
</body></html>"""


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
