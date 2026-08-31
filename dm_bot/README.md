# Lemonade DM Bot

A ManyChat-style autoresponder. Someone comments a keyword on your Instagram
or Facebook post — or DMs it to you — and they get a DM back from your account
with your document.

```
comment "GUIDE" on your post
        ↓
Meta webhook  →  match rule  →  private reply (DM) with the doc
        ↓
optional public reply: "Sent it to your DMs 📩"
```

Everything is driven by `rules.json`. No code changes to add a keyword.

---

## What it does

- **Comment → DM** on Instagram and Facebook Pages (the core ManyChat move).
- **DM → DM** — the same keywords work when someone messages you directly.
- **Document delivery** — a link on Instagram, a real file attachment on
  Messenger (see *Platform limits* below).
- **Keyword matching** — `exact`, `contains` (word-boundary aware, so a
  "guide" rule doesn't fire on "guidelines"), `starts_with`, `regex`, or
  `any` as a catch-all. Hebrew and emoji keywords work.
- **Per-post scoping** — a rule can be limited to specific posts via
  `media_ids`, so "PRICING" on the launch post doesn't fire everywhere.
- **Once per person** — `once_per_user` stops repeat sends to the same person.
- **De-duplication** — Meta retries webhooks and re-sends edited comments.
  Every event id is claimed in SQLite before anything is sent, so one comment
  is one DM.
- **Admin page** at `/admin` — counters, live rules, the last 50 deliveries
  with errors, a keyword tester, and a "reload rules.json" button.
- **Dry-run mode** — match and log without sending. Run the first day like this.

---

## Files

| File | What it is |
|---|---|
| `app.py` | Flask webhook server + admin page |
| `rules.py` | Rule loading, validation, keyword matching (no I/O — unit tested) |
| `senders.py` | Meta Graph API send layer |
| `store.py` | SQLite dedup + delivery log |
| `rules.example.json` | Copy to `rules.json` and edit |
| `simulate.py` | Fire a fake webhook locally, no Meta app needed |
| `test_dm_bot.py` | 30 tests, no network |

---

## Run it locally

```bash
cd dm_bot
pip install -r requirements.txt
cp .env.example .env
cp rules.example.json rules.json
```

Try it without touching Meta at all:

```bash
# terminal 1 — nothing gets sent in dry-run mode
DM_BOT_DRY_RUN=1 DM_BOT_SKIP_SIGNATURE=1 python app.py

# terminal 2
python simulate.py comment "GUIDE please" --account 17841400000000000
```

Then open `http://localhost:5001/admin?token=<ADMIN_TOKEN>` to see the match.

Run the tests with `python test_dm_bot.py`.

---

## Connecting it to Meta

You need a Meta app, an Instagram **professional** account (Business or
Creator), and the Facebook Page it's linked to.

**1. Create the app** — [developers.facebook.com](https://developers.facebook.com)
→ Create App → *Business*. Add the **Instagram** and **Messenger** products.

**2. Permissions.** Ask for these on the app:

- Instagram: `instagram_basic`, `instagram_manage_comments`,
  `instagram_manage_messages`, `pages_show_list`
- Facebook: `pages_manage_metadata`, `pages_messaging`,
  `pages_read_engagement`, `pages_manage_engagement`

**3. Page access token.** Generate one for the Page (Graph API Explorer, or
the Messenger → Settings panel), exchange it for a long-lived token, and put
it in `.env` as `IG_PAGE_ACCESS_TOKEN` / `FB_PAGE_ACCESS_TOKEN`. The IG
account is addressed through its linked Page's token.

**4. Expose the webhook.** Meta needs a public HTTPS URL.

```bash
ngrok http 5001    # → https://something.ngrok.io
```

**5. Subscribe.** App → Webhooks → Instagram (and/or Page):

- Callback URL: `https://something.ngrok.io/webhook`
- Verify token: the same string you put in `WEBHOOK_VERIFY_TOKEN`
- Subscribe to fields: `comments` and `messages` (Instagram);
  `feed` and `messages` (Page)

Then subscribe the Page itself to the app:

```bash
curl -X POST "https://graph.facebook.com/v21.0/<PAGE_ID>/subscribed_apps" \
  -d "subscribed_fields=feed,messages" \
  -d "access_token=<PAGE_ACCESS_TOKEN>"
```

**6. Fill in `rules.json`.** Get your IG user id with:

```bash
curl "https://graph.facebook.com/v21.0/<PAGE_ID>?fields=instagram_business_account&access_token=<TOKEN>"
```

**7. Go live in dry-run first.** Set `DM_BOT_DRY_RUN=1`, comment your keyword
on a real post, and confirm `/admin` shows the right rule matching. Then turn
dry-run off.

**8. App Review.** While the app is in Development mode it only works for
people with a role on it. Sending to the public requires App Review for the
Instagram/Messenger permissions above. Budget a few days for this.

---

## Writing rules

```json
{
  "id": "media_kit",
  "account_id": "lemonade_ig",
  "priority": 10,
  "triggers": ["comment", "dm"],
  "match": { "mode": "contains", "keywords": ["GUIDE", "מדריך"] },
  "media_ids": [],
  "dm": {
    "text": "Hey {username}! Here's the guide 👇",
    "document": { "url": "https://…/guide.pdf", "name": "The Guide (PDF)" },
    "follow_up": "Questions? Just reply here."
  },
  "public_reply": "Sent it to your DMs 📩",
  "once_per_user": true
}
```

- `{username}` and `{first_name}` are filled from the commenter's profile and
  fall back to "there".
- `priority` decides which rule wins when several match. Give catch-alls a
  negative priority.
- `media_ids` empty = every post.
- The document URL must be publicly reachable — Google Drive "anyone with the
  link", S3, or your own site.

Edit `rules.json` and hit **Reload rules.json** on `/admin` — no restart.

---

## Platform limits worth knowing

These are Meta's rules, not the bot's:

- **One private reply per comment.** That's why the document link rides inside
  the first DM on the comment path instead of arriving as a second message.
- **7 days** to privately reply to a comment; **24 hours** to send a normal DM
  after someone messages you.
- **Instagram has no file attachment type.** IG DMs take text, images, video,
  and audio — not PDFs. A "document" on Instagram is delivered as a link,
  which is what every tool in this category does. Messenger gets a real file
  attachment, with a link fallback if Meta rejects the upload.
- **Story replies and mentions** aren't handled yet — comments and DMs only.
- Automated DMs are subject to Meta's Platform Terms. Sending unsolicited
  messages to people who didn't opt in via a comment or DM is how accounts get
  restricted.

---

## Deploying

This is a stateful webhook server with a SQLite file, so it does **not** go on
the Vercel project that serves the dashboards — that deployment is static by
design. Run it on anything with a persistent disk (Railway, Render, Fly, a
small VPS):

```bash
gunicorn --workers 1 --threads 8 --bind 0.0.0.0:$PORT app:app
```

Keep it to **one worker process**. The dedup table is per-file SQLite; multiple
processes on separate disks would each send their own copy of the DM.

Never commit `.env`, `rules.json` (it may name real posts and accounts), or
`data/`. `.gitignore` already covers all three.
