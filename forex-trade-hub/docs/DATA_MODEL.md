# Data model

The authoritative description of every Firestore collection. The TypeScript
mirrors are `mobile/src/types/models.ts` and `admin/src/lib/types.ts`; when they
disagree with this document, this document is what should be corrected to.

**Convention:** timestamps are stored as Firestore `Timestamp` and converted to
epoch milliseconds (`number`) at the mapper boundary. `→` marks a denormalised
copy kept for query or display purposes.

---

## users/{uid}

The profile. Privilege fields here are **display copies** — the authoritative
values are custom claims.

| Field | Type | Notes |
|---|---|---|
| `uid` | string | Matches the document id |
| `fullName` | string | |
| `username` / `usernameLower` | string | Immutable after creation |
| `email` | string | |
| `photoURL` | string | Storage download URL |
| `bio` | string | ≤ 200 chars |
| `address` | map | `line1`, `city`, `country` — all optional |
| `role` | `user \| moderator \| admin` | → claim `admin` / `moderator` |
| `plan` | `free \| premium` | → claim `plan` |
| `planExpiresAt` | timestamp\|null | |
| `planSource` | `apple \| google \| manual` | |
| `status` | `active \| suspended \| banned` | → claim `status` |
| `community.status` | `none \| pending \| approved \| rejected \| blocked` | → claim `community` |
| `community.joinedAt` | timestamp | |
| `community.mutedUntil` | number | → claim `mutedUntil` |
| `notificationPrefs` | map<string, boolean> | Checked server-side before fan-out |
| `themePreference` | `dark \| light \| system` | |
| `onboardingCompleted` | boolean | |
| `createdAt` / `updatedAt` / `lastLoginAt` | timestamp | |
| `platform` / `appVersion` | string | For the admin dashboard |
| `stats.lessonsCompleted` / `stats.messagesSent` | number | Cosmetic counters |

**Writable by the owner:** `fullName`, `photoURL`, `bio`, `address`,
`notificationPrefs`, `themePreference`, `onboardingCompleted`, `lastLoginAt`,
`platform`, `appVersion`. Everything else is admin- or server-only.

### users/{uid}/private/contact
Owner + admin only. `phone`, `email`.

### users/{uid}/private/devices
Server-managed. `fcmTokens: string[]`, `platforms`.

---

## usernames/{usernameLower}
`{ uid, createdAt }`. Uniqueness index. A client may `create` (which fails if the
document exists) but never update or delete — that is what makes handle claiming
atomic against a race.

---

## subscriptions/{uid}
**Server-write only.** A client that could write here could grant itself premium.

| Field | Type |
|---|---|
| `plan` | `free \| premium` |
| `status` | `active \| in_grace \| on_hold \| cancelled \| expired \| refunded` |
| `productId` | string |
| `store` | `apple \| google \| manual` |
| `originalTransactionId` | string — the join key for store webhooks |
| `startedAt` / `expiresAt` | timestamp |
| `autoRenewing` / `isTrial` | boolean |
| `environment` | `sandbox \| production` |
| `lastVerifiedAt` | timestamp |

## purchase_events/{auto}
Append-only verification history for support and reconciliation. Admin-read only.

---

## signals/{id}

| Field | Type | Notes |
|---|---|---|
| `pair` | string | `EURUSD` — no slash in storage |
| `direction` | `buy \| sell` | |
| `entry` / `stopLoss` | number | |
| `takeProfits` | array | `{ level: 1\|2\|3, price, hit, hitAt }` |
| `riskReward` | number | Computed from the levels, never typed |
| `timeframe` | string | `M5 … W1` |
| `strategy` | string | |
| `confidence` | `low \| medium \| high` | Qualitative — never a probability |
| `chartUrl` | string | |
| `analysis` | map | `technical`, `fundamental` |
| `status` | `draft \| published \| cancelled` | Publication state |
| `tradeState` | `pending \| active \| tp_hit \| sl_hit \| closed \| cancelled` | Trade state |
| `result` | `win \| loss \| breakeven` | |
| `pips` | number | Signed |
| `isPremium` | boolean | Drives the read rule |
| `timeline` | array | `{ state, at, note }` — powers the status timeline |
| `authorId` / `authorName` | string | |
| `publishedAt` / `createdAt` / `updatedAt` / `closedAt` | timestamp | |

Two independent state fields is deliberate: a signal can be `published` while its
trade is still `pending`, and cancelling a *publication* is a different act from
cancelling a *trade*.

## signal_teasers/{signalId}
**Server-write only, readable by any signed-in user.** Created by
`onSignalPublished` for premium signals only.

`pair`, `direction`, `timeframe`, `confidence`, `publishedAt` — and nothing else.
By construction it contains no tradable level, which is what makes it safe to
show a free account.

---

## daily_stats/{yyyy-MM-dd}
Server-write only. `signals`, `wins`, `losses`, `breakeven`, `totalPips`,
`rrSum`, `rrCount`, `winRate` (0–100), `avgRR`.

`winRate` and `avgRR` are derived inside the same transaction as the counters, so
they can never disagree with them.

## daily_briefs/{yyyy-MM-dd}
`mood`, `headline`, `summary`, `majorPairs[]`, `events[]`, `keyLevels[]`, `focus`,
`isPremium`, `publishedAt`.

---

## news/{id}
`title`, `summary`, `body`, `category`, `imageUrl`, `source`, `sourceUrl`,
`isPremium`, `status`, `authorId`, `publishedAt`, `createdAt`.

Categories: `forex`, `economy`, `central_banks`, `interest_rates`, `gold`, `usd`,
`global_markets`.

---

## courses/{id}
`title`, `description`, `category`, `level`, `coverUrl`, `isPremium`,
`lessonCount`, `estimatedMinutes`, `order`, `status`, `createdAt`.

Categories: `forex_basics`, `technical_analysis`, `fundamental_analysis`, `smc`,
`ict`, `risk_management`, `trading_psychology`, `advanced`.

### courses/{id}/lessons/{lessonId}
`courseId`, `title`, `type` (`text \| video \| pdf \| quiz`), `summary`,
`content`, `videoUrl`, `pdfUrl`, `imageUrls[]`, `quiz[]`, `durationMinutes`,
`order`, `isPremium`.

`quiz[]`: `{ id, question, options[], correctIndex, explanation }`.

> The correct answer ships to the client. That is the right trade for an
> educational quiz — instant feedback matters more than exam integrity. Move
> grading to a callable if that ever changes.

## user_progress/{uid}/lessons/{lessonId}
Owner-only. `courseId`, `completed`, `completedAt`, `score`.

---

## community/{communityId}
Single room, id `main`. `name`, `description`, `memberCount`, `onlineCount`,
`pinnedMessageId`, `dailyTopic`, `rules[]`, `updatedAt`.

### community/main/messages/{id}
Readable only by approved members.

| Field | Type |
|---|---|
| `authorId` / `authorName` / `authorPhoto` | string |
| `authorRole` / `authorPlan` | denormalised for badge rendering |
| `type` | `text \| image \| video \| audio \| file \| system` |
| `text` | string ≤ 4000 |
| `media` | `{ url, width, height, durationMs, sizeBytes, name, mimeType, waveform[] }` |
| `replyTo` | `{ id, authorName, preview }` |
| `reactions` | `{ [emoji]: uid[] }` |
| `mentions` | uid[] |
| `pinned` / `deleted` / `forwarded` | boolean |
| `deletedBy` | string |
| `createdAt` / `editedAt` | timestamp |

Deletes are **soft**, so replies pointing at a message still resolve and
moderators keep an audit trail.

### community/main/typing/{uid}
Ephemeral presence. `{ name, at }`.

## community_members/{uid}
`displayName`, `username`, `photoURL`, `role`, `plan`, `status`, `mutedUntil`,
`joinedAt`, `lastSeenAt`, `lastReadAt`. Members may update only their own
`lastReadAt` / `lastSeenAt`.

## join_requests/{uid}
`uid`, `fullName`, `username`, `email`, `photoURL`, `message`, `status`,
`createdAt`, `decidedAt`, `decidedBy`.

Users create; only staff decide. There is deliberately **no self-service leave** —
removal is an administrative act.

---

## polls/{id}
`question`, `description`, `type`, `options[]` (`{ id, label, votes }`),
`totalVotes`, `allowMultiple`, `isActive`, `expiresAt`, `createdAt`, `createdBy`.

### polls/{id}/votes/{uid}
`{ uid, optionIds[], votedAt }`. Create-only; update and delete are denied to
everyone. The document id being the uid is what makes double voting impossible.

---

## announcements/{id}
`title`, `body`, `level` (`info \| important \| critical`), `audience`
(`all \| free \| premium`), `pinned`, `createdAt`, `createdBy`.

## notifications/{uid}/items/{id}
Owner-read. Server-write only. `type`, `title`, `body`, `imageUrl`, `route`,
`data`, `read`, `createdAt`. The owner may flip `read` and delete.

## market_quotes/{symbol}
`symbol`, `displayName`, `price`, `change`, `changePct`, `high`, `low`,
`sparkline[]`, `digits`, `updatedAt`. Seeded in Phase 1; a scheduled feed writer
replaces the writer in Phase 2 with no client change.

## app_settings/config
World-readable, admin-write. The app's runtime business rules:

```jsonc
{
  "signalLimits": { "freePerDay": 3, "premiumPerDay": 6, "freeHistoryLimit": 20 },
  "features": { "communityEnabled": true, "pollsEnabled": true, ... },
  "products":  { "monthly": "...", "quarterly": "...", "yearly": "..." },
  "legal":     { "termsUrl": "...", "privacyUrl": "...", "supportEmail": "...",
                 "riskDisclaimer": "..." },
  "maintenance": { "enabled": false, "message": "" },
  "minSupportedVersion": "1.0.0"
}
```

## reports/{id}
`reporterId`, `targetType`, `targetId`, `reason`, `status`, `createdAt`.
Anyone may create; only staff may read.

## admin_logs/{id}
Append-only, server-write, admin-read. `actorId`, `actorName`, `action`,
`targetType`, `targetId`, `meta`, `createdAt`.

---

## Indexes

`backend/firestore.indexes.json` carries every composite index the app needs.
The ones that matter most:

| Collection | Fields | Used by |
|---|---|---|
| signals | `status ASC, isPremium ASC, publishedAt DESC` | the free-tier feed |
| signals | `status ASC, publishedAt DESC` | the premium feed |
| news | `status ASC, category ASC, publishedAt DESC` | filtered news |
| messages | `deleted ASC, createdAt DESC` | chat history |
| users | `plan ASC, createdAt DESC` | admin filters |
| join_requests | `status ASC, createdAt DESC` | the approval queue |
| items (collection group) | `read ASC, createdAt DESC` | the unread badge |

Deploy them with `firebase deploy --only firestore:indexes` before first use —
a missing composite index surfaces as a `failed-precondition` at runtime with a
console link to create it.

---

## Storage layout

```
avatars/{uid}/profile.{ext}              owner write, ≤5MB, images
community/{uid}/images/{id}.{ext}        members, ≤10MB
community/{uid}/videos/{id}.{ext}        members, ≤50MB
community/{uid}/audio/{id}.{ext}         members, ≤15MB
community/{uid}/files/{id}-{name}        members, ≤20MB, documents
signals/{file}                           admin write, all read
news/{file}                              admin write, all read
courses/{courseId}/{file}                admin write, all read
courses/{courseId}/premium/{file}        admin write, premium read
```

Every path constrains owner, content type and size. `storage.rules` mirrors this
table exactly.
