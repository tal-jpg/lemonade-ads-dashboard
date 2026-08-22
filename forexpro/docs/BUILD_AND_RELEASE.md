# Building and releasing

## 0. Before any build

- [ ] `mobile/google-services.json` and `mobile/GoogleService-Info.plist` in place
- [ ] `firebase deploy --only firestore:rules,firestore:indexes,storage,functions` done
- [ ] `app_settings/config` seeded
- [ ] Store products created with matching IDs
- [ ] `npm run typecheck` passes in `mobile/`

---

## 1. Development build

`@react-native-firebase` and `react-native-iap` are native modules, so **Expo Go
cannot run this app**. You need a development build once; after that, JS reloads
work exactly as usual.

```bash
cd mobile
npm install
npx expo prebuild            # generates android/ and ios/
npm run android              # or npm run ios
npm start                    # metro, with fast refresh
```

Or build the dev client in the cloud:

```bash
eas build --profile development --platform android
```

`android/` and `ios/` are generated output — they are gitignored, and
`expo prebuild --clean` regenerates them from `app.config.ts` at any time. Make
native changes through config plugins, not by editing those folders.

---

## 2. Android APK (QA, sideload, stakeholder review)

### With EAS (recommended)

```bash
npm i -g eas-cli
eas login
eas build:configure          # first time only — links the project
npm run build:apk            # eas build -p android --profile preview
```

EAS generates and stores the keystore. Download the `.apk` from the build page or
with `eas build:list`.

### Locally

```bash
npm run build:apk:local
# → android/app/build/outputs/apk/release/app-release.apk
```

Local release builds need a keystore. Generate one:

```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore fxpulse-release.keystore \
  -alias fxpulse -keyalg RSA -keysize 2048 -validity 10000
```

Then in `android/gradle.properties` (never commit this):

```properties
FXPULSE_UPLOAD_STORE_FILE=fxpulse-release.keystore
FXPULSE_UPLOAD_KEY_ALIAS=fxpulse
FXPULSE_UPLOAD_STORE_PASSWORD=…
FXPULSE_UPLOAD_KEY_PASSWORD=…
```

> **Back up the keystore.** Losing it means you can never update the app under the
> same Play listing. Play App Signing (opt in at first upload) protects against
> this — do it.

---

## 3. Android AAB (Google Play)

```bash
npm run build:aab            # eas build -p android --profile production
eas submit -p android --latest
```

The `production` profile has `autoIncrement: true`, so `versionCode` advances on
every build.

Play Console requirements:
- Target API level 36 (set in `app.config.ts`)
- Data safety form — declare: email, name, phone, photos, user content, device
  IDs; all used for app functionality; account deletion available in-app
- Content rating questionnaire
- **Financial features declaration**: this app provides trading education and
  signals. It is not a broker and does not execute trades — say so plainly.

---

## 4. iOS (App Store)

```bash
npm run build:ios            # eas build -p ios --profile production
eas submit -p ios --latest
```

Requirements:
- Apple Developer Program membership
- Bundle ID registered, matching `APP_BUNDLE_ID`
- App created in App Store Connect
- The three subscription products created and **submitted for review with the
  build**

Fill in `eas.json` → `submit.production.ios` with your `appleId`, `ascAppId` and
`appleTeamId`.

### App Review notes that matter for this app

1. **Demo account.** Reviewers cannot register and wait for community approval.
   Supply a pre-approved account with Premium enabled in the review notes.
2. **Subscriptions.** The paywall must show, on-screen: title, duration, price,
   auto-renew terms, and links to Terms and Privacy. `app/premium.tsx` does. Do
   not remove that block.
3. **Restore purchases** must be reachable without an account action. It is on
   the paywall.
4. **Account deletion** must be in-app. `app/profile/delete-account.tsx`.
5. **No external payments** for digital subscriptions. There are none.
6. **Financial claims.** Guideline 3.1.1 and section 5.2 are both in play. The
   disclaimers throughout are there for this reason — do not soften them, and do
   not add marketing copy that promises returns.
7. **Push permission.** Requested contextually from notification settings, not on
   first launch.

---

## 5. Admin dashboard

```bash
cd admin
cp .env.example .env         # fill in the Firebase web config
npm run build                # tsc -b && vite build → dist/

cd ../backend
firebase deploy --only hosting
```

`backend/firebase.json` already points hosting at `../admin/dist` with SPA
rewrites and long-cache headers on hashed assets.

Restrict access at the app level (the `admin` claim) and, if you want a second
layer, put the hosting site behind Cloud IAP or an allowlist.

---

## 6. Over-the-air updates

JS-only changes can ship without a store review:

```bash
eas update --branch production --message "Fix signal card spacing"
```

OTA **cannot** update: native dependencies, permissions, app icon, splash, or
anything in `app.config.ts` that affects the native project. Those need a new
binary.

---

## 7. Versioning

| Where | What |
|---|---|
| `app.config.ts` → `version` | Marketing version, e.g. `1.2.0` |
| `ios.buildNumber` / `android.versionCode` | Auto-incremented by EAS |
| `app_settings.minSupportedVersion` | Forces an upgrade prompt for older clients |

---

## 8. Post-release

- Watch Crashlytics for the first 48 hours; the crash-free rate should hold above
  99.5%
- Watch `purchase_events` for verification failures
- `firebase functions:log --only verifyPurchase` after the first live purchase
- Confirm store webhooks are arriving: publish a sandbox renewal and check the
  logs for `appStoreNotifications` / `playNotifications`
