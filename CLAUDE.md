# CLAUDE.md — Master Instructions

You are the brain of the Lemonade Ads performance marketing dashboard system. This file tells you how to behave when a user (Tal or the Lemonade Ads team) asks you to generate or update a client dashboard.

---

## What This Project Does

A fully automated reporting system for 4 agency clients. The user opens Claude Code and types something like:

> "generate Thinkup dashboard for last 7 days"

You then:
1. Read `/clients/{client_id}/config.json` and `/clients/{client_id}/metric_map.json`
2. Call `mcps/meta_client.py` and `mcps/google_client.py` for the selected date range AND the previous period
3. Call the client's CRM (HubSpot / Shopify / Salesforce) for deals + revenue
4. Calculate every metric from raw totals (never average of averages, never platform-reported averages)
5. Fill `/templates/dashboard_template.html` with the calculated data
6. Save the result to `/clients/{client_id}/dashboard.html`
7. Commit and push — Vercel auto-deploys in under 10 seconds
8. Report back to the user with the live URL

---

## The 4 Clients

| client_id     | Name         | Type      | CRM        | Opportunity stage |
|---------------|--------------|-----------|------------|-------------------|
| `thinkup`     | Thinkup      | leads     | hubspot    | no                |
| `clear-living`| Clear Living | ecommerce | shopify    | no                |
| `solo`        | Solo         | ecommerce | shopify    | no                |
| `phytech`     | Phytech      | leads     | salesforce | YES               |

Phytech is the only client with an extra Opportunity step in the funnel (Sessions → Leads → **Opportunity** → Deals → Revenue). All others use Sessions → Leads/Purchases → Deals → Revenue.

---

## Folder Layout

```
/CLAUDE.md                       ← this file
/clients/{client_id}/
    config.json                  ← campaigns, ad account IDs, exclusion list
    metric_map.json              ← how to translate raw API fields into our metrics
    dashboard.html               ← generated output (overwrite on each run)
/templates/dashboard_template.html
/auth/                           ← Flask OAuth server (one-time token setup)
    app.py                       ← /connect page + Meta + Google OAuth callbacks
    .env                         ← tokens (gitignored)
/mcps/                           ← data-source clients (direct REST, no MCP servers)
    meta_client.py               ← Meta Graph API → campaign insights
    google_client.py             ← Google Ads REST API → campaign metrics
    date_utils.py                ← preset date-range helpers (M1-T7)
/management/dashboard.html       ← internal team view, all clients
/vercel.json                     ← routing
```

---

## Calculation Rules — Non-Negotiable

Always calculate from raw totals. Never use platform-reported averages. Never compute an average of averages.

```
CPL            = total_spend / total_leads
CPA            = total_spend / total_purchases
ROAS           = total_revenue / total_spend
Closing Rate   = total_deals / total_leads * 100
Cost per Deal  = total_spend / total_deals
Conv Rate      = total_purchases / total_sessions * 100
Period Change  = (current - previous) / previous * 100
```

Division by zero → render `"—"`, never raise, never show `NaN` or `Infinity`.

The summary row at the top of the dashboard only includes campaigns where `include_in_summary: true` in `config.json`. Excluded campaigns still appear in the campaign table (greyed out with an `EXCLUDED` badge) but do NOT contribute to summary totals.

---

## Date Range Logic

Presets: Yesterday, Last 7 days, Last 14 days, Last 30 days, Last 90 days, Custom.

Previous period = the same duration immediately before the selected range.
Example: selected = May 19–25 (7 days) → previous = May 12–18 (7 days).

When generating a dashboard, pre-compute ALL preset ranges (yesterday, 7d, 14d, 30d, 90d) and their previous periods, embed every dataset in the HTML, and let client-side JS toggle which one is shown. The live URL is fully static — no backend on Vercel.

`Custom` range requires a regeneration run by you (the user types a new request).

---

## Dashboard Components (what the template renders)

1. **KPI cards (top row)** — Spend, Sessions, Leads or Purchases, CPL or CPA, Deals, Closing Rate, Revenue, ROAS. Each shows current value + ↑/↓ arrow + % change vs previous period. Green ↑ = improvement, red ↓ = decline. For cost metrics (CPL, CPA, Cost per Deal), DOWN is good — invert the colour.
2. **Funnel** — Sessions → Leads/Purchases → Deals → Revenue (or with Opportunity for Phytech). Each step shows volume + conversion rate from the previous step. Annotation labels show the Meta vs Google split.
3. **Campaign table** — Campaign Name | Result | Spend | Sessions | Leads/Purchases | CPL/CPA | Deals | Closing Rate | Revenue | ROAS | vs Prev | Include. Result badge per campaign: Lead (blue), Purchase (green), Brand (grey), Awareness (purple). ↑/↓ arrows on every metric vs previous period.
4. **Summary row** — totals across `include_in_summary: true` campaigns, calculated from raw totals per the rules above.

---

## Hard Rules

1. **Never hardcode client data.** Always read from `config.json`.
2. **Never use platform averages.** Always calculate from raw totals.
3. **Never commit `.env`** or any file containing live tokens or secrets. `.gitignore` already excludes them — keep it that way.
4. **One template, N clients.** Do not fork the template per client. Variations are driven by config (`type`, `opportunity_stage`, `crm`).
5. **Client isolation.** Each Vercel route serves only that client's dashboard. Never link between clients. Never include another client's data in a generated file.
6. **Management URL is private** — internal team only, never share with clients.
7. **Currency is USD for all clients** (Phase 1). If a client switches, update their `config.json` only.
8. **Sessions for Meta = link clicks** (Phase 1 proxy). GA4 is Phase 2.

---

## How To Generate A Dashboard (step-by-step)

When the user asks "generate {client} dashboard for {range}":

1. Resolve `client_id` from the name. Reject if not one of the 4.
2. Read `/clients/{client_id}/config.json` and `/clients/{client_id}/metric_map.json`.
3. For each preset range (yesterday, 7d, 14d, 30d, 90d):
   a. Compute `current` and `previous` date windows.
   b. `mcps.meta_client.fetch_campaign_insights(account, since, until)`.
   c. `mcps.google_client.fetch_campaign_insights(customer_id, since, until)`.
   d. Pull CRM data per `config.crm` for the same windows.
   e. Apply `metric_map.json` to normalise field names.
   f. Compute totals + per-campaign metrics using the calculation rules.
4. Render `/templates/dashboard_template.html` with all preset datasets embedded.
5. Write to `/clients/{client_id}/dashboard.html`.
6. `git add /clients/{client_id}/dashboard.html` → commit → push.
7. Report the live URL and a short summary (spend, leads/purchases, ROAS, vs previous).

If a data pull fails partway, do NOT write a partial dashboard. Surface the error to the user with which platform/range failed.

---

## Ticket Status

See `ONBOARDING.md` (if present) or the project tracker for the live list of 22 tickets across 4 milestones. M1-T1 (this scaffolding) is the foundation; every other ticket assumes this structure exists.
