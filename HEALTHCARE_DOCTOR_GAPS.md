# Doctor view — remaining backend gaps

What the app currently cannot show truthfully, and what the backend needs to
provide. Everything here has already been handled honestly on the client (the
UI states what it doesn't know rather than inventing a value), and the
parameters are pre-plumbed, so each item below is a near-zero client change
once the endpoint lands.

Backend repo: `MetroMatrix-Backend` (`src/controllers/healthcareDoctorController.js`,
`src/routes/healthcareDoctorRoutes.js`).

---

## 1. Dashboard returns only ONE appointment for "Today's Schedule"

`GET /doctors/me/dashboard` returns `nextAppointment` (singular). The client
maps it to `upcomingAppointments: d.nextAppointment ? [d.nextAppointment] : []`
(`networks/healthcare/providerApi.ts`), so the dashboard's **"Today's Schedule"
section and its count badge show at most 1** — a doctor with eight
appointments sees "1". The list looks complete and is silently truncated.

**Ask:** return `todayAppointments: Appointment[]` alongside `nextAppointment`.

## 2. Dashboard `cancelled` count is hardcoded to 0

The controller does not return a cancelled count, so the client hardcodes
`cancelled: 0` and the dashboard's "Cancelled" stat card always reads 0.

**Ask:** include `today.cancelled` in the dashboard payload.

## 3. Earnings has no baseline for a trend

`GET /doctors/me/earnings?period=` returns `{ breakdown }` only. The client had
been defaulting `trendPercentage ?? 12`, so **every doctor saw "+12% vs last
period" forever, including at PKR 0**. That badge is now removed.

It cannot be derived client-side honestly: the chart's newest bucket is always
partial, so a record month would read as a decline for most of it, and `total`
sums the whole returned series rather than the selected period.

**Ask:** add `previousTotal` (and ideally `previousPeriodLabel`) computed over
the equivalent **complete** prior window. The client will then render the trend
only when `previousTotal > 0`.

## 4. No real patient-queue resource

There is no queue entity — the client builds one from
`GET /doctors/me/appointments`. Consequences now handled honestly on the client:

- **Token numbers** were `idx + 1` rendered as clinic tokens. Now labelled and
  typed as a list *position*.
- **Wait estimates** were `idx * 15` rendered as "~15 min wait" — a clinically
  actionable number derived from array position. **Removed entirely.**
- **"Start consultation"** has no endpoint. `updateQueuePatientApi('start')`
  sends `PATCH /doctors/me/appointments/:id/confirm`, which is the wrong verb;
  the in-progress state is local only.

**Ask:** a queue resource with server-issued token numbers, real wait
estimates, and documented check-in / start-consultation transitions.

## 5. Note attachments never upload

`attachFileApi` (`networks/healthcare/providerApi.ts`) performs **no HTTP call
at all** and always returns `{ success: true }`. The UI shows the file attached
and nothing leaves the device.

**Ask:** a multipart upload endpoint for note attachments. Until then the
attach control must be labelled or disabled — it must never report success for
an upload that did not happen.

## 6. `videoConsultation` is not persisted

`fetchAvailabilitySettingsApi` hardcodes `videoConsultation: true` and
`saveAvailabilitySettingsApi` sends only `isAvailable`, `weeklyAvailability`
and `absentDates`. So the toggle always reads "on" and flipping it does
nothing.

**Ask:** persist and return `videoConsultation` on
`GET`/`PATCH /doctors/me/availability`.

## 7. Legacy `usd` wallet documents

Some wallets were created with `currency: 'usd'`, which made the doctor
dashboard show "$0.00 USD" beside PKR earnings.
`networks/wallet/walletApi.ts` records that the ledger was always meant to be
PKR. The client now normalises unsupported currencies at ingest
(`constants/Currency.ts` + `services/wallet/walletSlice.ts`), so this is
cosmetic rather than urgent — but the data is still wrong.

**Ask:** migrate legacy `usd` wallet documents to `PKR`.

## 8. Prescription PDF is 403 for the prescribing doctor

Per `HEALTHCARE_SPEC.md` §3 A4 the doctor who wrote a prescription cannot fetch
its PDF.

**Ask:** allow the prescribing doctor access.

## 9. `processPaymentApi` is a silent stub

`providerApi.ts` returns a synthetic `payatclinic-*` id with no HTTP call. It
has no caller in the doctor view today, but if it were wired up it would report
success for a payment that never happened.

**Ask:** implement it, or have it return `success: false` with a typed
not-implemented message.

---

## Already fixed in the backend (this pass)

- `GET /doctors/me/appointments` now accepts an inclusive **`from`/`to`** range.
  Previously only an exact `date` existed, so the schedule screen requested
  `status=upcoming` and filtered in memory — past days were always empty and
  anything past the page limit was invisible.
- `scripts/seed-healthcare.js` now seeds **a clinic day for today** for doctor 1.
  Every other seeded appointment sits 2–11 days in the past or future, so a
  doctor signing in saw 0 TOTAL / 0 SEEN / 0 PENDING, "0 waiting · 0 completed"
  and PKR 0 — the app looked broken while faithfully rendering an empty day.
  Idempotent per day via a date-stamped marker.
