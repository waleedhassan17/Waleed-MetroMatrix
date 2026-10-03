# Phase F4 — Screen migrations, waves 1–3

Branch `admin-hardening`. Every migrated screen is built on `components/admin`:

- the `admin` theme;
- skeleton, error-with-retry, forbidden and empty states (`QueryState`);
- `ConfirmSheet` with a reason for every consequential action, replacing
  `Alert.alert`;
- labelled controls and tap targets of at least 44 pt;
- at most 400 lines per file (the largest is 302).

Each migrated folder is in the design-gates scope.

## Wave 1 — Overview

`screens/admin/overview/AdminOverviewScreen.tsx` replaces `adminDashboard.tsx`
(2,245 lines) and `adminSlice.ts`. It makes one request, `GET /admin/overview`,
which the server filters to the admin's permissions:

- **Needs attention:** each non-empty queue with how long its oldest item has
  waited; a tap opens the Queue tab filtered to it.
- **Platform:** customers, new customers month to date (with change vs the same
  period last month, or "no baseline"), approved providers, provider sign-ups.
- **One block per module.** A module that times out says so; the rest of the
  overview still loads.
- **Recent admin activity:** your own, or everyone's with `canViewAudit`.

Removed with the old dashboard:

- the greeting card, gradient tiles and drawer;
- a donut whose split was invented (40 % / 35 % / 25 % of the total) when the
  API had no breakdown;
- `trend={5.2}` and `|| 12` fallbacks;
- calls to `/admin/dashboard/*`, which the backend no longer serves.

## Wave 2 — Queue and People

- **Queue** (`screens/admin/queue`): the server's merged queue (provider,
  doctor and brand applications, disputes, payouts, returns, wallet
  adjustments), oldest first with cursor paging. Types come from meta,
  filtered to the admin's permissions. Each item opens where it is decided.
- **People** (`screens/admin/people`): providers (state chips with server
  counts) and customers (active / deactivated with counts), debounced search,
  infinite lists. It replaces `pendingReviewScreen`, `providerManagementScreen`
  and `userManagementScreen` (about 1,370 lines each), their slices,
  `networks/admin/adminAPIs.ts` and `models/admin.ts`.
- **Provider detail:**
  - Actions by state: approve, reject (reason shown to the provider), suspend
    (reason), lift suspension, delete (reason).
  - A refused delete lists the server's `DELETE_BLOCKED` reasons in the sheet.
  - Documents open, the ID number is masked, and admin history shows as a
    timeline.
- **Customer detail:** activity counts, wallet balance, deactivate (reason) /
  reactivate, delete with blocking reasons, history.

## Wave 3 — Home services (7 screens)

The admin endpoints moved to the typed client, in
`networks/admin/homeServicesApi.ts`. The legacy module file keeps only its
customer calls.

| Screen | What changed |
|---|---|
| Bookings | Status chips from meta, customer search, infinite list |
| Booking detail | Job, people, money, after-sale (dispute, review, cancellation) and status history. **Change status** (reason) shows the state machine's refusal verbatim. **Refund** needs Home services + Finance and defaults to the remaining refundable amount. |
| Disputes | Decide with resolution and note; refund or penalty fields only with Finance |
| Payout requests | Finance only; approve or reject (reason) with balance and jobs shown |
| Service categories | Provider types from meta (were hardcoded); add/edit sheet; hide vs delete explained; delete needs a reason |
| Analytics | 7 / 30 / 90-day ranges; bookings per Pakistan day, by category and status; paid value, commission, cancellation rate, average job length ("—" when unmeasured); busiest providers |
| Settings | Commission, payout floor, search radius, speed, matching weights (sum shown live); checked locally and on the server; save needs a reason; discard prompt |

### Backend fixes found while building these (commits on the BE branch)

| Commit | Fix |
|---|---|
| `1edc346` | **Refunds capped at what the customer paid.** The admin refund defaulted to the full price with no record of earlier refunds: a double tap refunded twice, and a dispute refund on top paid more than the booking cost. A conditional claim on `payment.refundedAmount` blocks concurrent refunds without depending on an index. Wallet adjustments are now also claimed inside their transaction. |
| `9c14f90` | Home-services analytics group by Pakistan day (were UTC) and return null instead of invented zeros. |
| `33c9d79` | Home-services settings are validated (a commission of -50 or "abc" used to be stored). |
| `d0b0ff7` | Deterministic test runs (timeouts under parallel load). |

## Gates

- `scripts/no-static-data.sh` **exits 0**, and CI now enforces it.
- `networks/admin/__tests__/adminCallsites.test.ts`: no admin endpoint is called
  outside the typed client, except healthcare and shopping module layers and
  provider onboarding. Each exception has a reason and must still exist.
- The reachability test has no allow-lists: every route opened is registered,
  and every admin route has a way in.

## Numbers

| | Before (F0) | After (F4) |
|---|---|---|
| Static/hybrid screens | 5 | 0 |
| no-static-data hits | 1,446 (243 excluding hex) | 0 |
| Hex literals in admin code | 1,391 | 423 (healthcare detail screens and shopping, not migrated) |
| `Alert.alert` in admin code | 99 | 42 (same) |
| `console.log` in admin code | 82 | 0 |
| Largest admin file | 2,258 (`adminDashboard.tsx`) | 1,186 (`SpecialtyManagementScreen.tsx`, not migrated) |
| Admin screens on the kit | 1 | 28 |
| jest | 3 suites / 141 | 14 suites / 247 |

## Not migrated (deferred by scope: F4 waves 4–6)

These screens have correct data and envelopes after F2 but keep their old
visuals (hex colours, `Alert.alert`):

- **Healthcare:** doctors, appointments, appointment detail, clinics, reviews,
  specialties.
- **Shopping:** the whole stack.

They are outside the design-gates scope and listed in
`docs/ADMIN_SCREEN_INVENTORY.md`.
