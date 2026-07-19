# HEALTHCARE_MISSING_ENDPOINTS.md

Dummy branches whose real endpoint does not exist (from the H0 audit + H4 cutover).
Everything not listed here is now served by the real backend.

| Frontend function | Wanted endpoint | Status | Behaviour with flag off |
|---|---|---|---|
| `providerApi.applyCouponApi` | `POST /api/v1/healthcare/coupons/validate` | Backend route exists but is **unmounted** (`routes/index.js` excludes couponRoutes: "telemedicine/payment excluded"). H1 added admin guards so it is safe to mount later if coupons are wanted. | Returns a typed `{ isValid: false, message: 'Coupons are not available' }` — no silent dummy fallback |
| `appointmentApi.startVideoCallApi` | `POST /api/v1/healthcare/video-calls/join/:appointmentId` | Backend routes exist but **unmounted**, and no WebRTC transport exists in the app. Resolved by the H6 decision (descope — see TELEMEDICINE_DECISION.md). | Returns a typed not-available error; video entry points hidden behind `FEATURE_TELEMEDICINE=false` |

Everything else (48 of 49 branches): the real call was already implemented beneath the dummy branch with serializers — the cutover was the flag flip in `networks/healthcare/config.ts` plus fallout fixes recorded in HEALTHCARE_E2E.md.
