# TELEMEDICINE_DECISION.md

Decision requested by H6; direction given: **implement for FYP-II scope now — BUILD both features.**

## 1. Telemedicine (video consultations)

### Option A — BUILD (chosen)

Transport options for an Expo **managed** workflow:

| Transport | Feasibility | Cost | Verdict |
|---|---|---|---|
| `react-native-webrtc` | Needs a config plugin + **expo-dev-client** (custom native build); does not run in Expo Go | free | rejected — breaks the current build workflow |
| Agora / Twilio Video SDKs | Same native-module problem + account/keys; Twilio Video is being sunset | free tier limited | rejected |
| **Jitsi Meet in a WebView** | `react-native-webview@13.15` is already a dependency (used by TopUpWebView). Public `meet.jit.si` rooms need no account, no key, no native modules. Camera/mic granted via WebView media-capture permissions | free | **chosen** |

Design implemented:
- Backend `videoCallRoutes` **mounted** (was written but switched off) with participant checks fixed so the **owning doctor can join too** (previously patient-only). `POST /video-calls/join/:appointmentId` creates/returns the `VideoCall` record and a `roomUrl` of the form `https://meet.jit.si/MetroMatrix-<appointmentId>` — the appointment id is unguessable enough for FYP scope, and only participants can obtain the URL through the API.
- Patient side: existing `VideoCall` screen now renders the Jitsi room in a WebView once the join endpoint responds.
- Doctor side: new `DoctorVideoConsultation` screen (the missing half — a call could never connect before) joins the same room.
- Call lifecycle (`waiting → active → ended`) tracked via the existing `VideoCall` model; `end` endpoint records duration.

Honest limits (also stated in the report): media quality/TURN relies on the public Jitsi infrastructure; no in-call recording; WebView camera permissions vary by Android WebView version — tested paths documented in HEALTHCARE_E2E.md.

### Option B — descope (not taken)
Would have hidden the three video screens behind `FEATURE_TELEMEDICINE=false` with a "Coming in FYP-II" state. Rejected per direction to ship FYP-II scope now.

## 2. AI symptom checker (TC-19)

**BUILD (chosen)** with a two-tier design so it is demoable with zero budget:

- `POST /api/v1/healthcare/symptom-checker { symptoms }` (authenticated patient).
- **Tier 1 — LLM** (when `GEMINI_API_KEY` is set): strict-JSON prompt returns up to 3 possible condition areas with confidence percentages and a specialist recommendation. The model is instructed it is *not* diagnosing.
- **Tier 2 — deterministic fallback** (no key, or the call fails/times out): a curated keyword→specialty mapping produces the same response shape, defaulting to "General Physician".
- Constraints enforced server-side regardless of tier: never states a diagnosis (phrasing is "possible areas to discuss with a doctor"), **always** returns the medical disclaimer, and `recommendedSpecialty` is matched against the live `Specialty` collection so the UI can deep-link straight to real doctors.
- Frontend: new `SymptomChecker` patient screen → results with disclaimer → "Find a <specialty> doctor" button into the existing DoctorList.

Cost: PKR 0 (fallback tier) / Gemini free tier when a key is provided.
