# MetroMatrix — Complete API Requirements

> This document covers all backend API endpoints required to make both the
> **Home Service** and **Healthcare** modules fully functional with live data.
> All endpoints use REST/JSON over HTTPS. Auth is Bearer JWT unless noted.

---

## Table of Contents

1. [Shared / Auth APIs](#1-shared--auth-apis)
2. [Home Service — User APIs](#2-home-service--user-apis)
3. [Home Service — Provider APIs](#3-home-service--provider-apis)
4. [Healthcare — User APIs](#4-healthcare--user-apis)
5. [Healthcare — Doctor APIs](#5-healthcare--doctor-apis)
6. [Admin APIs](#6-admin-apis)
7. [Real-Time & Push APIs](#7-real-time--push-apis)
8. [File Upload APIs](#8-file-upload-apis)
9. [Payment APIs](#9-payment-apis)

---

## 1. Shared / Auth APIs

### 1.1 User Authentication

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|-------------|---------|
| `POST` | `/auth/user/signup` | Register new user | `{ name, email, password, phone }` | `{ userId, message }` |
| `POST` | `/auth/user/signin` | Login user | `{ email, password }` | `{ accessToken, refreshToken, user }` |
| `POST` | `/auth/user/social` | Social login (Google/Facebook) | `{ provider, idToken, accessToken }` | `{ accessToken, refreshToken, user, isNewUser }` |
| `POST` | `/auth/verify-email` | Verify email token from link | `{ token }` | `{ accessToken, refreshToken, user }` |
| `POST` | `/auth/resend-verification` | Resend email verification | `{ email }` | `{ message }` |
| `POST` | `/auth/forgot-password` | Trigger OTP | `{ email, userType: 'user'|'provider' }` | `{ message, expiresIn }` |
| `POST` | `/auth/verify-otp` | Verify reset OTP | `{ email, otp, userType }` | `{ resetToken }` |
| `POST` | `/auth/reset-password` | Set new password | `{ resetToken, newPassword }` | `{ message }` |
| `POST` | `/auth/refresh` | Refresh access token | `{ refreshToken }` | `{ accessToken, refreshToken }` |
| `POST` | `/auth/logout` | Invalidate tokens | — | `{ message }` |
| `GET` | `/auth/me` | Get current user | — | `{ user }` |

### 1.2 Provider Authentication

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|-------------|---------|
| `POST` | `/auth/provider/signup` | Register provider | `{ name, email, password, phone, providerType, providerSubType }` | `{ providerId, message }` |
| `POST` | `/auth/provider/signin` | Login provider | `{ email, password }` | `{ accessToken, refreshToken, provider }` |
| `GET` | `/auth/provider/approval-status` | Poll approval status | — | `{ status: 'pending'|'approved'|'rejected', reason? }` |
| `POST` | `/auth/provider/profile` | Submit provider profile/docs | `FormData: { personalInfo, documents[], photo }` | `{ message }` |

### 1.3 User Profile

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|-------------|---------|
| `POST` | `/user/profile/complete` | Complete user registration | `{ name, dob, gender, address, city, photo? }` | `{ user }` |
| `PUT` | `/user/profile` | Update profile | `{ name, phone, address?, photo? }` | `{ user }` |
| `GET` | `/user/profile` | Get user profile | — | `{ user }` |

---

## 2. Home Service — User APIs

### 2.1 Provider Discovery

| Method | Endpoint | Description | Query Params | Response |
|--------|----------|-------------|-------------|---------|
| `GET` | `/homeservice/providers` | List providers | `category, city, availability, minRating, minPrice, maxPrice, page, limit` | `{ providers[], total, page }` |
| `GET` | `/homeservice/providers/:id` | Provider detail | — | `{ provider }` |
| `GET` | `/homeservice/providers/search` | Quick search | `q (job description), location, category` | `{ providers[] }` |
| `GET` | `/homeservice/categories` | List all service categories | — | `{ categories[] }` |
| `GET` | `/homeservice/promotions` | Active promotions/banners | — | `{ promotions[] }` |

### 2.2 Bookings

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|-------------|---------|
| `POST` | `/homeservice/bookings` | Create booking | `{ providerId, category, scheduledDate, scheduledTime, address, description, services[] }` | `{ booking }` |
| `GET` | `/homeservice/bookings` | User's booking list | `status?, page, limit` | `{ bookings[], total }` |
| `GET` | `/homeservice/bookings/:id` | Booking detail | — | `{ booking }` |
| `PUT` | `/homeservice/bookings/:id/cancel` | Cancel booking | `{ reason? }` | `{ booking }` |
| `PUT` | `/homeservice/bookings/:id/approve-completion` | Customer approval | `{ approved: boolean }` | `{ booking }` |

### 2.3 Tracking

| Method | Endpoint | Description | Response |
|--------|----------|-------------|---------|
| `GET` | `/homeservice/bookings/:id/tracking` | Get provider's live location + ETA | `{ lat, lng, eta, status }` |
| `GET` | `/homeservice/bookings/:id/status` | Get booking status steps | `{ steps[], currentStep }` |

### 2.4 Payment (User)

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|-------------|---------|
| `POST` | `/homeservice/payments` | Initiate payment | `{ bookingId, method: 'cash'|'card'|'online', amount }` | `{ paymentId, status, gatewayUrl? }` |
| `GET` | `/homeservice/payments/:id/status` | Payment status | — | `{ status }` |

### 2.5 Reviews

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|-------------|---------|
| `POST` | `/homeservice/reviews` | Submit review | `{ bookingId, providerId, rating, comment, tags[] }` | `{ review }` |
| `GET` | `/homeservice/providers/:id/reviews` | Provider reviews | `page, limit` | `{ reviews[], averageRating, total }` |

### 2.6 Wallet (User)

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|-------------|---------|
| `GET` | `/homeservice/wallet` | Get wallet balance & transactions | `page?, limit?` | `{ balance, transactions[], total }` |
| `POST` | `/homeservice/wallet/topup` | Add funds | `{ amount, method }` | `{ transactionId, gatewayUrl? }` |
| `POST` | `/homeservice/wallet/withdraw` | Request withdrawal | `{ amount, bankAccount }` | `{ transactionId }` |

### 2.7 Chat

| Method | Endpoint | Description | Response |
|--------|----------|-------------|---------|
| `GET` | `/homeservice/chats/:bookingId` | Load chat history | `{ messages[] }` |
| `POST` | `/homeservice/chats/:bookingId/messages` | Send message | `{ message }` |

---

## 3. Home Service — Provider APIs

### 3.1 Dashboard

| Method | Endpoint | Description | Response |
|--------|----------|-------------|---------|
| `GET` | `/homeservice/provider/dashboard` | Dashboard stats + recent jobs | `{ stats, activeJobs[], recentActivity }` |
| `GET` | `/homeservice/provider/jobs` | All jobs (with filter) | `status?, page, limit → { jobs[], total }` |
| `GET` | `/homeservice/provider/jobs/:id` | Job detail | `{ job }` |
| `PUT` | `/homeservice/provider/jobs/:id/accept` | Accept job | `{ accepted: true }` |
| `PUT` | `/homeservice/provider/jobs/:id/reject` | Reject job | `{ reason? }` |
| `PUT` | `/homeservice/provider/jobs/:id/arrive` | Mark arrived | `{ lat, lng }` → `{ job }` |
| `PUT` | `/homeservice/provider/jobs/:id/start` | Start job | — |
| `PUT` | `/homeservice/provider/jobs/:id/complete` | Mark job complete | `{ notes?, additionalCharges?, materialCost? }` |

### 3.2 Navigation / Tracking

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|-------------|---------|
| `PUT` | `/homeservice/provider/location` | Broadcast live location | `{ lat, lng, bookingId? }` | `{ ok }` |
| `GET` | `/homeservice/bookings/:id/route` | Get route from provider to customer | `{ providerLat, providerLng }` | `{ route, distance, eta }` |

### 3.3 Payment Request

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|-------------|---------|
| `POST` | `/homeservice/provider/payment-request` | Submit payment request | `{ bookingId, baseAmount, additionalCharges, materialCost, finalAmount, method }` | `{ paymentRequest }` |
| `GET` | `/homeservice/provider/payment-request/:id` | Check payment request status | — | `{ status, paidAt? }` |

### 3.4 Earnings

| Method | Endpoint | Description | Query Params | Response |
|--------|----------|-------------|-------------|---------|
| `GET` | `/homeservice/provider/earnings` | Earnings summary + chart | `period: today|week|month|custom, startDate?, endDate?` | `{ total, chartData[], transactions[] }` |
| `GET` | `/homeservice/provider/wallet` | Wallet balance | — | `{ balance, transactions[] }` |
| `POST` | `/homeservice/provider/wallet/withdraw` | Request payout | `{ amount, bankAccount }` | `{ transactionId }` |

### 3.5 Provider Profile

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|-------------|---------|
| `GET` | `/homeservice/provider/profile` | Get provider profile | — | `{ provider }` |
| `PUT` | `/homeservice/provider/profile` | Update profile | `{ bio, skills[], serviceAreas[], photo? }` | `{ provider }` |
| `PUT` | `/homeservice/provider/availability` | Toggle online/offline | `{ isAvailable: boolean }` | `{ provider }` |

---

## 4. Healthcare — User APIs

### 4.1 Doctor Discovery

| Method | Endpoint | Description | Query Params | Response |
|--------|----------|-------------|-------------|---------|
| `GET` | `/healthcare/home` | Home screen data (specialties + featured doctors) | — | `{ specialties[], featuredDoctors[] }` |
| `GET` | `/healthcare/specialties` | All specialties | `page?, limit?` | `{ specialties[], total }` |
| `GET` | `/healthcare/doctors` | Search / filter doctors | `specialtyId?, city?, gender?, type?, minFee?, maxFee?, availability?, q?, page, limit` | `{ doctors[], total }` |
| `GET` | `/healthcare/doctors/:id` | Doctor detail | — | `{ doctor, clinics[], averageRating, totalReviews }` |
| `GET` | `/healthcare/doctors/:id/reviews` | Doctor reviews | `rating?, sort?, page, limit` | `{ reviews[], total, averageRating }` |
| `POST` | `/healthcare/doctors/:id/favorite` | Toggle doctor favorite | `{ isFavorite: boolean }` | `{ ok }` |

### 4.2 Clinics & Slots

| Method | Endpoint | Description | Query Params | Response |
|--------|----------|-------------|-------------|---------|
| `GET` | `/healthcare/doctors/:id/clinics` | Doctor's clinics | — | `{ clinics[] }` |
| `GET` | `/healthcare/slots` | Available slots | `doctorId, clinicId?, date, consultationType: 'in-clinic'|'video'` | `{ dates[], slots by date and time group }` |

### 4.3 Appointments

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|-------------|---------|
| `POST` | `/healthcare/appointments` | Book appointment | `{ doctorId, clinicId?, slotId, consultationType, symptoms?, notes?, couponCode? }` | `{ appointment, confirmationCode }` |
| `GET` | `/healthcare/appointments` | User's appointments | `status: upcoming|past|all, page, limit` | `{ appointments[], total }` |
| `GET` | `/healthcare/appointments/:id` | Appointment detail | — | `{ appointment, doctor, prescription? }` |
| `PUT` | `/healthcare/appointments/:id/cancel` | Cancel appointment | `{ reason? }` | `{ appointment }` |
| `PUT` | `/healthcare/appointments/:id/reschedule` | Reschedule | `{ newSlotId, newDate }` | `{ appointment }` |

### 4.4 Video Consultation

| Method | Endpoint | Description | Response |
|--------|----------|-------------|---------|
| `POST` | `/healthcare/appointments/:id/video/join` | Join/create video room | `{ roomId, token, sessionId, status }` |
| `GET` | `/healthcare/appointments/:id/video/status` | Poll room status | `{ status: waiting|doctor-joined|active|ended }` |
| `PUT` | `/healthcare/appointments/:id/video/end` | End call | `{ duration }` → `{ ok }` |

### 4.5 Prescriptions

| Method | Endpoint | Description | Response |
|--------|----------|-------------|---------|
| `GET` | `/healthcare/prescriptions` | User's prescriptions | `{ prescriptions[] }` |
| `GET` | `/healthcare/prescriptions/:id` | Prescription detail | `{ prescription }` |
| `GET` | `/healthcare/prescriptions/:id/pdf` | Download PDF | Binary PDF stream |

### 4.6 Health Records

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|-------------|---------|
| `GET` | `/healthcare/records` | User's records | `type?, page, limit` | `{ records[], total }` |
| `POST` | `/healthcare/records/upload` | Upload records | `FormData: { files[], type, title, linkedAppointmentId? }` | `{ records[] }` |
| `DELETE` | `/healthcare/records/:id` | Delete record | — | `{ ok }` |

### 4.7 Coupons

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|-------------|---------|
| `POST` | `/healthcare/coupons/validate` | Validate coupon | `{ code, doctorId, amount }` | `{ isValid, discountPercent, maxDiscount, message }` |

### 4.8 Healthcare Notifications

| Method | Endpoint | Description | Query Params | Response |
|--------|----------|-------------|-------------|---------|
| `GET` | `/healthcare/notifications` | User's notifications | `filter: all|unread, page, limit` | `{ notifications[], unreadCount }` |
| `PUT` | `/healthcare/notifications/:id/read` | Mark as read | — | `{ ok }` |
| `PUT` | `/healthcare/notifications/read-all` | Mark all as read | — | `{ ok }` |
| `DELETE` | `/healthcare/notifications/:id` | Delete notification | — | `{ ok }` |

### 4.9 Healthcare User Profile

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|-------------|---------|
| `GET` | `/healthcare/user/profile` | Get health profile (blood group, allergies, etc.) | — | `{ healthProfile }` |
| `PUT` | `/healthcare/user/profile` | Update health profile | `{ bloodGroup, allergies[], conditions[], weight, height }` | `{ healthProfile }` |
| `GET` | `/healthcare/user/stats` | Appointments count, prescriptions, records | — | `{ stats }` |

---

## 5. Healthcare — Doctor APIs

### 5.1 Dashboard

| Method | Endpoint | Description | Response |
|--------|----------|-------------|---------|
| `GET` | `/healthcare/doctor/dashboard` | Today's stats + upcoming appointments | `{ todayStats, upcomingAppointments[], earningsSummary }` |
| `POST` | `/healthcare/doctor/dashboard/refresh` | Force refresh dashboard | `{ dashboard }` |

### 5.2 Appointments (Doctor View)

| Method | Endpoint | Description | Query Params | Response |
|--------|----------|-------------|-------------|---------|
| `GET` | `/healthcare/doctor/appointments` | Doctor's appointments | `date?, status?, type?, page, limit` | `{ appointments[], total }` |
| `GET` | `/healthcare/doctor/appointments/:id` | Appointment detail with patient info | — | `{ appointment, patient }` |
| `PUT` | `/healthcare/doctor/appointments/:id/confirm` | Confirm appointment | — | `{ appointment }` |
| `PUT` | `/healthcare/doctor/appointments/:id/cancel` | Cancel by doctor | `{ reason }` | `{ appointment }` |
| `PUT` | `/healthcare/doctor/appointments/:id/complete` | Mark complete | — | `{ appointment }` |

### 5.3 Patient Queue

| Method | Endpoint | Description | Response |
|--------|----------|-------------|---------|
| `GET` | `/healthcare/doctor/queue` | Today's patient queue | `{ queue[] }` |
| `PUT` | `/healthcare/doctor/queue/:queueId/start` | Start consultation | `{ queue }` |
| `PUT` | `/healthcare/doctor/queue/:queueId/complete` | Complete consultation | `{ queue }` |
| `PUT` | `/healthcare/doctor/queue/:queueId/skip` | Skip patient | `{ reason? }` → `{ queue }` |
| `PUT` | `/healthcare/doctor/queue/next` | Call next patient | `{ queue }` |

### 5.4 Prescriptions (Doctor Write)

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|-------------|---------|
| `POST` | `/healthcare/doctor/prescriptions` | Issue prescription | `{ appointmentId, patientId, diagnosis, medications[], tests[], advice, followUpDate? }` | `{ prescription }` |
| `PUT` | `/healthcare/doctor/prescriptions/:id` | Update prescription | Same as POST body | `{ prescription }` |
| `GET` | `/healthcare/doctor/prescriptions` | Doctor's prescriptions | `patientId?, page, limit` | `{ prescriptions[] }` |

### 5.5 Medical Notes

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|-------------|---------|
| `GET` | `/healthcare/doctor/notes` | Notes list | `patientId?, page, limit` | `{ notes[], total }` |
| `POST` | `/healthcare/doctor/notes` | Create note | `{ appointmentId, title, content, tags[], attachments[] }` | `{ note }` |
| `PUT` | `/healthcare/doctor/notes/:id` | Update note | Same fields | `{ note }` |
| `DELETE` | `/healthcare/doctor/notes/:id` | Delete note | — | `{ ok }` |

### 5.6 Patient History

| Method | Endpoint | Description | Response |
|--------|----------|-------------|---------|
| `GET` | `/healthcare/doctor/patients/:id/history` | Patient visit history | `{ patient, visits[] }` |
| `GET` | `/healthcare/doctor/patients/:id/records` | Patient records | `{ records[] }` |

### 5.7 Slots & Availability

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|-------------|---------|
| `GET` | `/healthcare/doctor/slots` | Doctor's slot configuration | `weekStart?` | `{ slots by day }` |
| `PUT` | `/healthcare/doctor/slots` | Save slot config | `{ weekSlots[], duration, maxPatientsPerSlot }` | `{ ok }` |
| `GET` | `/healthcare/doctor/availability` | Get availability settings | — | `{ weeklySchedule[], vacations[], instantBooking, videoConsultation }` |
| `PUT` | `/healthcare/doctor/availability` | Update availability | Same structure | `{ settings }` |
| `POST` | `/healthcare/doctor/availability/vacation` | Add vacation | `{ startDate, endDate, reason }` | `{ vacation }` |
| `DELETE` | `/healthcare/doctor/availability/vacation/:id` | Remove vacation | — | `{ ok }` |
| `PUT` | `/healthcare/doctor/availability/status` | Toggle online | `{ isAvailable: boolean }` | `{ ok }` |

### 5.8 Doctor Earnings

| Method | Endpoint | Description | Query Params | Response |
|--------|----------|-------------|-------------|---------|
| `GET` | `/healthcare/doctor/earnings` | Earnings data | `period: today|week|month|custom, startDate?, endDate?` | `{ total, chartData[], breakdown{}, transactions[] }` |
| `GET` | `/healthcare/doctor/wallet` | Wallet balance | — | `{ balance, transactions[] }` |
| `POST` | `/healthcare/doctor/wallet/withdraw` | Request payout | `{ amount, bankAccount }` | `{ transactionId }` |

### 5.9 Doctor Profile

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|-------------|---------|
| `GET` | `/healthcare/doctor/profile` | Get doctor profile | — | `{ doctor }` |
| `PUT` | `/healthcare/doctor/profile` | Update doctor profile | `{ bio, languages[], clinicInfo?, consultationFee?, videoFee? }` | `{ doctor }` |
| `PUT` | `/healthcare/doctor/profile/photo` | Update profile photo | `FormData: { photo }` | `{ photoUrl }` |

---

## 6. Admin APIs

### 6.1 Dashboard

| Method | Endpoint | Description | Response |
|--------|----------|-------------|---------|
| `GET` | `/admin/dashboard` | Stats, recent activity, charts | `{ stats, recentBookings[], recentProviders[], chartData }` |

### 6.2 Provider Management

| Method | Endpoint | Description | Query Params | Response |
|--------|----------|-------------|-------------|---------|
| `GET` | `/admin/providers` | All providers | `status?, type?, search?, page, limit` | `{ providers[], total }` |
| `GET` | `/admin/providers/pending` | Pending approval | — | `{ providers[] }` |
| `GET` | `/admin/providers/:id` | Provider detail + documents | — | `{ provider, documents[] }` |
| `PUT` | `/admin/providers/:id/approve` | Approve provider | — | `{ ok }` |
| `PUT` | `/admin/providers/:id/reject` | Reject with reason | `{ reason }` | `{ ok }` |
| `PUT` | `/admin/providers/:id/activate` | Activate provider | — | `{ ok }` |
| `PUT` | `/admin/providers/:id/deactivate` | Deactivate provider | `{ reason? }` | `{ ok }` |
| `DELETE` | `/admin/providers/:id` | Delete provider | — | `{ ok }` |

### 6.3 User Management

| Method | Endpoint | Description | Query Params | Response |
|--------|----------|-------------|-------------|---------|
| `GET` | `/admin/users` | All users | `status?, search?, page, limit` | `{ users[], total }` |
| `GET` | `/admin/users/:id` | User detail | — | `{ user }` |
| `PUT` | `/admin/users/:id/activate` | Activate user | — | `{ ok }` |
| `PUT` | `/admin/users/:id/deactivate` | Deactivate user | `{ reason? }` | `{ ok }` |
| `DELETE` | `/admin/users/:id` | Delete user account | — | `{ ok }` |

### 6.4 Service Provider Analytics (Home Service Admin)

| Method | Endpoint | Description | Query Params | Response |
|--------|----------|-------------|-------------|---------|
| `GET` | `/admin/homeservice/stats` | Dashboard stats by category/city | — | `{ stats, byCategory[], byCity[] }` |
| `GET` | `/admin/homeservice/bookings` | All bookings | `status?, search?, page, limit` | `{ bookings[], total }` |
| `PUT` | `/admin/homeservice/bookings/:id/status` | Update booking status | `{ status }` | `{ ok }` |
| `GET` | `/admin/homeservice/analytics` | Analytics data | `city?, period?` | `{ revenue, bookings, chartData[] }` |

### 6.5 Healthcare Admin

| Method | Endpoint | Description | Query Params | Response |
|--------|----------|-------------|-------------|---------|
| `GET` | `/admin/healthcare/analytics` | Healthcare KPIs | `startDate, endDate` | `{ appointments, revenue, doctors, patients, chartData[] }` |
| `POST` | `/admin/healthcare/analytics/export` | Export report | `{ format: 'csv'|'pdf', dateRange }` | Binary download |
| `GET` | `/admin/healthcare/specialties` | All specialties | — | `{ specialties[] }` |
| `POST` | `/admin/healthcare/specialties` | Create specialty | `{ name, icon, description }` | `{ specialty }` |
| `PUT` | `/admin/healthcare/specialties/:id` | Update specialty | Same fields | `{ specialty }` |
| `PUT` | `/admin/healthcare/specialties/:id/status` | Toggle active/inactive | `{ isActive: boolean }` | `{ ok }` |
| `DELETE` | `/admin/healthcare/specialties/:id` | Delete specialty | — | `{ ok }` |

### 6.6 Admin Settings

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|-------------|---------|
| `GET` | `/admin/settings` | Get all settings | — | `{ general, notifications, security, appearance }` |
| `PUT` | `/admin/settings/general` | Update general | `{ appName, language, timezone, maintenanceMode }` | `{ ok }` |
| `PUT` | `/admin/settings/notifications` | Update notification prefs | `{ emailEnabled, pushEnabled, smsEnabled, events{} }` | `{ ok }` |
| `PUT` | `/admin/settings/security` | Update security | `{ twoFactorEnabled, sessionTimeout, passwordPolicy }` | `{ ok }` |
| `PUT` | `/admin/settings/appearance` | Update appearance | `{ theme, accentColor, fontSize }` | `{ ok }` |

### 6.7 Admin Notifications

| Method | Endpoint | Description | Response |
|--------|----------|-------------|---------|
| `GET` | `/admin/notifications` | Admin notifications | `{ notifications[], unreadCount }` |
| `PUT` | `/admin/notifications/:id/read` | Mark read | `{ ok }` |
| `PUT` | `/admin/notifications/read-all` | Mark all read | `{ ok }` |
| `DELETE` | `/admin/notifications/:id` | Delete | `{ ok }` |

---

## 7. Real-Time & Push APIs

### 7.1 WebSocket Events (Socket.io or native WS)

#### Home Service Events
| Event (Server → Client) | Payload | Used In |
|------------------------|---------|---------|
| `job:new` | `{ job }` | Provider Dashboard — new job cards |
| `job:accepted_by_provider` | `{ jobId, provider }` | User — booking confirmed |
| `provider:location_update` | `{ lat, lng, eta }` | LiveTrackingScreen — move provider marker |
| `job:status_changed` | `{ jobId, status }` | ServiceStatusScreen — step update |
| `job:completed` | `{ jobId }` | User — trigger approval modal |
| `payment:received` | `{ bookingId, amount }` | Provider — payment confirmation |
| `message:new` | `{ chatId, message }` | ProviderChatScreen / in-app chat |

#### Healthcare Events
| Event (Server → Client) | Payload | Used In |
|------------------------|---------|---------|
| `appointment:confirmed` | `{ appointmentId }` | MyAppointmentsScreen / Notification |
| `appointment:cancelled` | `{ appointmentId, reason }` | MyAppointmentsScreen / Notification |
| `appointment:reminder` | `{ appointmentId, minutesBefore }` | Push notification |
| `video:doctor_joined` | `{ roomId, appointmentId }` | VideoWaitingRoomScreen → auto-join |
| `video:call_ended` | `{ appointmentId }` | VideoCallScreen |
| `prescription:issued` | `{ prescriptionId }` | HealthRecordsScreen / Notification |
| `queue:status_changed` | `{ queueId, status }` | PatientQueueScreen |

### 7.2 Firebase Cloud Messaging (FCM)

| Notification Type | Trigger | Target |
|------------------|---------|--------|
| New Job Alert | Job created and matched to provider | Provider device(s) |
| Booking Confirmed | Booking status → confirmed | User device |
| Appointment Reminder | 24h and 1h before appointment | User device |
| Provider Arrived | Job status → arrive | User device |
| Payment Received | Payment confirmed | Provider device |
| Prescription Ready | Prescription created | User device |
| Video Call Incoming | Doctor initiates call | User device |

**Required Server Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/notifications/register-token` | Save FCM device token |
| `DELETE` | `/notifications/unregister-token` | Remove token on logout |

---

## 8. File Upload APIs

All file uploads use `multipart/form-data`.

| Method | Endpoint | Description | Fields | Response |
|--------|----------|-------------|--------|---------|
| `POST` | `/uploads/profile-photo` | User/doctor profile photo | `photo (image)` | `{ url }` |
| `POST` | `/uploads/documents` | Provider KYC documents | `documents[] (pdf/image)` | `{ urls[] }` |
| `POST` | `/uploads/health-records` | Patient health records | `files[] (pdf/image), type, title` | `{ records[] }` |
| `POST` | `/uploads/prescription-attachment` | Doctor note attachments | `files[] (image/pdf)` | `{ urls[] }` |
| `GET` | `/uploads/:fileId` | Secure file access | — | Signed URL redirect or stream |

---

## 9. Payment APIs

### 9.1 Payment Gateway Integration

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|-------------|---------|
| `POST` | `/payments/initiate` | Start payment session | `{ amount, currency: 'PKR', orderId, type: 'booking'|'appointment'|'wallet_topup', returnUrl }` | `{ sessionId, gatewayUrl, expiresAt }` |
| `GET` | `/payments/:sessionId/status` | Poll payment result | — | `{ status: pending|completed|failed, transactionId? }` |
| `POST` | `/payments/webhook` | Gateway webhook (server-side) | `{ event, data }` | HTTP 200 |
| `GET` | `/payments/history` | User payment history | `type?, page, limit` | `{ payments[], total }` |
| `POST` | `/payments/refund` | Request refund | `{ paymentId, reason }` | `{ refundId, status }` |

### 9.2 Coupon Validation

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/coupons/validate` | Validate any coupon code across services |

---

## Summary: API Counts by Service

| Module | Endpoints |
|--------|-----------|
| Shared Auth | 11 |
| Home Service — User | 18 |
| Home Service — Provider | 16 |
| Healthcare — User | 29 |
| Healthcare — Doctor | 28 |
| Admin | 30 |
| Real-Time (WebSocket/FCM) | 15 event types + 2 REST |
| File Upload | 5 |
| Payments | 8 |
| **Total** | **~162** |

---

## Standard Response Format

All endpoints return:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

Error responses:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable message",
    "details": { ... }
  }
}
```

## Authentication Headers

```http
Authorization: Bearer <accessToken>
X-Platform: ios | android
X-App-Version: 1.0.0
Content-Type: application/json
```
