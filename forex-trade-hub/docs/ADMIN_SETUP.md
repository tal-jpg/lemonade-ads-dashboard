# Admin setup

## 1. How admin access works

Admin access is the `admin` custom claim on the Firebase Auth user. Nothing else
grants it — not a Firestore field, not a hardcoded email list, not a flag in the
client bundle.

```
claim admin: true
  ├── security rules allow privileged reads and writes
  ├── Cloud Functions accept privileged callables
  └── the dashboard route guard lets the UI render
```

Remove the claim and the account loses access everywhere at once, including in an
already-open browser tab (the functions revoke refresh tokens, so the next
request fails).

---

## 2. Granting the first admin

There is no bootstrap UI on purpose — a self-service "make me admin" button is
exactly the hole this design exists to close.

**Option A — the seed script (easiest)**

```bash
# register the account in the mobile app first
export GOOGLE_APPLICATION_CREDENTIALS=/path/service-account.json
export FIREBASE_PROJECT_ID=your-project-id
export ADMIN_EMAIL=you@example.com

cd backend/functions && npx ts-node scripts/seed.ts
```

**Option B — a one-off Node script**

```javascript
const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'your-project-id' });

(async () => {
  const user = await admin.auth().getUserByEmail('you@example.com');
  await admin.auth().setCustomUserClaims(user.uid, {
    admin: true, moderator: true, plan: 'premium',
    community: 'approved', status: 'active',
  });
  await admin.auth().revokeRefreshTokens(user.uid);
  await admin.firestore().doc(`users/${user.uid}`).set(
    { role: 'admin', plan: 'premium', community: { status: 'approved' } },
    { merge: true },
  );
  console.log('done');
})();
```

**Sign out and back in** afterwards — claims are baked into the ID token.

### Every admin after the first

Use the dashboard: **Users → find the person → Manage → Role → Admin**. That path
goes through `setUserRole`, which records the change in the audit log.

---

## 3. Running the dashboard

```bash
cd admin
cp .env.example .env      # Firebase console → Project settings → Web app
npm install
npm run dev               # http://localhost:5173
```

The web API key in `.env` is public by design — it identifies the project, it does
not authorise anything. Access is decided by the claim.

Deploy:

```bash
npm run build
cd ../backend && firebase deploy --only hosting
```

---

## 4. What each page does

| Page | Capabilities |
|---|---|
| **Overview** | Live counts, 14-day registration chart, signal win/loss chart, recent activity |
| **Users** | Search and filter; per user: upgrade/downgrade plan, set role, approve/reject community, mute/unmute, suspend/ban/activate |
| **Signals** | Compose and publish (with validation), then drive the lifecycle: entry hit → TP/SL → closed. Delete. |
| **News** | Create, publish/unpublish, delete |
| **Education** | Create courses; add, list and delete lessons |
| **Community** | Approve/reject/block join requests; pin and remove messages; send announcements |
| **Polls** | Create polls with 2–8 options, close and reopen; live results |
| **Subscriptions** | Read-only ledger of verified entitlements, by store and status |
| **Settings** | Signal allowances, feature flags, store product IDs, legal copy, maintenance mode — plus the audit log |

---

## 5. Signal composer validation

The composer refuses to publish a signal whose levels contradict its direction:

- Stop loss below entry for a buy, above entry for a sell
- Every take profit on the profitable side of entry
- At least one take profit
- Entry and stop must differ

Risk/reward is **computed** from the levels and shown live as you type. It is
never a typed field, so the ratio the app displays can never disagree with the
prices beside it.

---

## 6. Moderation reference

| Action | Effect |
|---|---|
| **Mute** | 24 hours by default. Can read the community, cannot post. |
| **Remove from community** | Community claim → `blocked`. Membership deleted. Cannot re-request. |
| **Suspend** | Account-wide. Status claim → `suspended`. Can sign in; the app shows the status banner and support contact. |
| **Ban** | Permanent. Every callable rejects the account. |
| **Reject** (join request) | Can request again later. |
| **Block** (join request) | Cannot request again. |

Message deletes are soft: the row stays so replies still resolve and there is an
audit trail. Hard deletion is admin-only and intended for illegal content.

Everything above is written to `admin_logs` with the actor, the target and a
timestamp. Read it on the Settings page.

---

## 7. Runtime settings

Settings take effect in every installed app within seconds — no release.

| Setting | Effect |
|---|---|
| `signalLimits.freePerDay` / `premiumPerDay` | The allowance meter on the Signals tab |
| `signalLimits.freeHistoryLimit` | How far back a free account can scroll before the upgrade card |
| `features.*` | Hides whole tabs (community, education) or flows |
| `products.*` | Store product IDs the paywall loads |
| `legal.riskDisclaimer` | The disclaimer text shown throughout the app |
| `maintenance.enabled` | Maintenance mode |
| `minSupportedVersion` | Forces an upgrade prompt on older clients |

Because the mobile app falls back to sane defaults when the document is missing,
a bad edit degrades rather than breaks — but the limits are still live business
rules, so change them deliberately.

---

## 8. Security notes for operators

1. **Use a separate admin account** from your personal member account. It makes
   the audit log meaningful.
2. **Enable 2FA** on the Google account that owns the Firebase project.
3. **Never share the service account JSON.** It bypasses every security rule.
4. **Review the audit log** periodically — it is the only record of who changed
   what.
5. An admin cannot remove their own admin claim; that guard exists so a project
   cannot be locked out. To step down, have another admin do it.
