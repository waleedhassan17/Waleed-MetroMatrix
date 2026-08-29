# Healthcare — doctor availability & patient booking

## The state this started from

Verified against the production database, not inferred:

- **Zero bookable slots.** All 530 slots ran 2026-07-08 → 2026-08-27; the date was
  2026-08-29. `future + available = 0` across **all 13 doctors**. No patient could book
  anything, from anyone.
- **12 of 13 doctors had an empty `weeklyAvailability`**, and the one that wasn't empty had
  every day `isWorking: false`.
- **No timezone field anywhere** — not on Doctor, Clinic, Slot or Appointment — and no date
  library in either repo.
- **No unique index on `Slot` or `Appointment`.** `{slotId: 1}` is non-unique.

## Root cause of the empty calendar

Generation was **one-shot**. The doctor app published a fixed 30-day window
(`generateSlots({ days: 30 })`) and nothing ever extended it. A doctor set availability once
and about a month later it silently ran out — no error, no warning, no signal to patients.
Fixing generation without fixing the horizon would have reproduced this in 30 days.

A daily job now keeps a 60-day horizon populated. **On Vercel that cron cannot be
`node-cron`** — serverless has no long-lived process, and `server.js` only runs under
`npm start` locally, the same trap the Socket.IO layer fell into. Production is driven by
Vercel Cron (`vercel.json` → `crons`) calling `/api/internal/slots/refresh-horizon`, guarded
by a timing-safe key check.

## What changed

**Times became real instants.** `Clinic` gained an IANA `timezone`; `Slot` gained
`startUtc`/`endUtc` derived from date + wall clock + that zone. The wall-clock strings stay —
they are what the doctor authored and must not move when a DST rule changes. `src/utils/time.js`
is the only place permitted to do timezone maths, and returns `null` on bad input rather than
guessing.

**A clinic per period, not per day.** `weeklyAvailability` carried one `clinicId` per *day*, so
"09:00–12:00 at Gulberg, 17:00–20:00 at DHA" was unrepresentable — the actual requirement. The
clinic now lives on the range. The editor had no clinic control at all (the `setDayClinic`
reducer existed with nothing rendering it), so every onsite hour saved `clinicId: null` and
patients were never told where to go.

**Booking became atomic.** It was a `findOne` check and a separate read-modify-write increment;
two patients both passed the check, and only a WiredTiger write conflict prevented a real
double-booking — surfacing as an unhandled **500**. Now one conditional `$inc` carrying the
capacity invariant, returning a clean **409 `SLOT_TAKEN`**. A *partial* unique index backs it,
restricted to `maxPatients === 1` so group consultations remain possible.

**Discovery works across days.** There was no past filter at all, so at 18:00 you were still
offered this morning's 09:00 slot. Results grouped by time-of-day rather than clinic, and
anything outside 06:00–22:00 was silently dropped. Added `availability-summary` (which upcoming
dates have slots, per clinic, in one indexed aggregation) and `next-available`, so the date
strip greys out empty days and offers "Next available Sat, 5 Sep" — the pattern Marham uses.

**Doctors get told when they are unbookable**, in three distinct states (never set / exhausted
/ running out), with a one-tap extend when a template already exists.

**Also fixed:** `setAvailability` assigned `weeklyAvailability` raw — no format, ordering or
overlap validation, and no check that the clinic belonged to the doctor (a real authorization
hole). Cancelling un-blocked slots the doctor had deliberately blocked. The appointment's clinic
came from the request body rather than the slot. Eight patient-side files computed "today" via
`toISOString()`, which in UTC+5 yields **yesterday** before 05:00.

## Verified against production

```
horizon populated 60 days — 732 slots, through 2026-10-28
next-available via live API — 17:00 at ZZTEST DHA
a day reports BOTH clinics — 2026-08-30 -> 12 slots across 2 clinics
a future SATURDAY is bookable — 6 slots
that day groups by clinic — Gulberg:6, DHA:6
10 parallel claims -> exactly 1 wins        (capacity 3 -> exactly 3)
release does NOT un-block a blocked slot
past slot cannot be claimed
```
Test data removed afterwards; no real doctor or booking was touched.

## What still needs doing

- **The 13 real doctors have no weekly template**, so the rolling job has nothing to roll
  forward for them — `refreshAllDoctors` currently reports `doctors: 1`. Each must set
  availability once in the app; the new banner is what prompts them. This was deliberately not
  mass-generated on their behalf.
- `CRON_SECRET` is optional; `INTERNAL_API_KEY` already works for the cron endpoint.
- Not done, and listed rather than hidden: date-specific *custom hours* (only whole-day
  `absentDates` exists), per-clinic fees (Marham varies fee by location; this app has one fee
  per doctor), the reschedule UX, and the duplicate slot-write surface in `slotController` that
  spreads the client body.
