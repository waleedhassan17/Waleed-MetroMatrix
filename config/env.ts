// ============================================
// App Environment Config
// Single source for API hosts + feature flags.
// The base URL lives in networks/network/network.ts (API_URL) so the
// whole app — including shopping — talks to ONE backend host.
// ============================================

import { API_URL } from '../networks/network/network';

export const API_BASE_URL = API_URL;

// Shopping module mount point on the same host
export const SHOPPING_API_URL = `${API_BASE_URL}/shopping`;

// Offline demo fallback ONLY. When true, networks/shopping/* return the
// bundled Outfitters fixtures from dummyData.ts instead of hitting the API.
export const USE_SHOPPING_DUMMY_DATA = true;

// Telemedicine BUILT (see TELEMEDICINE_DECISION.md): Jitsi Meet rooms in a
// WebView on both patient and doctor sides, joined via /video-calls/join.
export const FEATURE_TELEMEDICINE = true;
