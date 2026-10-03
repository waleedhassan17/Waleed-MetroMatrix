# Phase F1 — Admin auth, session and guard

Branch `admin-hardening`. This phase pairs with backend B1 (sessions, lockout,
TOTP and restricted sessions). The app and the backend must ship together:
admin tokens issued by the old backend have no session id, and the new backend
rejects them.

## What changed

### Sign-in

- **Staff sign-in is its own flow.** The "Staff sign-in" link on the customer
  sign-in screen opens `AdminSignIn` → `AdminTotp` (when two-factor is on).
- **The hardcoded admin email lists are gone** from `signinSlice.ts` and
  `signupSlice.ts`. One of them shipped a personal address inside the app bundle.
- **Lockout copy uses the server's `retryAfterSeconds`**, e.g. "Try again in 14
  minutes". Wrong credentials get one message whether the email or the password
  was wrong.
- **Restricted sessions land on the screen that lifts the restriction:**
  - `password_change` → `AdminChangePassword` (no back arrow, sign-out only)
  - `totp_enrol` → `AdminTwoFactorEnrol`

  The server enforces this; the app follows the `restrict` value from sign-in,
  refresh, profile, and any 403 `PASSWORD_CHANGE_REQUIRED` /
  `TOTP_ENROLMENT_REQUIRED`.
- **Two-factor enrolment** takes password → `otpauth://` link to the
  authenticator app, plus a typeable grouped key → 6-digit code → recovery codes,
  shown once. The codes can be shared to a password manager through the system
  share sheet. No clipboard or QR library was added, because either would need a
  new native build.

### Session storage

- **One SecureStore key, `adminSession`,** holds
  `{accessToken, refreshToken, accessTokenExpiresAt, sessionId}` in a single
  atomic write (`networks/admin/session.ts`).
- **Profile and permissions are not persisted.** They load from
  `GET /admin/profile` on every launch.
- **Legacy keys are deleted, not migrated.** `adminToken`, `adminRefreshToken`
  and `adminInfo` carry pre-session tokens the server no longer accepts.

### Network layer

- **`networks/network/authRecovery.ts`** does token attachment and
  refresh-on-401 for any axios instance. Its dependencies are injected so it can
  be tested.
  - Refresh is **single-flight per audience**: `admin` → `POST
    /admin/auth/refresh-token`; `account` → `POST /auth/refresh`.
  - A replayed rotated refresh token revokes the admin session on the server, so
    concurrent 401s refresh once.
  - Before rotating, it checks whether another request already renewed the
    token.
  - A failed admin refresh clears **only** the admin session and emits
    `sessionEnded('admin')`. The user session is untouched, and the reverse
    holds.
  - A refresh that never reached the server (offline, timeout, 5xx, 429) is
    **transient**: the session is kept. Before this, losing signal at the wrong
    moment signed people out.
- **`audienceForUrl`** maps `admin/`, `v1/admin/` and `shopping/admin/` to the
  admin audience.
- **Admin public endpoints are an explicit prefix list.** Substring matching
  would have treated `admin/auth/...` paths as public.
- **`adminAPIs.ts` no longer sets its own `Authorization` header.** Before, those
  calls never got `__sentAuth`, so their 401s had no recovery at all. The token
  parameters were removed from the API layer and its slices.
- **`shoppingAxios` shares the same refresher.** It used to clear all auth on
  any 401 without trying to refresh.
- **Error logs carry status and error code only**, never response bodies.
- **Proactive refresh:** `networks/admin/refreshScheduler.ts` renews the admin
  session 60 s before `accessTokenExpiresAt`, in the foreground only. Returning
  from the background with an expired token refreshes at once.

### Relaunch and guard

- **`validateUserType` accepts `'admin'`.** `landingRoute` sends an admin to the
  console, and `AppContainer` verifies the stored session at boot.
- **`AdminGate` wraps every route in `AdminRoutes`** (`navigation-maps/Base.tsx`),
  including deep links.
  - No verified session → `AdminSignIn`.
  - Server unreachable → retry state.
  - Restricted session → the fixing screen.

  The decision itself is pure: `screens/admin/auth/adminGate.ts`.
- **`AdminSessionManager`** (mounted once) turns network events into store
  updates, runs the proactive refresh, and hosts the admin toasts.

### Permissions

- `hooks/useAdminPermission.ts`: `usePermission(...flags)` and `hasPermission`.
  Effective permissions come from the server; a super admin has every flag.
- `components/admin/PermissionGate.tsx` and `ForbiddenState.tsx`: "You don't
  have access", never a generic error.

### Logging

- `utils/devLog.ts`: development only, redacts JWT-shaped strings and values
  under token, password, secret or code keys.
- **Token and response logs removed** from `adminAPIs.ts`, `signinSlice.ts` and
  `adminSlice.ts`, plus the `console.error` that printed a token in
  `emailVerificationSlice.ts`. `console.error` survives release builds.

## Tests (jest)

| Suite | What it proves |
|---|---|
| `networks/network/__tests__/authRecovery.test.ts` | `audienceForUrl` table; two concurrent admin 401s → exactly one refresh, both replayed; admin and user refresh independently; a failed admin refresh ends only the admin session; a transient failure keeps it; a 401 after the retry ends it; a token renewed meanwhile is reused; no recovery when no token was sent; no header on public endpoints |
| `networks/network/__tests__/sessionRefresh.test.ts` | One SecureStore key; legacy keys deleted; admin refresh posts the stored refresh token, stores the rotation and reports the profile; concurrent refreshes post once; 401/403 are final while 429/5xx/offline are transient and keep the session; the account refresh never touches the admin session |
| `networks/admin/__tests__/refreshScheduler.test.ts` | Refresh 60 s before expiry, then reschedule; nothing in the background; immediate refresh on return when due; nothing when signed out |
| `screens/admin/auth/__tests__/adminAuth.test.ts` | Gate decision table (11 cases); landing after sign-in; lockout copy from `retryAfterSeconds`; one message for wrong credentials; server internals hidden; password problems |
| `utils/__tests__/devLog.test.ts` | JWTs and sensitive keys redacted at any depth |

Totals: 9 suites / 208 tests pass. `tsc --noEmit` reports 0 errors, and the
design gates pass with `components/admin` and `screens/admin/auth` now in scope.

## Numbers

| | F0 | F1 |
|---|---|---|
| no-static-data: `console.log` of auth data | 38 | **0** |
| no-static-data total | 1,446 | 1,408 |
| `console.log` in admin code (inventory) | 82 | 8 |
| Screens (inventory) | 39 | 43 (4 new auth screens) |
| Static/hybrid screens | 5\* | 5 |

\* The F0 report said 6. One was a false positive: a comment containing
"hardcoded" on the service-categories screen. The inventory now ignores
comments.

## Deviations

- **Recovery codes are the last step of enrolment, not a separate route.** The
  server shows them once and has no endpoint to list them again, so a standalone
  screen would have nothing to show.
- **The legacy dashboard (`adminDashboard.tsx` / `adminSlice.ts`) now only loses
  its auth state.** The endpoints it reads (`/admin/dashboard/*`) no longer exist
  on the backend; they were replaced by `/overview`. It is rewritten in F4 wave 1.
- **Sign-out from the console arrives with the More tab in F3.** The legacy
  dashboard never had one.
- **Not run on a device:** the sign-in → TOTP → console flow and a relaunch
  with `JWT_EXPIRE=1m`. Rows Q03/Q06 in the QA matrix stay Blocked until run on
  a device against a local backend.
