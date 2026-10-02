# Requirements traceability: FYP feature checklist

Status on 2026-10-02 for every row of the FYP feature checklist (Home Services, Healthcare, Shopping and the cross-cutting rows).

Each row gives:
- what was built;
- where it lives (API endpoint, backend file, app screen);
- the automated tests that prove it;
- how to demonstrate it.

Repos:
- **App**: this repo, Expo SDK 54.
- **API**: `MetroMatrix-Backend`, Express on Vercel.
- **Realtime**: `metromatrix-realtime`, Socket.IO and push, on Heroku.

API paths are relative to the API host. Every row is implemented and tested. A few rows were built differently from the report's wording; [§2](#2-report-wording-to-amend) lists those, and they should be corrected in the report rather than hidden.

---

## 1. Summary

| # | Checklist row | Module | Status | Main evidence |
|---|---|---|---|---|
| 1 | Geospatial provider discovery, ranked by rating and proximity | Home Services | **Done** | `GET /api/providers` → `discoveryPipeline.js`; app `ProvidersScreen` (list + map) |
| 2 | `$geoNear` + 2dsphere | Home Services | **Done** | `$geoNear` first stage on `providers.currentLocation` (2dsphere); also clinics and outlets |
| 3 | AI provider matching engine: Haversine proximity + rating weight + availability filter, list by quality | Home Services | **Done** | 4-term weighted score (distance, Bayesian rating, available-now, quality); learned TF.js re-ranker on top |
| 4 | FCM push for Home Services, Healthcare and Shopping | All three | **Done** | Expo Push → FCM HTTP v1 from the realtime service; the push matrix is in §3.4 |
| 5 | Browse approved providers by category, with rating, availability and proximity filters | Home Services (+ doctors, outlets) | **Done** | Filters and sorts reach the server; paging; "available now"; distance on cards |
| 6 | Vendor listing management | Shopping | **Done** | Publish / unpublish, moderation queue, status pills, 3D models, rating filter |
| 7 | AI/ML: suggestions, demand prediction, NLP search | All three | **Done** | Recommendations, "Describe the problem", Holt-Winters forecasts, natural-language product search |
| 8 | Personalised recommendations in all 3 modules | All three | **Done** | `/api/recommendations/{shopping,homeservice,healthcare}` + app rails |
| 9 | AI/ML service: TF.js + Python for matching scores and recommendations | Cross-cutting | **Done** | `ml/` Python batch (nightly GitHub Action) + TF.js serving in the API |
| 10 | Analytics dashboards: provider performance, demand predictions, real-time usage | Admin + providers | **Done** | `PlatformAnalyticsScreen` (Live / Demand / Leaders / Models) + demand cards |
| 11 | API Gateway: routing, JWT, rate limiting, CORS | Cross-cutting | **Done** (in-process layer) | `src/gateway/*` |
| 12 | Redis caching layer: hot data, sessions, provider availability | Cross-cutting | **Done** (sessions deliberately not in Redis) | `src/lib/redis.js`, `src/lib/cache.js` |
| 13 | `service_providers` 2dsphere index | Home Services | **Done** (the collection is `providers`) | `Provider.js` index + `scripts/sync-indexes.js` |
| 14 | Cloud storage (report says Firebase Storage): profile, documents, medication uploads | All three | **Done** (Cloudinary) | Signed direct uploads, `POST /api/uploads/sign` |
| 15 | FCM for all booking lifecycle events | Home Services | **Done** | Every transition, expiry, ~5-min-away, reminder, review, identity check |
| 16 | AR / Bluetooth / NFC support | Shopping / Healthcare / Home Services | **Done** (one focused feature each) | AR "View in your room"; BLE heart-rate / BP monitors; NFC + QR doorstep ID check |

---

## 2. Report wording to amend

| The report says | What was built | Why |
|---|---|---|
| Firebase Storage | **Cloudinary**, through signed direct uploads (phone → Cloudinary). The API only signs the upload and then checks that the URL is this account's upload for this purpose. | Cloudinary was already the platform's store. Vercel caps request bodies at 4.5 MB, so large files go direct. A second storage vendor would add cost and nothing else. |
| FCM | **FCM HTTP v1, delivered through Expo's push service.** The realtime service sends; the app never calls FCM directly. | Expo Push wraps FCM v1 (Android) and APNs (iOS) behind one token type. |
| `service_providers` collection | Collection **`providers`** (Mongoose model `Provider`), with the same 2dsphere index. | Existing schema name. |
| API Gateway (separate component) | **In-process API gateway layer** inside the modular monolith (`src/gateway/`). It handles request ids, access log, CORS/helmet, Redis-shared rate limits, JWT per router, and one route table. | On serverless hosting a separate gateway adds a network hop to every request and gains nothing. |
| Redis for sessions | **Sessions are not in Redis.** They use stateless JWT access tokens plus refresh-token rotation in MongoDB. Redis holds hot data, rate limits, real-time usage and cached search/availability. | Refresh tokens must survive a cache flush. Redis is fail-open by design. |
| NFC phone-to-phone | **NFC badge (tag) + QR code + 6-digit code.** | Android removed phone-to-phone NFC (Beam) in Android 10. |
| AR inside the app | **The phone's own AR viewer**: Google Scene Viewer on Android, AR Quick Look on iPhone. | No AR engine ships in the app; works on any ARCore phone. |
| AI matching engine | **Heuristic score + learned model.** The weighted score ranks by default. A Python-trained MLP served in TF.js re-ranks only when an admin enables it and its checks pass. | Honest with thin data: the model must prove itself against the heuristic first. |

---

## 3. Detail per requirement

### 3.1 Geospatial discovery, matching and browsing (rows 1, 2, 3, 5, 13)

**Built:**

- **Search.** `GET /api/providers` runs `$geoNear` as the first stage on the `providers` 2dsphere index. It is measured from the customer's pinned address, else the phone's location. Without a location it falls back to a plain `$match` across all cities, with no invented distances. Each provider's own service radius is enforced, and the search widens 15 → 30 → 60 km only when nobody is in range.
- **Score** (weights are admin-tunable, defaults .35/.35/.15/.15):
  - distance (Haversine);
  - Bayesian rating `(C·m + avg·n)/(C+n)`, with m = 4.0 and C = 5;
  - **available now**: online, seen within `onlineStaleMinutes`, and inside today's hours (PKT);
  - **quality**: completion rate, Laplace-smoothed.
  Each result carries `scoreBreakdown`.
- **Learned re-ranking.** It re-orders the top 50 of a "Best match" search in `blend` or `model` mode. Every search logs its impressions with features. Bookings are credited through `rankingContext.searchId`. (See [§3.5](#35-aiml-service-recommendations-nlp-search-forecasting-rows-7-8-9).)
- **Location data:**
  - provider location is a coarse **service base** (~500 m), set in Availability or sampled when the provider goes online;
  - presence is kept honest by `POST /api/provider/heartbeat`;
  - the live GPS track is never stored (NFR-08), and tracking returns `null` rather than the base;
  - `scripts/geo-hygiene.js` cleans legacy placeholder coordinates.
- **App** (the server's order is kept, never re-sorted on the phone):
  - `screens/user/homeservice/service-providers/ProvidersScreen.tsx`: sort sheet (best / nearest / top rated / most reviewed / price), filter sheet (min rating, available now, within X km), infinite paging;
  - map view `components/homeservice/ProviderDiscoveryMap.tsx`;
  - "Available now" badges and distance on cards.
- **Also proximity-aware:**
  - doctors: `GET /api/v1/healthcare/doctors?lat&lng` gives the nearest clinic via `$geoNear` on `clinics`;
  - shopping outlets: `GET /api/shopping/outlets?lat&lng`, sorted nearest-first with `distanceKm`.

**Code:**
- API: `src/modules/homeservice/services/discoveryPipeline.js`, `controllers/providerSearchController.js`, `services/presenceService.js`, `services/serviceBase.js`, `src/models/Provider.js`.
- Healthcare: `src/modules/healthcare/services/doctorService.js`.
- Shopping: `src/modules/shopping/services/catalogService.js`.

**Tests:**
- API: `homeservice/__tests__/discovery.test.js`, `discovery.integration.test.js` (real MongoDB: near beats far at equal rating; a stale provider loses "available now"; placeholder locations are excluded), `expiryAndSearch.test.js`, `ml/__tests__/searchRerank.integration.test.js`, `healthcare/__tests__/doctorProximity.test.js`, `shopping/__tests__/outletsNearby.test.js`.
- App: `providersSlice.test.ts`.

**Demo:**
1. Pin an address in DHA.
2. Open Electricians: providers are ranked by match, with distances; tap **Sort → Nearest**.
3. Turn on **Available now**: offline providers disappear.
4. Switch to the map.

### 3.2 Vendor listing management (row 6)

**Built:**

- **Vendor:**
  - publish / unpublish (`isActive`);
  - status pills (Live / Hidden / In review / Needs changes / Removed) on `BrandProductsScreen`;
  - content edits re-enter review when the admin turns auto-approve off;
  - 3D model upload for AR ([§3.7](#37-ar--bluetooth--nfc-row-16)).
- **Admin:**
  - moderation queue `screens/admin/Shopping/ProductModeration/ProductModerationScreen.tsx` (`GET /api/shopping/admin/products`, `PATCH …/:id/moderation` with a required note to reject or remove; pushes the vendor);
  - `autoApproveProducts` setting.
- **Customers** only ever see products that are published, not held by moderation, and from an active brand. They also get a **minimum rating** filter.

**Tests:** `shopping/__tests__/moderation.test.js`, `model3d.test.js`, `catalog.test.js`.

**Demo:**
1. The vendor unpublishes a product: it vanishes from the store.
2. The admin turns auto-approve off, and the vendor edits a product: it goes "In review".
3. The admin approves it: the vendor gets a push.

### 3.3 Cloud storage (row 14)

**Built:**

- **Signed direct uploads:** `POST /api/uploads/sign` with purpose `avatar | dispute_evidence | health_record | product_image | product_model3d`.
  - Each signature is confined to `metromatrix/<purpose>/<account>/`.
  - The API re-checks every returned URL (`src/utils/assetUrl.js`), so `file://` paths and other people's uploads are refused.
- **Fixed upload bugs:**
  - dispute photos were saved as `file://` strings;
  - the profile camera button did nothing;
  - the Home Services avatar stored the client URI.
- **Added:**
  - provider and doctor photos are editable;
  - health records gain a **medications** category.

**Code:** app `services/uploads/cloudinaryUpload.ts`, `screens/user/healthcare/upload-record/uploadRecord.tsx`, `RaiseDisputeScreen.tsx`, `UserProfileScreen.tsx`.

**Tests:** API `src/utils/__tests__/assetUrl.test.js`; app `cloudinaryUpload.test.ts`.

### 3.4 Push notifications (rows 4 and 15)

**Built:** the API posts to the realtime service (`POST /api/internal/push`), which sends via Expo Push → FCM HTTP v1. Push types are allow-listed. Pushes collapse per booking, appointment or order. Time-bound ones expire.

**Home Services**, who gets a push for each event:

| Event | Customer | Provider |
|---|---|---|
| New request | — | ✓ |
| Accepted / rejected | ✓ | — |
| On the way | ✓ | — |
| ~5 minutes away (once per trip) | ✓ | — |
| Arrived | ✓ | — |
| Work started | ✓ | — |
| Completed by the provider | ✓ | — |
| Completed (confirmed) by the customer | — | ✓ |
| Cancelled by the customer | — | ✓ |
| Cancelled by the provider | ✓ | — |
| Cancelled by the system (a rival provider accepted) | ✓ | ✓ |
| Expired | ✓ | ✓ |
| Cancelled by an admin | ✓ | ✓ |
| Payment requested | ✓ | — |
| Paid (wallet) | — | ✓ |
| Cash confirmed | ✓ | — |
| Cash selected | — | ✓ |
| Reminder 1 h before | ✓ | ✓ |
| New review | — | ✓ |
| Identity verified at the door | — | ✓ |

**Healthcare** pushes every appointment notice: booked, confirmed, cancelled, rescheduled, completed, reminder 1 h before, video starting in 5 min, prescription ready.

**Shopping** pushes:
- to the customer: confirmed, shipped, out for delivery, delivered, cancelled, refunded;
- to the vendor: new order, return requested, product moderated.

**Scheduler:** time-driven pushes run on `POST /api/internal/scheduler/tick`. The realtime dyno calls it every 5 min, and a GitHub Actions watchdog every 15 min. Each reminder is claimed atomically, so overlapping ticks never double-send.

**App:** tapping a push opens the right screen (`services/push/pushNotifications.ts`, `useNotificationRouting.ts`). Shopping gets a notification inbox (`ShoppingNotificationsScreen`).

**Tests:**
- API: `homeservice/__tests__/pushMatrix.test.js`, `nearby.test.js` (once-only under concurrency), `healthcare/__tests__/reminders.test.js` (exactly once), `shopping/__tests__/orderNotifications.test.js`.
- Realtime: `test/routes.test.js`, `test/nearby.test.js`, `test/scheduler.test.js`.
- App: `routeFromNotification.test.ts`.

**Demo:** use two phones on a preview build and walk a booking from request to review; each step arrives as a push.

### 3.5 AI/ML service, recommendations, NLP search, forecasting (rows 7, 8, 9)

**Python batch** (`MetroMatrix-Backend/ml/`). It runs nightly through `.github/workflows/ml-nightly.yml` at 03:00 PKT, and also on demand. It writes only `ml_*` collections, which a write guard enforces.

- **Demand forecasting** (`mm_ml/forecasting.py`, `jobs/forecast_demand.py`):
  - per module × category × day, 14-day horizon;
  - Holt-Winters (weekly), seasonal-naive or mean, picked by a MASE backtest;
  - stores WAPE, MASE and sMAPE, plus 80% bands.
- **Matching model** (`mm_ml/matching.py`, `jobs/train_matching.py`):
  - an MLP trained on logged impressions → bookings;
  - exported by hand to a TF.js LayersModel, with parity fixtures;
  - registered with holdout AUC against the heuristic's AUC;
  - models trained on simulated data are labelled `synthetic` and never activated automatically.
- **Recommendations** (`mm_ml/recs.py`, `jobs/recommend.py`):
  - shopping: item-item collaborative filtering on orders, wishlist, cart and views (time-decayed), blended with TF-IDF content similarity; evaluated by leave-last-out hit-rate@10 against popularity;
  - doctors by specialty affinity;
  - Home Services trades by booking history.

**Node serving** (`src/modules/ml/`):

- **TF.js runtime:** `@tensorflow/tfjs-core`, `-layers` and `-backend-cpu`, pinned at 4.22.0 and about 3 MB of pure JS (`services/tfRuntime.js`, `modelStore.js`, `rankingService.js`). Modes are heuristic, shadow, blend and model. Admins manage models in the Models tab of the analytics screen.
- **Recommendations** (`services/recsService.js`):
  - `GET /api/recommendations/shopping`, `…/shopping/trending` and `…/shopping/similar/:id` (scoped to the storefront the shopper is in);
  - `GET /api/recommendations/homeservice` ("book again" + top matches in the trades they book, through the search pipeline);
  - `GET /api/recommendations/healthcare` (doctors with a reason and distance);
  - every item is re-checked against today's visibility, and items the shopper already bought are not offered back.
- **NLP product search:** `GET /api/shopping/products?q=` (`services/queryUnderstanding.js`).
  - Rules handle price ("under 5k", "1,500–4,000"), colours, gender (incl. Roman-Urdu: *laal*, *larkiyon*), brands and category synonyms.
  - Gemini is the fallback for long free text. It uses the same `GEMINI_API_KEY` as the symptom checker, and its output is validated field by field.
  - A weighted `$text` index ranks results.
  - The response carries `interpretedAs`; the app shows removable chips (`ignore=`).
- **"Describe the problem":** `GET /api/search/services?q=` (`services/serviceIntent.js`). For example, "AC dripping, need someone today" → AC technicians, available now.

**App:**
- Shopping home: "Recommended for you" + real "Trending" (best sellers; labelled "Featured" until there are sales).
- Product page: "You may also like".
- Search: "We understood:" chips.
- Home Services home: "Describe the problem" box + recommended providers.
- Healthcare home: recommended doctors.
- Interaction events go to `POST /api/events` (`services/analytics/track.ts`).

**Tests:**
- Python (`ml/tests`, 23): `test_forecasting`, `test_matching`, `test_recs`, `test_series_and_guard`, `test_forecast_job_db`.
- API: `ml/__tests__/matching.test.js` (TF.js parity), `searchRerank.integration.test.js`, `queryUnderstanding.test.js`, `serviceIntent.test.js`, `recs.integration.test.js`, `events.test.js`, `shopping/__tests__/nlqSearch.integration.test.js`.
- App: `interpretationChips.test.ts`, `productSearchSlice.test.ts`, `providerMeta.test.ts`.

**Demo:**
1. Search "red shoes under 3000": only red shoes ≤ PKR 3,000, with chips. Remove the price chip.
2. On the Home Services home, type "pankha nahi chal raha abhi" (Urdu: "the fan isn't working, now"): you get electricians, available now.

### 3.6 Analytics, API gateway, Redis (rows 10, 11, 12)

**Analytics** (`src/modules/analytics/`). The app screen is `screens/admin/analytics/PlatformAnalyticsScreen.tsx`.

| Endpoint | What it returns | App |
|---|---|---|
| `GET /api/admin/platform/realtime` | Providers online now, active bookings by status, appointments in the next 2 h, orders today, live sockets (from the realtime service's `/api/internal/stats`), requests per minute and error rate (Redis counters) | **Live** tab, refreshes every 15 s |
| `GET /api/admin/platform/demand` | Forecast vs. actuals, with the model's accuracy | **Demand** tab |
| `GET /api/admin/platform/performance` | Provider, doctor and vendor leaderboards: completion, on-time, Bayesian rating, cancellations, revenue | **Leaders** tab |
| `GET /api/insights/demand/mine` | Next 7 days for the signed-in provider, doctor or vendor | "Expected demand" card on their dashboards (`components/ui/DemandCard.tsx`) |

Admins also get a **Models** tab. The old hard-coded admin Home Services dashboard and analytics tabs were removed in favour of real data. Charts follow one-axis, legend and table-view rules.

**API gateway** (`src/gateway/`):
- `requestContext.js`: `X-Request-Id` in and out;
- `accessLog.js`: JSON log line and per-minute metrics;
- `security.js`: CORS, helmet, sanitising;
- `rateLimit.js`: account- or IP-keyed limits shared across serverless instances through Redis, with in-memory fallback; extra budgets for auth, NLP search and upload signing;
- `internalAuth.js`: server-to-server key;
- `registry.js`: one table mounting every module in order;
- JWT: `protect` / role guards per router.

**Redis** (`src/lib/redis.js`, `cache.js`). Upstash over HTTP, so it works on serverless.
- **Cached:**
  - provider-search pages: 30 s per ~1 km cell (this carries "available now");
  - settings;
  - recommendations: 10 min;
  - parsed NLP queries: 24 h;
  - rate-limit counters;
  - request and error metrics;
  - the active-user sets behind the live dashboard (`rt:active:<role>`).
- **Behaviour:** fail-open, with a 150 ms budget, a circuit breaker and versioned namespaces for one-call invalidation.
- **Never cached:** money. `noCacheInMoneyPaths.test.js` enforces this.

**Tests:** `gateway/__tests__/rateLimit.test.js`, `requestContext.test.js`, `registry.test.js` (route order unchanged); `lib/__tests__/cache.test.js`, `noCacheInMoneyPaths.test.js`; `analytics/__tests__/analytics.test.js`; app `components/ui/charts/__tests__/geometry.test.ts`.

### 3.7 AR / Bluetooth / NFC (row 16)

Android-first. These features need a new app build ([§4](#4-what-needs-a-person-deploy-and-device-steps)). Older builds degrade gracefully instead of crashing (guarded native loading, as already done for MapLibre).

**AR: "View in your room" (Shopping)**
- The vendor attaches a `.glb` (and optionally a `.usdz`) in the product form. The upload goes direct to Cloudinary.
- `PATCH /api/shopping/vendor/products/:id/model3d` checks:
  - it is the vendor's own upload;
  - the file's first bytes (ranged request): glTF 2.0 binary ≤ 10 MB, or a USDZ/ZIP.
- The product page shows **View in your room**:
  - Android opens Google Scene Viewer (AR with ARCore, otherwise 3D);
  - iPhone opens AR Quick Look;
  - anything else gets a web 3D viewer.
- Code: `src/modules/shopping/services/model3dService.js`; app `utils/shopping/arLauncher.ts`, `screens/Shopping/Brand/ProductForm/Model3dSection.tsx`.
- Tests: `shopping/__tests__/model3d.test.js`; app `arLauncher.test.ts`.

**Bluetooth: vital signs (Healthcare)**
- Standard Bluetooth SIG monitors, no vendor SDKs:
  - heart rate: service 0x180D, measurement 0x2A37;
  - blood pressure: service 0x1810, measurement 0x2A35 (IEEE-11073 SFLOAT, kPa → mmHg).
- Patients scan, connect, see the live reading and save it (Vitals quick action → Connect a monitor), or type a reading.
- The treating doctor sees the readings in the appointment detail.
- API:
  - `GET/POST/DELETE /api/v1/healthcare/vitals`: batch with per-reading validation and idempotent `clientId`;
  - `GET /api/v1/healthcare/doctors/me/patients/:id/vitals`: treating doctor only.
- Code: app `utils/healthcare/bleParsers.ts`, `services/ble/bleVitals.ts`, `screens/user/healthcare/vitals/*`, `components/Healthcare/doctor/PatientVitalsCard.tsx`.
- Tests: app `bleParsers.test.ts` (spec byte vectors: 8/16-bit HR, contact, energy, RR intervals, kPa, timestamps, special values); API `healthcare/__tests__/vitals.test.js`.
- Demo without hardware: the nRF Connect app's heart-rate peripheral simulator.

**NFC: doorstep identity check (Home Services)**
- **The proof:** when en route or at the door, the provider's app gets a **10-minute, single-use, HMAC-signed, booking-bound** proof (`POST /api/provider/jobs/:id/identity-token`). It is shown as:
  - a **QR code**;
  - a **6-digit code**, which allows 5 wrong guesses and then dies;
  - an **NFC badge**: written to any NTAG213+ sticker; the token is short enough for the smallest one.
- **The check:** the customer taps the badge, scans the QR or types the code (`POST /api/bookings/:id/verify-identity`).
  - An `EN_ROUTE` booking becomes `ARRIVED`.
  - The provider is told.
  - Only the newest token counts, and never for another job.
- **Opening the app from outside:** tapping the badge, or scanning the QR with the phone's camera app, opens the verify screen (`metromatrix://verify?…`, Android NDEF intent filter).
- Code: API `src/modules/homeservice/services/identityService.js`, `controllers/identityController.js`; app `services/nfc/nfcBadge.ts`, `screens/providers/homeservice/show-id/ShowIdScreen.tsx`, `screens/user/homeservice/verify-provider/VerifyProviderScreen.tsx`.
- Tests: API `homeservice/__tests__/identity.test.js` (forgery, expiry, replacement, single use, code lockout, wrong party); app `identityLink.test.ts`; realtime `test/routes.test.js`.

---

## 4. What needs a person (deploy and device steps)

Nothing below has been run. Each step changes shared infrastructure, so it is the team's call.

1. **Backend (Vercel):**
   - merge to `main`;
   - add env vars `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `REDIS_ENV=prod`, `NFC_TOKEN_SECRET` (`openssl rand -hex 32`), and optionally `GEMINI_MODEL` (`GEMINI_API_KEY` already exists);
   - then `vercel redeploy`.
2. **Database, once, against production:**
   - `node scripts/geo-hygiene.js` (dry run; read the report), then `--apply`;
   - `node scripts/sync-indexes.js --dry`, then for real. This also swaps the product text index.
3. **Realtime (Heroku):**
   - set `MAIN_API_URL` and `SCHEDULER_ENABLED=true`;
   - `git push heroku main`. The new `identity_verified` event and push type live there.
4. **GitHub Actions secrets:**
   - `ML_MONGODB_URI`: a user that can only write `ml_*`;
   - `API_URL`;
   - `INTERNAL_API_KEY`.
   - Then run **ml-nightly** once by hand.
5. **App:**
   - one **EAS rebuild**: development client + `preview` APK, because BLE, NFC and the camera are new native modules;
   - social login on the preview APK still needs the EAS keystore SHA-1 registered.
6. **Device QA:**
   - two phones for the push matrix and the identity check;
   - an NFC sticker (NTAG213/215);
   - the nRF Connect heart-rate simulator or a real strap;
   - an ARCore phone for Scene Viewer.

## 5. Test evidence (2026-10-02)

| Repo | Command | Result |
|---|---|---|
| API | `MONGO_TEST_URI=mongodb://127.0.0.1:27099/x node node_modules/jest/bin/jest.js --runInBand src/modules src/gateway src/lib src/utils` | 63 suites, 721 tests, all passing (integration suites against a throwaway MongoDB 7) |
| ML | `cd ml && python -m pytest -q tests` (with `MONGO_TEST_URI`) | 23 passed |
| Realtime | `npm test` | 8 passed |
| App | `npm test` | 15 suites, 216 tests passing |
| App | `npx tsc --noEmit` | clean |
| App | `./scripts/design-gates.sh` | all gates pass |
| End to end | Python `recommend` job → MongoDB → Node `recsService` | personal recommendations with "Because you liked …"; "Bought together" neighbours; registry metrics recorded |
