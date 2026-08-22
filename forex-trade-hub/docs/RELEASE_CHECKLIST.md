# Release checklist

## 1. Backend

- [ ] Firestore rules deployed and reviewed
- [ ] Storage rules deployed
- [ ] Composite indexes deployed and **built** (console shows "Enabled")
- [ ] Cloud Functions deployed; `firebase functions:log` is clean
- [ ] `app_settings/config` populated with real legal URLs and support email
- [ ] Apple credentials set (`APPLE_PRIVATE_KEY` secret, issuer/key/bundle params)
- [ ] Play service account granted subscription permissions
- [ ] App Store Server Notifications V2 URL configured
- [ ] Play RTDN Pub/Sub push subscription configured
- [ ] Blaze budget alert set

## 2. Store products

- [ ] Three subscriptions created in App Store Connect
- [ ] Three subscriptions created in the Play Console
- [ ] Product IDs match `app_settings/config.products` exactly
- [ ] Prices and localisations set in target markets
- [ ] iOS subscriptions submitted **with** the build

## 3. Mobile app

- [ ] `npm run typecheck` passes
- [ ] `npx expo export --platform android` bundles without error
- [ ] Icon, splash and notification icon render correctly on a device
- [ ] `version` bumped in `app.config.ts`
- [ ] Real bundle identifiers, not `com.forextradehub.app`, if you are rebranding
- [ ] `google-services.json` and `GoogleService-Info.plist` are the production ones
- [ ] Deep links open the right screen from a notification, cold and warm

## 4. Legal and compliance

- [ ] Terms & Conditions published at the configured URL
- [ ] Privacy Policy published, listing every data type collected
- [ ] Risk disclaimer reviewed by whoever owns compliance
- [ ] No copy anywhere promises profit, guarantees signals or says "risk-free"
- [ ] Historical performance figures carry the past-performance disclaimer
- [ ] Account deletion works end to end and actually removes the data
- [ ] Data safety / privacy nutrition labels filled in on both stores

## 5. Manual test matrix

Run each row on a real device, on both platforms.

### Authentication
- [ ] Register with a new email → profile document created, defaults correct
- [ ] Register with a taken username → clear error, no orphaned auth account
- [ ] Sign in, sign out, sign back in
- [ ] Forgot password → email arrives → reset works
- [ ] Change password from Security
- [ ] Wrong password → friendly message, not a Firebase error code

### Free tier
- [ ] Sees free signals with full levels
- [ ] Premium signals appear as **locked** cards with no levels
- [ ] Opening a premium signal directly shows the paywall, not an error
- [ ] The allowance meter matches `signalLimits.freePerDay`
- [ ] Scrolling past the history limit shows the upgrade card
- [ ] Premium lessons and articles are locked

### Premium tier
- [ ] Purchase completes; the plan claim flips without a restart
- [ ] Every signal, lesson and article is readable
- [ ] Restore purchases works on a fresh install
- [ ] Cancelling in store settings keeps access until expiry
- [ ] Expiry downgrades the account (or force the hourly sweep to verify)

### Community
- [ ] A new user cannot see the chat before approval
- [ ] Join request arrives in the admin queue and notifies admins
- [ ] Approval unlocks the chat without a sign-out
- [ ] Send text, photo, video, voice note and file
- [ ] Reply, react, and see reactions from another device
- [ ] Long-press → delete own message; moderator can delete any
- [ ] Pin and unpin; the banner reflects it
- [ ] Muted user cannot post and sees why
- [ ] Removed user loses access immediately

### Polls
- [ ] Vote once; results reveal
- [ ] A second vote is rejected
- [ ] Totals match across two devices
- [ ] A closed poll cannot be voted in

### Notifications
- [ ] Publishing a signal notifies the right audience
- [ ] Premium signal → premium users get the full alert, free users get the nudge
- [ ] Tapping opens the right screen (foreground, background, cold start)
- [ ] Turning a preference off stops that type
- [ ] The unread badge is accurate; "mark all read" clears it

### States
- [ ] Every list shows a loading skeleton, then content or an empty state
- [ ] Airplane mode → error states with retry, no blank screens, no crash
- [ ] Pull-to-refresh works everywhere it appears

### Admin
- [ ] A non-admin account is refused at the dashboard
- [ ] Role, plan and moderation actions take effect on device
- [ ] The signal composer rejects an inverted stop loss
- [ ] Publishing writes the teaser for premium signals
- [ ] Settings changes appear in the app within seconds
- [ ] Every privileged action appears in the audit log

## 6. Security verification

- [ ] Signed-out client cannot read any collection
- [ ] A free account's read of a premium signal fails with `permission-denied`
- [ ] A client cannot write `role`, `plan`, `status` or `community` on its own user doc
- [ ] A client cannot write `subscriptions/{uid}`
- [ ] A non-member cannot read `community/main/messages`
- [ ] A client cannot write `admin_logs` or `signal_teasers`
- [ ] `setUserRole` from a non-admin returns `permission-denied`
- [ ] A tampered purchase receipt does not grant premium

Test these against the emulator with the rules unit-testing SDK, or by hand with
two accounts.

## 7. Performance

- [ ] Cold start under ~2.5s on a mid-range Android device
- [ ] The chat scrolls at 60fps with 500+ loaded messages
- [ ] Images are cached — a second visit does not re-download
- [ ] No listener leaks (background the app; reads should go quiet in the console)
- [ ] Firestore reads per session are in the low hundreds, not thousands

## 8. Launch day

- [ ] Crashlytics dashboard open
- [ ] `firebase functions:log` tailing
- [ ] `purchase_events` watched for the first live purchases
- [ ] Support inbox monitored
- [ ] A rollback plan: EAS Update for JS, a previous build for native

---

## Known limitations

State these to whoever owns the product; none is a defect, each is a deliberate
Phase 1 boundary.

1. **Market quotes are seeded, not live.** The app reads `market_quotes`; wire a
   feed writer to make them real. Demo values are labelled as such in the UI.
2. **Chat search covers loaded messages only.** Firestore has no full-text search;
   add Algolia or Typesense for server-side search.
3. **Quiz answers ship to the client.** Correct for instant feedback in an
   educational quiz; move grading to a callable if it ever needs to be graded.
4. **Online presence is approximate** — derived from `lastSeenAt` within five
   minutes, not a realtime presence system.
5. **The notification fan-out writes one document per recipient.** Fine into the
   tens of thousands of users; beyond that, move it to a task queue.
6. **Apple receipt verification decodes the JWS to read the transaction id, then
   re-fetches authoritative state from the App Store Server API.** That is the
   correct pattern — but if you ever act on the decoded payload directly, verify
   the x5c certificate chain first.
