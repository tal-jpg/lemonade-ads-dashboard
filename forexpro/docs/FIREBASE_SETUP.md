# Firebase setup

End to end, from an empty Google account to a running app. Budget about 45
minutes the first time.

---

## 1. Create the project

1. <https://console.firebase.google.com> → **Add project**
2. Name it (e.g. `fxpulse-prod`), enable Google Analytics (needed for Crashlytics
   and product analytics)
3. **Upgrade to the Blaze plan.** Cloud Functions and the outbound calls to the
   Apple and Google store APIs both require it. Set a budget alert while you are
   there.

Consider a second project (`fxpulse-dev`) and switch with `firebase use`.

---

## 2. Enable the services

| Service | Setting |
|---|---|
| **Authentication** | Sign-in method → enable **Email/Password** |
| **Firestore** | Create database → **Production mode** → pick a region close to your users (it cannot be changed later) |
| **Storage** | Get started → Production mode → same region |
| **Cloud Messaging** | Enabled with the project |
| **Crashlytics** | Enable from the console |

---

## 3. Register the apps

### Android
Project settings → **Add app** → Android.

- Package name: `com.fxpulse.app` (must match `APP_BUNDLE_ID`)
- Download `google-services.json` → `mobile/google-services.json`

For release builds, add your signing SHA-1 and SHA-256 (Project settings → your
Android app → Add fingerprint). Get them from EAS with
`eas credentials -p android`.

### iOS
Project settings → **Add app** → iOS.

- Bundle ID: `com.fxpulse.app`
- Download `GoogleService-Info.plist` → `mobile/GoogleService-Info.plist`
- Upload your APNs auth key (.p8) under Cloud Messaging → Apple app configuration.
  Without it, iOS push silently does nothing.

### Web (for the admin dashboard)
Project settings → **Add app** → Web. Copy the config into `admin/.env`.

> **Both mobile config files are gitignored.** They are not secrets in the
> cryptographic sense, but they identify your project and should not sit in a
> public repository. Supply them through EAS secrets in CI.

---

## 4. Deploy rules, indexes and functions

```bash
cd backend
firebase login
firebase use --add          # select your project, alias it "default"

cd functions && npm install && cd ..

firebase deploy --only firestore:rules,firestore:indexes,storage
firebase deploy --only functions
```

Index builds take a few minutes on a populated database and are instant on an
empty one. Deploy them **before** first use — a missing composite index surfaces
at runtime as `failed-precondition` with a console link.

---

## 5. Configure store verification

Subscriptions will not activate until this is done. Skip it only if you are
building without payments for now.

### Apple

1. App Store Connect → **Users and Access → Integrations → App Store Connect API**
2. Create a key with the **App Manager** role; download the `.p8` (once only)
3. Note the **Issuer ID** and **Key ID**

```bash
firebase functions:secrets:set APPLE_PRIVATE_KEY   # paste the whole .p8 contents

firebase functions:config:set \
  apple_issuer_id="YOUR_ISSUER_ID" \
  apple_key_id="YOUR_KEY_ID" \
  apple_bundle_id="com.fxpulse.app"
```

Or set `APPLE_ISSUER_ID`, `APPLE_KEY_ID`, `APPLE_BUNDLE_ID` as function params in
the console — the code reads them via `defineString`.

**Server notifications:** App Store Connect → your app → **App Information →
App Store Server Notifications**. Set the production and sandbox URLs to:

```
https://<region>-<project-id>.cloudfunctions.net/appStoreNotifications
```

Use **Version 2** notifications.

### Google Play

1. Play Console → **Setup → API access** → link your Google Cloud project
2. Grant the Cloud Functions default service account
   (`<project-id>@appspot.gserviceaccount.com`) the **View financial data** and
   **Manage orders and subscriptions** permissions
3. Set `ANDROID_PACKAGE_NAME` to your package name

**Real-time developer notifications:** Play Console → Monetisation setup → set the
Pub/Sub topic, then add a *push* subscription on that topic pointing at:

```
https://<region>-<project-id>.cloudfunctions.net/playNotifications
```

### Create the products

Both stores need three auto-renewing subscription products whose IDs match
`app_settings/config.products`:

```
fxpulse.premium.monthly
fxpulse.premium.quarterly
fxpulse.premium.yearly
```

---

## 6. Seed the database and grant yourself admin

Register an account in the app first — the script promotes an existing user.

```bash
# Project settings → Service accounts → Generate new private key
export GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/service-account.json
export FIREBASE_PROJECT_ID=your-project-id
export ADMIN_EMAIL=you@example.com

cd backend/functions
npx ts-node scripts/seed.ts
```

This writes `app_settings/config`, the community room, market quotes, three
signals, two articles, a course with three lessons, a poll and today's brief —
and sets your `admin` claim.

The script is idempotent: re-running it updates rather than duplicates.

**Sign out and back in** in the app so the new claims land in your token.

> Keep `service-account.json` out of the repository. It grants full project
> access. `.gitignore` already excludes it.

---

## 7. Local development with the emulator suite

```bash
cd backend
firebase emulators:start
```

Point the clients at it:

```bash
# mobile/.env
EXPO_PUBLIC_USE_FIREBASE_EMULATOR=1
EXPO_PUBLIC_EMULATOR_HOST=192.168.1.50   # your machine's LAN IP, not localhost,
                                         # if you are running on a real device

# admin/.env
VITE_USE_EMULATOR=1
```

The emulator connection is guarded by `__DEV__` and can never be enabled in a
release build.

Emulator UI: <http://localhost:4000>.

---

## 8. Verify the setup

| Check | How |
|---|---|
| Auth works | Register in the app; a `users/{uid}` document appears |
| Claims minted | Firestore → your user → `role: admin` after seeding and re-login |
| Rules enforced | Sign in as a free user; a premium signal read fails with `permission-denied` |
| Functions live | `firebase functions:log` shows `onUserCreated` on registration |
| Push works | Publish a signal from the admin panel; the device receives it |
| Teasers work | As a free user, today's premium signals appear as locked cards |
| Admin panel | `cd admin && npm run dev` and sign in with the admin account |

---

## 9. Cost notes

The main cost driver is Firestore document reads.

- Listeners are all bounded with `limit`; nothing loads a whole collection
- The chat subscribes to 30 documents regardless of history size
- `useAppSettings` shares one listener process-wide
- Broadcast notifications use FCM **topics** — one API call, not one per device
- The one query that scales with user count is the in-app notification fan-out
  (one read per active user per broadcast). If you pass a few tens of thousands
  of users, move that write into a batched task queue.

Set a Blaze budget alert. For a community of a few thousand active members, this
architecture sits comfortably in the low tens of dollars per month.
