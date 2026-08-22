# Forex Trade Hub — Forex Trading Community Platform

A production-grade Forex signals, education and community platform: a React Native
mobile app for iOS and Android, a React admin dashboard, and a Firebase backend.

```
forex-trade-hub/
├── mobile/     React Native (Expo SDK 57, RN 0.86, TypeScript) — the iOS + Android app
├── admin/      React 19 + TypeScript + Vite — the web admin dashboard
├── backend/    Firestore rules, indexes, Cloud Functions (TypeScript), seed script
└── docs/       Architecture, data model, Firebase setup, builds, release checklist
```

---

## 1. What it does

**For members**
- Trading signals with entry, stop loss, up to three take-profit levels, computed
  risk/reward, confidence rating, chart, and technical + fundamental analysis
- A live dashboard: market snapshot, latest signal, daily brief, today's results,
  news, education progress and community activity
- Private moderated community chat — text, photos, video, voice notes, files,
  reactions, replies, pinned messages and search
- Daily and weekly polls with one-vote-per-member enforcement
- A structured course library (Forex basics → SMC / ICT → psychology) with
  progress tracking and quizzes
- A Forex news feed with categories
- Free and Premium tiers with Apple In-App Purchase and Google Play Billing

**For operators**
- Web dashboard with live platform metrics and charts
- User management: search, filter, roles, plans, suspend/ban/mute, community
  approvals
- Signal composer with lifecycle controls (entry hit → TP/SL → closed)
- News, course and lesson publishing
- Community moderation, announcements and polls
- Subscription ledger and an append-only audit log
- Runtime settings — signal allowances, feature flags, product IDs and legal copy
  change live, with no app release

---

## 2. Requirements

| Tool | Version | Notes |
|---|---|---|
| Node.js | 22 LTS | Required by the Cloud Functions runtime |
| npm | 10+ | |
| Firebase CLI | 13+ | `npm i -g firebase-tools` |
| EAS CLI | 12+ | `npm i -g eas-cli` — for cloud builds |
| Xcode | 16+ | iOS builds only (macOS) |
| Android Studio | Ladybug+ | Android SDK 36, JDK 17 |
| A Firebase project | Blaze plan | Cloud Functions and outbound calls to the store APIs require it |

> This app uses `@react-native-firebase`, which needs native modules. It runs in a
> **development build**, not Expo Go. See §6.

---

## 3. Quick start

```bash
# 1. Backend
cd backend/functions && npm install && cd ..
firebase login
firebase use --add                    # select your project
firebase deploy --only firestore:rules,firestore:indexes,storage,functions

# 2. Mobile
cd ../mobile && npm install
#    drop in google-services.json and GoogleService-Info.plist (see docs/FIREBASE_SETUP.md)
npx expo prebuild                     # generates android/ and ios/
npm run android                       # or: npm run ios

# 3. Admin
cd ../admin && npm install
cp .env.example .env                  # fill in the Firebase web config
npm run dev                           # http://localhost:5173

# 4. Seed demo content and promote yourself to admin
#    (register in the app first, then:)
cd ../backend/functions
export GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
export FIREBASE_PROJECT_ID=your-project-id
export ADMIN_EMAIL=you@example.com
npx ts-node scripts/seed.ts
```

Full walkthrough: **[docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md)**.

---

## 4. Architecture at a glance

| Layer | Choice | Why |
|---|---|---|
| Mobile | Expo SDK 57 + React Native 0.86 + TypeScript | Managed native builds via EAS, but full native module access through config plugins |
| Routing | expo-router (file-based) | Typed routes; deep links from notifications work with no extra wiring |
| State | Zustand + Firestore listener hooks | One system, used consistently. Server state comes from real-time listeners; Zustand holds the session and UI state |
| Styling | Centralised theme + StyleSheet | Every colour, space and font size resolves through `src/theme` — a rebrand is one file |
| Backend | Firebase (Auth, Firestore, Storage, FCM, Functions, Analytics, Crashlytics) | Real-time by default, and the security rules language is expressive enough to hold the authorization model |
| Admin | React 19 + Vite + Firebase Web SDK | Fast, static-hostable on Firebase Hosting |
| Payments | Apple IAP + Google Play Billing via `react-native-iap` | Required by both stores for digital subscriptions |

Detail: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** · **[docs/DATA_MODEL.md](docs/DATA_MODEL.md)**

### The one rule that shapes everything

**Privilege never comes from a client-writable field.** Role, plan, account status
and community membership live in Firebase Auth **custom claims**, which only a
Cloud Function can mint. Security rules read the claims. The matching fields on
`/users/{uid}` are display copies, and the rules explicitly forbid clients from
writing them.

This is why:
- Premium signals are unreadable to free accounts at the database level — not
  hidden in the UI. Locked previews come from a separate server-written
  `signal_teasers` projection that contains no tradable level.
- A purchase grants nothing until `verifyPurchase` validates the token directly
  with Apple or Google.
- Poll tallies are computed in a transaction server-side, so no client can inflate
  a result.

---

## 4b. Demo build (testable APK, no backend)

A single flag produces an APK that runs entirely offline against a realistic
in-memory dataset — no Firebase project, no sign-in, no network:

**No Android SDK installed?** Push to GitHub and run the **"Build demo APK"**
workflow (Actions → Run workflow). It installs the toolchain, builds, and
attaches the APK to the run — nothing needed on your machine.

**Have the SDK?** One command:

```bash
cd mobile && npm run build:demo     # → mobile/forextradehub-demo.apk
```

The branch sits at the repository boundary, so the UI under test is the real UI.
The store is mutable: send a message, vote in the poll, complete a lesson,
subscribe — all of it works and persists for the session. **Profile → Demo build
→ Premium access** toggles between the free and premium experience so one APK
demonstrates both.

Full detail: **[docs/DEMO_BUILD.md](docs/DEMO_BUILD.md)**

---

## 5. Verification status

Everything in this repository compiles:

```bash
cd mobile   && npm run typecheck              # tsc --noEmit
cd mobile   && npx expo export -p android     # real Metro/Hermes bundle
cd admin    && npm run build                  # tsc -b && vite build → dist/
cd backend/functions && npm run build
```

What has **not** been run here, because it needs credentials and platform SDKs:
a real Firebase project, an iOS/Android device build, and live store purchases.
See §7 of [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md) for the manual
test matrix.

---

## 6. Why a development build, not Expo Go

`@react-native-firebase` and `react-native-iap` are native modules. Expo Go ships a
fixed set of native code and cannot load them. The project is configured for
[development builds](https://docs.expo.dev/develop/development-builds/introduction/):

```bash
npx expo prebuild            # generate native projects
npm run android              # build + install a dev client
npm start                    # then reload JS instantly as usual
```

You keep fast refresh and over-the-air JS reloads; you just install a custom dev
client once instead of Expo Go.

---

## 7. Building for the stores

```bash
# Android APK (QA / sideload)
npm run build:apk            # eas build -p android --profile preview

# Android AAB (Google Play)
npm run build:aab            # eas build -p android --profile production

# iOS (App Store)
npm run build:ios            # eas build -p ios --profile production
```

Local Gradle builds without EAS are also supported (`npm run build:apk:local`).
Full instructions, signing, and store metadata: **[docs/BUILD_AND_RELEASE.md](docs/BUILD_AND_RELEASE.md)**.

---

## 8. Compliance and risk disclosure

This is a trading-adjacent product, and it is written to be defensible:

- Signals and lessons are labelled educational and informational throughout
- The risk disclaimer appears on every screen that shows a signal, a result or a
  performance figure, and its text is editable from the admin panel
- Historical win rates always carry "past performance does not guarantee future
  results"
- Signal confidence is qualitative (low / medium / high), never a probability
- No claim anywhere promises profit, guarantees signals, or describes trading as
  risk-free
- Digital subscriptions use only Apple IAP and Google Play Billing — no external
  payment path
- Account deletion is implemented in-app, as both stores require

---

## 9. What is deliberately Phase 2

The schema and module boundaries make room for these without a rewrite:
TradingView charts, a live market data feed (the app already reads
`market_quotes`, currently seeded), the economic calendar, an AI trade assistant,
a personal trade journal, broker integration, referrals and multi-language.

`docs/ARCHITECTURE.md` §9 lists the extension point for each.

---

## 10. Documentation

| Document | Covers |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Folder structure, layering, state, security model, Phase 2 seams |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | Every Firestore collection, field and index |
| [docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md) | Project creation, config files, rules, functions, secrets, seeding |
| [docs/BUILD_AND_RELEASE.md](docs/BUILD_AND_RELEASE.md) | APK, AAB, iOS builds, signing, submission |
| [docs/ADMIN_SETUP.md](docs/ADMIN_SETUP.md) | Granting admin access, deploying the dashboard |
| [docs/DEMO_BUILD.md](docs/DEMO_BUILD.md) | The offline demo APK: what it contains, how to build it |
| [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md) | Pre-launch verification and the manual test matrix |
