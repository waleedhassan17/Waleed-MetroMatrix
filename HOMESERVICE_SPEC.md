# HOMESERVICE_SPEC — API Contract Extracted From the Frontend

Source of truth: `networks/serviceProviders/*.ts` (15 modules) + `models/serviceProviders/*.ts` (12 type files).
The backend must be generated from this contract; every response field name below is what a screen already renders.

All functions return `ApiResponse<T>`:

```ts
interface ApiResponse<T> { success: boolean; data: T; message?: string; pagination?: Pagination }
interface Pagination { currentPage: number; totalPages: number; totalItems: number;
                       itemsPerPage: number; hasNext: boolean; hasPrevious: boolean }
```

---

## 1. API CONTRACT (all exported functions)

### providerNetwork.ts (6 dummy branches)

| Function | Method | Path | Request | Response `data` |
|---|---|---|---|---|
| `fetchProviders(params)` | GET | `/providers?category&search&page&limit&sort&filters` | `category: string` (electricians\|plumbers\|ac-repairers), `search?`, `page?`, `limit?` (15), `sort?`, `filters?: {minRating?, maxPrice?, verified?, available?}` (JSON-stringified) | `{ providers: Provider[]; pagination: Pagination }` |
| `fetchProviderDetails(providerId)` | GET | `/providers/:providerId` | — | `ProviderDetails` (Provider + `servicesOffered: ProviderService[]`, `availability: ProviderAvailability[]`, `gallery: GalleryItem[]`, `reviewsList: Review[]`) |
| `fetchProviderProfile()` | GET | `/provider/profile` | — | `ProviderDetails` (own profile) |
| `updateProviderProfile(data)` | PATCH | `/provider/profile` | `Partial<Provider>` | `Provider` |
| `updateProviderOnlineStatus(isOnline)` | PATCH | `/provider/status` | `{ isOnline: boolean }` | `{ isOnline: boolean }` |

`Provider` (models/serviceProviders/provider.ts): `id, name, image, email, phoneNumber, rating, reviews (count), experience, price, verified, available, isOnline, responseTime, specialty, bio, address, city, category ('electricians'|'plumbers'|'ac-repairers'), skills[], certifications[], languages[], completedJobs, jobSuccessRate, coordinates {latitude, longitude}, createdAt, updatedAt`.

### homeNetwork.ts (2)

| Function | Method | Path | Response `data` |
|---|---|---|---|
| `fetchHomeData()` | GET | `/user/home` | `{ categories: ServiceCategory[]; promotions: Promotion[] }` — `ServiceCategory {id, name, badge, badgeColor, description, image, providerCount, providers[] (avatar urls), icon}`; `Promotion {id, title, subtitle, discount, badge, gradient[], cta, icon?}` |

### bookingNetwork.ts (4)

| Function | Method | Path | Request | Response `data` |
|---|---|---|---|---|
| `fetchBookingData(providerId)` | GET | `/bookings/init/:providerId` | — | `{ provider: BookingProvider; addresses: SavedAddress[]; timeSlots: TimeSlot[] }` |
| `createBooking(data)` | POST | `/bookings` | `{ providerId, selectedDate, selectedTime, addressId, instructions? }` | `BookingConfirmation { bookingId, status: 'waiting'\|'confirmed'\|'rejected'\|'cancelled', provider: BookingProvider, bookingDetails: BookingDetails, estimatedArrival? }` |
| `cancelBooking(bookingId, reason?)` | POST | `/bookings/:bookingId/cancel` | `{ reason }` | `{ success: boolean }` |

`BookingProvider {id, name, image, service, specialty, rating, reviews, experience, verified, isOnline, responseTime, basePrice, category}` · `SavedAddress {id, label, address, icon: 'home'|'building'|'location'|'briefcase', isDefault, coordinates}` · `TimeSlot {id, time, available, period: 'morning'|'afternoon'|'evening'}`.

### serviceStatusNetwork.ts (2)

| Function | Method | Path | Response `data` |
|---|---|---|---|
| `fetchServiceStatus(bookingId)` | GET | `/bookings/:bookingId/service-status` | `ServiceStatus { bookingId, status: 'arrived'\|'in_progress'\|'completed', provider {id,name,phone,image}, serviceDetails {type, description, startedAt, estimatedDuration, suggestedAmount}, progressSteps: {id, label, completed, time?}[] }` |

### jobNetwork.ts (15) — provider side

| Function | Method | Path | Request | Response `data` |
|---|---|---|---|---|
| `fetchProviderJobs(params?)` | GET | `/provider/jobs?status&page&limit` | `status?` (display bucket), `page?`, `limit?` | `{ jobs: Job[]; stats: JobStats; pagination }` |
| `fetchJobDetail(jobId)` | GET | `/provider/jobs/:jobId` | — | `JobDetail` (Job + `customerName`, `estimatedPrice`) |
| `acceptJob(jobId)` | POST | `/provider/jobs/:jobId/accept` | — | `{ success: boolean }` |
| `rejectJob(jobId, reason?)` | POST | `/provider/jobs/:jobId/reject` | `{ reason }` | `{ success: boolean }` |
| `startJob(jobId)` | POST | `/provider/jobs/:jobId/start` | — | `{ success: boolean }` — semantics: provider goes EN_ROUTE |
| `completeJob(data)` | POST | `/provider/jobs/:jobId/complete` | `{ jobId, finalAmount, notes?, photos? }` | `{ success: boolean }` |
| `arrivedAtLocation(jobId)` | POST | `/provider/jobs/:jobId/arrived` | — | `{ success: boolean }` |
| `startJobWork(jobId)` | POST | `/provider/jobs/:jobId/start-work` | — | `{ startTime: string }` — ARRIVED → IN_PROGRESS |
| `completeJobWork(jobId)` | POST | `/provider/jobs/:jobId/complete-work` | — | `{ endTime: string; duration: number }` (minutes) |
| `submitJobCompletion(jobId)` | POST | `/provider/jobs/:jobId/finalize` | — | `{ completed: boolean }` |
| `fetchAwaitingApprovalData(jobId)` | GET | `/provider/jobs/:jobId/awaiting-approval` | — | `AwaitingApprovalData { jobId, serviceType, customerName, address, actualDuration, estimatedPrice }` |
| `checkJobApprovalStatus(jobId)` | GET | `/provider/jobs/:jobId/approval-status` | — | `{ isApproved: boolean; approvalTime? }` |
| `fetchJobInProgressData(jobId)` | GET | `/provider/jobs/:jobId/in-progress` | — | `JobInProgressData { jobId, serviceType, category, customerName, customerPhone, address, city, specialInstructions, estimatedPrice, coordinates }` |
| `fetchJobCompletionData(jobId)` | GET | `/provider/jobs/:jobId/completion` | — | `JobCompletionData { jobId, serviceType, customerName, actualDuration, earnings, paymentMethod: 'online'\|'cash', transactionId, stats { totalJobsDone, averageRating, levelProgress } }` |

`Job {id, title, category, serviceType, customer, customerAvatar, customerPhone, customerImage?, location, city, date, time, price, status (display bucket — see §2), coordinates, specialInstructions?}` · `JobStats {total, upcoming, today, completed, cancelled}`.

### trackingNetwork.ts (5)

| Function | Method | Path | Request | Response `data` |
|---|---|---|---|---|
| `fetchTrackingData(bookingId)` | GET | `/bookings/:bookingId/tracking` | — | `TrackingData { provider: TrackingProvider, providerLocation, userLocation, route: RouteInfo\|null {coordinates[], distance, distanceValue, duration, durationValue}, trackingStatus {status: 'en_route'\|'nearby'\|'arrived'\|'in_progress'\|'completed', message, timestamp}, bookingId }` |
| `updateProviderLocation(data)` | POST | `/provider/location` | `{ latitude, longitude, jobId? }` | `{ distance: string; duration: string }` |
| `markArrived(jobId)` | POST | `/provider/jobs/:jobId/arrived` | — | `{ arrived: boolean }` (duplicate of `arrivedAtLocation`) |
| `fetchNavigationData(jobId)` | GET | `/provider/jobs/:jobId/navigation` | — | `NavigationParams { jobId, destination, destinationAddress, destinationCity, customerName, customerPhone, serviceType }` |

### chatNetwork.ts (3)

| Function | Method | Path | Request | Response `data` |
|---|---|---|---|---|
| `fetchChatData(bookingId)` | GET | `/chat/:bookingId` | — | `ChatData { bookingId, participants {user: ChatParticipant, provider: ChatParticipant}, messages: ChatMessage[] }` |
| `sendChatMessage(data)` | POST | `/chat/:bookingId/messages` | `{ message: string }` | `ChatMessage { id, text, sender: 'user'\|'provider', timestamp, status: 'sent'\|'delivered'\|'read' }` |

### paymentNetwork.ts (7)

| Function | Method | Path | Request | Response `data` |
|---|---|---|---|---|
| `fetchPaymentData(bookingId)` | GET | `/payments/:bookingId/init` | — | `PaymentData { paymentId, recipient {id,name,image}, details {bookingId, service, description, amount, suggestedAmount, invoiceId}, availableMethods: PaymentMethod[] {id: 'cash'\|'jazzcash'\|'easypaisa'\|'card', name, icon, enabled, description} }` |
| `processPayment(data)` | POST | `/payments/process` | `{ bookingId, method, amount, tipAmount? }` | `Transaction { transactionId, status: 'completed'\|'failed'\|'pending', method, amount, currency, paidAt }` |
| `initializeProviderPayment(jobId)` | GET | `/provider/jobs/:jobId/payment` | — | `PaymentInitData { jobId, amount, serviceType, customerName, breakdown { serviceCharge, materialCost?, additionalCharges?, discount?, tax? } }` |
| `requestPaymentFromCustomer(jobId, amount)` | POST | `/provider/jobs/:jobId/request-payment` | `{ amount }` | `{ requestId: string }` |
| `confirmOnlinePayment(jobId, transactionId)` | POST | `/provider/jobs/:jobId/confirm-payment` | `{ transactionId }` | `{ confirmed: boolean }` |
| `confirmCashPayment(jobId)` | POST | `/provider/jobs/:jobId/confirm-cash` | — | `{ transactionId: string }` |

### reviewNetwork.ts (3)

| Function | Method | Path | Request | Response `data` |
|---|---|---|---|---|
| `fetchReviewData(bookingId)` | GET | `/reviews/:bookingId/init` | — | `ReviewData { provider {id,name,image,category}, serviceDetails {type, description, completedAt, amount}, availableTags: {id,label,icon}[] }` |
| `submitReview(data)` | POST | `/reviews` | `{ bookingId, providerId, rating, feedback, tags[] }` | `SubmittedReview { id, rating, feedback, tags, createdAt }` |

### dashboardNetwork.ts (2)

| Function | Method | Path | Response `data` |
|---|---|---|---|
| `fetchProviderDashboard()` | GET | `/provider/dashboard` | `DashboardData { profile {id,name,avatar,rating,isOnline,isPro,unreadNotifications}, stats {todayJobs, weekJobs, completionRate}, insights[], jobs { pending: DashboardJob[], today: DashboardJob[], upcoming: DashboardJob[] }, recentActivity[] }` — `DashboardJob.status: 'pending'\|'accepted'\|'in_progress'\|'completed'` (a FOURTH status vocabulary) |

### earningsNetwork.ts (3)

| Function | Method | Path | Request | Response `data` |
|---|---|---|---|---|
| `fetchProviderEarnings(params?)` | GET | `/provider/earnings?period` | `period?: 'week'\|'month'\|'year'` | `EarningsData { stats {totalEarnings, thisMonthEarnings, pendingPayouts, completedJobsCount, monthlyGrowth}, monthlyData {month, amount, jobs}[], recentPayments: PaymentItem[] {id, type: 'earning'\|'payout', amount, date, status, description}, performance {avgRating, onTimeRate, statusTier, repeatCustomerRate} }` |
| `requestPayout(data)` | POST | `/provider/earnings/payout` | `{ amount, method, accountDetails? }` | `{ payoutId: string; status: string }` |

### userNetwork.ts (11)

| Function | Method | Path | Request | Response `data` |
|---|---|---|---|---|
| `fetchUserBookings(params?)` | GET | `/user/bookings?status` | `status?` ('all' = no filter) | `UserBooking[]` `{id, serviceId, serviceName, serviceImage, categoryType, providerId, providerName, providerAvatar, status: 'pending'\|'confirmed'\|'in_progress'\|'upcoming'\|'completed'\|'cancelled', date, time, address, price, rating?, review?, createdAt, updatedAt}` |
| `cancelUserBooking(bookingId)` | POST | `/user/bookings/:bookingId/cancel` | — | `{ bookingId }` |
| `updateUserBookingStatus(bookingId, status)` | PATCH | `/user/bookings/:bookingId/status` | `{ status }` | `{ bookingId, status }` |
| `rateUserBooking(bookingId, rating, review?)` | POST | `/user/bookings/:bookingId/rate` | `{ rating, review? }` | `{ bookingId, rating, review? }` |
| `fetchUserProfile()` | GET | `/user/profile` | — | `UserProfileData { user: UserProfile {id,name,email,phone,avatar,isPremium,stats{bookings,reviews,points}}, addresses: UserAddress[] {id,label,address,city,isDefault}, paymentMethods: UserPaymentMethod[] }` |
| `updateUserProfile(data)` | PATCH | `/user/profile` | `Partial<UserProfile>` | `UserProfile` |
| `updateUserAvatar(avatarUri)` | POST | `/user/profile/avatar` | `{ avatar }` | `{ avatar: string }` |
| `addUserAddress(address)` | POST | `/user/addresses` | `Omit<UserAddress,'id'>` | `UserAddress` |
| `deleteUserAddress(addressId)` | DELETE | `/user/addresses/:addressId` | — | `{ addressId }` |
| `logoutUser()` | POST | `/auth/logout` | — | `{ success: boolean }` |

**Count: 46 exported API functions** across 12 callable modules (config/index/dummyData excluded), **64 `USE_DUMMY_DATA` branches**.

---

## 2. STATUS MODEL — the canonical resolution

Four (not three) vocabularies exist on the frontend:

| File | Vocabulary | Nature |
|---|---|---|
| `booking.ts` | `pending, confirmed, in_progress, completed, cancelled` | lifecycle, missing en-route/arrived |
| `serviceStatus.ts` | `arrived, in_progress, completed` | tail of the lifecycle |
| `tracking.ts` | `en_route, nearby, arrived, in_progress, completed` | tracking phase |
| `job.ts` | `upcoming, active, completed, cancelled, available, today` | lifecycle MIXED with display buckets |
| `dashboard.ts` (DashboardJob) | `pending, accepted, in_progress, completed` | lifecycle subset |
| `userNetwork.ts` (UserBooking) | booking.ts set + `upcoming` | list-filter vocabulary |

### Canonical backend lifecycle (single source of truth)

```
PENDING → ACCEPTED | REJECTED | CANCELLED
ACCEPTED → EN_ROUTE | CANCELLED
EN_ROUTE → ARRIVED | CANCELLED
ARRIVED → IN_PROGRESS | CANCELLED
IN_PROGRESS → COMPLETED
COMPLETED, REJECTED, CANCELLED terminal
```

Payment is **not** a booking status — it is a parallel `payment.status: unpaid|requested|paid` field, because the payment screen runs after COMPLETED.

### Derived display mappings (implemented in ONE backend file, `statusMap.js`)

**→ booking.ts / UserBooking (customer lists):**
`PENDING→pending` · `ACCEPTED|EN_ROUTE|ARRIVED→confirmed` (list view) · `IN_PROGRESS→in_progress` · `COMPLETED→completed` · `REJECTED|CANCELLED→cancelled`. The `upcoming` bucket in UserBooking = `ACCEPTED` with `scheduledFor` in the future.

**→ serviceStatus.ts:** `ARRIVED→arrived` · `IN_PROGRESS→in_progress` · `COMPLETED→completed` (screen only reachable from these states).

**→ tracking.ts:** `EN_ROUTE→en_route` (`nearby` when distance < 500 m) · `ARRIVED→arrived` · `IN_PROGRESS→in_progress` · `COMPLETED→completed`.

**→ job.ts display buckets (provider job list):**
`PENDING→available` · `ACCEPTED (scheduled today)→today` · `ACCEPTED (future)→upcoming` · `EN_ROUTE|ARRIVED|IN_PROGRESS→active` · `COMPLETED→completed` · `REJECTED|CANCELLED→cancelled`. Buckets are computed server-side per request; they are filters, never stored.

**→ DashboardJob:** `PENDING→pending` · `ACCEPTED|EN_ROUTE|ARRIVED→accepted` · `IN_PROGRESS→in_progress` · `COMPLETED→completed`.

**Screens needing change:** none structurally — the serializers translate. `BookingConfirmation.status` (`waiting|confirmed|rejected|cancelled`) maps `PENDING→waiting`, `ACCEPTED→confirmed`.

---

## 3. SCREEN INVENTORY

### Customer (`screens/user/homeservice/`)
| Screen | Network calls (via slice) |
|---|---|
| `tabs/home-screen` | `fetchHomeData` |
| `quick-search` | (local filter over home data) |
| `search-providers` | `fetchProviders` |
| `service-providers` (ProvidersScreen) | `fetchProviders` |
| `provider-profile` | `fetchProviderDetails` |
| `Booking` | `fetchBookingData`, `createBooking` |
| `book-confirmation` | (params from createBooking; polls booking status) |
| `service-status` | `fetchServiceStatus`, `processPayment` |
| `live-tracking` | `fetchTrackingData` |
| `payment-screen` | `fetchPaymentData`, `processPayment` |
| `rating-screen` | `fetchReviewData`, `submitReview` |
| `providers-chat` | `fetchChatData`, `sendChatMessage`, `createBooking` |
| `call-screen` | none (UI only — no provider counterpart, cannot connect) |
| `tabs/booking-screen` | `fetchUserBookings`, `cancelUserBooking`, `createBooking` |
| `tabs/profile` | `fetchUserProfile`, `updateUserProfile`, `updateUserAvatar`, `logoutUser` |

### Provider (`screens/providers/homeservice/`)
| Screen | Network calls |
|---|---|
| `tabs/dashboard` | `fetchProviderDashboard`, `updateProviderOnlineStatus`, `acceptJob`, `rejectJob` |
| `tabs/jobs` | `fetchProviderJobs`, `acceptJob`, `rejectJob` |
| `tabs/earnings` | `fetchProviderEarnings`, `requestPayout` |
| `jobdetail-screen` | `fetchJobDetail`, `acceptJob`, `rejectJob`, `startJob` |
| `map-screen` | `fetchJobDetail`, `updateProviderLocation`, `markArrived`, `fetchNavigationData` |
| `job-InProgress` | `fetchJobInProgressData`, `startJobWork`, `completeJobWork` |
| `awaiting-screen` | `fetchAwaitingApprovalData`, `checkJobApprovalStatus` |
| `job-completion` | `fetchJobCompletionData`, `submitJobCompletion` |
| `payment-screen` | `initializeProviderPayment`, `requestPaymentFromCustomer`, `confirmOnlinePayment`, `confirmCashPayment` |
| `profie-screen` *(folder misspelled)* | `fetchProviderProfile`, `updateProviderProfile` |

### Super admin (`screens/admin/`)
admin-dashboard, providers, pending-review, provider-review, provider-management, user-management, notifications, settings — **zero home-service booking oversight.**

---

## 4. DUMMY DEPENDENCY MAP

64 `USE_DUMMY_DATA` branches (all functions of §1 modules): providerNetwork 6, homeNetwork 2, bookingNetwork 4, serviceStatusNetwork 2, jobNetwork 15, dashboardNetwork 2, trackingNetwork 5, chatNetwork 3, paymentNetwork 7, reviewNetwork 3, earningsNetwork 3, userNetwork 11. Each branch is replaced by its endpoint from §1; the shape translation lives in `serializers/serviceProviders/`.

---

## 5. MISSING UI

**API functions with no screen:** `updateProviderOnlineStatus` (dashboard toggles it, but no availability/radius settings screen), `addUserAddress`, `deleteUserAddress` (no address-management screen — booking screen only picks from a fetched list), `updateUserBookingStatus`, `rateUserBooking` (redundant with reviewNetwork; superseded).

**One-sided two-party features:** customer has `providers-chat` + `call-screen`; provider has **neither** → chat/call can never connect (FR-10 blocked). Fix in HS7.

**Missing screens:** customer AddressManagement, BookingDetail, dispute UI, home-service notifications; provider chat, call, availability; admin: bookings list/detail, disputes, payouts, service categories, home-service analytics/settings.

---

## 6. CONFIG DEFECTS (`networks/serviceProviders/config.ts`)

1. ~~**Third API host** — `BASE_URL` pointed at a retired Heroku dyno while `network.ts` used the real Vercel host and `shoppingAxios.ts` a second Heroku host. One app, three hosts.~~ **RESOLVED** — `config.ts` now derives `BASE_URL` from the shared `API_BASE_URL`; every module talks to the one Vercel host.
2. **No `Authorization` header, ever** — `apiRequest` uses raw `fetch` with only `Content-Type`. Blast radius: **every function in §1 except none** — all endpoints except the public provider search require auth, so ~44 of 46 calls 401 immediately once `USE_DUMMY_DATA=false`. (`fetchProviders`/`fetchProviderDetails` could be public; everything else dies.)
3. **No timeout** — hung request hangs the screen forever, violating NFR-01.

Fix (HS6 Part A): route `apiRequest` through the shared axios instance in `networks/network/network.ts` (token injection, 401 handling, 30 s timeout), keep the `ApiResponse<T>` return contract identical.
