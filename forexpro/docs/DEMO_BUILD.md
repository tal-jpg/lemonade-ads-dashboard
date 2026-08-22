# Demo build — a testable APK with sample data

This produces an APK you can install on any Android phone and use immediately:
no Firebase project, no sign-in, no network. Every screen is populated with a
realistic dataset and the app is fully interactive.

---

## 1. What demo mode actually does

`EXPO_PUBLIC_DEMO_MODE=1` flips a compile-time constant
(`src/config/demo.ts`). Each repository function checks it once and delegates to
an in-memory store instead of Firestore:

```
hooks / screens / components        ← identical in both modes
        │
services/firebase/*Repo.ts          ← one early return per function
        ├── DEMO_MODE  → services/demo/repos.ts → services/demo/db.ts
        └── otherwise  → Firestore
```

Because the branch sits at the repository boundary, **the UI you test is the
real UI** — same components, same hooks, same loading, empty and error states.

It is not a static mock. The store is observable and mutations write back:

| Action | Result |
|---|---|
| Send a chat message | Appears in the room immediately, with your avatar |
| React to a message | Count updates and toggles |
| Delete your message | Soft-deletes, shows "This message was removed" |
| Vote in the poll | Tally moves, results reveal, second vote refused |
| Complete a lesson | Progress bar advances on Learn and Home |
| Edit your profile | Name, bio and address persist across screens |
| Tap Subscribe | Grants premium, whole app unlocks |
| Toggle plan in Profile | Switches the tier instantly, both directions |

---

## 2. The sample dataset

| Area | What's included |
|---|---|
| Signals | 6 — one active with TP1 hit, one pending, two closed wins, one stopped out, two premium |
| Teasers | Locked previews for today's premium signals (pair and direction only) |
| Market | 6 pairs with sparklines, labelled as demo prices |
| Daily brief | Market mood, 4 pair biases, 3 events, 3 key levels |
| Today's stats | 3 signals, 2 wins, 1 loss, 66.7% win rate, 2.33 avg R:R |
| News | 5 articles across 4 categories, 2 premium |
| Education | 4 courses, 8 lessons including a 3-question quiz; 2 already complete |
| Community | 12 messages — replies, reactions, a photo, a voice note, a pinned rule, a system join |
| Members | 7, including an admin and a moderator, with online presence |
| Poll | Active weekly poll with 65 existing votes |
| Notifications | 7, three unread, all deep-linking to real screens |
| Announcements | 2, one pinned |

The demo account is **Alex Morgan** (`@alexm`), free tier, community approved.

---

## 3. Switching between free and premium

Open **Profile → Demo build → Premium access**.

This is the fastest way to review the product, because the two experiences are
genuinely different:

**Free** — premium signals appear as locked cards with `••••` instead of levels,
opening one shows the paywall, premium lessons and articles are gated, the
allowance meter caps at 3/day, and the history limit triggers the upgrade card.

**Premium** — every signal shows entry, stop and all targets with full analysis,
the whole course library opens, and the membership card turns gold.

Tapping **Subscribe** on the paywall reaches the same state, so the purchase
flow is testable end to end without a store account.

---

## 4. Building the APK

Three routes, easiest first.

### A. GitHub Actions — nothing to install

Push this repository to GitHub, then **Actions → "Build demo APK" → Run
workflow**. It provisions JDK 17 and the Android SDK, builds, and attaches the
APK to the run. Download **fxpulse-demo-apk**, unzip, install.

The workflow (`.github/workflows/build-demo-apk.yml`) also runs on every push
that touches `mobile/`, so the default branch always has a downloadable build.
A `live` mode is included for when you have a real `google-services.json` —
store it as the `GOOGLE_SERVICES_JSON` repository secret.

### B. One command locally

```bash
cd mobile
npm run build:demo
```

`scripts/build-demo-apk.sh` verifies Node, JDK 17 and the Android SDK, prints a
specific fix for whichever is missing, then builds and drops the result at
`mobile/fxpulse-demo.apk`.

### C. Manual

Prerequisites: Node 22, JDK 17, Android SDK (platform 36, build-tools 36),
`ANDROID_HOME` set.

```bash
cd mobile
npm install

cp .env.demo .env                          # sets EXPO_PUBLIC_DEMO_MODE=1
cp google-services.demo.json google-services.json

npx expo prebuild --platform android --clean
cd android
./gradlew assembleRelease
```

Output:

```
android/app/build/outputs/apk/release/app-release.apk
```

Install it:

```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

The generated project signs release builds with the debug keystore, which is
exactly what you want for a test APK — it installs on any device without
configuring signing. Do **not** ship that to Google Play; see
docs/BUILD_AND_RELEASE.md for release signing.

### D. EAS Build (Expo's cloud, no local SDK)

```bash
npm i -g eas-cli && eas login
eas build --platform android --profile preview
```

Add the demo variables to the `preview` profile in `eas.json`:

```json
"preview": {
  "extends": "base",
  "distribution": "internal",
  "channel": "preview",
  "android": { "buildType": "apk" },
  "env": { "EXPO_PUBLIC_DEMO_MODE": "1", "APP_NAME": "FX Pulse Demo" }
}
```

---

## 5. About the placeholder Firebase config

`google-services.demo.json` contains a syntactically valid but entirely fake
project. The `@react-native-firebase/app` Gradle plugin requires the file to
exist at build time, so the build needs one — but in demo mode no Firebase call
is ever made, so its contents are never used.

Your real `google-services.json` stays gitignored.

---

## 6. Going from the demo build to a live build

```bash
rm .env                                    # or set EXPO_PUBLIC_DEMO_MODE=0
cp /path/to/real/google-services.json mobile/google-services.json
npx expo prebuild --platform android --clean
```

Nothing else changes. The demo dataset is behind a compile-time constant, so a
production bundle does not carry it.

---

## 7. What the demo build deliberately cannot do

These need a real backend and are non-functional by design:

- **Push notifications.** No FCM project, so registration is skipped. The
  in-app notification centre is fully populated.
- **Real sign-in / registration.** The session is synthesised. Onboarding is
  still reachable on first launch.
- **Real purchases.** The paywall lists illustrative prices and grants the
  entitlement locally. No store is contacted and no charge is possible.
- **Media upload.** Picking a photo works, but the upload target does not exist.
  Sample media in the seeded messages displays normally.
- **Live prices.** Quotes are the seeded set and are labelled as demo in the UI.
