# Social Login Auth Flow

Documents what mints each social credential, what validates it, and every App ID / client ID /
redirect / scheme involved — so a future config change can't silently break login the way the
Facebook App ID and Google proxy drift did.

Firebase project: **metromatrix-c44c6**. Backend: **https://metro-matrix-backend.vercel.app**.

## Google

1. **Mint**: `@react-native-google-signin/google-signin` (native SDK, dev/production builds) or
   `expo-auth-session/providers/google` (Expo Go only — browser-based, uses the app's own
   `metromatrix://` redirect via `makeRedirectUri({ scheme: 'metromatrix' })`, **not** the
   `auth.expo.io` proxy, which `expo-auth-session` 7.x no longer supports).
   `utils/social-auth/socialAuthConfig.ts` → `useGoogleAuth()`, `signInWithGoogleNativeSDK()`.
2. **Validate (client)**: the resulting Google ID token is exchanged with Firebase via
   `signInWithCredential(auth, GoogleAuthProvider.credential(idToken))` —
   `firebaseSignInWithGoogle()` in `socialAuthConfig.ts`.
3. **Validate (backend)**: the app then calls `currentUser.getIdToken()` to get a **Firebase ID
   token** (different from the Google ID token) and POSTs it to `POST /google-login`. The backend
   verifies it with `firebase-admin`'s `admin.auth().verifyIdToken()` —
   `MetroMatrix-NodeBackend/.../src/config/firebase.js` `verifyGoogleIdToken()`.

| ID | Value | Used for |
|---|---|---|
| Web Client ID (`client_type: 3`) | `942315940095-t465i8sfr4dc3m685fm9juqm8d4o49c5.apps.googleusercontent.com` | `GoogleSignin.configure({ webClientId })` and `Google.useIdTokenAuthRequest({ clientId })` — this is the audience the ID token carries; must match backend's `GOOGLE_CLIENT_ID`/Firebase project. |
| Android Client ID (`client_type: 1`) | `942315940095-fvodke6uh00g3ooshvi56jcch6glk6oo.apps.googleusercontent.com` | Resolved automatically by the native SDK via package name + SHA-1 fingerprint; not passed explicitly. Must be registered in the Firebase/Google console for **every** signing keystore used (local debug keystore AND the EAS build keystore are different SHA-1s — both must be registered). |
| iOS Client ID | not set | iOS Google Sign-In not configured yet. |
| Native redirect scheme | `metromatrix` (`app.json` → `expo.scheme`) | Used only by the Expo Go fallback via `makeRedirectUri`. |

## Facebook

1. **Mint**: `react-native-fbsdk-next`'s native `LoginManager` (dev/production builds only — no
   Expo Go support). `signInWithFacebookNativeSDK()` in `socialAuthConfig.ts`.
2. **Validate (client)**: the Facebook access token is exchanged with Firebase via
   `signInWithCredential(auth, FacebookAuthProvider.credential(accessToken))` —
   `firebaseSignInWithFacebook()`. **Firebase's servers** independently call Facebook's
   `debug_token` Graph endpoint here, using the App ID/Secret configured in the **Firebase
   Console** (not this repo) — this is the step that throws `(#100) The App_id in the input_token
   did not match the Viewing App` if that console config drifts from the App ID below.
3. **Validate (backend)**: the raw Facebook access token (not a Firebase ID token) is separately
   POSTed to `POST /facebook-login`, which independently re-validates it against Facebook's
   `debug_token` endpoint using its own `FACEBOOK_APP_ID`/`FACEBOOK_APP_SECRET` —
   `MetroMatrix-NodeBackend/.../src/config/facebook.js` `validateFacebookAccessToken()`.

| ID | Value | Used for |
|---|---|---|
| Facebook App ID | `26818541697736156` | `app.json` (`facebookAppId`, `ios.infoPlist.FacebookAppID`, `plugins → react-native-fbsdk-next.appID`), `socialAuthConfig.ts` `FACEBOOK_APP_ID` constant, backend `.env` `FACEBOOK_APP_ID`. **Must also equal the App ID configured in Firebase Console → Authentication → Sign-in method → Facebook** — that's a 4th location this repo cannot see or set. |
| Facebook App Secret | (Vercel env, not in repo) | Backend `.env` `FACEBOOK_APP_SECRET`, used for `debug_token` calls. **Must also match the App Secret in the Firebase Console's Facebook provider.** |
| Facebook Client Token | `8e9ceae58a1d76247a99d80f3bf77403` | `app.json` `plugins → react-native-fbsdk-next.clientToken` — required by the native SDK, not secret. |
| URL scheme | `fb26818541697736156` | `app.json` `ios.infoPlist.CFBundleURLTypes` + `facebookScheme` — must always be `fb` + the App ID above. |
| OAuth redirect | `https://metromatrix-c44c6.firebaseapp.com/__/auth/handler` | Must be present in the Facebook app's **Valid OAuth Redirect URIs** (Facebook Developer Console). |

## Why Google and Facebook complete sign-in differently

Both mint a native provider token and both exchange it with Firebase client-side
(`signInWithCredential`) — that part is consistent. Where they diverge is what's sent to *our own*
backend afterwards:

- **Google** sends the **Firebase ID token** (`POST /google-login { idToken }`), verified via
  `firebase-admin`.
- **Facebook** sends the **raw Facebook access token** (`POST /facebook-login { accessToken }`),
  verified via Facebook's own `debug_token` endpoint.

This is an intentional (if inconsistent-looking) design already in the backend: each provider's
native token is validated against that provider's own authority rather than routed uniformly
through one mechanism. It works correctly today for both providers independently. Unifying it
(e.g. making Facebook also send a Firebase ID token) is a backend behavior change beyond the scope
of the two bugs this doc accompanies — flagged here for visibility, not changed.

## Config surfaces outside this repo (drift-prone)

These cannot be verified or set from either codebase — check them whenever social login breaks
after otherwise-unrelated changes:

1. **Firebase Console → Authentication → Sign-in method → Facebook** — App ID + App Secret. This
   is the single most likely place for the `(#100)` error to originate, since it's invisible to
   both repos and nothing in either enforces it stays in sync with `FACEBOOK_APP_ID` above.
2. **Facebook Developer Console → App roles → Roles** — while the app is in Development mode, only
   added test accounts can log in at all (unrelated error otherwise).
3. **Facebook Developer Console → Valid OAuth Redirect URIs** — must include the Firebase auth
   handler URL above.
4. **Google/Firebase Console → SHA-1 fingerprints** — one per signing keystore (local debug, EAS
   build, Play Store signing) registered against the Android OAuth client.
5. **Vercel → Project → Environment Variables** — `FACEBOOK_APP_ID`/`FACEBOOK_APP_SECRET` for the
   **deployed** backend; the local `.env` value is not automatically what's live.
