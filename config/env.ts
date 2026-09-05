// ============================================
// App Environment Config
// Single source for API hosts + feature flags.
//
// THE APP NOW TARGETS TWO BACKENDS:
//
//   API_BASE_URL      (Vercel)  auth, users, providers, doctors, bookings,
//                               appointments, shopping, wallet, Stripe
//   REALTIME_BASE_URL (Heroku)  chat + call ONLY
//
// They are separate because Vercel is serverless and cannot hold a WebSocket
// open — the main backend's Socket.IO layer exists but is never initialised in
// its serverless entrypoint, so it is dead in production. The realtime service
// is a persistent dyno that owns chat and call signalling.
//
// The two backends never call each other. They stay consistent by sharing the
// same MongoDB database and the same JWT_SECRET, so a token minted by the main
// backend at login is accepted by the realtime service as-is.
//
// Both values fall back to their previous hardcoded literals, so a build with
// no env configured still runs.
// ============================================

import { API_URL } from '../networks/network/network';

export const API_BASE_URL = API_URL;

// Realtime service (chat + call). NOTE: no `/api` suffix here — the REST
// helper and the socket client each append what they need.
export const REALTIME_BASE_URL =
  process.env.EXPO_PUBLIC_REALTIME_URL ||
  'https://metromatrix-realtime-1d7dadda1082.herokuapp.com';

// Shopping module mount point on the main host
export const SHOPPING_API_URL = `${API_BASE_URL}/shopping`;

// NOTE: the USE_SHOPPING_DUMMY_DATA flag and the bundled dummyData.ts fixtures
// are gone. Every shopping screen now reads the API, banners and delivery tiers
// included — there is no offline fixture path left to fall back to.

// Home Services offline demo fallback ONLY (HS6). When true, the
// networks/serviceProviders/* modules return bundled fixtures instead of
// hitting the API. Must stay FALSE for the real backend flows.
export const USE_HOMESERVICE_DUMMY_DATA = false;

// Telemedicine BUILT. NOTE: no longer Jitsi-in-a-WebView, whatever
// TELEMEDICINE_DECISION.md still says — a consultation is a peer-to-peer WebRTC
// call on the same stack as every other call in the app (services/call/*),
// relayed through Cloudflare TURN when a direct path is impossible. The old
// /video-calls/* endpoints survive as bookkeeping only: they open and close the
// VideoCall record that billing and history read, and opening it is what
// publishes `video_call_started`. They no longer carry the media.
export const FEATURE_TELEMEDICINE = true;
