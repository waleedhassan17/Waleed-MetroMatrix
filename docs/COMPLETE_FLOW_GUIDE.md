# MetroMatrix — Complete Frontend Flow Guide

> Generated after full audit & completion pass. Both services are fully wired and navigable.

---

## Table of Contents

1. [Shared Auth & Onboarding Flow](#1-shared-auth--onboarding-flow)
2. [Home Service — User Flow](#2-home-service--user-flow)
3. [Home Service — Provider Flow](#3-home-service--provider-flow)
4. [Healthcare — User Flow](#4-healthcare--user-flow)
5. [Healthcare — Doctor/Provider Flow](#5-healthcare--doctorprovider-flow)
6. [Admin Flow](#6-admin-flow)
7. [Screen Inventory Summary](#7-screen-inventory-summary)

---

## 1. Shared Auth & Onboarding Flow

```
App Launch
  └─► SplashScreen (2s auto-redirect)
        └─► OnboardingScreen (swipe carousel, "Get Started")
              └─► RoleSelectionScreen
                    ├─► [User] ──────────────► SignInScreen / SignUpScreen
                    │                              └─► EmailVerificationScreen
                    │                                    └─► CompleteProfile (3-step: PersonalInfo→Location→Photo)
                    │                                          └─► UserHome
                    │
                    ├─► [Provider] ──────────► ProviderSelectionScreen (type + subtype)
                    │                              └─► ProviderSignIn / ProviderSignUp
                    │                                    └─► EmailVerificationScreen
                    │                                          └─► PersonalInfo (documents, experience)
                    │                                                └─► ProviderApprovalPending
                    │                                                      └─► [Approved] → HomeServiceProviderDashboard
                    │                                                                       OR DoctorStack
                    │
                    └─► [Admin] ─────────────► SignInScreen (admin credentials)
                                                    └─► AdminDashboard

Password Recovery (any role):
  SignIn ──► ForgotPassword ──► ResetPasswordOTP (6-digit) ──► ResetPassword ──► SignIn

Deep Link / Email Verification:
  VerifySuccessScreen (handles ?token= query param)
    └─► saves tokens → navigates to UserHome or PersonalInfo
```

**Screens:**
| Screen | Path |
|--------|------|
| SplashScreen | `screens/authentication-screens/on-boarding/splash.tsx` |
| OnboardingScreen | `screens/authentication-screens/on-boarding/onboarding.tsx` |
| RoleSelectionScreen | `screens/role-selection/role.tsx` |
| ProviderSelectionScreen | `screens/provider-selection/provider.tsx` |
| UserSignIn | `screens/user-authentication/signin-screen/signin.tsx` |
| UserSignUp | `screens/user-authentication/signup-screen/signup.tsx` |
| ProviderSignIn | `screens/provider-authentication/signin-screen/signin.tsx` |
| ProviderSignUp | `screens/provider-authentication/signup-screen/signup.tsx` |
| EmailVerification | `screens/authentication-screens/email-verification/emailVerification.tsx` |
| CompleteProfile | `screens/authentication-screens/profile-info/completeProfile.tsx` |
| PersonalInfo | `screens/authentication-screens/provider-info/personalInfo.tsx` |
| ProviderApprovalPending | `screens/authentication-screens/provider-approval-pending/providerApprovalPendingScreen.tsx` |
| ForgotPassword | `screens/authentication-screens/forget-password/forgetPassword.tsx` |
| ResetPasswordOTP | `screens/authentication-screens/reset-password-otp/resetPasswordOtp.tsx` |
| ResetPassword | `screens/authentication-screens/reset-password/resetPassword.tsx` |
| VerifySuccess | `screens/verify-success/verifySuccess.tsx` |

---

## 2. Home Service — User Flow

### Entry Point
`UserHome` → user selects Home Service → `HomeServiceLayout` (bottom tab navigator)

### Tab Navigator: HomeServiceLayout
```
HomeServiceLayout (3 tabs)
  ├─► Tab 1: Home (HomeScreen)
  ├─► Tab 2: Bookings (BookingListTab)
  └─► Tab 3: Profile (UserProfileTab)
```

### Primary Booking Flow
```
HomeScreen (Tab 1)
  ├─► Category Card Press ──────────────────────────────► ProvidersScreen
  │     (Electricians / Plumbers / AC Repair)                 └─► Filter/Sort modal (gender, availability, price, city)
  │                                                                └─► ProviderProfile
  │                                                                      ├─► Call (tel: link)
  │                                                                      ├─► Chat ──► ProviderChatScreen
  │                                                                      └─► Book Now ──► BookingScreen
  │                                                                                         └─► BookConfirmationScreen
  │                                                                                               └─► LiveTrackingScreen (map + polyline)
  │                                                                                                     └─► ServiceStatusScreen (progress steps)
  │                                                                                                           └─► PaymentScreen
  │                                                                                                                 └─► ReviewRatingScreen
  │                                                                                                                       └─► HomeScreen (reset)
  │
  ├─► Search Icon Press ──────────────────────────────────► QuickSearchScreen (natural language job desc)
  │                                                             └─► SearchingProvidersScreen (results)
  │                                                                   └─► ProviderProfile ──► (same booking funnel above)
  │
  └─► Promotion Banner ──────────────────────────────────► ProvidersScreen (featured category)

```

### Wallet Flow
```
UserProfileTab ──► Wallet section ──► UserWalletScreen
  ├─► View balance & transaction history
  ├─► Add Funds (payment gateway modal)
  └─► Withdraw

```

### Communication
```
ProviderChatScreen   — real-time text chat during booking
CallScreen           — in-app call UI (VOIP integration required)
```

**All User Home Service Screens:**
| Screen | Path |
|--------|------|
| HomeServiceLayout (tabs) | `screens/user/homeservice/tabs/layout.tsx` |
| HomeScreen (tab) | `screens/user/homeservice/tabs/home-screen/index.tsx` |
| BookingListTab (tab) | `screens/user/homeservice/tabs/booking-screen/booking.tsx` |
| UserProfileTab (tab) | `screens/user/homeservice/tabs/profile/profile.tsx` |
| ProvidersScreen | `screens/user/homeservice/service-providers/ProvidersScreen.tsx` |
| ProviderProfile | `screens/user/homeservice/provider-profile/providerProfile.tsx` |
| BookingScreen | `screens/user/homeservice/Booking/bookingScreen.tsx` |
| BookConfirmation | `screens/user/homeservice/book-confirmation/bookConfirmation.tsx` |
| LiveTracking | `screens/user/homeservice/live-tracking/liveTracking.tsx` |
| ServiceStatus | `screens/user/homeservice/service-status/serviceStatus.tsx` |
| PaymentScreen | `screens/user/homeservice/payment-screen/payment.tsx` |
| ReviewRating | `screens/user/homeservice/rating-screen/rating.tsx` |
| QuickSearchScreen | `screens/user/homeservice/quick-search/QuickSearchScreen.tsx` |
| SearchingProviders | `screens/user/homeservice/search-providers/searchProviders.tsx` |
| ProviderChatScreen | `screens/user/homeservice/providers-chat/providersChatScreen.tsx` |
| CallScreen | `screens/user/homeservice/call-screen/callScreen.tsx` |
| UserWalletScreen | `screens/user/homeservice/wallet/walletScreen.tsx` |

---

## 3. Home Service — Provider Flow

### Entry Point
Post-approval → `HomeServiceProviderDashboard` (bottom tab navigator)

### Tab Navigator: HomeServiceProviderLayout
```
HomeServiceProviderLayout (4 tabs)
  ├─► Tab 1: Dashboard
  ├─► Tab 2: Jobs
  ├─► Tab 3: Earnings
  └─► Tab 4: Profile
```

### Job Execution Flow (Core Provider Loop)
```
Dashboard (Tab 1)
  ├─► New Job Card arrives (real-time / push)
  │     ├─► Accept ──► JobDetailScreen
  │     │               ├─► View customer info, location, job description
  │     │               ├─► Call Customer (tel: link)
  │     │               └─► Start Navigation ──► NavigationMapScreen (turn-by-turn MapViewDirections)
  │     │                                           └─► [Arrived] ──► JobInProgressScreen
  │     │                                                                ├─► Start timer
  │     │                                                                ├─► Track elapsed time
  │     │                                                                └─► [Mark Complete] ──► AwaitingApprovalScreen
  │     │                                                                                           ├─► Customer approves ──► PaymentRequestScreen
  │     │                                                                                           │                           ├─► Cash / Online payment
  │     │                                                                                           │                           ├─► Add material costs
  │     │                                                                                           │                           └─► [Confirm Payment] ──► JobCompletionScreen (confetti, reset)
  │     │                                                                                           └─► Customer declines ──► (raise dispute)
  │     └─► Reject ──► Dashboard (job removed)
  │
  └─► Jobs Tab ──► List of all active/completed jobs ──► JobDetailScreen

Earnings Tab ──► Earnings breakdown (Today/Week/Month/Custom), bar charts
Profile Tab   ──► Provider profile, availability toggle, settings
Wallet        ──► ProviderWalletScreen — balance, payouts, transaction history
```

**All Provider Home Service Screens:**
| Screen | Path |
|--------|------|
| HomeServiceProviderLayout (tabs) | `screens/providers/homeservice/tabs/index.tsx` |
| ProviderDashboard (tab) | `screens/providers/homeservice/tabs/dashboard/dashboard.tsx` |
| JobsTab (tab) | `screens/providers/homeservice/tabs/jobs/job.tsx` |
| EarningsTab (tab) | `screens/providers/homeservice/tabs/earnings/earning.tsx` |
| ProviderProfileTab (tab) | `screens/providers/homeservice/profie-screen/profile.tsx` |
| JobDetailScreen | `screens/providers/homeservice/jobdetail-screen/jobDetail.tsx` |
| NavigationMapScreen | `screens/providers/homeservice/map-screen/map.tsx` |
| JobInProgressScreen | `screens/providers/homeservice/job-InProgress/jobInProgress.tsx` |
| AwaitingApprovalScreen | `screens/providers/homeservice/awaiting-screen/awaitingScreen.tsx` |
| PaymentRequestScreen | `screens/providers/homeservice/payment-screen/paymentScreen.tsx` |
| JobCompletionScreen | `screens/providers/homeservice/job-completion/jobCompletion.tsx` |
| ProviderWalletScreen | `screens/providers/homeservice/wallet/providerWalletScreen.tsx` |

---

## 4. Healthcare — User Flow

### Entry Point
`UserHome` → user selects Healthcare → `HealthcareStack` (nested stack) → `HealthcareTabNavigator`

### Tab Navigator: HealthcareTabNavigator
```
HealthcareTabNavigator (4 tabs)
  ├─► Tab 1: Home (HealthcareHomeScreen) — header has Notification 🔔 + Profile 👤 icons
  ├─► Tab 2: Appointments (MyAppointmentsScreen)
  ├─► Tab 3: Records (HealthRecordsScreen)
  └─► Tab 4: Find Doctor (DoctorSearchScreen)
```

### Doctor Discovery & Booking Flow
```
HealthcareHomeScreen
  ├─► 🔔 Notification Icon ──────────────────────────────► HealthcareNotificationsScreen ✅ (NEW)
  │
  ├─► 👤 Profile Icon ────────────────────────────────────► HealthcareProfileScreen ✅ (NEW)
  │
  ├─► Search Bar ─────────────────────────────────────────► DoctorListScreen (keyword filter)
  │
  ├─► Specialty Card ─────────────────────────────────────► DoctorListScreen (by specialty)
  │     │
  │     └─► "See All" ──────────────────────────────────── SpecialtyListScreen ──► DoctorListScreen
  │
  ├─► Doctor Card "Book" button ──────────────────────────► DoctorDetailScreen
  │
  ├─► Quick Action: Appointments ─────────────────────────► MyAppointmentsScreen
  ├─► Quick Action: Records ──────────────────────────────► HealthRecordsScreen
  └─► Quick Action: Emergency 🆘 ─────────────────────────► EmergencyScreen ✅ (NEW)
```

### Full Doctor Booking Funnel
```
DoctorDetailScreen
  ├─► Reviews Tab ──► DoctorReviewsScreen (paginated, filterable)
  ├─► About Tab     (bio, experience, qualifications)
  ├─► Clinics Tab ──► ClinicSelectionScreen
  │                     └─► MapView, Call clinic
  │                           └─► SlotSelectionScreen (14-day calendar, time groups)
  │                                 └─► BookAppointmentScreen (3-step stepper)
  │                                       Step 1: Consultation Type (in-clinic / video)
  │                                       Step 2: Symptoms, notes, quick tags
  │                                       Step 3: Review summary
  │                                             └─► BookingConfirmationScreen
  │                                                   ├─► Apply coupon code
  │                                                   ├─► Select payment method
  │                                                   └─► Confirm ──► AppointmentConfirmScreen
  │                                                                     ├─► Add to Calendar
  │                                                                     ├─► Share
  │                                                                     └─► View Appointments
  └─► Book Now (direct) ──► SlotSelectionScreen (same funnel)
```

### Appointments Management Flow
```
MyAppointmentsScreen (Upcoming | Past tabs)
  └─► AppointmentDetailScreen
        ├─► Cancel (modal confirmation)
        ├─► Reschedule ──► RescheduleAppointmentScreen
        │                     └─► Select new date/slot ──► Confirm (back to detail)
        └─► Join Video Call ──► VideoWaitingRoomScreen
                                   ├─► Device checks (mic/camera)
                                   ├─► Status: connecting / waiting / joining / ready
                                   └─► [Doctor joins] ──► VideoCallScreen
                                                            ├─► Mute / Toggle Video / Speaker
                                                            ├─► PiP mode
                                                            ├─► In-call chat (slide-up overlay)
                                                            └─► End Call ──► (back to AppointmentDetail)
```

### Health Records Flow
```
HealthRecordsScreen (tab)
  ├─► Category filter: Prescriptions | Lab Reports | Imaging | Discharge | Other
  ├─► Card Press ──► PrescriptionViewScreen (download PDF, share)
  ├─► Delete record
  └─► Upload ──► UploadRecordScreen (multi-file pick, type selector, progress)
```

### Notifications & Profile (NEW)
```
HealthcareNotificationsScreen
  ├─► Filter: All | Unread
  ├─► Mark individual as read
  ├─► Mark all as read
  └─► Delete notification

HealthcareProfileScreen
  ├─► Medical info card (blood group, age, weight, height)
  ├─► Allergies & conditions tags
  ├─► Quick access: Appointments | Records | Prescriptions
  ├─► Notification preferences (push / reminders toggles)
  ├─► Account settings (edit profile, change password, emergency contacts)
  └─► Sign Out
```

**All Healthcare User Screens:**
| Screen | Path | Status |
|--------|------|--------|
| HealthcareTabNavigator | `screens/user/healthcare/tabs/HealthcareTabNavigator.tsx` | ✅ |
| HealthcareHomeScreen | `screens/user/healthcare/home/healthcareHome.tsx` | ✅ |
| SpecialtyListScreen | `screens/user/healthcare/specialty-list/specialtyList.tsx` | ✅ |
| DoctorListScreen | `screens/user/healthcare/doctor-list/doctorList.tsx` | ✅ |
| DoctorDetailScreen | `screens/user/healthcare/doctor-detail/doctorDetail.tsx` | ✅ |
| DoctorSearchScreen | `screens/user/healthcare/doctor-search/doctorSearch.tsx` | ✅ |
| DoctorReviewsScreen | `screens/user/healthcare/doctor-reviews/doctorReviews.tsx` | ✅ |
| ClinicSelectionScreen | `screens/user/healthcare/clinic-selection/ClinicSelectionScreen.tsx` | ✅ |
| SlotSelectionScreen | `screens/user/healthcare/slot-selection/SlotSelectionScreen.tsx` | ✅ |
| BookAppointmentScreen | `screens/user/healthcare/book-appointment/bookAppointment.tsx` | ✅ |
| BookingConfirmationScreen | `screens/user/healthcare/booking-confirmation/BookingConfirmationScreen.tsx` | ✅ |
| AppointmentConfirmScreen | `screens/user/healthcare/appointment-confirm/appointmentConfirm.tsx` | ✅ |
| MyAppointmentsScreen | `screens/user/healthcare/MyAppointments/MyAppointmentsScreen.tsx` | ✅ |
| AppointmentDetailScreen | `screens/user/healthcare/AppointmentDetail/AppointmentDetailScreen.tsx` | ✅ |
| RescheduleAppointmentScreen | `screens/user/healthcare/RescheduleAppointment/RescheduleAppointmentScreen.tsx` | ✅ |
| VideoWaitingRoomScreen | `screens/user/healthcare/VideoWaitingRoom/VideoWaitingRoomScreen.tsx` | ✅ |
| VideoCallScreen | `screens/user/healthcare/VideoCall/VideoCallScreen.tsx` | ✅ |
| InCallChatScreen | `screens/user/healthcare/InCallChat/InCallChatScreen.tsx` | ✅ (embedded) |
| HealthRecordsScreen | `screens/user/healthcare/health-records/healthRecords.tsx` | ✅ |
| UploadRecordScreen | `screens/user/healthcare/upload-record/uploadRecord.tsx` | ✅ |
| PrescriptionViewScreen | `screens/user/healthcare/prescription-view/prescriptionView.tsx` | ✅ |
| **EmergencyScreen** | `screens/user/healthcare/emergency/EmergencyScreen.tsx` | ✅ **NEW** |
| **HealthcareNotificationsScreen** | `screens/user/healthcare/notifications/HealthcareNotificationsScreen.tsx` | ✅ **NEW** |
| **HealthcareProfileScreen** | `screens/user/healthcare/profile/HealthcareProfileScreen.tsx` | ✅ **NEW** |

---

## 5. Healthcare — Doctor/Provider Flow

### Entry Point
Post-approval (provider type = `doctor`) → `DoctorStack` → `DoctorTabNavigator`

### Tab Navigator: DoctorTabNavigator
```
DoctorTabNavigator (4 tabs)
  ├─► Tab 1: Dashboard (DoctorDashboardScreen)
  ├─► Tab 2: Schedule (DoctorScheduleScreen)
  ├─► Tab 3: Patients (PatientQueueScreen)
  └─► Tab 4: Profile (DoctorProfileScreen)
```

### Doctor Dashboard Flow
```
DoctorDashboardScreen
  ├─► Stats cards: Total / Seen / Pending / Cancelled
  ├─► Quick actions ──► DoctorAppointments, DoctorSchedule, Consultation
  ├─► Upcoming appointments list ──► AppointmentDetailScreen
  └─► Earnings summary ──► DoctorEarningsScreen
```

### Schedule & Consultation Flow
```
DoctorScheduleScreen (day / week view toggle)
  └─► Appointment row press ──► ConsultationScreen
                                   ├─► View patient info, symptoms
                                   ├─► Medical Notes ──► MedicalNotesScreen
                                   │                       ├─► Add/edit/delete notes
                                   │                       ├─► Attach files
                                   │                       └─► Convert to prescription ──► PrescriptionWriterScreen
                                   ├─► Patient History ──► PatientHistoryScreen (accordion visits)
                                   └─► Write Prescription ──► PrescriptionWriterScreen
                                                                 ├─► Add symptoms, medications, tests
                                                                 └─► Save & issue
```

### Patient Queue Flow
```
PatientQueueScreen
  ├─► Tabs: All | Waiting | Active | Done
  ├─► Call Next Patient
  ├─► Start Consultation ──► ConsultationScreen
  ├─► Skip Patient
  └─► Complete ──► (queue updates, mark Done)
```

### Slot & Availability Management
```
DoctorProfileScreen
  └─► Availability toggle (on/off)
  └─► Settings ──► AvailabilitySettingsScreen
                    ├─► Weekly schedule (toggle each day, set hours)
                    ├─► Instant booking toggle
                    ├─► Video consultation toggle
                    └─► Vacation dates ──► add/remove vacation modal

ManageSlotsScreen
  ├─► 7-day week view
  ├─► Slot grid toggle (available/blocked)
  ├─► Duration selector (15/20/30/45/60 min)
  ├─► Max patients per slot
  └─► Save
```

### Earnings Flow
```
DoctorEarningsScreen
  ├─► Period: Today | This Week | This Month | Custom date range
  ├─► Animated bar chart
  ├─► Consultation breakdown (in-clinic vs video)
  └─► Transaction history list
```

**All Doctor/Provider Healthcare Screens:**
| Screen | Path |
|--------|------|
| DoctorTabNavigator | `screens/providers/healthcare/tabs/DoctorTabNavigator.tsx` |
| DoctorDashboardScreen | `screens/providers/healthcare/doctor-home/doctorHome.tsx` |
| DoctorScheduleScreen | `screens/providers/healthcare/doctor-schedule/doctorSchedule.tsx` |
| PatientQueueScreen | `screens/providers/healthcare/patient-queue/patientQueue.tsx` |
| MedicalNotesScreen | `screens/providers/healthcare/medical-notes/medicalNotes.tsx` |
| PrescriptionWriterScreen | `screens/providers/healthcare/prescription-writer/prescriptionWriter.tsx` |
| PatientHistoryScreen | `screens/providers/healthcare/patient-history/patientHistory.tsx` |
| DoctorEarningsScreen | `screens/providers/healthcare/doctor-earnings/doctorEarnings.tsx` |
| DoctorProfileScreen | `screens/providers/healthcare/profile/doctorProfile.tsx` |
| AvailabilitySettingsScreen | `screens/providers/healthcare/availability-settings/availabilitySettings.tsx` |
| ManageSlotsScreen | `screens/providers/healthcare/manage-slots/manageSlots.tsx` |

---

## 6. Admin Flow

### Entry Point
Admin credentials → `AdminDashboard` (drawer-based layout)

```
AdminDashboard
  ├─► SVG Donut Chart (bookings, revenue, users)
  ├─► 75% slide-in Drawer with section navigation
  └─► Stats cards ──► module-specific screens

Provider Management
  ├─► PendingReviewScreen ──► list of unapproved providers
  │     ├─► View uploaded documents (Linking.openURL)
  │     ├─► Approve ──► notifies provider + moves to active
  │     └─► Reject (with reason)
  │
  ├─► ProviderManagementScreen ──► all providers (filter: active/inactive/all)
  │     ├─► Search bar
  │     ├─► Provider card ──► ProviderReviewScreen (full detail)
  │     │                       ├─► Approve / Reject
  │     │                       └─► View documents
  │     ├─► Activate provider
  │     ├─► Deactivate provider
  │     └─► Delete provider
  │
  └─► ServiceProvidersAdminTabs (3 tabs)
        ├─► Dashboard — stats by category & city
        ├─► Bookings — search, status filter, update booking status
        └─► Analytics — city selector, revenue bar charts

User Management
  └─► UserManagementScreen ──► all users
        ├─► Search, filter (active/inactive/all)
        ├─► Activate user
        └─► Deactivate user

Healthcare Admin
  ├─► HealthcareAnalyticsScreen
  │     ├─► Date range presets (7d / 30d / 3m / custom)
  │     ├─► Stat cards (appointments, revenue, doctors, patients)
  │     └─► Export report
  └─► SpecialtyManagementScreen
        ├─► Add specialty (name, icon picker, description)
        ├─► Edit specialty
        ├─► Toggle specialty active/inactive
        └─► Delete specialty

Admin Notifications
  └─► NotificationScreen
        ├─► Mark read / Mark all read
        └─► Delete notification

Admin Settings
  └─► SettingsScreen (4 tabs)
        ├─► General (app name, language, timezone, maintenance mode)
        ├─► Notifications (email/push/SMS toggles per event type)
        ├─► Security (2FA, session timeout, password policy)
        └─► Appearance (theme, accent color, font size)
```

**All Admin Screens:**
| Screen | Path |
|--------|------|
| AdminDashboard | `screens/admin/admin-dashboard/adminDashboard.tsx` |
| NotificationScreen | `screens/admin/notifications/notification.tsx` |
| PendingReviewScreen | `screens/admin/pending-review/pendingReviewScreen.tsx` |
| ProviderManagementScreen | `screens/admin/provider-management/providerManagementScreen.tsx` |
| ProviderReviewScreen | `screens/admin/provider-review/providerReviewScreen.tsx` |
| UserManagementScreen | `screens/admin/user-management/userManagementScreen.tsx` |
| SettingsScreen | `screens/admin/settings/settings.tsx` |
| HealthcareAnalyticsScreen | `screens/admin/healthcare/HealthcareAnalytics/HealthcareAnalyticsScreen.tsx` |
| SpecialtyManagementScreen | `screens/admin/healthcare/SpecialtyManagement/SpecialtyManagementScreen.tsx` |
| ServiceProvidersAdminTabs | `screens/admin/providers/service-providers/tabs/index.tsx` |
| AdminDashboardTab | `screens/admin/providers/service-providers/tabs/dashboard/dashboard.tsx` |
| AdminBookingsTab | `screens/admin/providers/service-providers/tabs/bookings/bookings.tsx` |
| AdminAnalyticsTab | `screens/admin/providers/service-providers/tabs/analytics/analytics.tsx` |

---

## 7. Screen Inventory Summary

### Total Screens by Category
| Category | Screen Count | Status |
|----------|-------------|--------|
| Shared Auth / Onboarding | 16 | ✅ Complete |
| Home Service — User | 17 | ✅ Complete |
| Home Service — Provider | 12 | ✅ Complete |
| Healthcare — User | 24 (incl. 3 new) | ✅ Complete |
| Healthcare — Doctor | 11 | ✅ Complete |
| Admin | 13 | ✅ Complete |
| **Total** | **93** | ✅ |

### Fixes Applied in This Pass
| # | What | Where |
|---|------|-------|
| 1 | Created `EmergencyScreen` | `screens/user/healthcare/emergency/EmergencyScreen.tsx` |
| 2 | Created `HealthcareNotificationsScreen` | `screens/user/healthcare/notifications/HealthcareNotificationsScreen.tsx` |
| 3 | Created `HealthcareProfileScreen` | `screens/user/healthcare/profile/HealthcareProfileScreen.tsx` |
| 4 | Registered all 3 new screens in | `navigators/HealthcareStack.tsx` |
| 5 | Added 3 new route names | `navigation-maps/Healthcare.ts` |
| 6 | Added 3 new param types | `models/healthcare/types.ts` |
| 7 | Wired Notification icon `onPress` → `HealthcareNotificationsScreen` | `screens/user/healthcare/home/healthcareHome.tsx` |
| 8 | Wired Profile icon `onPress` → `HealthcareProfileScreen` | `screens/user/healthcare/home/healthcareHome.tsx` |

### Known Limitations (Not Bugs — Require Backend Integration)
| # | Item | Notes |
|---|------|-------|
| 1 | Video calls not using real WebRTC | Simulated state — needs Agora/Daily.co/Twilio SDK |
| 2 | In-app call screen (home service) | Simulated — needs VOIP SDK |
| 3 | Real-time job push notifications | Needs Firebase FCM or WebSocket |
| 4 | User Healthcare Wallet | Mock data — needs payment gateway API |
| 5 | Google Maps directions | `GOOGLE_MAPS_API_KEY` placeholder in map.tsx |
| 6 | Doctor data in BookingConfirmation | Uses dummy-data helper — needs live API |
| 7 | Patient data in PrescriptionWriter | Uses `DUMMY_PATIENT` — needs appointment param feed |
