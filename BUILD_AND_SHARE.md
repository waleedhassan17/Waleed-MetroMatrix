# Building & Sharing an Installable APK (EAS)

For testing Facebook and Google login on a real Android device — a development/preview
build, not Expo Go. Two frontend/backend config mismatches were found and fixed while
preparing this (see "Blocking config mismatches" for the full trace) — what's left is
console-side credential registration, covered in §4.

---

## What's already correct (verified, no changes needed)

`app.json` already has everything an EAS build needs:

| Check | Value |
|---|---|
| `owner` | `waleed17` ✓ |
| `extra.eas.projectId` | `adc7a05f-5e99-4a99-b6e4-58ac28a97b7e` (present — confirm it's still this project's ID with `eas project:info` if a build ever complains about project mismatch) |
| `android.package` | `com.metromatrix.app` (changed from `com.waleed17.MetroMatrix` on 2026-08-02 — see below) — **this is the value that must match the Facebook key hash and Google Android OAuth client** |
| `scheme` | `metromatrix` ✓ |
| `android.permissions` | `INTERNET` ✓ (nothing else required by the Google/Facebook SDKs) |
| Plugins | `expo-web-browser`, `@react-native-google-signin/google-signin`, `react-native-fbsdk-next` (with `appID`/`clientToken`/`displayName`/`scheme`), `@react-native-firebase/app` — all present |

`eas.json` did not exist and has been created with `development` and `preview` profiles,
both producing an APK (`android.buildType: "apk"`, not the default AAB) — see the comments
in the file for which one to use.

One unrelated gap, not a blocker for this Android build: `app.json` references
`ios.googleServicesFile: "./GoogleService-Info.plist"`, but that file doesn't exist in the
repo. Irrelevant to `eas build -p android`, but an iOS build would fail on it.

**Another one to flag, also not a blocker for this build**: `app.json`'s
`ios.bundleIdentifier` is still `com.waleed17.MetroMatrix`, while Android just changed to
`com.metromatrix.app` and the Firebase project's registered iOS client (in the
`google-services.json` `appinvite_service` block) is *also* under bundle id
`com.metromatrix.app` — so iOS looks like it needs the same rename for consistency. Not
touched here since it's out of scope for an Android build and changing an iOS bundle
identifier has its own consequences (App Store Connect identity, provisioning profiles) —
flagging it so it doesn't surprise you later.

---

## Blocking config mismatches (found while verifying native auth config)

Item 3 of this task asks to sanity-check that the native config lines up with what the
backend expects. It doesn't — on two separate axes, independent of anything EAS-related:

### 1. Google: the app and the backend are talking to two different Firebase projects

**RESOLVED (2026-08-02) — user confirmed `metromatrix-c44c6` (the backend's project) is
authoritative.** What was wrong and what's been fixed:

- `firebaseConfig.ts` (the JS Firebase SDK used for `firebaseSignInWithGoogle`/
  `getFirebaseIdToken` — the code path this app's login screens actually call) was
  configured for `metromatrix-31f9f`. **Fixed**: now uses the real `metromatrix-c44c6` web
  app config (apiKey, appId, storageBucket from the Firebase console).
- `utils/social-auth/socialAuthConfig.ts`'s `GOOGLE_WEB_CLIENT_ID` (the audience the native
  Google Sign-In requests an ID token for) was `1007229712045-hepjj2...` (the old project).
  **Fixed**: now `942315940095-t465...`, matching the backend's `GOOGLE_CLIENT_ID` exactly.

With both of those aligned, the JS-SDK sign-in path (`GoogleSignin` native handshake →
`firebaseSignInWithGoogle` → `getFirebaseIdToken` → backend `verifyIdToken`) is now
internally consistent end to end on the same Firebase project as the backend.

**FULLY RESOLVED (2026-08-02).** `google-services.json` now has both:
- the `client_type: 3` Web client (matches `GOOGLE_WEB_CLIENT_ID`), and
- a real `client_type: 1` Android client:
  `942315940095-fvodke6uh00g3ooshvi56jcch6glk6oo.apps.googleusercontent.com`,
  registered for package `com.metromatrix.app` with certificate hash
  `5e8f16062ea3cd2c4a0d547876baa6f38cabf625` (your debug/dev keystore's SHA-1,
  `5e:8f:16:06:2e:a3:cd:2c:4a:0d:54:78:76:ba:a6:f3:8c:ab:f6:25` with the colons
  removed) — confirmed matching.

Along the way: this Android app was initially registered under package `com.metromatrix.app`
while `app.json` still said `com.waleed17.MetroMatrix` — a mismatch that would have failed
the Android build outright (the `google-services` Gradle plugin requires an exact package
match). **You confirmed `com.metromatrix.app` is the app's correct identity**, so
`app.json`'s `android.package` was changed to match. `GOOGLE_ANDROID_CLIENT_ID` in
`socialAuthConfig.ts` is now filled in with the real client id above too (documentation only
— it isn't passed into `GoogleSignin.configure()`, which resolves the native client by
package+SHA-1 automatically).

**One nuance for later**: the SHA-1 just registered is your **local debug/dev keystore's**
fingerprint — good enough for testing a `development`-profile dev-client build on your own
machine. The **EAS build's** keystore (used for the `preview`-profile APK you'll share with
a teammate) has a **different** SHA-1 and needs to be added as a *second* fingerprint on this
same Firebase Android app before Google Sign-In works in that shared APK — see §4
(`eas credentials`). Same app entry, just one more fingerprint to add, not a new app.

### 2. Facebook: the app and the backend had two different App IDs

**RESOLVED (2026-08-02) — user confirmed `26818541697736156` (the backend's App ID) is
authoritative.** What was wrong and what's fixed:

- `app.json` (`facebookAppId`, iOS `FacebookAppID`, the `fb...` URL scheme everywhere, and
  the `react-native-fbsdk-next` plugin's `appID`/`scheme`) was `2277966629368711` — a
  different Facebook app. **Fixed**: all of it now reads `26818541697736156`.
- The plugin's `clientToken` was `b4ca5891df6414d095cc27abfe52c6ae`, which belonged to the
  old App ID and would not have worked with the new one. **Fixed**: replaced with the real
  client token for `26818541697736156` (`8e9ceae58a1d76247a99d80f3bf77403`), from Facebook
  Developers → this app → Settings → Advanced → Client Token.
- `utils/social-auth/socialAuthConfig.ts`'s `FACEBOOK_APP_ID` constant (used by the
  Expo-Go-compatible `expo-auth-session` Facebook flow): also updated to
  `26818541697736156`.

`MetroMatrix-Backend/.env`'s `FACEBOOK_APP_ID` was already `26818541697736156` — no backend
change needed, the frontend was the side that had to move.

**Still outstanding, same shape as the Google Android client**: whether the Facebook
Developer Console's **Android platform** entry for app `26818541697736156` has
`com.metromatrix.app` registered as its package name, and the correct key hash. If that
Android platform entry doesn't exist yet, or lists the old package, add/update it — see §4
below for getting the key hash from the same EAS keystore.

**Bottom line**: both the Google/Firebase project mismatch and the Facebook App ID mismatch
are now resolved on the frontend. What's left before login works in a built APK is entirely
console-side registration (Google Android OAuth client's EAS-keystore fingerprint, Facebook's
Android platform key hash and Development-mode tester role) — see §4 and the Facebook
Development-mode reminder below.

---

## 1. Prerequisites

```bash
npm install -g eas-cli
eas login                 # must be waleed17 — the project's owner
```

Only `waleed17` can build this project. A teammate logging in under their own Expo account
and running `eas build` here will fail with an ownership/permission error — that's expected
and not a bug. The fix is always "the account owner runs the build."

## 2. Build the shareable APK

```bash
eas build -p android --profile preview
```

This is the `preview` profile added to `eas.json` — internal distribution, `buildType: apk`
(not the Play Store `.aab`, which can't be sideloaded).

EAS queues the build on its own servers and prints a build URL on `expo.dev`. When it
finishes, that page has a **Download** button linking directly to the `.apk`.

## 3. Share it with a teammate who has no Expo account

Send them either:
- the `expo.dev` build page URL (they click **Download** themselves), or
- the direct `.apk` file/link.

They do **not** need an Expo account, EAS CLI, or to be logged in as anyone — sideloading
an APK is independent of Expo's auth. They just need to enable "install from unknown
sources" (or approve the one-time installer prompt on modern Android) and open the file.

## 4. One-time credential registration — the step that makes login actually work in the APK

The EAS build is signed with **EAS's own managed keystore**, whose SHA-1/key hash is
different from your local debug keystore. Google and Facebook both check the signing
certificate of the APK that's calling them, so both consoles need the *EAS* build's
fingerprint registered, not your local one — independent of the mismatches above, this step
is still required.

**Get the SHA-1 (for Google):**
```bash
eas credentials
# Select: Android -> (this project) -> Keystore: Manage everything needed to build your project
# -> the output includes "SHA1 Fingerprint" directly — copy it
```
Add that SHA-1 to the Android app entry for package `com.metromatrix.app` under project
`metromatrix-c44c6` in Firebase Console (Project settings → your apps → the Android app →
Add fingerprint) — this is the same one-time step described above, just repeated for the
EAS build's SHA-1 specifically (it differs from your local debug SHA-1). Re-download
`google-services.json` afterward and swap it into the repo.

**Get the Facebook key hash (needs the actual keystore file, not just the SHA-1 string):**
```bash
eas credentials
# Select: Android -> (this project) -> Keystore: Download the existing keystore
# This saves a .jks file locally, plus prints the keystore password/alias.

keytool -exportcert -alias <alias-from-above> -keystore <path-to-downloaded>.jks \
  -storepass <password-from-above> | openssl sha1 -binary | openssl base64
```
That base64 string is the Facebook key hash. Add it under **app `26818541697736156`** in
Facebook Developers → Settings → Basic → Android platform → Key Hashes, for package
`com.metromatrix.app`. If that app's Android platform entry doesn't exist yet, or lists a
different package, create/update it to `com.metromatrix.app` first — Facebook rejects the
whole login attempt on a package mismatch regardless of the key hash being correct.

**Facebook Development-mode reminder** (from `facebook.md`/`FACEBOOK_AUTH_TEST.md`): this
Facebook app is in Development mode. Even with the right key hash registered, login fails
silently for any tester account that isn't added under **App roles → Roles**. Add the
tester's Facebook account there before handing them the APK.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `eas build` fails with an owner/permission error | Not logged in as `waleed17` | `eas login` as the project owner — no code fix exists for this |
| Google login: `DEVELOPER_ERROR` on a **local dev-client build** | Shouldn't happen now — the debug/dev keystore's SHA-1 is registered and reflected in `google-services.json` | If it still does, confirm the keystore your dev build actually signs with matches the registered SHA-1 (`5e:8f:16:...`) — `eas credentials` or `keytool -list -v -keystore ~/.android/debug.keystore` |
| Google login: `DEVELOPER_ERROR` specifically on the **shared EAS preview APK** | Expected until the *EAS build's* (different) SHA-1 is also added to the same Firebase Android app | `eas credentials` → get the EAS keystore's SHA-1 → add as a second fingerprint → re-download `google-services.json` → paste into `credentials.md` — see §4 |
| Google login: fails with "Invalid or expired Google token" | Should no longer happen — `firebaseConfig.ts` and `GOOGLE_WEB_CLIENT_ID` are now both aligned to `metromatrix-c44c6`. If it still does, double check nothing re-introduced the old project number (`1007229712045`) anywhere | `grep -r "1007229712045" .` should only match nothing now (the old `google-services.json` was replaced) |
| Android build fails with "No matching client found for package name" | `android.package` in `app.json` doesn't match any `package_name` in `google-services.json` | Should be resolved — both are now `com.metromatrix.app`. If you change one, change the other |
| Facebook login: "invalid key hash" | EAS build's key hash not registered in the Facebook console | `eas credentials` → download keystore → `keytool`/`openssl` → add to Facebook console, §4 above |
| Facebook login: backend returns "token was not issued for this app" (401) | Should no longer happen — `app.json` and `socialAuthConfig.ts` are now both `26818541697736156`, matching the backend. If it still does, check nothing re-introduced the old App ID | `grep -r "2277966629368711" .` should only match historical comments now |
| Facebook login does nothing at all, no error | App is in Development mode and the tester's account isn't added under App roles → Roles | Add the account there (see `FACEBOOK_AUTH_TEST.md`) |
| APK installs but "app not installed" or a signature error on reinstall | A different-signed build (e.g. an old debug APK) is already installed under the same package name | Uninstall the existing app first, then install the new APK |

## What this covers vs. what's still yours to do

| Check | Verified by |
|---|---|
| `app.json` has correct owner/projectId/scheme/plugins | This task — confirmed, no changes needed |
| `app.json`'s `android.package` matches the real Firebase Android registration | Done — changed to `com.metromatrix.app` per your confirmation, matching the `google-services.json` you provided |
| `eas.json` produces an APK (not AAB) via the `preview` profile | This task — created and schema-validated against the real `@expo/eas-json` validator |
| Google/Firebase mismatch resolved (JS SDK side) | Done — `firebaseConfig.ts` + `GOOGLE_WEB_CLIENT_ID` now aligned to `metromatrix-c44c6` |
| `google-services.json` matches the right project + package | Done — replaced with the `metromatrix-c44c6` / `com.metromatrix.app` file you provided |
| Google Android native OAuth client (`client_type: 1`) registered with a SHA-1 | Done — real Android client registered for `com.metromatrix.app` with your debug/dev keystore's SHA-1, confirmed matching in `google-services.json` |
| The build itself succeeds | **You** — only `waleed17` can run `eas build` |
| EAS build's (different) SHA-1 added as a second fingerprint on the same Android app, + Facebook key hash registered | **You** — needs `eas credentials`, which needs the `waleed17` login — see §4 |
| Facebook App ID + client token aligned to `26818541697736156` | Done — `app.json` and `socialAuthConfig.ts` updated, real client token in place |
| Facebook Android platform (package + key hash) registered for app `26818541697736156` | **You** — needs Facebook Developer Console access; same shape as the Google Android client step above |
| iOS `bundleIdentifier` reconciled with the new `com.metromatrix.app` identity | **You** — flagged, not in scope for this Android build |
| Login actually works in the installed APK | **You + a teammate**, after all of the above |
