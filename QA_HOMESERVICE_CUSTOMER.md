# QA_HOMESERVICE_CUSTOMER — Home Services, customer flows

Run 2026-09-26 against the **live demo backend** (`metro-matrix-backend.vercel.app`) and the live realtime
service (Heroku `metromatrix-realtime`, release v19), with the seeded QA accounts `customer1..8.hs@metromatrix.pk`
opposite `provider1..15.hs@metromatrix.pk`.

**How it was tested.** `MetroMatrix-Backend/scripts/e2e-homeservice.js` plays the customer and the provider at the same
time over the real API, and holds a real `socket.io` connection to the realtime service for each of them. Every
step therefore checks both the HTTP answer and the live event the other person's screen waits for. Backend fixes
were first proven against a local copy of the API on the same database, then deployed, then re-run against
production.

**Result: 117/117 checks pass on production** (provider-side checks are in `QA_HOMESERVICE_PROVIDER.md`; the
scenarios exercise both sides at once). Backend unit tests: 37 suites, 464 tests, all green (was 81/82 in the
module, with one stale test). `npx tsc --noEmit` clean, `scripts/design-gates.sh` all pass, and the full Android
bundle compiles through Metro.

| Flow | Checks | Result |
|---|---|---|
| Discovery — categories, search, provider profile, reviews | in S1, S8 | pass |
| Booking — slots, hours, duplicates, expiry | S5, S12 | 19 pass |
| Live job — accepted, on the way (live map), arrived, working, done | S1 | 36 pass |
| Cancelling — at every allowed stage, refused once work starts | S4 | 10 pass |
| Paying — wallet, cash, exact bill, double payment | S1, S2, S9, S10 | pass |
| Rating, bookings list, dispute | S1, S7 | pass |
| Access control and races | S8, S9 | 13 pass |

---

## Bugs found and fixed

### P0 — The customer decided how much to pay

**Expected.** The customer pays the amount the provider billed.
**Actual.** The payment screen had a "Change" link that accepted any number, and `POST /payments/process` charged
exactly what the phone sent. A Rs. 2,000 job could be settled for Rs. 1. Choosing cash also overwrote the provider's
requested amount with the customer's number.
**Fix.** The server owns the price (`services/money.js`: requested → final → estimate). A different amount is a
409 that names the real one; choosing cash never touches the provider's amount. The app's amount is read-only
("Set by Ahmad Khan for this job"), and a route parameter can no longer override the server's bill.
**Verified.** S1: Rs. 1 against a Rs. 1,500 bill → 409; wallet charged exactly Rs. 1,500. S2: cash keeps the
provider's Rs. 1,200. S10: underpaying refused.

### P1 — Cash showed "Payment sent" before any money moved

**Actual.** Picking cash showed "Payment sent — Rs X is on its way" while the server reported `pending`.
**Fix.** A real "Pay Rs. X in cash" state that listens on the booking room and becomes "Payment confirmed" the
moment the provider confirms. Reopening the screen shows where the payment really stands.
**Verified.** S2: the customer's socket receives `payment_received` (method cash) as the provider confirms.

### P1 — Customers were never told anything with the app closed

**Actual.** The realtime service only allowed one push type (`booking_created`, to providers).
**Fix.** Customers are pushed for accepted, declined, on the way, arrived, done, payment requested and cash
confirmed. Tapping any job push opens that booking (or the payment screen when asked to pay); it used to open
nothing.
**Verified.** Realtime logs after release v19 show `booking_update` and `payment_received` pushes delivered.

### P1 — Old requests never expired, and blocked re-booking

**Actual.** 52 of 57 open bookings were scheduled in the past (oldest 20 July). Because a customer may hold only
one live request per provider, one abandoned request blocked re-booking that provider forever.
**Fix.** A request still unanswered an hour after its time, or an accepted job not started a day after, is closed
by the system with a plain reason — lazily whenever it is read, plus a daily cron. The backlog was closed quietly.
**Verified.** S12: a backdated request stops counting as live, reads "This request expired before it was
accepted", and the customer can book that provider again.

### P1 — Past times were bookable

**Actual.** The same nine slots were offered every day, including times already gone, and the server accepted them.
**Fix.** Closed slots carry a reason the form shows (Passed, Too soon, Booked, Off hours, Day off), and the server
refuses them in words — "Ahmad Khan works 10:00 AM - 02:00 PM on Mondays. Pick a time in those hours."
**Verified.** S12, six checks.

### P1 — "Near you" was not near anyone

**Actual.** The app never sent a location, so every search was centred on central Lahore; providers in Bahria Town
never appeared; typing `(` in search was a server error.
**Fix.** Search uses the customer's default saved address (or the phone's last known fix, only if permission was
already given), respects each provider's service radius, widens only when nobody is near, and shows distance on
the cards. Search text is escaped.
**Verified.** S8 (`(` returns 200); pipeline unit tests.

### P1 — Test junk and invented numbers in front of customers

**Actual.** "Wallet Smoke Provider" and two other test accounts in the electrician list; six "Smoke test review"
reviews; an "Appliance Technicians" tile that opened an empty list; profiles reading "4.9 ★ (132 reviews)" above
no reviews; the same two services on every profile whatever the trade; provider emails and phone numbers returned
by the public, logged-out search.
**Fix.** `scripts/homeservice-data-hygiene.js` hid the test accounts, removed the smoke reviews, deactivated the
dead category and recomputed every rating and job counter from real records; the seed no longer invents them.
Each trade has its own service menu. Public provider data carries no contact details, and reviewers appear as
"Sarah M.".
**Verified.** `validate-homeservice.js`: no problems. S1: public profile has no email/phone; review author
"Sarah M."; review count moves by exactly one.

### P1 — Provider cards said "Available now" for everyone

**Fix.** Cards show the provider's real online state.

### P2 — Also fixed
- Accept racing a cancel, or a double tap, could both "succeed"; writes are now conditional (409 for the loser,
  a harmless no-op for a repeat). S9.
- Bookings list: sorted live-first, reviews shown, status filter applied before the page is cut.
- Rate limiter was 100 requests / 10 min per IP — one polling screen, or a shared mobile-carrier IP, could lock
  the app. Now per account for signed-in users.

---

## Not done / known limits

- **On-device walkthrough: not yet run.** The phone (SM-A035F) disconnected from USB during the session. Every flow
  above is proven end to end through the real API and realtime service, and the bundle compiles, but the new and
  changed screens have not yet been tapped through on a device.
- 24 wallets across the platform (shopping, healthcare and older test accounts; last activity July–September)
  have balances that disagree with their ledgers. None was caused by this work — today's home-service payments
  reconcile exactly — and `scripts/wallet-reconcile-repair.js` can fix them once the owner has reviewed the list.
- Tips are not offered; card payment goes through wallet top-up (Stripe test mode), as before.
