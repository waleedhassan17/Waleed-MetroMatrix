# Healthcare Module — FYP Report Section (draft)

Everything below is implemented and verifiable; file paths are evidence. Honest gaps at the end. Production smoke test: 22/22 against the live Vercel deployment.

## 1. Module overview and roles

- **Patient (User):** browses 8 specialties and verified doctors, selects clinic and slot, books in-clinic or video appointments, pays the consultation fee from the MetroMatrix wallet (or cash at clinic), reschedules/cancels with policy-driven refunds, joins video consultations, receives prescriptions with PDF download, keeps health records, gets notifications, writes verified reviews, and uses the AI symptom checker.
- **Doctor (Provider `providerType='doctor'`):** onboards through the existing two-step verification (email + admin approval) plus a Doctor profile with PMC number; manages clinics, availability and slots; runs the patient queue; confirms/completes appointments (completion captures cash payments and credits earnings minus platform commission); writes notes and prescriptions; sees reviews, notifications, patients, earnings; joins the same video room as the patient.
- **Super admin:** approves/suspends doctors, oversees every appointment with force-transition and manual refunds (all audited), manages clinics and specialties, moderates reviews with automatic rating recomputation, and controls the live platform parameters (commission, refund window, slot duration, booking horizon, auto-approval).

Backend: `src/modules/healthcare/` (13 models + HealthcareAuditLog, 12 route files) + doctor self-service (`src/routes/healthcareDoctorRoutes.js`, 35 endpoints) + admin oversight (`src/routes/adminHealthcareRoutes.js`). Frontend: 24 patient + 15 doctor + 9 admin screen folders. Deployed on Vercel serverless.

## 2. Data model (class/ER diagram)

Specialty · Doctor (1:1 Provider via providerId; fee, PMC, verificationStatus, denormalised rating) · Clinic (doctorId, Lahore coordinates) · ClinicTiming · Slot (doctor/clinic/date/time/type, maxPatients/bookedCount) · Appointment (patient, doctor, slot, clinic, type, status, fee frozen at booking, **payment subdocument** {status unpaid/paid/refunded, method wallet/cash_at_clinic, walletTransactionId, refundAmount}, **payout subdocument** {amount, commission, walletTransactionId}) · Prescription (medications[]) · Review (unique per appointment) · HealthRecord (owner-scoped, category enum) · MedicalNote (authoring doctor) · HCNotification · VideoCall (roomId, status, duration) · HealthcareAuditLog (who/what/before/after/reason).

Settings live in the `AdminSettings.healthcare` sub-document — the same source the payment code reads (`settingsService.js`), no duplicated constants.

## 3. Doctor onboarding

A doctor is a `Provider` that passed the existing pipeline (email verification FR-04, admin approval FR-06) plus a `Doctor` profile (`providerId` 1:1) carrying specialty, PMC number, fees and its own `verificationStatus`; only `verified` + `isActive` doctors appear in patient search. Admin can suspend an approved doctor at any time (`PATCH /api/v1/admin/doctors/:id/status`), which hides them from search and blocks new bookings while preserving existing appointments.

## 4. Appointment lifecycle

`pending → confirmed → completed`, with `cancelled` reachable from pending/confirmed. Who may trigger what: patient books (pending) and cancels pending/confirmed; doctor confirms, completes (only once the slot date has arrived), and cancels with a mandatory reason; admin may force pending→confirmed/cancelled and confirmed→completed/cancelled with a mandatory audited reason. Slot bookedCount/status stay consistent through book/cancel/reschedule (transactional service).

## 5. Payment and refund design

Fee is frozen from the doctor's `consultationFee` (or video fee) at booking; later fee changes never alter existing appointments. Policy (documented in code): **book unpaid, settle later** — wallet in-app any time before the visit, or cash captured when the doctor completes. Wallet payments debit via the shared `walletService` with a linked `WalletTransaction`; double payment and insufficient balance are rejected with clear 400s (unit-tested). Doctor payout happens at **completion**, never at payment: fee minus `commissionPercent` → the doctor's Provider wallet. Refunds: patient cancel ≥ `cancellationWindowHours` before the slot → 100%; inside the window → `lateCancelRefundPercent`; doctor/admin cancel → always 100% and the patient is notified with the amount. All refunds flow through walletService and appear in transaction history. Files: `services/paymentService.js`, tests `__tests__/payment.test.js` (window boundaries both sides, commission arithmetic).

## 6. Authorisation & PHI (NFR-08 honesty)

Fixed in H1 (`SECURITY_FIXES.md`): specialty/coupon mutations were open to any authenticated patient (now `requireAdmin`); doctor access to a patient's history/notes leaked patient identity for arbitrary ids (now `requireTreatingDoctor`: ≥1 appointment or 403); prescription PDF now patient-or-prescriber only. Health records are owner-scoped on read/update/delete; appointments participant-scoped; 13 denial-path tests prove 403s. **Honest statement for NFR-08:** access control and per-role scoping are implemented as above and all traffic is TLS-encrypted in transit (HTTPS on Vercel/Atlas); field-level encryption at rest is NOT implemented — MongoDB Atlas provides storage-level encryption by default, and that is the extent of at-rest protection. The report should claim exactly this, no more.

## 7. Endpoint table

~85 healthcare endpoints. Full table: `HEALTHCARE_API.md` (backend repo), grouped patient (public browse, booking, payment, records, notifications, reviews, symptom checker, video calls), doctor self-service (35), admin (existing + 14 new oversight endpoints).

## 8. Screen inventory

- **Patient (27):** home, specialty-list, doctor-search/list/detail/reviews, clinic-selection, slot-selection, book-appointment, appointment-confirm, booking-confirmation, MyAppointments, AppointmentDetail (+Pay button), RescheduleAppointment, **AppointmentPayment**, prescription-view, **MyPrescriptions**, health-records, upload-record, notifications, emergency, profile, tabs, VideoCall (real Jitsi), VideoWaitingRoom, InCallChat, **SymptomChecker**.
- **Doctor (15):** dashboard, schedule, patient-queue (+Join Call), ConsultationNotes, prescription-writer, patient-history, earnings, manage-slots, DoctorAvailability, profile, tabs, **DoctorVideoConsultation**, **DoctorReviews**, **DoctorNotifications**, **DoctorPatients**.
- **Admin (9):** DoctorManagement, SpecialtyManagement, HealthcareAnalytics, **AdminHealthcareDashboard**, **AdminAppointments**, **AdminAppointmentDetail**, **AdminClinicManagement**, **AdminReviewModeration**, **AdminHealthcareSettings**.

(Bold = built in this phase.)

## 9. Telemedicine & AI symptom checker (H6 decision: BUILD)

- **Telemedicine (TC-18):** built with Jitsi Meet rendered in a WebView on BOTH sides (`react-native-webview` was already a dependency; no native modules, works in the Expo managed workflow, zero cost). The previously unmounted `videoCallRoutes` are mounted with participant guards, and the missing doctor-side screen now exists so a call can actually connect. Honest limits: media relies on public Jitsi infrastructure; no recording; WebView camera permission behaviour varies by Android WebView version. Rationale + rejected alternatives (react-native-webrtc/Agora need expo-dev-client): `TELEMEDICINE_DECISION.md`.
- **AI symptom checker (TC-19):** `POST /symptom-checker` with two tiers — Gemini (strict JSON, ≤3 "possible concern" phrasings, confidence capped at 90%) and a deterministic keyword→specialty fallback that always works with zero budget. Server-enforced constraints: never a diagnosis, disclaimer always present, recommendation mapped to a real Specialty (deep-links to DoctorList), graceful "General Physician" default. Unit tests cover the fallback tier.

## 10. Honest "not implemented / FYP-II" list

- Field-level encryption of PHI at rest (Atlas storage encryption only — see §6).
- Push notifications (in-app notification records only; the reminder cron writes them but nothing pushes to the device).
- In-call chat persistence (InCallChat is local to the call session).
- Video call recording, TURN infrastructure, and call-quality metrics (public Jitsi).
- No-show status exists in the FE type union but the backend lifecycle stops at cancelled (no automated no-show marking).
- Coupons for consultations (routes written but deliberately unmounted; wallet + cash only).
- Doctor payout withdrawal to bank (earnings accumulate in the Provider wallet).
- LLM tier of the symptom checker requires a `GEMINI_API_KEY` env var; without it the rules tier serves all traffic.

## 11. FR numbering conflict — fix

Chapter 2 defines FR-09 = Real-Time GPS Tracking, FR-12 = Review & Rating; Chapter 4's TC-16 cites "FR-09 browse doctors by specialization" and TC-19 cites "FR-12 AI symptom checker" — two different FR-09/FR-12s in one document. **Proposal:** keep FR-01..FR-20 exactly as Chapter 2 defines them (auth + home services + shared), allocate healthcare a contiguous new block **FR-35..FR-48** (shopping already proposed FR-21..FR-34), and update Chapter 4's FR-Ref column: TC-16 → FR-35, TC-17 → FR-38, TC-18 → FR-44, TC-19 → FR-45.

## 12. Healthcare functional requirements (Chapter-2 table format)

| ID | Requirement | Description | Priority |
|---|---|---|---|
| FR-35 | Doctor Discovery | Patients shall browse specialties and search/filter verified doctors by specialization (TC-16). | High |
| FR-36 | Clinic & Slot Selection | Patients shall view a doctor's clinics and real-time slot availability grouped by time of day. | High |
| FR-37 | Doctor Onboarding | Doctors shall register through two-step verification (email + admin approval) with PMC number and credentials. | High |
| FR-38 | Appointment Booking | Patients shall book in-clinic or video appointments; booking returns 201, marks the slot unavailable and notifies both parties (TC-17). | High |
| FR-39 | Consultation Payment | Patients shall pay the frozen consultation fee via wallet or cash-at-clinic; double payment and insufficient balance shall be rejected. | High |
| FR-40 | Cancellation & Refund | Cancellations shall refund per the configured window policy; doctor cancellations always refund in full and notify the patient. | High |
| FR-41 | Rescheduling | Patients shall reschedule to another available slot with slot counts kept consistent. | Medium |
| FR-42 | Prescriptions | Doctors shall issue prescriptions on completed appointments; patients shall list, view and download them as PDF (patient/prescriber only). | High |
| FR-43 | Health Records | Patients shall upload and manage personal health records, access restricted to the owner. | Medium |
| FR-44 | Telemedicine | Patients and doctors shall join the same video consultation room for confirmed video appointments (TC-18). | Medium |
| FR-45 | AI Symptom Checker | The system shall suggest possible concern areas with confidence and a specialist recommendation, never a diagnosis, always with a disclaimer (TC-19). | Medium |
| FR-46 | Reviews & Ratings | Patients shall review completed appointments once; doctor rating aggregates shall update automatically; admins shall moderate with recomputation. | Medium |
| FR-47 | Doctor Earnings | Completed appointments shall credit the doctor's wallet with fee minus the configured platform commission. | High |
| FR-48 | Admin Oversight | Admins shall supervise doctors (suspend/reactivate), appointments (force status, manual refund), clinics and settings, with every action audited. | High |

### Chapter-4 mapping (endpoint · screen · test case)

| FR | Endpoint (proof) | Screen | TC |
|---|---|---|---|
| FR-35 | GET /doctors/search | SpecialtyList/DoctorList | TC-16 (smoke: PASS) |
| FR-38 | POST /appointments | BookAppointment | TC-17 (smoke: 201+slot+notification PASS) |
| FR-39 | POST /appointments/:id/pay | AppointmentPayment | TC-20* pay+double-pay (smoke PASS) |
| FR-40 | PATCH /appointments/:id/cancel | AppointmentDetail | TC-21* refund window (unit tests) |
| FR-42 | GET /prescriptions/:id/pdf | MyPrescriptions | TC-22* PDF content-type (smoke PASS) |
| FR-44 | POST /video-calls/join/:id | VideoCall / DoctorVideoConsultation | TC-18 |
| FR-45 | POST /symptom-checker | SymptomChecker | TC-19 |
| FR-46 | POST /reviews | doctor-reviews | smoke: rating 2→3 PASS |
| FR-47 | complete → payout | DoctorEarnings | smoke PASS |
| FR-48 | /api/v1/admin/* | Admin screens | smoke: admin list PASS |

*new TC numbers to append to Chapter 4 in the existing table format.
