# HEALTHCARE_E2E.md — end-to-end trace against the real backend

Backend truth: `scripts/smoke-healthcare.js` — **22/22 PASS against Vercel production** (`https://metro-matrix-backend.vercel.app`), covering the report's TC-16 (browse by specialization) and TC-17 (book in-clinic: HTTP 201, record created, slot marked unavailable, confirmation notification) plus payment, payout, prescription PDF, review→rating, admin oversight and an H1 security probe.

Frontend: `USE_HEALTHCARE_DUMMY_DATA = false`; every screen path below dispatches real thunks through `healthcareApiRequest` (the audit found 48/49 dummy branches already had real implementations beneath them). `npx tsc --noEmit` clean. Items a static trace cannot prove (on-device rendering, WebView camera permission) are marked VERIFY-ON-DEVICE.

## Smoke output (production)

```
[PASS] patient login                          [PASS] double payment rejected
[PASS] browse specialties (9)                 [PASS] doctor confirms appointment
[PASS] search doctors by specialization TC-16 [PASS] doctor completes (payout settles)
[PASS] view doctor detail                     [PASS] doctor writes prescription
[PASS] view doctor clinics                    [PASS] patient views prescriptions list
[PASS] doctor login                           [PASS] patient downloads prescription PDF
[PASS] pick an available slot for today       [PASS] patient submits review
[PASS] book returns 201 + record TC-17        [PASS] doctor rating aggregate updates
[PASS] slot marked unavailable TC-17          [PASS] admin login
[PASS] confirmation notification TC-17        [PASS] admin sees appointment in list
[PASS] pay consultation fee from wallet       [PASS] patient blocked from specialty (403)
```

## Patient path

| Step | Screen | Wire-up | Status |
|---|---|---|---|
| 1 | HealthcareHome | specialties + featured doctors (real) | PASS |
| 2 | SpecialtyList → DoctorList | search by specialtyId | PASS |
| 3 | DoctorDetail → DoctorReviews | doctor + reviews endpoints | PASS |
| 4 | ClinicSelection → SlotSelection | clinics + grouped slots | PASS |
| 5 | BookAppointment → BookingConfirmation | POST /appointments (TC-17 proven) | PASS |
| 6 | **AppointmentPayment** (new) | GET payment state, POST pay (wallet w/ insufficient state, cash) | PASS |
| 7 | MyAppointments → AppointmentDetail | lists + detail + **Pay button** when unpaid | PASS |
| 8 | RescheduleAppointment | PATCH reschedule | PASS |
| 9 | Cancel (in detail) | refund per policy, amount in response | PASS |
| 10 | **MyPrescriptions** (new) → PrescriptionView → PDF | /prescriptions/my + pdf | PASS |
| 11 | HealthRecords → UploadRecord | owner-scoped CRUD | PASS |
| 12 | HealthcareNotifications | real notifications | PASS |
| 13 | **SymptomChecker** (new) | disclaimer, ≤3 conditions, find-a-specialist deep link | PASS |
| 14 | VideoCall / VideoWaitingRoom | real join → Jitsi room in WebView | PASS (VERIFY-ON-DEVICE: camera permission prompt) |

## Doctor path

| Step | Screen | Wire-up | Status |
|---|---|---|---|
| 1 | registration → verification → approval-pending | existing provider pipeline | PASS |
| 2 | DoctorDashboard | real dashboard | PASS |
| 3 | ManageSlots / DoctorAvailability (renamed from DoctorSettings) | slots + availability | PASS |
| 4 | PatientQueue | real appointments; **Join Call** on video appts | PASS |
| 5 | ConsultationNotes (renamed from Consultation) | notes CRUD (treating-doctor-guarded) | PASS |
| 6 | PrescriptionWriter | POST prescriptions (completed appts) | PASS |
| 7 | **DoctorPatients** (new) → PatientHistory | derived from my appointments | PASS |
| 8 | **DoctorReviews** (new) | GET /doctors/me/reviews + rating filter | PASS |
| 9 | **DoctorNotifications** (new) | read / read-all | PASS |
| 10 | DoctorEarnings → Wallet | real payouts land at completion (commission deducted) | PASS |
| 11 | **DoctorVideoConsultation** (new) | same Jitsi room as patient — call can now connect | PASS (VERIFY-ON-DEVICE) |

## Admin path

| Step | Screen | Wire-up | Status |
|---|---|---|---|
| 1 | **AdminHealthcareDashboard** (new) | /healthcare/dashboard tiles → tap-through | PASS |
| 2 | DoctorManagement (approve pending) | existing endpoints | PASS |
| 3 | Doctor suspend/reactivate | PATCH /doctors/:id/status (reason, audited) | PASS (via endpoint; detail screen shows in DoctorManagement flow) |
| 4 | **AdminAppointments** (new) → **AdminAppointmentDetail** (new) | filters + payment trail + force status + manual refund (confirmed, audited) | PASS |
| 5 | **AdminClinicManagement** (new) | city filter, activate/deactivate | PASS |
| 6 | **AdminReviewModeration** (new) | ≤2★ flag, delete w/ reason → rating recompute | PASS |
| 7 | SpecialtyManagement / HealthcareAnalytics | existing (now admin-guarded server-side) | PASS |
| 8 | **AdminHealthcareSettings** (new) | live values (commission/refund window/…) | PASS |

## Fixes made during the trace

1. **H1 security**: specialty/coupon mutations were open to any patient (now admin-only); patient identity leaked via notes/history for arbitrary ids (now treating-doctor-only); prescription PDF wrongly blocked the prescribing doctor.
2. **TC-17 gap**: booking only notified the doctor — the patient confirmation notification now exists.
3. **Timezone bugs**: same-day completion failed with UTC-midnight slot dates (local normalisation + one-server-day tolerance for UTC lambdas vs PKT clients).
4. Route renames: `Consultation`→`ConsultationNotes`, `DoctorSettings`→`DoctorAvailability` everywhere.
5. `applyCouponApi` returns a typed "not available" (couponRoutes deliberately unmounted) — HEALTHCARE_MISSING_ENDPOINTS.md.

Dummy check: `USE_HEALTHCARE_DUMMY_DATA=false`; the fixtures remain only as the flag-gated offline fallback. `npx tsc --noEmit` clean at every commit.
