# HEALTHCARE_SPEC.md — MetroMatrix Healthcare Module Contract

Backend: `MetroMatrix-Backend` (`src/modules/healthcare/` + 4 doctor/admin route files at `src/routes/`). Frontend: `Waleed-MetroMatrix` (~38 healthcare screens). Audit date: 2026-07-19.

---

## 1. ENDPOINT INVENTORY (~72 endpoints)

### Patient / public — `/api/v1/healthcare/*` (module router `src/modules/healthcare/routes/index.js`)

| Method+Path | Auth | Handler |
|---|---|---|
| GET `/specialties`, `/specialties/:id` | public | specialtyController |
| POST/PUT/DELETE `/specialties[/:id]` | **requireUser — HOLE (any patient)** | specialtyController |
| GET `/doctors`, `/doctors/search`, `/doctors/featured`, `/doctors/:doctorId`, `/:doctorId/slots`, `/:doctorId/clinics`, `/:doctorId/reviews` | public | doctorController |
| PUT `/doctors/profile`, POST `/doctors/clinics`, PUT `/doctors/clinics/:clinicId[/timings]` | requireUser+requireDoctor | doctorController |
| GET `/slots/:doctorId` | public; `/slots/my-slots` + POST/PUT/DELETE | requireDoctor | slotController |
| GET/POST `/appointments`, GET `/:appointmentId`, GET `/:appointmentId/prescription`, PATCH `/:appointmentId/cancel`, `/reschedule` | requireUser (service scopes by userId) | appointmentController |
| GET `/appointments/doctor`, PUT `/appointments/:id/status` | requireDoctor | appointmentController |
| GET `/reviews/doctor/:doctorId` public; POST `/reviews` requireUser | reviewController |
| GET `/prescriptions/my`, GET `/prescriptions/:prescriptionId/pdf` requireUser; POST requireDoctor | prescriptionController |
| GET/POST `/health-records`, PUT `/:id`, DELETE `/:recordId` | requireUser (ownership checked in controller) | healthRecordController |
| GET `/notifications`, PATCH `/read-all`, `/:id/read`, DELETE `/:id` | requireUser | notificationController |

### Doctor self-service — `/api/v1/healthcare/doctors/*` (`src/routes/healthcareDoctorRoutes.js`, 35 endpoints)

register, signin, verification upload; me profile/image; clinics CRUD; schedule; slots create/generate/block/unblock; availability get/set; appointments list/detail/confirm/complete/cancel; prescriptions create/update/list; dashboard; earnings; transactions; reviews; patient notes CRUD; patient history. All `protect + providerOnly`.

### Admin — `/api/v1/admin/*`

doctors pending/approve/reject/list (`adminDoctorRoutes`); specialties CRUD (`adminSpecialtyRoutes`); analytics stats/appointments/revenue (`adminAnalyticsRoutes`). All `protect + adminOnly`. **Nothing else — no appointment/clinic/review/settings oversight.**

Cron: `jobs/appointmentReminders.js` registered at boot.

## 2. DATA MODEL (13 collections)

Doctor (1:1 Provider via `providerId`; verificationStatus, specialtyId, consultationFee mirrors Provider, ratings agg), Specialty, Clinic (doctorId), ClinicTiming, Slot (doctorId, clinicId, date, time, status available/booked/blocked), Appointment (patientId→User, doctorId→Doctor, clinicId, slotId, status pending/confirmed/completed/cancelled/no_show, patientInfo snapshot, **no payment fields**), Prescription (appointmentId, doctorId, patientId, medications[]), Review (doctorId, patientId, appointmentId, rating), HealthRecord (userId, files), MedicalNote (doctorId, patientId), HCNotification (userId), Coupon, VideoCall — last two UNMOUNTED.

## 3. AUTHORISATION MATRIX — holes found

| # | Route | Current guard | Should be |
|---|---|---|---|
| A1 | POST/PUT/DELETE `/specialties` (module) | requireUser | admin only (comment admits it) |
| A2 | POST `/coupons` | requireUser | admin only |
| A3 | GET `/coupons` | requireUser | fine for validate/list active, but returns all coupons incl. inactive → scope |
| A4 | Prescription PDF | patient-only check | should ALSO allow the prescribing doctor (spec: both) — currently 403s the doctor |
| A5 | `GET /doctors/me/patients/:patientId/history` and `/notes` | providerOnly, queries scoped to own doctor BUT fetches the patient's User record (name/phone) regardless of any appointment relationship → leaks patient identity to any doctor for any id | require ≥1 appointment between doctor and patient |
| A6 | `/video-calls/*` | requireUser only (unmounted today) | participants only, if ever mounted |

Verified OK: health-record update/delete check `record.userId === req.user._id`; slots and clinics scope by `req.doctor._id`; appointment detail service scopes by user id; medical notes queries filter by own doctorId; prescriptions `/my` scopes by patientId.

## 4. UNMOUNTED CODE

`routes/index.js` does not mount `videoCallRoutes.js` (join/status/end + VideoCall model) or `couponRoutes.js` (validate/create/list + Coupon model). Frontend has fully built VideoCall/VideoWaitingRoom/InCallChat screens registered in HealthcareStack, but **package.json has no WebRTC/Twilio/Agora dependency** — the video UI has no transport. See TELEMEDICINE_DECISION.md (H6).

## 5. PHI EXPOSURE SUMMARY

- Health records: ownership enforced (read scoped to own userId; update/delete check owner). Doctor access to a patient's records: **no endpoint exists** (not a leak; a gap).
- Prescriptions: `/my` scoped; PDF patient-only (A4 — prescribing doctor wrongly blocked, no leak).
- Medical notes / patient history: scoped to authoring doctor's records, but patient name/phone returned without relationship check (A5).
- Appointments: scoped via service by req.user; doctor endpoints scoped via req.doctor.

## 6. SCREEN INVENTORY (frontend)

- **Patient (24 folders, `screens/user/healthcare/`)**: home, specialty-list, doctor-search, doctor-list, doctor-detail, doctor-reviews, clinic-selection, slot-selection, book-appointment, appointment-confirm, booking-confirmation, MyAppointments, AppointmentDetail, RescheduleAppointment, prescription-view, health-records, upload-record, notifications, emergency, profile, tabs, VideoCall, VideoWaitingRoom, InCallChat.
- **Doctor (11 folders, `screens/providers/healthcare/`)**: doctor-home, doctor-schedule, patient-queue, medical-notes, prescription-writer, patient-history, doctor-earnings, manage-slots, availability-settings, profile, tabs.
- **Admin (3)**: DoctorManagement, SpecialtyManagement, HealthcareAnalytics.

All screens call `networks/healthcare/*` which run on **dummy fixtures** (`USE_HEALTHCARE_DUMMY_DATA = true` in `networks/healthcare/config.ts`; the comment claims "Real backend by default" — it isn't).

## 7. DUMMY DEPENDENCY MAP ⭐ (the key finding)

49 `USE_HEALTHCARE_DUMMY_DATA` branches: `providerApi.ts` 22, `appointmentApi.ts` 11, `healthcareNetwork.ts` 8, `doctorApi.ts` 7, `config.ts` 1. `adminApi.ts` clean (already real).

**Every branch except ONE already has a real-endpoint implementation with serializers written directly below the dummy branch.** This module was wired for the real backend and then left switched off. Classification:

| Status | Count | Detail |
|---|---|---|
| **READY (flip the flag)** | 48 | dummy branch → real `healthcareApiRequest` call with shape adaptation already coded (verified in fetchTimeSlotsApi, bookAppointmentApi, dashboard, schedule, notes, prescriptions, records, notifications, earnings, transactions, profile, etc.) |
| **DUMMY ONLY** | 1 | `providerApi.applyCouponApi` — no real branch; backend couponRoutes unmounted. → typed not-implemented error (goes in HEALTHCARE_MISSING_ENDPOINTS.md) |
| **ENDPOINT MISSING (called nowhere yet)** | — | payment endpoints (H2), admin oversight (H3) |

**Conclusion: H4 is a flag flip + fallout fixing, not a rebuild.**

## 8. MISSING SCREENS / UI GAPS

- Patient: **AppointmentPayment** (no payment anywhere despite consultationFee + wallet), **MyPrescriptions list** (PrescriptionView is unreachable except by id), InCallChat only reachable inside VideoCall.
- Doctor: **no video consultation screen** (patient half exists → call can never connect), **DoctorReviews** (endpoint exists, no UI), **DoctorNotifications** (cron reminders go nowhere visible), **DoctorPatients** (PatientHistory unreachable without a browsable patient list).
- Admin: no dashboard, no appointment list/detail, no clinic management, no review moderation, no settings, no suspend-approved-doctor.
- Route naming: DoctorStack maps `Consultation` → medicalNotes screen and `DoctorSettings` → availabilitySettings (H5 renames to ConsultationNotes / DoctorAvailability).
