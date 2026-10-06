# Admin console — QA review, October 2026

What was reviewed, what was wrong, what changed, how it was verified, and what is left before release.

- **Scope:** every commit from 2026-10-01 to 2026-10-06.
  - The admin console rebuild (F0–F4).
  - Removing the platform commission.
  - Provider analytics.
  - The sign-in change in 794fd7e.
- **Rules held throughout:**
  - The app's existing design system: `theme/`, `components/ui`, `components/admin`.
  - No change to the authentication screens beyond what 794fd7e added.
  - MetroMatrix is a community app: the platform takes no share of any payment.
- **Branches:** `qa/admin-flow-hardening` in both repos.
  - Both were fast-forwarded into `main` on 2026-10-06, backend first.
  - `main` (app a1b868d, backend 104fc73) was merged in before testing, so this was tested against what production ran.

## Findings and fixes

### Blocker
- **Only one admin could ever sign in.**
  - 794fd7e sends `ADMIN_CONSOLE_EMAIL` to the admin login. Every other admin landed on the customer login and was refused. That includes admins created in Admin Management and the second super admin that wallet approvals need.
  - **Fixed** (fd11f70):
    - The console email keeps its direct path.
    - Any other email is tried once on the admin login after the customer login answers 401 (`shouldTryAdminSignIn`).
    - Only a deactivated admin is told so. Every other failure shows the customer's own message, so the form never reveals who is an admin.
    - No visible change to the sign-in screen.
    - Sign-up blocks the console email again.

### Major — outside the admin console
- **Providers were signed out about 30 minutes into a session.**
  - Cause: provider requests send `providerAccessToken` first. A refresh renewed only `accessToken`, and the new 401 recovery replayed the stale stored copy without refreshing.
  - **Fixed** (fd11f70): the refresh renews both copies, and a replay with a stored token that is refused again triggers one real refresh. Both paths have tests.

### Major — admin console
| Finding | Fix |
|---|---|
| 18 healthcare and shopping admin screens on the old visuals: ~313 hex colours, hand-built headers, dark mode broken, accent text failing contrast, 42 `Alert.alert` | All rebuilt on the admin kit with the same fields, actions and flows (7ea9448, 357e720). The design gate now covers the whole console. |
| Doctors fell back to the **public** list when the admin call failed, and rejected with an invented reason | Error or forbidden state instead; a reason is required (7ea9448). |
| Brand approve/suspend used `Alert.prompt`: two dialogs on iOS, an invented reason on Android | Confirmation sheet with a required reason (357e720). |
| A pending or suspended brand would not open (Edit read the storefront endpoint, which returns only live brands) | Reads the admin endpoint (357e720). |
| Shopping settings never sent "Auto-approve products" | Saved now (357e720). |
| Lists stopped at the first page (orders 25, appointments 50, doctors 100, products 50; clinics and reviews unpaged) | Every list pages through everything. |
| Add brand had "Tap to upload" boxes and an "Assign owner" picker that did nothing | Images are web addresses with a preview. Owner removed: the API has no owner field, and vendors create their own brands. |
| Platform analytics outside the admin gate | Gated and permission-checked (c4bb3d3). |
| Permission dead-ends: analytics-only and finance-only admins had no way in | Links added in More (c4bb3d3). |
| The console's Dark Mode switch was lost in the rewrite | Restored in More → This device (c4bb3d3). |
| No UI for wallet adjustments (maker-checker) or for restoring deleted accounts | Wallets and adjustments screens; a "Deleted" filter with Restore in People (183f5e2). |
| Queue and notification items with nowhere to go | Each opens its record (c4bb3d3, 183f5e2). |

### Major — backend
| Finding | Fix |
|---|---|
| `npm test` (what CI runs) hung forever in `adminMigrations.test.js`. `execFileSync` in the process that owns the in-memory mongod deadlocked on mongod's output pipe. | Children run asynchronously (e92d24d). In band: 990/990. |
| Creating an outlet without map coordinates answered 500 ("Can't extract geo keys"), and `sync-indexes` cannot build the 2dsphere index over such outlets | Schema fixed; migration **07-outlet-geo-cleanup** added (9ed2e11). |
| An admin refund of a completed consultation repaid the patient while the doctor kept the fee: money from nowhere | The doctor's payout is reversed, as shopping already does (16e92a1). |
| Deleted accounts could not be found, so Restore was unusable | `status=deleted` / `state=deleted`, super admin only (66f39b7). |
| The drift alert relied on a unique index that production does not have yet, so it repeated on every Overview load | Deduplicated in code (904ed4d). |
| Shopping settings were saved unvalidated; wallet search used a raw regex (`(` → 500) | Validated; literal search (904ed4d). |

### Minor (fixed)
- An explicit sign-out leaves no admin session behind, and admin sign-out resets the store.
- The "session ended" notice shows in the existing error box.
- Analytics days are Pakistan days, not UTC.
- Settings changes keep their reason in the audit log.
- A return request's notification carries its order.
- `QueryState` keeps its margins while loading.
- The "from undefined to undefined" message is gone.
- The inventory script's "on the kit" check is honest.
- Docs updated.
- Wording: "revenue", "GMV" and "commission" became payments, order value and sales. A gate fails on platform-revenue wording.

## Verification (2026-10-06)

| Check | Result |
|---|---|
| App `tsc --noEmit` | 0 errors |
| App jest | 396 passed (was 335) |
| Design gates (whole admin console in scope) | pass |
| No-static-data + wording gate | pass |
| `sync-admin-spec --check` | in sync |
| Backend jest, parallel | 92 suites / 995 tests (was 89 / 955) |
| Backend jest `--coverage --runInBand` (CI) | completes, 990/990 (used to hang) |
| `dump-routes --check` | up to date |
| Live e2e `e2e/adminConsole` vs dev:memory | 13/13 |
| Live e2e `e2e/adminModules` vs dev:memory | 29/29: healthcare, shopping (including the exact form payloads), restore, wallets, and a second super admin approving an adjustment the first could not |
| Migration rehearsal on an in-memory DB | 17/17 steps (below) |

**Not verified yet: the app on a phone.** There is no emulator on this machine. See the device checklist below.

## Production checklist (no database step has been run on production)

Rehearsed in this order against a throwaway database. Every step passed.

1. Take an Atlas snapshot.
2. Deploy the backend: merge `qa/admin-flow-hardening` → `main` and push; Vercel deploys. Check that `GET /health/ready` returns 200.
   - **Done 2026-10-06** (904ed4d; `/health/ready` 200). The deploy changes no data, so the snapshot is still due before step 3.
   - On a cold instance the first `/health/ready` can answer 503 "ping timed out" (the ping limit is 2 s). Retry before treating it as an outage.
3. Run the migrations in order. Each runs `--dry` first, then for real:
   ```
   node scripts/migrations/01-admin-auth-cleanup.js     --confirm-db=<db> --dry   # then without --dry
   node scripts/migrations/02-admin-permissions.js      --confirm-db=<db> --dry
   node scripts/migrations/03-audit-backfill.js         --confirm-db=<db> --dry
   node scripts/migrations/04-provider-status.js        --confirm-db=<db> --dry
   node scripts/migrations/05-notification-read-state.js --confirm-db=<db> --dry
   node scripts/migrations/06-remove-commission.js      --confirm-db=<db> --dry
   node scripts/migrations/07-outlet-geo-cleanup.js     --confirm-db=<db> --dry   # BEFORE sync-indexes
   ```
4. `node scripts/sync-indexes.js --dry`, then `node scripts/sync-indexes.js`.
5. `node scripts/audit-prod-hygiene.js --confirm-db=<db>` (report). Review it before any `--apply`, because `--apply` deactivates admins whose password is a known one.
6. Create a second super admin (People → Admins). They sign in from the regular form and change the temporary password.
7. Build the app (EAS `preview`) and share it.
8. Deploy order matters: backend first. The app's Deleted filter needs 66f39b7. Before the backend is live it just shows nothing.

## Device checklist (needs a phone; `adb devices` + `npm start`)
- [ ] Sign in with the console email.
- [ ] Sign in as a second admin (fallback). Check a wrong password gives the customer's message, the lockout message appears, and the 2FA and forced password change screens work.
- [ ] Sign in as a provider, use the app for more than 30 minutes, and check the session stays.
- [ ] Every tab and module screen, in light and dark.
- [ ] Every Queue item opens its record.
- [ ] Wallets: an adjustment below the threshold applies; one above it waits; a second super admin approves it.
- [ ] Restore a deleted account.
- [ ] Shopping: add a brand and an outlet, then edit them; add a banner; refund an order.
- [ ] Healthcare: verify and reject a doctor; refund an appointment.

## Left as is, on purpose
- **Payout approval takes no note.** The server stores a reason only on rejection, so a note box would save nothing.
- **Outlet colours are saved, but the customer app does not show them yet.** The screen says so.
- **The dev seed's appointment has no slot**, so it cannot be refunded in dev:memory. Real appointments always have one; the model requires it.
- **The customer healthcare screens and Shopping/User are still outside the design gate.** They are not part of the admin console.
