"""Keyword rule engine — the ManyChat-style "if they say X, DM them Y" layer.

Rules live in dm_bot/rules.json (see rules.example.json), or in the
DM_BOT_RULES_JSON environment variable when running somewhere without a
writable checkout. This module loads them, validates the shape, and decides
which rule an incoming comment or DM should fire. It performs no network I/O,
so it is cheap to unit-test.
"""
from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

RULES_PATH = Path(os.environ.get("DM_BOT_RULES", Path(__file__).parent / "rules.json"))

# Containers have no rules.json — it is gitignored, since it names real
# accounts and posts. On a host like Railway the whole config is handed in
# through this variable instead, so the rules live with the deployment
# rather than in the image.
RULES_JSON_ENV = "DM_BOT_RULES_JSON"

MATCH_MODES = ("exact", "contains", "starts_with", "regex", "any")
TRIGGERS = ("comment", "dm")


class RulesError(ValueError):
    """Raised when rules.json is malformed. Surfaced at startup, not mid-webhook."""


@dataclass
class Account:
    """One connected social profile."""

    id: str
    platform: str  # "instagram" | "facebook"
    account_id: str  # IG user id, or FB page id
    page_id: str  # FB page id backing the IG account (same as account_id for FB)
    token_env: str
    enabled: bool = True

    @property
    def token(self) -> str | None:
        return os.environ.get(self.token_env)


@dataclass
class Rule:
    """One keyword → DM automation."""

    id: str
    account_id: str
    keywords: list[str]
    dm_text: str
    document_url: str | None = None
    document_name: str | None = None
    follow_up: str | None = None
    public_reply: str | None = None
    match_mode: str = "contains"
    case_sensitive: bool = False
    triggers: tuple[str, ...] = ("comment", "dm")
    media_ids: list[str] = field(default_factory=list)
    once_per_user: bool = False
    priority: int = 0
    enabled: bool = True

    def matches(self, text: str, *, trigger: str, media_id: str | None = None) -> str | None:
        """Return the keyword that matched, or None.

        `""` is returned for `any`-mode rules, which match on any text — that
        is still a truthy match at the call site via `is not None`.
        """
        if not self.enabled or trigger not in self.triggers:
            return None
        if self.media_ids and (media_id or "") not in self.media_ids:
            return None
        if self.match_mode == "any":
            return ""
        if not text:
            return None

        haystack = text if self.case_sensitive else text.lower()
        for keyword in self.keywords:
            needle = keyword if self.case_sensitive else keyword.lower()
            if self.match_mode == "exact" and haystack.strip() == needle.strip():
                return keyword
            if self.match_mode == "contains" and _contains_word(haystack, needle):
                return keyword
            if self.match_mode == "starts_with" and haystack.lstrip().startswith(needle):
                return keyword
            if self.match_mode == "regex":
                flags = 0 if self.case_sensitive else re.IGNORECASE
                if re.search(keyword, text, flags):
                    return keyword
        return None


def _contains_word(haystack: str, needle: str) -> bool:
    """Substring match that respects word boundaries for single-word keywords.

    Without this, a "guide" rule fires on "guidelines". Multi-word keywords
    fall back to a plain substring test.
    """
    if not needle:
        return False
    if re.search(r"\s", needle):
        return needle in haystack
    return re.search(rf"(?<!\w){re.escape(needle)}(?!\w)", haystack) is not None


@dataclass
class RuleSet:
    accounts: dict[str, Account]
    rules: list[Rule]

    def account_for_webhook(self, platform: str, incoming_id: str) -> Account | None:
        """Resolve the account a webhook entry belongs to.

        Meta identifies the recipient by IG user id (Instagram) or page id
        (Facebook); we accept either so a single config entry covers both.
        """
        for account in self.accounts.values():
            if not account.enabled or account.platform != platform:
                continue
            if incoming_id in (account.account_id, account.page_id):
                return account
        return None

    def match(
        self,
        account_id: str,
        text: str,
        *,
        trigger: str,
        media_id: str | None = None,
    ) -> tuple[Rule, str] | None:
        """Highest-priority matching rule for this account, with its keyword."""
        candidates: list[tuple[Rule, str]] = []
        for rule in self.rules:
            if rule.account_id != account_id:
                continue
            matched = rule.matches(text, trigger=trigger, media_id=media_id)
            if matched is not None:
                candidates.append((rule, matched))
        if not candidates:
            return None
        # Higher priority wins; ties break toward the more specific rule
        # (an `any` catch-all should never beat a real keyword).
        candidates.sort(key=lambda c: (c[0].priority, c[0].match_mode != "any"), reverse=True)
        return candidates[0]


def load_rules(path: Path | str | None = None) -> RuleSet:
    """Read and validate rules.json. Raises RulesError on a bad config."""
    if path is None:
        inline = os.environ.get(RULES_JSON_ENV, "").strip()
        if inline:
            try:
                return parse_rules(json.loads(inline))
            except json.JSONDecodeError as exc:
                raise RulesError(f"{RULES_JSON_ENV} is not valid JSON: {exc}") from exc

    rules_path = Path(path) if path else RULES_PATH
    if not rules_path.exists():
        raise RulesError(
            f"{rules_path} not found. Copy dm_bot/rules.example.json to "
            f"dm_bot/rules.json and edit it, or set {RULES_JSON_ENV} to the "
            f"config itself (how the deployed service is configured)."
        )
    try:
        raw = json.loads(rules_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise RulesError(f"{rules_path} is not valid JSON: {exc}") from exc
    return parse_rules(raw)


def parse_rules(raw: dict[str, Any]) -> RuleSet:
    accounts: dict[str, Account] = {}
    for entry in raw.get("accounts", []):
        for key in ("id", "platform", "account_id", "token_env"):
            if not entry.get(key):
                raise RulesError(f"account is missing required field '{key}': {entry}")
        if entry["platform"] not in ("instagram", "facebook"):
            raise RulesError(
                f"account '{entry['id']}': platform must be 'instagram' or 'facebook'"
            )
        if entry["id"] in accounts:
            raise RulesError(f"duplicate account id '{entry['id']}'")
        accounts[entry["id"]] = Account(
            id=entry["id"],
            platform=entry["platform"],
            account_id=str(entry["account_id"]),
            page_id=str(entry.get("page_id") or entry["account_id"]),
            token_env=entry["token_env"],
            enabled=bool(entry.get("enabled", True)),
        )
    if not accounts:
        raise RulesError("rules.json defines no accounts")

    rules: list[Rule] = []
    seen_ids: set[str] = set()
    for entry in raw.get("rules", []):
        rule_id = entry.get("id")
        if not rule_id:
            raise RulesError(f"rule is missing 'id': {entry}")
        if rule_id in seen_ids:
            raise RulesError(f"duplicate rule id '{rule_id}'")
        seen_ids.add(rule_id)

        account_id = entry.get("account_id")
        if account_id not in accounts:
            raise RulesError(f"rule '{rule_id}' references unknown account '{account_id}'")

        match = entry.get("match", {})
        mode = match.get("mode", "contains")
        if mode not in MATCH_MODES:
            raise RulesError(
                f"rule '{rule_id}': match.mode must be one of {', '.join(MATCH_MODES)}"
            )
        keywords = [k for k in match.get("keywords", []) if k]
        if mode != "any" and not keywords:
            raise RulesError(f"rule '{rule_id}': needs at least one keyword")
        if mode == "regex":
            for keyword in keywords:
                try:
                    re.compile(keyword)
                except re.error as exc:
                    raise RulesError(f"rule '{rule_id}': bad regex '{keyword}': {exc}") from exc

        triggers = tuple(entry.get("triggers") or ("comment", "dm"))
        for trigger in triggers:
            if trigger not in TRIGGERS:
                raise RulesError(
                    f"rule '{rule_id}': trigger must be one of {', '.join(TRIGGERS)}"
                )

        dm = entry.get("dm", {})
        if not dm.get("text"):
            raise RulesError(f"rule '{rule_id}': dm.text is required")
        document = dm.get("document") or {}

        rules.append(
            Rule(
                id=rule_id,
                account_id=account_id,
                keywords=keywords,
                dm_text=dm["text"],
                document_url=document.get("url"),
                document_name=document.get("name"),
                follow_up=dm.get("follow_up"),
                public_reply=entry.get("public_reply"),
                match_mode=mode,
                case_sensitive=bool(match.get("case_sensitive", False)),
                triggers=triggers,
                media_ids=[str(m) for m in entry.get("media_ids", [])],
                once_per_user=bool(entry.get("once_per_user", False)),
                priority=int(entry.get("priority", 0)),
                enabled=bool(entry.get("enabled", True)),
            )
        )
    if not rules:
        raise RulesError("rules.json defines no rules")
    return RuleSet(accounts=accounts, rules=rules)


def render(template: str, *, username: str | None, name: str | None) -> str:
    """Fill {username} / {first_name} placeholders. Unknown names degrade to 'there'."""
    first_name = (name or "").strip().split(" ")[0] if name else ""
    return (
        template.replace("{username}", username or first_name or "there")
        .replace("{first_name}", first_name or username or "there")
    )
