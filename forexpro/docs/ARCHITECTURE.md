# Architecture

## 1. Shape of the system

```
┌───────────────────┐        ┌──────────────────────┐
│  Mobile (RN/Expo) │        │  Admin (React/Vite)  │
│  iOS + Android    │        │  Firebase Hosting    │
└─────────┬─────────┘        └──────────┬───────────┘
          │ Firestore listeners,        │ Firestore + callables
          │ Storage, callables, FCM     │
          └──────────────┬──────────────┘
                         ▼
        ┌────────────────────────────────────┐
        │            Firebase                │
        │  Auth (+ custom claims)            │
        │  Firestore  ← security rules       │
        │  Storage    ← security rules       │
        │  Cloud Functions (privileged ops)  │
        │  FCM · Analytics · Crashlytics     │
        └────────────────┬───────────────────┘
                         │ server-to-server
              ┌──────────┴───────────┐
              ▼                      ▼
     App Store Server API    Play Developer API
```

Clients read and write Firestore directly for everything unprivileged — that is
what makes the app real-time with no polling. Everything privileged goes through
a Cloud Function.

---

## 2. The authorization model

This is the single most important design decision in the codebase.

**Privilege lives in Firebase Auth custom claims, which only a Cloud Function can
mint.**

```
request.auth.token.admin      boolean
request.auth.token.moderator  boolean
request.auth.token.plan       'free' | 'premium'
request.auth.token.community  'none' | 'pending' | 'approved' | 'rejected' | 'blocked'
request.auth.token.status     'active' | 'suspended' | 'banned'
request.auth.token.mutedUntil number (epoch ms)
```

Security rules read *only* these. The same-named fields on `/users/{uid}` exist so
the admin dashboard can query and display them, and the rules explicitly reject
any client write that touches them:

```javascript
allow update: if isSelf(userId)
              && onlyTouches([...safe fields...])
              && unchanged('role') && unchanged('plan')
              && unchanged('status') && unchanged('community');
```

Consequences worth stating plainly:

| Concern | How it is actually enforced |
|---|---|
| Free user reads a premium signal | The rule rejects the document read. Not a UI filter. |
| Free user sees *something* about premium signals | A server-written `signal_teasers` doc — pair, direction, timeframe, confidence. No entry, stop or target ever leaves the server. |
| Device claims it purchased Premium | `verifyPurchase` validates the token with Apple/Google before minting the claim. |
| Client inflates a poll result | Votes are counted in a Firestore transaction inside `castVote`; the vote doc id is the uid, so a second vote is a create-on-existing and fails. |
| Banned user keeps posting | `mergeClaims` revokes refresh tokens, so the new claim applies on the next request rather than in up to an hour. |
| Admin demotes themselves and locks everyone out | `setUserRole` refuses to remove the caller's own admin claim. |

---

## 3. Mobile app layering

```
src/
├── app/            expo-router routes — screens only, no business logic
├── components/
│   ├── ui/         design system (Button, Card, Input, Badge, Skeleton, …)
│   ├── signals/    domain components (SignalCard, RiskRewardBar, TradeTimeline)
│   ├── home/  community/  learn/  news/
├── hooks/          React ↔ Firestore bindings (useSignals, useCommunity, …)
├── services/
│   ├── firebase/   client, paths, mappers, repositories, callables
│   ├── iap.ts      store purchases
│   ├── push.ts     FCM + local presentation
│   └── analytics.ts
├── store/          Zustand: authStore, settingsStore, uiStore
├── theme/          colors, typography, tokens, ThemeProvider
├── types/          the domain model
├── utils/          format, date, validate, errors, logger
└── data/           demo market data (Phase 1 only)
```

**Dependencies point one way:** `app/` → `hooks/` → `services/` → Firebase.
A screen never imports the Firestore SDK; a repository never imports a component.

### The mapper boundary

`services/firebase/mappers.ts` is the only file that knows Firestore types exist.
Every document becomes a plain object with `number` timestamps:

```typescript
export function mapSignal(snap: Snap): Signal | null
```

Mappers are defensive — a missing or malformed field yields a sane default rather
than throwing, because one bad document must never blank a whole screen.

### State management

One system, used consistently:

- **Zustand** for session and UI state (`authStore`, `settingsStore`, `uiStore`)
- **Firestore listeners** for server state, wrapped in hooks that expose
  `{ data, loading, error }`

`authStore.start()` is called once from the root layout. It owns the whole
session: the Firebase user, the profile document, the claims, and the
subscription mirror — and tears its listeners down on sign-out.

Screens read derived selectors (`useIsPremium`, `useCanPostInCommunity`) rather
than re-deriving the rules, so a change to what "can post" means is one edit.

### Theming

`useTheme()` returns colours, spacing, radii, typography and motion. Nothing in
the app hardcodes a hex value or a font size. Dark is the default and the light
palette is complete, so enabling light mode is a preference, not a project.

---

## 4. Data flow: publishing a signal

```
Admin composer
   │ addDoc(signals/…)  status: published, isPremium: true
   ▼
onSignalPublished (Firestore trigger)
   ├── writes signal_teasers/{id}         ← the locked preview free users see
   ├── FCM topic "premium"  → full alert
   ├── FCM topic "free"     → upgrade nudge, no levels
   ├── writes in-app notification docs, respecting each user's prefs
   └── bumps daily_stats/{today}.signals
   ▼
Premium device: onSnapshot(signals) delivers the document
Free device:    rule rejects it; onSnapshot(signal_teasers) delivers the teaser
```

When the trade closes, `onSignalUpdated` notifies again and folds the result into
`daily_stats`. A nightly `rebuildDailyStats` recomputes yesterday from the source
documents, so a missed trigger cannot leave a published win rate permanently
wrong.

---

## 5. Performance

| Technique | Where |
|---|---|
| Bounded queries — every listener has a `limit` | all repositories |
| Cursor pagination | signals, news, chat history |
| Live-tail + paged history | chat subscribes only to the newest 30 messages |
| `FlashList` | signals feed, chat, notifications, news |
| Memoised message rows | `MessageBubble` compares only render-affecting fields |
| Cached images | `expo-image` with `memory-disk` policy |
| Skeletons matching real layout | no reflow when data lands |
| Module-level settings cache | `useAppSettings` shares one listener across all callers |
| Hermes bytecode | Expo default |

The chat is the stress case: opening a room with 100k messages costs one query for
30 documents.

---

## 6. Notifications

FCM owns delivery, `expo-notifications` owns presentation.

- **Topics** (`all`, `free`, `premium`) for broadcasts — one API call reaches
  every device, and topic membership follows the plan claim.
- **Token registry** in `users/{uid}/private/devices` for per-user notifications.
  Tokens the API reports as permanently invalid are pruned after each send.
- **Preferences** are checked server-side before the in-app document is written,
  so the notification centre matches what was actually pushed.
- **Deep links**: every notification carries `route`, handled in all three app
  states (foreground, background tap, cold start).

---

## 7. Subscriptions

```
App: requestPurchase()  →  store sheet  →  purchaseUpdatedListener
                                                │ purchaseToken
                                                ▼
                              verifyPurchase (callable)
                                 ├── Apple: App Store Server API (ES256 JWT)
                                 └── Google: Play Developer API
                                                │
                              writes subscriptions/{uid} + mints plan claim
                                                │
                                    finishTransaction()
```

`finishTransaction` runs only after the server records the entitlement, so a crash
mid-flow leaves the purchase to be replayed rather than lost.

Three mechanisms keep entitlement correct over time:
1. **Store webhooks** — App Store Server Notifications V2 and Play RTDN
2. **Restore purchases** — re-verifies every owned purchase
3. **Hourly sweep** — `expireSubscriptions` downgrades anything past expiry

---

## 8. Admin dashboard

React 19 + Vite + the Firebase Web SDK, hosted on Firebase Hosting. The route
guard checks the `admin` claim, but the guard is a convenience: every read and
write behind it is independently rejected by security rules without the claim.

Privileged actions call Cloud Functions (`setUserRole`, `setUserPlan`,
`moderateUser`, `decideJoinRequest`) rather than writing Firestore. Content
management (signals, news, courses, polls, announcements) writes directly,
because the rules already restrict those collections to admins.

---

## 9. Phase 2 extension points

Each of these has a seam already in place:

| Feature | Where it plugs in |
|---|---|
| Live market data | `market_quotes` is already the app's source; replace the seed writer with a scheduled function. No client change. |
| TradingView charts | `Sparkline` is isolated behind a props interface; the signal detail screen has a dedicated chart slot. |
| Economic calendar | `daily_briefs.events` already carries the shape. |
| AI trade assistant | Add a callable; the `callables.ts` wrapper is the only place to register it. |
| Trade journal | New `journal/{uid}/trades` collection; `user_progress` is the pattern to copy. |
| Referrals / affiliate | `users` has room for `referredBy`; the audit log pattern covers attribution. |
| Multi-language | All user-facing strings live in components; extract to i18n resources. The theme and layout already tolerate longer strings. |
| Support chat | Reuse the community message model with a per-user room id. |

The rule for all of them: add a collection and a function, not a rewrite.
