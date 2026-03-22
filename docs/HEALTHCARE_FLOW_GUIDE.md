# Healthcare Module — Flow Guide

> Complete workflow reference for User and Provider (Doctor) healthcare views.

---

## Architecture Overview

```
BaseNavigator
├── HealthcareStack (User)
│   └── HealthcareTabNavigator (Bottom Tabs)
│       ├── Tab 1: Home
│       ├── Tab 2: Appointments
│       ├── Tab 3: Records
│       └── Tab 4: Find Doctor
│   └── ... 19 stack screens (detail views)
│
└── DoctorStack (Provider)
    └── DoctorTabNavigator (Bottom Tabs)
        ├── Tab 1: Dashboard
        ├── Tab 2: Schedule
        ├── Tab 3: Patients
        └── Tab 4: Profile
    └── ... 9 stack screens (detail views)
```

---

## USER Healthcare Flow

### Tab Navigator (`HealthcareTabNavigator`)

| Tab | Route Name | Component | File |
|-----|-----------|-----------|------|
| 1 — Home | `HealthHome` | HealthcareHomeScreen | `screens/user/healthcare/home/healthcareHome.tsx` |
| 2 — Appointments | `Appointments` | MyAppointmentsScreen | `screens/user/healthcare/MyAppointments/MyAppointmentsScreen.tsx` |
| 3 — Records | `Records` | HealthRecordsScreen | `screens/user/healthcare/health-records/healthRecords.tsx` |
| 4 — Find Doctor | `FindDoctor` | DoctorSearchScreen | `screens/user/healthcare/doctor-search/doctorSearch.tsx` |

### Stack Screens (pushed on top of tabs)

| Route Name | Component | File | Params |
|-----------|-----------|------|--------|
| `HealthcareTabs` | Tab Navigator | `tabs/HealthcareTabNavigator.tsx` | — |
| `HealthcareHome` | HealthcareHomeScreen | `home/healthcareHome.tsx` | — |
| `SpecialtyList` | SpecialtyListScreen | `specialty-list/specialtyList.tsx` | — |
| `DoctorList` | DoctorListScreen | `doctor-list/doctorList.tsx` | `specialtyId`, `specialtyName`, `isVideoOnly?` |
| `DoctorDetail` | DoctorDetailScreen | `doctor-detail/doctorDetail.tsx` | `doctorId` |
| `DoctorSearch` | DoctorSearchScreen | `doctor-search/doctorSearch.tsx` | — |
| `DoctorReviews` | DoctorReviewsScreen | `doctor-reviews/doctorReviews.tsx` | `doctorId` |
| `ClinicSelection` | ClinicSelectionScreen | `clinic-selection/ClinicSelectionScreen.tsx` | `doctorId` |
| `SlotSelection` | SlotSelectionScreen | `slot-selection/SlotSelectionScreen.tsx` | `doctorId`, `clinicId?` |
| `BookAppointment` | BookAppointmentScreen | `book-appointment/bookAppointment.tsx` | `doctorId`, `clinicId?` |
| `BookingConfirmation` | BookingConfirmationScreen | `booking-confirmation/BookingConfirmationScreen.tsx` | `appointmentData` |
| `AppointmentConfirm` | AppointmentConfirmScreen | `appointment-confirm/appointmentConfirm.tsx` | `appointmentId` |
| `MyAppointments` | MyAppointmentsScreen | `MyAppointments/MyAppointmentsScreen.tsx` | — |
| `AppointmentDetail` | AppointmentDetailScreen | `AppointmentDetail/AppointmentDetailScreen.tsx` | `appointmentId` |
| `RescheduleAppointment` | RescheduleAppointmentScreen | `RescheduleAppointment/RescheduleAppointmentScreen.tsx` | `appointmentId` |
| `VideoCall` | VideoCallScreen | `VideoCall/VideoCallScreen.tsx` | `appointmentId`, `roomId` |
| `VideoWaitingRoom` | VideoWaitingRoomScreen | `VideoWaitingRoom/VideoWaitingRoomScreen.tsx` | `appointmentId` |
| `PrescriptionView` | PrescriptionViewScreen | `prescription-view/prescriptionView.tsx` | `prescriptionId` |
| `HealthRecords` | HealthRecordsScreen | `health-records/healthRecords.tsx` | — |
| `UploadRecord` | UploadRecordScreen | `upload-record/uploadRecord.tsx` | — |

### User Booking Flow (step-by-step)

```
Home Tab
  ├── Browse Specialties → SpecialtyList → DoctorList → DoctorDetail
  ├── Search Doctor     → DoctorSearch → DoctorDetail
  └── Quick Actions     → (route depends on action)

DoctorDetail
  ├── View Reviews    → DoctorReviews
  ├── Select Clinic   → ClinicSelection → SlotSelection
  └── Book Directly   → SlotSelection → BookAppointment → BookingConfirmation

Post-Booking
  ├── View Appointment  → AppointmentDetail
  ├── Reschedule        → RescheduleAppointment
  ├── Join Video Call   → VideoWaitingRoom → VideoCall
  └── View Prescription → PrescriptionView
```

### User Data Flow

```
User opens Healthcare → HealthcareTabNavigator loads
  └── Home tab fetches: specialties, featured doctors, upcoming appointments
  └── Appointments tab fetches: all user appointments (filterable: upcoming/past)
  └── Records tab fetches: medical records, prescriptions, documents
  └── Find Doctor tab: search interface with recent/popular suggestions
```

---

## PROVIDER (Doctor) Healthcare Flow

### Tab Navigator (`DoctorTabNavigator`)

| Tab | Route Name | Component | File |
|-----|-----------|-----------|------|
| 1 — Dashboard | `DoctorHome` | DoctorHomeScreen | `screens/providers/healthcare/doctor-home/doctorHome.tsx` |
| 2 — Schedule | `Schedule` | DoctorScheduleScreen | `screens/providers/healthcare/doctor-schedule/doctorSchedule.tsx` |
| 3 — Patients | `Patients` | PatientQueueScreen | `screens/providers/healthcare/patient-queue/patientQueue.tsx` |
| 4 — Profile | `DoctorProfileTab` | DoctorProfileScreen | `screens/providers/healthcare/profile/doctorProfile.tsx` |

### Stack Screens (pushed on top of tabs)

| Route Name | Component | File | Params |
|-----------|-----------|------|--------|
| `DoctorTabs` | Tab Navigator | `tabs/DoctorTabNavigator.tsx` | — |
| `DoctorDashboard` | DoctorHomeScreen | `doctor-home/doctorHome.tsx` | — |
| `DoctorSchedule` | DoctorScheduleScreen | `doctor-schedule/doctorSchedule.tsx` | — |
| `DoctorAppointments` | PatientQueueScreen | `patient-queue/patientQueue.tsx` | — |
| `Consultation` | MedicalNotesScreen | `medical-notes/medicalNotes.tsx` | `appointmentId`, `patientId` |
| `PrescriptionWriter` | PrescriptionWriterScreen | `prescription-writer/prescriptionWriter.tsx` | `appointmentId`, `patientId` |
| `PatientHistory` | PatientHistoryScreen | `patient-history/patientHistory.tsx` | `patientId` |
| `DoctorEarnings` | DoctorEarningsScreen | `doctor-earnings/doctorEarnings.tsx` | — |
| `DoctorProfile` | DoctorProfileScreen | `profile/doctorProfile.tsx` | — |
| `DoctorSettings` | AvailabilitySettingsScreen | `availability-settings/availabilitySettings.tsx` | — |
| `ManageSlots` | ManageSlotsScreen | `manage-slots/manageSlots.tsx` | — |

### Provider Daily Workflow

```
Dashboard Tab (Home)
  ├── View today's stats (total, seen, pending, cancelled)
  ├── Next appointment card → Start Consultation
  ├── Quick Actions
  │   ├── Schedule → DoctorSchedule (stack)
  │   ├── Earnings → DoctorEarnings (stack)
  │   └── Settings → DoctorSettings (stack)
  ├── Today's Schedule list → tap appointment for detail
  └── Earnings Summary → View Full Earnings

Schedule Tab
  ├── Calendar day picker
  ├── View mode toggle (day/week)
  ├── Appointment list by time
  └── Manage Slots → ManageSlots (stack)

Patients Tab
  ├── Patient queue with status filters (all/waiting/in-progress/completed)
  ├── Call Next Patient → starts consultation
  ├── Tap patient → expand details
  └── Start Consultation → Consultation (stack)

Profile Tab
  ├── View doctor info (name, specialty, rating, patients, experience)
  ├── Stats overview
  ├── About section
  ├── Availability schedule
  └── Settings section
```

### Provider Consultation Flow

```
Doctor sees patient in queue or schedule
  └── Start Consultation → Consultation (MedicalNotes)
      ├── Record symptoms, diagnosis, notes
      ├── Write Prescription → PrescriptionWriter
      └── View Patient History → PatientHistory

After consultation:
  ├── Patient marked as completed
  ├── Earnings updated
  └── Return to Dashboard/Queue
```

---

## Navigation Pattern: Tab-Aware Screens

Screens that serve as both **tab roots** and **stack screens** use an `isInTab` check to conditionally hide the back button when displayed inside a tab navigator:

```typescript
const isInTab = navigation.getParent()?.getState()?.type === 'tab';
```

**Screens using this pattern:**
- `MyAppointmentsScreen` (User Tab 2)
- `HealthRecordsScreen` (User Tab 3)
- `DoctorSearchScreen` (User Tab 4)
- `DoctorScheduleScreen` (Provider Tab 2)
- `PatientQueueScreen` (Provider Tab 3)
- `DoctorProfileScreen` (Provider Tab 4)

When `isInTab === true`: back button is replaced with an empty spacer view.  
When `isInTab === false`: back button calls `navigation.goBack()` normally (stack context).

---

## Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#EC4899` | Buttons, active icons, gradients |
| Primary Dark | `#DB2777` | Gradient end, emphasis |
| Primary Light | `#FDF2F8` | Card backgrounds, soft tints |
| Primary Soft | `#FFF1F2` | Section backgrounds |
| Accent | `#F472B6` | Secondary pink, badges |
| Accent Light | `#FCE7F3` | Borders, category badges |
| Success | `#10B981` | Confirmed status, earnings |
| Warning | `#F59E0B` | Pending status |
| Error | `#EF4444` | Cancelled, alerts |
| Page Background | `#FDF2F8` (provider) / `#F8FAFC` (user) | Screen canvas |
| Card Background | `#FFFFFF` | All cards |
| Border | `#F1F5F9` | Card borders, dividers |
| Text Dark | `#0F172A` | Headings |
| Text Medium | `#475569` | Body text |
| Text Light | `#94A3B8` | Subtitles, captions |

---

## Redux Slices

### User Slices
| Slice | State Key | File |
|-------|----------|------|
| healthcareHome | `healthcareHome` | `screens/user/healthcare/home/healthcareHomeSlice.ts` |
| myAppointments | `myAppointments` | `screens/user/healthcare/MyAppointments/myAppointmentsSlice.ts` |
| healthRecords | `healthRecords` | `screens/user/healthcare/health-records/healthRecordsSlice.ts` |
| doctorSearch | `doctorSearch` | `screens/user/healthcare/doctor-search/doctorSearchSlice.ts` |
| doctorDetail | `doctorDetail` | `screens/user/healthcare/doctor-detail/doctorDetailSlice.ts` |
| doctorReviews | `doctorReviews` | `screens/user/healthcare/doctor-reviews/doctorReviewsSlice.ts` |
| clinicSelection | `clinicSelection` | `screens/user/healthcare/clinic-selection/clinicSelectionSlice.ts` |
| slotSelection | `slotSelection` | `screens/user/healthcare/slot-selection/slotSelectionSlice.ts` |
| bookAppointment | `bookAppointment` | `screens/user/healthcare/book-appointment/bookAppointmentSlice.ts` |
| bookingConfirmation | `bookingConfirmation` | `screens/user/healthcare/booking-confirmation/bookingConfirmationSlice.ts` |
| appointmentDetail | `appointmentDetail` | `screens/user/healthcare/AppointmentDetail/appointmentDetailSlice.ts` |
| prescriptionView | `prescriptionView` | `screens/user/healthcare/prescription-view/prescriptionViewSlice.ts` |

### Provider Slices
| Slice | State Key | File |
|-------|----------|------|
| doctorDashboard | `doctorDashboard` | `screens/providers/healthcare/doctor-home/doctorDashboardSlice.ts` |
| doctorSchedule | `doctorSchedule` | `screens/providers/healthcare/doctor-schedule/doctorScheduleSlice.ts` |
| patientQueue | `patientQueue` | `screens/providers/healthcare/patient-queue/patientQueueSlice.ts` |
| doctorProfile | `doctorProfile` | `screens/providers/healthcare/profile/doctorProfileSlice.ts` |
| doctorEarnings | `doctorEarnings` | `screens/providers/healthcare/doctor-earnings/doctorEarningsSlice.ts` |
| medicalNotes | `medicalNotes` | `screens/providers/healthcare/medical-notes/medicalNotesSlice.ts` |
| prescriptionWriter | `prescriptionWriter` | `screens/providers/healthcare/prescription-writer/prescriptionWriterSlice.ts` |
| patientHistory | `patientHistory` | `screens/providers/healthcare/patient-history/patientHistorySlice.ts` |
| availabilitySettings | `availabilitySettings` | `screens/providers/healthcare/availability-settings/availabilitySettingsSlice.ts` |
| manageSlots | `manageSlots` | `screens/providers/healthcare/manage-slots/manageSlotsSlice.ts` |

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `navigators/HealthcareStack.tsx` | User healthcare stack navigator |
| `navigators/DoctorStack.tsx` | Provider healthcare stack navigator |
| `navigation-maps/Healthcare.ts` | All route name constants |
| `models/healthcare/types.ts` | TypeScript types & param lists |
| `models/healthcare/index.ts` | Model barrel exports |
| `constants/Colors.ts` | Global color tokens |
| `constants/Fonts.ts` | Typography tokens |
| `store/store.ts` | Redux store with all slice registrations |
