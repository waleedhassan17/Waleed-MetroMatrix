# HOMESERVICE_REPORT_SECTION — Paste-Ready Content for the FYP Report

Source-checked against `MetroMatrix_FYP1_report_final (2).docx` (the report you have on disk). Quoted FR/NFR
text below is copied verbatim from your Chapter 2; everything else is written from what was actually
built and verified (see HOMESERVICE_E2E.md for the verification method).

**Headline correction to make in the report first:** §5.4.5 currently reads *"Home Services Module (In
Progress)"* with Booking Engine, Stripe Integration, and React Native UI all marked *(Partial)*. That
section is now stale — replace it with the content below. The AI Provider Matching Score paragraph
("Designed... hardcoded... FYP-II") was accurate and required no correction beyond changing "Designed" to
"Implemented" — it's exactly what got built, weights and all.

---

## 1. Module overview, roles, end-to-end flow

Home Services is a three-role marketplace (Customer, Provider, Admin) built as a peer module to Healthcare
and Shopping inside the same modular-monolith backend (`src/modules/homeservice/`). End-to-end flow:
customer searches providers by category + location → views a provider profile → books a time slot at a
saved address → the assigned provider accepts, travels (live-tracked), arrives, and completes the job →
customer pays from the in-app wallet → customer reviews → provider's rating updates atomically → provider
requests a payout → admin approves it. Every booking carries a complete, append-only status history and
is visible to admin from creation to close, including disputes.

## 2. Data model (for the class/ER diagram)

- **Booking** (`HSBooking`): customer, provider, serviceCategory/SubCategory, description, images[],
  scheduledFor/scheduledTime, address `{ label, line1, city, coordinates: GeoJSON Point, 2dsphere }`,
  status (canonical enum, §3), statusHistory[] `{ status, changedBy: {id, role}, changedAt, note }`
  (append-only), pricing `{ estimatedPrice, finalPrice, currency }`, payment `{ status, method,
  walletTransactionId, requestedAmount, paidAt }`, cancellation `{ by, reason, at }`, work `{ startedAt,
  endedAt, actualDurationMinutes, notes, photos[] }`.
- **ChatMessage** (`HSChatMessage`): booking, sender, senderRole, text (≤2000), attachments[], readAt;
  indexed `{ booking, createdAt }`.
- **ProviderReview** (`HSProviderReview`): booking (**unique** — one review per booking), customer,
  provider, rating (1–5 integer), comment, tags[].
- **Dispute** (`HSDispute`): booking, raisedBy `{id, role}`, againstRole, reason, description, evidence[],
  status (open/investigating/resolved/rejected), resolution, refundAmount, resolvedBy, resolvedAt.
- **PayoutRequest** (`HSPayoutRequest`): provider, amount, method, accountDetails, status
  (pending/approved/rejected), decidedBy, decidedAt, rejectionReason, walletTransactionId.
- **ServiceCategory** (`HSServiceCategory`): name, slug, providerSubType, icon, badge, basePrice, isActive,
  sortOrder — the service catalogue is data, not a hardcoded enum (see §8, FR-07).
- **HSAuditLog**: admin, action, targetType/Id, before/after, reason — one record per admin mutation.
- Existing `Provider` model extended with `isAvailable`, `serviceRadius`, `basePrice`, `currentLocation`
  (GeoJSON Point, 2dsphere) for discovery.

## 3. Booking state machine

```
PENDING → ACCEPTED | REJECTED | CANCELLED
ACCEPTED → EN_ROUTE | CANCELLED
EN_ROUTE → ARRIVED | CANCELLED
ARRIVED → IN_PROGRESS | CANCELLED
IN_PROGRESS → COMPLETED
COMPLETED, REJECTED, CANCELLED — terminal
```

Enforced centrally in `bookingService.transition()` (`src/modules/homeservice/services/bookingService.js`).
Actor rules: only the **assigned** provider may ACCEPT/REJECT/EN_ROUTE/ARRIVED/IN_PROGRESS/COMPLETED; only
the **customer** may CANCEL, and only strictly before IN_PROGRESS; **admin** may force any transition,
which is only permitted with a mandatory reason and is always recorded in `statusHistory` with the admin's
id. This is proved live in the smoke test (customer cannot accept, a different provider gets 403, customer
cannot cancel an in-progress job) and by 62 dedicated Jest tests covering every legal transition, every
illegal one, and every actor violation, including two regression tests for a real bug found during live
testing (see §11).

Four independent frontend status vocabularies pre-existed on the client (`booking.ts`, `serviceStatus.ts`,
`tracking.ts`, `job.ts`) before any backend was built. All four are now derived, in one file
(`statusMap.js`), from the single canonical status above — never duplicated logic.

## 4. Provider discovery — $geoNear + weighted matching score

`GET /api/providers` runs `$geoNear` as the **first** aggregation stage (spherical, metres, on the
`providers` collection's 2dsphere index) whenever the customer's position is known — their pinned saved
address, else the phone's location — filtered to searchable home-service providers
(`providerType: 'home_service'`, `adminVerified: 'active'`, `isActive: true`, not hidden). Without a
position it is a plain `$match` across every city, with no invented distances. Each provider's own service
radius is enforced, and the search widens (15 → 30 → 60 km) only when nobody is in range. Per result:

```
matchingScore = w_d·distance + w_r·rating + w_a·availability + w_q·quality      (defaults .35/.35/.15/.15)
distance     = 1 − min(d / radius, 1)                 (Haversine distance from $geoNear)
rating       = bayes / 5,  bayes = (C·m + avg·n) / (C + n),  m = 4.0, C = 5
availability = 1 if available NOW: online, seen in the last onlineStaleMinutes, inside today's hours (PKT)
quality      = (completed + 1) / (total bookings + 2)     (completion rate, Laplace-smoothed)
               unknown distance → 0.5 (neutral); city-centre estimate → damped closeness
```

The Bayesian rating stops a single 5★ review outranking a provider with fifty 4.8★ reviews; the quality
term is how "list by quality" is measured. Weights, the freshness window and the ranking mode are
admin-tunable (`/admin/homeservice/settings`) and every result carries its `scoreBreakdown`. Provider
locations are a coarse **service base** (~500 m grid, set by the provider or sampled when they go online);
the live GPS track is never stored (NFR-08). Sorts: best match (default), nearest, top rated, most
reviewed, price. Filters: minimum rating, available now, within X km, maximum price.

**Learned re-ranking (FYP-II).** Every search logs the providers shown with the features used to rank
them; bookings are credited back through `rankingContext.searchId`. A nightly Python job
(`ml/mm_ml/jobs/train_matching.py`) trains a small MLP on those outcomes, exports it to a TensorFlow.js
LayersModel and registers it with its holdout AUC against the heuristic's. The API scores the top 50 with
`@tensorflow/tfjs-core/-layers/-backend-cpu` (pure JS, serverless-safe) only after a parity check against
fixtures written by Python; admins choose `heuristic`, `shadow` (scored and logged, never shown), `blend`
or `model`, and any error or timeout falls back to the heuristic order.

## 5. Real-time layer

Socket.io attached to the HTTP server (not the Express app), JWT-authenticated in `io.use()`, room
convention `booking:<id>` with server-verified membership (a client can never join a room it isn't part
of). Chat persists to MongoDB and broadcasts `new_message`; typing and read-receipts are ephemeral events.
Live tracking (FR-09) broadcasts `provider_location_update`, throttled to one accepted update per booking
per 3 seconds, and is **only accepted while the booking is EN_ROUTE or ARRIVED** — verified live: rejected
during IN_PROGRESS, accepted once a booking was driven to EN_ROUTE. Positions are cached in an in-memory
map only (`lastLocationStore.js`) and cleared the moment the booking leaves that window — nothing about a
provider's location is ever written to the database, satisfying NFR-08's "location data is only ever used
during an active booking and is never stored once the job is done" verbatim. Every socket event has a REST
fallback (documented in `SOCKET_API.md`) because the Vercel production deployment is serverless and cannot
hold WebSocket connections — the app degrades to polling there.

Calling (FYP-I): signalling only — `call_ring`/`call_accept`/`call_decline`/`call_end` over the socket,
audio handed to the native dialer. *Superseded:* calls are now in-app WebRTC relayed through Cloudflare
TURN (see `CHAT_CALL_CHANGELOG.md`).

**Push (FR-16).** Every lifecycle event also reaches a closed app: the API posts to the realtime service,
which sends through Expo Push → FCM HTTP v1 — accepted, rejected, on the way, ~5 minutes away (once per
trip, claimed atomically), arrived, work started, completed, cancelled (by customer, provider, the system
when a rival accepted, expiry or an admin), payment requested/received, cash selected, reminder an hour
before, new review, and the doorstep identity check.

## 6. Payment, commission and payout design

Money moves on the existing wallet rails (`WalletService`), not a new payment system. Wallet-method
payments use `WalletService.transferFunds` customer→provider with `feePercent` set to the platform
commission and an idempotency key of `hspay-<bookingId>` — structurally impossible to double-pay, verified
live (second payment attempt on the same booking → 400). Cash payments record the provider's commission as
a wallet debit; if the provider's balance can't cover it yet, the debit is recorded `pending` and settled
against their next payout request rather than blocking the cash confirmation. Reviews recompute
`provider.ratings` with a single atomic MongoDB update expression — no read-modify-write race. Payouts are
rejected if they exceed `wallet.balance − pending cash commissions − already-requested pending payouts`;
this exact formula is shared between the earnings screen's displayed "available" figure and the payout
endpoint's validation after a bug (§11) let them disagree.

## 7. Provider onboarding

Unchanged from the existing two-step pipeline (email verification, then admin document review via
`adminVerified: pending → active`) — Home Services providers are Provider documents with
`providerType: 'home_service'` and `providerSubType: electrician | plumber | ac_repairer`, going through
the exact same approval flow as doctors and vendors. No new onboarding code was needed.

## 8. Endpoint & socket event tables

Full tables with method, path, role, params, body, response, and errors are in `HOMESERVICE_API.md`
(backend repo) and `SOCKET_API.md` (backend repo) — not duplicated here to avoid drift between two copies.

## 9. Screen inventory by role

**Customer:** home, quick-search, search-providers, service-providers, provider-profile, Booking (+
AddressManagement, new), book-confirmation, service-status, live-tracking (sockets), providers-chat
(sockets), call-screen, payment-screen, rating-screen, bookings tab, BookingDetail (new), RaiseDispute
(new), HomeServiceNotifications (new).
**Provider:** dashboard, jobs tab, earnings tab, jobdetail, awaiting-approval, map-screen (sockets), job-
in-progress, job-completion, payment-screen, profile (renamed from the misspelled `profie-screen`),
provider-chat (new), call-screen (new), availability settings (new).
**Admin:** AdminHSBookings, AdminHSBookingDetail (force-status + refund, both reason-gated and audited),
AdminHSDisputes (resolve + optional refund/penalty), AdminHSPayouts (approve/reject), AdminHSService
Categories (CRUD), AdminHSAnalytics, AdminHSSettings (commission/radius/matching weights/min payout — the
single source of truth the search and payment code reads at runtime).

---

## 10. FR-01..FR-20 verification table

Quoted requirement text is verbatim from your report's Chapter 2 (Table of Functional Requirements). Not
every FR belongs to Home Services — several are shared/platform-level (auth, RBAC) or Healthcare-specific;
those are marked accordingly rather than force-fit.

| FR | Requirement (verbatim) | Scope | Verdict | Evidence |
|---|---|---|---|---|
| FR-01 | User Registration (email/password, Google, Facebook) | Platform-wide, pre-existing | Done (out of HS scope) | `src/routes/authRoutes.js` |
| FR-02 | Profile Completion | Platform-wide, pre-existing | Done (out of HS scope) | — |
| FR-03 | Provider Registration (category, experience, area) | Shared provider onboarding | Done | `Provider.providerType='home_service'`, `providerSubType` |
| FR-04 | Email Verification (two-step, step 1) | Platform-wide, pre-existing | Done (out of HS scope) | — |
| FR-05 | Document Upload (5 types) | Shared provider onboarding | Done (out of HS scope) | `uploadMiddleware.js` |
| FR-06 | Admin Approval (two-step, step 2) | Shared, extended for HS oversight | Done | `adminVerified: pending→active`; HS5 adds booking/dispute/payout oversight on top |
| FR-07 | Service Browsing (category, rating, availability, proximity filters) | **Home Services** | **Done** | `GET /providers` — `$geoNear` on the 2dsphere index, minimum rating / available now / within X km / price filters, five sorts, paging; server order kept by the app (list + map); tests `discovery.test.js`, `discovery.integration.test.js` |
| FR-08 | Booking Creation (category, time slot, address → provider dashboard) | **Home Services** | **Done** | `POST /bookings`; live-verified end to end |
| FR-09 | Real-Time GPS Tracking (live location, route) | **Home Services** | **Done** | socket `provider_location_update` + REST fallback; live-verified incl. the EN_ROUTE/ARRIVED gate |
| FR-10 | In-App Chat (WebSocket, real-time) | **Home Services** | **Done** | socket `send_message`/`new_message`; live-verified; both customer AND provider sides now exist (were one-sided before this work) |
| FR-11 | Multi-Method Payment (wallet, earnings ledger update) | **Home Services** | **Done** — with one honest scope note | Wallet method fully live-verified (payment + commission + double-payment rejection). "Multi-method" in the report implies card/JazzCash/EasyPaisa gateways; only the in-app wallet is real — `jazzcash`/`easypaisa` in the payment screen currently route through the wallet as a stand-in, not a live mobile-money integration (see §12) |
| FR-12 | Review and Rating (1–5 stars, displayed on profile) | **Home Services** | **Done** | atomic rating recompute; live-verified (duplicate rejected, rating updates after review) |
| FR-13 | Provider Dashboard (stats, earnings, pending payments) | **Home Services** | **Done** | `GET /provider/dashboard`; live-verified |
| FR-14 | Provider Job Management (accept/reject/complete, real-time status to customer) | **Home Services** | **Done** | full accept→complete chain live-verified; `booking_status_changed` socket event |
| FR-15 | Admin User Management | Platform-wide, pre-existing | Done (out of HS scope) | — |
| FR-16 | Notification System (FCM push for lifecycle events) | **Home Services** (+ Healthcare, Shopping) | **Done** | In-app notifications + socket events + **push for every lifecycle event** via Expo Push → FCM HTTP v1 (`bookingService.pushFor`, `notificationService`, `expiryService`, reminders on the scheduler tick); tests `pushMatrix.test.js`, `nearby.test.js`, `reminders.test.js`, `orderNotifications.test.js`. Healthcare appointments and Shopping orders push too |
| FR-17 | Role-Based Access Control | Platform-wide, extended | Done | `protect/userOnly/providerOnly/adminOnly` + `loadBookingWithAccess` ownership guard, live-verified both directions (403 for a different provider, 403 for non-admin) |
| FR-18 | Social Authentication | Platform-wide, pre-existing | Done (out of HS scope) | — |
| FR-19 | Password Recovery | Platform-wide, pre-existing | Done (out of HS scope) | — |
| FR-20 | Provider Earnings Tracking (daily/weekly/monthly breakdown) | **Home Services** | **Done** | `GET /provider/earnings` — aggregation pipelines, not in-memory loops; live-verified incl. the availableBalance fix (§11) |

FR-16 was the one partial item in the mid report; it is now complete (push for the whole matrix, plus
Healthcare and Shopping). Word it as "push notifications (FCM HTTP v1, delivered through Expo's push
service)" — the app never calls FCM directly.

## 11. TC-09..TC-15 — Chapter 4, Table 4.2 "Home Services Module"

Your Chapter 4 test table pre-dated this work and was written against a **different architecture than what
was built** — TC-12/13 assume Stripe test cards, TC-15 assumes a provider "auto-accept" feature that
doesn't exist and isn't in your own FR list (FR-14 explicitly says providers "accept, reject" — manual,
not automatic; the TC table's own FR-Ref column disagrees with Chapter 2 here, worth fixing regardless of
this module). Rather than fabricate results against tests that don't match the real system, each row below
states the ORIGINAL planned test, then the ACTUAL test run against the real implementation and its result.
Full transcript: `scripts/smoke-homeservice.js` in the backend repo (31/31 passing) plus a second live
verification pass (see HOMESERVICE_E2E.md).

| TC | Original (as written) | Actual test run | Actual Output | Status |
|---|---|---|---|---|
| TC-09 | Search electricians near Lahore coords, HTTP 200 ranked list within 10 km | `GET /providers?category=electricians&lat=31.5204&lng=74.3587&radiusKm=30` | 200; 5 electricians returned, `matchingScore` sorted strictly descending (top match 0.959) | **PASS** |
| TC-10 | Search with no providers in area, expect empty array + message | Not run against a genuinely empty area (all seeded providers are in Lahore) — the empty-result code path (`$facet` with 0 items) was exercised by the aggregation logic itself but not observed with a truly remote coordinate | — | **NOT RUN** — recommend a quick manual check with e.g. `lat=24.86&lng=67.00` (Karachi) before the demo |
| TC-11 | View provider profile by id, HTTP 200 full object with reviews[] | `GET /providers/:providerId` | 200; `{name: "Ahmad Khan", rating: 4.8, reviewsList: [...]}` | **PASS** |
| TC-12 | Create booking + Stripe test card 4242…, HTTP 201, status=CONFIRMED, push sent | **Substituted**: `POST /bookings` (no Stripe — wallet architecture, see §12) → `POST /payments/process {method:'jazzcash'}` after job completion | Booking created (`status: waiting/PENDING`); payment completed via wallet transfer with commission deducted; `booking_status_changed` socket event fired (push substitute) | **PASS** (on the actual architecture) |
| TC-13 | Booking with declined Stripe card, HTTP 402, booking NOT created | **Substituted**: attempt a second payment on an already-paid booking | HTTP 400, `"This booking has already been paid"`, no duplicate transaction created | **PASS** (equivalent guarantee — no double-charge — proved on the real payment path) |
| TC-14 | Real-time location via Socket.io, marker re-renders | Live `socket.io-client` session: connect → `join_booking` → `provider_location` while EN_ROUTE | `provider_location_update` broadcast to the room with the emitted coordinates; correctly **rejected** with `"Tracking not active in status IN_PROGRESS"` when attempted outside EN_ROUTE/ARRIVED | **PASS** (stronger than the original test — proves the status gate, not just the happy path) |
| TC-15 | Provider "auto-accept" triggers booking → ACCEPTED automatically | **No auto-accept exists** (nor is it in FR-14). Actual: provider manually calls `POST /provider/jobs/:id/accept` | 200; `status: ACCEPTED`; a *different* provider attempting the same call gets 403 | **PASS** (manual-accept is what FR-14 actually specifies; recommend rewriting this TC's premise rather than the code) |

**Two report actions to take from this table:**
1. TC-10 needs a genuine run against an out-of-range location before the report is finalized.
2. TC-12/13/15's premises (Stripe, auto-accept) contradict both the actual FYP-I architecture decision
   (wallet-only payments, no Stripe key anywhere in the codebase) and your own FR-11/FR-14 wording. Rewrite
   the test *descriptions* to match the wallet + manual-accept design already documented in FR-11/FR-14 —
   the underlying guarantees (no double-payment, no unauthorized accept) are proven either way.

## 12. Architecture honesty — divergences to write into the report, not hide

Your Chapter 3/5 describe: a microservices backend behind an API Gateway, Redis for caching/session/OTP
version-locking, Twilio for OTP SMS delivery, Stripe for payments, and an "AI Matching Engine". The actual
system, for Home Services and the platform it sits in:

- **Modular monolith, not microservices-behind-a-gateway.** All modules (auth, wallet, healthcare,
  shopping, home services) run in one Express process (`src/app.js`), with module boundaries enforced by
  directory structure (`src/modules/homeservice/`) and Express sub-routers, not network calls or service
  discovery. *Why this was the right call:* a 3-person FYP team on free-tier Heroku/Vercel hosting gets
  zero practical benefit from inter-service network hops — only added latency, deployment complexity, and
  a service-discovery problem (Challenge 1 in your own Chapter 5) that a monolith doesn't have. Module
  boundaries are still real (separate models, services, routes per domain) — just not process boundaries.
  The **API gateway** is an in-process layer (`src/gateway/`): request ids, structured access logs, CORS
  and security headers, rate limits shared across serverless instances through Redis, JWT verification
  per router, and one route table mounting every module. Call it an "API gateway layer", not a separate
  gateway product.
- **Redis, as a fail-open cache (FYP-II).** Upstash Redis (HTTP client — serverless-safe) holds hot data:
  provider-search pages (30 s, per ~1 km cell), settings, recommendations (10 min), parsed natural-language
  queries (24 h), per-minute request/error counters and who is active right now (the real-time dashboard),
  and the shared rate-limit counters. Every call has a 150 ms budget and a circuit breaker: with Redis
  slow or down the API simply reads MongoDB. Money is never cached (a test enforces it), sessions stay
  JWT + MongoDB refresh tokens, and live provider locations stay in memory only (NFR-08) — deliberate
  choices, write them as such.
- **Email verification, not Twilio OTP SMS.** Account activation is gated on a verified-email link, not an
  SMS one-time code. *Why:* Twilio SMS costs real money per message and requires a business-verified
  sender ID to avoid carrier filtering in Pakistan — email verification achieves the same "prove you own
  this contact channel" security property at zero marginal cost for a student project's user base.
- **In-app wallet, not Stripe.** All Home Services money movement (bookings, commission, payouts, refunds)
  rides the existing `WalletService` — a ledger inside the platform's own MongoDB, not a card processor.
  *Why:* Stripe onboarding for a Pakistani SBP-regulated payment flow is a compliance project in its own
  right (documented as a constraint in your own stakeholder analysis); a wallet demonstrates the same
  booking→pay→earn→payout lifecycle end-to-end without that dependency, and is honestly labelled in the
  code and this report as the FYP-I payment mechanism rather than a Stripe stand-in.
- **AI matching: a heuristic with a learned model on top (FYP-II).** The weighted score (§4) ranks by
  default; the learned MLP (Python-trained, TF.js-served) re-ranks only when an admin enables it and its
  checks pass. Report its metrics as measured (holdout AUC vs. the heuristic's) and say which data it was
  trained on: models trained on simulated data are labelled `synthetic` and are never activated
  automatically.

None of these divergences reduce what the module demonstrates — booking lifecycle, geospatial discovery,
real-time chat/tracking, payment with commission, and full admin oversight are all real and independently
verified (§11, HOMESERVICE_E2E.md). The honest framing is simply: right-sized engineering for a 3-person
team and free-tier hosting, not a shortfall against the documented design's actual goals.
