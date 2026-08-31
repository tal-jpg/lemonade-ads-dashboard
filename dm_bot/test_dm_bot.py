"""Tests for the DM bot. No network, no Meta app needed.

    cd dm_bot && python test_dm_bot.py
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import tempfile
import unittest
from pathlib import Path

# Point the app at a throwaway DB and the example rules before importing it —
# app.py loads both at import time.
_TMP = tempfile.mkdtemp(prefix="dm_bot_test_")
os.environ["DM_BOT_DB"] = str(Path(_TMP) / "test.db")
os.environ["DM_BOT_RULES"] = str(Path(__file__).parent / "rules.example.json")
os.environ["META_APP_SECRET"] = "test_secret"
os.environ["WEBHOOK_VERIFY_TOKEN"] = "test_verify"
os.environ["ADMIN_TOKEN"] = "test_admin"

import app as dm_app  # noqa: E402
import rules as rules_mod  # noqa: E402
import senders  # noqa: E402
import store  # noqa: E402

IG_ACCOUNT_ID = "17841400000000000"
IG_PAGE_ID = "100000000000000"


def build_ruleset(**overrides) -> rules_mod.RuleSet:
    rule = {
        "id": "guide",
        "account_id": "ig",
        "priority": 10,
        "triggers": ["comment", "dm"],
        "match": {"mode": "contains", "keywords": ["guide"]},
        "dm": {
            "text": "Hey {username}!",
            "document": {"url": "https://example.com/doc.pdf", "name": "The Guide"},
        },
        "public_reply": "Check your DMs 📩",
    }
    rule.update(overrides)
    return rules_mod.parse_rules(
        {
            "accounts": [
                {
                    "id": "ig",
                    "platform": "instagram",
                    "account_id": IG_ACCOUNT_ID,
                    "page_id": IG_PAGE_ID,
                    "token_env": "TEST_TOKEN",
                }
            ],
            "rules": [rule],
        }
    )


class MatchingTests(unittest.TestCase):
    def test_contains_respects_word_boundaries(self):
        rs = build_ruleset()
        self.assertIsNotNone(rs.match("ig", "send me the guide", trigger="comment"))
        self.assertIsNotNone(rs.match("ig", "GUIDE!!", trigger="comment"))
        # "guidelines" must not fire a "guide" rule
        self.assertIsNone(rs.match("ig", "read the guidelines", trigger="comment"))

    def test_exact_mode(self):
        rs = build_ruleset(match={"mode": "exact", "keywords": ["guide"]})
        self.assertIsNotNone(rs.match("ig", "  Guide ", trigger="comment"))
        self.assertIsNone(rs.match("ig", "send me the guide", trigger="comment"))

    def test_regex_mode(self):
        rs = build_ruleset(match={"mode": "regex", "keywords": [r"gu?ide?\b"]})
        self.assertIsNotNone(rs.match("ig", "gide please", trigger="comment"))

    def test_any_mode_matches_everything(self):
        rs = build_ruleset(match={"mode": "any", "keywords": []})
        match = rs.match("ig", "literally anything", trigger="dm")
        self.assertIsNotNone(match)
        self.assertEqual(match[1], "")

    def test_trigger_filter(self):
        rs = build_ruleset(triggers=["dm"])
        self.assertIsNone(rs.match("ig", "guide", trigger="comment"))
        self.assertIsNotNone(rs.match("ig", "guide", trigger="dm"))

    def test_media_scoping(self):
        rs = build_ruleset(media_ids=["999"])
        self.assertIsNone(rs.match("ig", "guide", trigger="comment", media_id="111"))
        self.assertIsNotNone(rs.match("ig", "guide", trigger="comment", media_id="999"))

    def test_priority_beats_catch_all(self):
        rs = rules_mod.parse_rules(
            {
                "accounts": [
                    {
                        "id": "ig",
                        "platform": "instagram",
                        "account_id": IG_ACCOUNT_ID,
                        "token_env": "TEST_TOKEN",
                    }
                ],
                "rules": [
                    {
                        "id": "catch_all",
                        "account_id": "ig",
                        "priority": -10,
                        "match": {"mode": "any", "keywords": []},
                        "dm": {"text": "generic"},
                    },
                    {
                        "id": "guide",
                        "account_id": "ig",
                        "priority": 10,
                        "match": {"mode": "contains", "keywords": ["guide"]},
                        "dm": {"text": "specific"},
                    },
                ],
            }
        )
        self.assertEqual(rs.match("ig", "guide", trigger="dm")[0].id, "guide")
        self.assertEqual(rs.match("ig", "hello", trigger="dm")[0].id, "catch_all")

    def test_placeholders(self):
        self.assertEqual(
            rules_mod.render("Hi {first_name}", username="talj", name="Tal Jacobs"), "Hi Tal"
        )
        self.assertEqual(rules_mod.render("Hi {username}", username=None, name=None), "Hi there")

    def test_bad_config_is_rejected(self):
        with self.assertRaises(rules_mod.RulesError):
            rules_mod.parse_rules({"accounts": [], "rules": []})
        with self.assertRaises(rules_mod.RulesError):
            build_ruleset(account_id="nope")
        with self.assertRaises(rules_mod.RulesError):
            build_ruleset(match={"mode": "regex", "keywords": ["("]})

    def test_example_rules_file_is_valid(self):
        rules_mod.load_rules(Path(__file__).parent / "rules.example.json")

    def test_rules_can_come_from_the_environment(self):
        """How the deployed service is configured — there is no rules.json in
        the container."""
        config = json.dumps(
            {
                "accounts": [
                    {
                        "id": "ig",
                        "platform": "instagram",
                        "account_id": IG_ACCOUNT_ID,
                        "token_env": "TEST_TOKEN",
                    }
                ],
                "rules": [
                    {
                        "id": "from_env",
                        "account_id": "ig",
                        "match": {"mode": "contains", "keywords": ["guide"]},
                        "dm": {"text": "hi"},
                    }
                ],
            }
        )
        os.environ[rules_mod.RULES_JSON_ENV] = config
        try:
            rs = rules_mod.load_rules()
            self.assertEqual([r.id for r in rs.rules], ["from_env"])
            # An explicit path still wins, so tests and the CLI are unaffected.
            from_file = rules_mod.load_rules(Path(__file__).parent / "rules.example.json")
            self.assertNotIn("from_env", [r.id for r in from_file.rules])
        finally:
            del os.environ[rules_mod.RULES_JSON_ENV]

    def test_bad_env_rules_are_rejected(self):
        os.environ[rules_mod.RULES_JSON_ENV] = "{not json"
        try:
            with self.assertRaises(rules_mod.RulesError):
                rules_mod.load_rules()
        finally:
            del os.environ[rules_mod.RULES_JSON_ENV]


class WebhookParsingTests(unittest.TestCase):
    def setUp(self):
        self.ruleset = build_ruleset()
        self.account = self.ruleset.accounts["ig"]

    def test_instagram_comment(self):
        entry = {
            "id": IG_ACCOUNT_ID,
            "changes": [
                {
                    "field": "comments",
                    "value": {
                        "id": "c1",
                        "text": "guide please",
                        "from": {"id": "u1", "username": "someone"},
                        "media": {"id": "m1"},
                    },
                }
            ],
        }
        events = dm_app._parse_entry(entry, self.account, "instagram")
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0].trigger, "comment")
        self.assertEqual(events[0].comment_id, "c1")
        self.assertEqual(events[0].media_id, "m1")
        self.assertEqual(events[0].event_key, "comment:c1")

    def test_own_comment_is_ignored(self):
        entry = {
            "id": IG_ACCOUNT_ID,
            "changes": [
                {
                    "field": "comments",
                    "value": {
                        "id": "c2",
                        "text": "guide",
                        "from": {"id": IG_ACCOUNT_ID, "username": "us"},
                    },
                }
            ],
        }
        self.assertEqual(dm_app._parse_entry(entry, self.account, "instagram"), [])

    def test_facebook_feed_only_new_comments(self):
        fb_account = rules_mod.Account(
            id="fb",
            platform="facebook",
            account_id=IG_PAGE_ID,
            page_id=IG_PAGE_ID,
            token_env="TEST_TOKEN",
        )
        base = {"item": "comment", "comment_id": "c3", "message": "guide",
                "from": {"id": "u2", "name": "Someone"}, "post_id": "p1"}
        added = {"id": IG_PAGE_ID, "changes": [{"field": "feed", "value": {**base, "verb": "add"}}]}
        edited = {"id": IG_PAGE_ID,
                  "changes": [{"field": "feed", "value": {**base, "verb": "edited"}}]}
        liked = {"id": IG_PAGE_ID,
                 "changes": [{"field": "feed", "value": {"item": "like", "verb": "add"}}]}

        self.assertEqual(len(dm_app._parse_entry(added, fb_account, "facebook")), 1)
        self.assertEqual(dm_app._parse_entry(edited, fb_account, "facebook"), [])
        self.assertEqual(dm_app._parse_entry(liked, fb_account, "facebook"), [])

    def test_dm_and_echo(self):
        entry = {
            "id": IG_ACCOUNT_ID,
            "messaging": [
                {"sender": {"id": "u3"}, "recipient": {"id": IG_ACCOUNT_ID},
                 "message": {"mid": "m1", "text": "guide"}},
                {"sender": {"id": IG_ACCOUNT_ID}, "recipient": {"id": "u3"},
                 "message": {"mid": "m2", "text": "guide", "is_echo": True}},
            ],
        }
        events = dm_app._parse_entry(entry, self.account, "instagram")
        self.assertEqual([e.event_key for e in events], ["message:m1"])

    def test_account_resolution_by_page_id(self):
        self.assertIsNotNone(self.ruleset.account_for_webhook("instagram", IG_PAGE_ID))
        self.assertIsNone(self.ruleset.account_for_webhook("facebook", IG_PAGE_ID))


class FakeSender:
    """Records calls instead of hitting Graph. Optionally raises."""

    def __init__(self, error: senders.SendError | None = None):
        self.calls: list[tuple] = []
        self.error = error

    def private_reply(self, sender_id, comment_id, text, token):
        self.calls.append(("private_reply", sender_id, comment_id, text))
        if self.error:
            raise self.error
        return {"recipient_id": "dm_user_1", "message_id": "mid_1"}

    def message(self, sender_id, recipient_id, text, token):
        self.calls.append(("message", sender_id, recipient_id, text))
        if self.error:
            raise self.error
        return {"message_id": "mid_2"}

    def document(self, *, platform, sender_id, recipient_id, url, name, token):
        self.calls.append(("document", platform, recipient_id, url))
        return {"message_id": "mid_3"}

    def comment_reply(self, comment_id, text, token):
        self.calls.append(("comment_reply", comment_id, text))
        return {"id": "reply_1"}


class DeliveryTests(unittest.TestCase):
    def setUp(self):
        # Each test gets a clean DB so dedup state does not leak between them.
        self.db = Path(_TMP) / f"{self.id()}.db"
        store.DB_PATH = self.db
        store.init_db()

        os.environ["TEST_TOKEN"] = "fake_token"
        dm_app.DRY_RUN = False
        dm_app.RULESET = build_ruleset()
        self.account = dm_app.RULESET.accounts["ig"]

        self.fake = FakeSender()
        self._patch(self.fake)

    def _patch(self, fake: FakeSender):
        dm_app.send_private_reply = fake.private_reply
        dm_app.send_message = fake.message
        dm_app.send_document = fake.document
        dm_app.reply_to_comment = fake.comment_reply

    def comment_event(self, key="comment:c1"):
        return dm_app.Event(
            account=self.account,
            trigger="comment",
            text="guide please",
            user_id="u1",
            username="someone",
            name=None,
            event_key=key,
            comment_id="c1",
            media_id="m1",
        )

    def test_comment_sends_one_private_reply_with_the_doc_link(self):
        dm_app.handle_event(self.comment_event())
        kinds = [c[0] for c in self.fake.calls]
        self.assertEqual(kinds, ["private_reply", "comment_reply"])
        body = self.fake.calls[0][3]
        self.assertIn("Hey someone!", body)
        self.assertIn("https://example.com/doc.pdf", body)
        self.assertEqual(store.recent_deliveries(1)[0]["status"], "sent")

    def test_duplicate_event_is_only_delivered_once(self):
        dm_app.handle_event(self.comment_event())
        dm_app.handle_event(self.comment_event())  # Meta retry
        self.assertEqual(sum(1 for c in self.fake.calls if c[0] == "private_reply"), 1)

    def test_dm_trigger_sends_text_then_document(self):
        event = dm_app.Event(
            account=self.account,
            trigger="dm",
            text="guide",
            user_id="u9",
            username=None,
            name=None,
            event_key="message:m9",
        )
        dm_app.handle_event(event)
        self.assertEqual([c[0] for c in self.fake.calls], ["message", "document"])
        self.assertEqual(self.fake.calls[1][3], "https://example.com/doc.pdf")

    def test_no_match_sends_nothing(self):
        event = self.comment_event()
        event.text = "cool post"
        dm_app.handle_event(event)
        self.assertEqual(self.fake.calls, [])

    def test_once_per_user(self):
        dm_app.RULESET = build_ruleset(once_per_user=True)
        self.account = dm_app.RULESET.accounts["ig"]
        dm_app.handle_event(self.comment_event(key="comment:a"))
        dm_app.handle_event(self.comment_event(key="comment:b"))
        self.assertEqual(sum(1 for c in self.fake.calls if c[0] == "private_reply"), 1)
        self.assertEqual(store.recent_deliveries(1)[0]["status"], "skipped")

    def test_retryable_failure_releases_the_event(self):
        self._patch(FakeSender(senders.SendError("rate limited", retryable=True, code=4)))
        event = self.comment_event()
        dm_app.handle_event(event)
        self.assertEqual(store.recent_deliveries(1)[0]["status"], "failed")
        # The key is released, so Meta's redelivery gets another shot.
        self.assertTrue(store.claim_event(event.event_key))

    def test_permanent_failure_keeps_the_event_claimed(self):
        self._patch(FakeSender(senders.SendError("no permission", retryable=False, code=10)))
        event = self.comment_event()
        dm_app.handle_event(event)
        self.assertFalse(store.claim_event(event.event_key))

    def test_dry_run_sends_nothing(self):
        dm_app.DRY_RUN = True
        dm_app.handle_event(self.comment_event())
        self.assertEqual(self.fake.calls, [])
        self.assertEqual(store.recent_deliveries(1)[0]["status"], "dry_run")

    def test_public_reply_failure_does_not_fail_the_delivery(self):
        def boom(comment_id, text, token):
            raise senders.SendError("comment deleted", retryable=False)

        dm_app.reply_to_comment = boom
        dm_app.handle_event(self.comment_event())
        self.assertEqual(store.recent_deliveries(1)[0]["status"], "sent")


class HttpTests(unittest.TestCase):
    def setUp(self):
        store.DB_PATH = Path(_TMP) / "http.db"
        store.init_db()
        dm_app.APP_SECRET = "test_secret"
        dm_app.SKIP_SIGNATURE = False
        dm_app.VERIFY_TOKEN = "test_verify"
        dm_app.ADMIN_TOKEN = "test_admin"
        dm_app.RULESET = build_ruleset()
        self.client = dm_app.app.test_client()

    def test_verification_handshake(self):
        resp = self.client.get(
            "/webhook",
            query_string={
                "hub.mode": "subscribe",
                "hub.verify_token": "test_verify",
                "hub.challenge": "12345",
            },
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.get_data(as_text=True), "12345")

    def test_verification_rejects_wrong_token(self):
        resp = self.client.get(
            "/webhook",
            query_string={"hub.mode": "subscribe", "hub.verify_token": "nope",
                          "hub.challenge": "12345"},
        )
        self.assertEqual(resp.status_code, 403)

    def test_unsigned_payload_is_rejected(self):
        resp = self.client.post("/webhook", json={"object": "instagram", "entry": []})
        self.assertEqual(resp.status_code, 403)

    def test_signed_payload_is_accepted(self):
        body = json.dumps({"object": "instagram", "entry": []}).encode()
        sig = hmac.new(b"test_secret", body, hashlib.sha256).hexdigest()
        resp = self.client.post(
            "/webhook",
            data=body,
            content_type="application/json",
            headers={"X-Hub-Signature-256": f"sha256={sig}"},
        )
        self.assertEqual(resp.status_code, 200)

    def test_admin_requires_token(self):
        self.assertEqual(self.client.get("/admin").status_code, 403)
        self.assertEqual(
            self.client.get("/admin", query_string={"token": "test_admin"}).status_code, 200
        )

    def test_health(self):
        self.assertEqual(self.client.get("/health").get_json()["rules"], 1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
