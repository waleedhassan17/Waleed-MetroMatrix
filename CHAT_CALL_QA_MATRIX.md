# Chat & Call — verification matrix

Status as of this branch.

**DEPLOYED.** Realtime is live on Heroku (v13, commit `9e7bbe9`) and the backend
auto-deployed to Vercel. The server-side halves of BUG-03 and BUG-04 are
verified against production — results below. The device matrix still needs two
physical phones on different networks.

## Before any of this

Deploy order matters, and getting it wrong fails **silently** — Heroku serves
stale code, Vercel serves stale env, and neither shows an error:

```bash
# 1. Realtime FIRST, so the new events exist before any app build can emit them.
cd ~/metromatrix-realtime
git push origin feat/chat-call-production
git push heroku feat/chat-call-production:main
heroku logs --tail -a metromatrix-realtime      # expect a clean boot

# 2. App build (react-native-webrtc will NOT run in Expo Go — dev build required)
cd ~/MetroMatrix/Waleed-MetroMatrix
eas build --platform android --profile preview

# 3. Backend only if you want the passport fix (auto-deploys on push to main).
```

## Automated pre-check (run this first)

Proves the server halves of BUG-03 and BUG-04 in seconds, so a broken deploy is
caught before a 20-minute build.

```bash
cd ~/metromatrix-realtime
JWT_SECRET=$(heroku config:get JWT_SECRET -a metromatrix-realtime) \
  npm run verify-realtime -- <realBookingId> <customerUserId> <providerUserId>
```

Asserts: both participants join; a fake room is refused cleanly; the counterpart
reads as online; a clean disconnect is seen within ~1s; an offline callee is
refused with `reason:'unavailable'` and never rung; and **no `call_ringing`
reaches the caller until the callee's device acknowledges** — that last one is
the whole of BUG-03 and no unit test can see it.

Note it creates CallLog rows in the production database.

Run against production on 2026-08-29 (release v13). CallLog rows created by the
call checks were deleted afterwards; no pre-existing data was touched.

| Check | Result | Notes |
|---|---|---|
| A and B join a real room | **PASS** | |
| Nonexistent room refused, no crash | **PASS** | ack `Not a participant` |
| `presence_get` returns counterpart online | **PASS** | correct counterpart id |
| Clean disconnect → `presence_update` offline | **PASS** | with `lastSeen`; **failed on v12** — see note |
| `presence_get` reports offline afterwards | **PASS** | |
| Back online after reconnect | **PASS** | |
| Offline callee → `reason:'unavailable'` | **PASS** | `call_unavailable` delivered to caller only |
| No `call_ringing` before the callee acks | **PASS** | the core BUG-03 assertion |
| `call_ringing` arrives after the ack | **PASS** | |

**The v12 failure is worth remembering.** The offline broadcast iterated
`socket.rooms` inside the `disconnect` handler — but Socket.IO clears rooms
*before* emitting `disconnect`, so it broadcast to an empty list and nobody was
ever told about a clean sign-out. Only a live two-socket test caught it;
`presence_get` passed throughout, so the feature looked fine. Fixed in `9e7bbe9`
by moving to `disconnecting`.

## Per-bug device matrix

Two physical devices, dev builds, **on different networks** so the TURN relay is
actually exercised (same-wifi passes on host candidates and proves nothing).

| Bug | Test | Pass criteria | Result |
|---|---|---|---|
| **BUG-01** | Cold-launch the app, immediately place the first call | State reads "Calling…"; the string "Socket Unavailable" never appears | |
| **BUG-02** | Open a chat, keyboard up, on a gesture-nav device and a 3-button-nav device | Composer and Send fully visible and tappable in all four combinations | |
| **BUG-03** | Provider force-closed, customer calls them | "Calling…" → "User unavailable". Must **never** show "Ringing…" | |
| **BUG-04** | Provider force-closes mid-chat | Customer's header shows offline / "last seen …" within ~45s; immediately on a clean sign-out | |
| **BUG-05** | All Electricians → provider → call → decline → **tap Close during the outcome message** | Lands on All Electricians, not Home Services. Tapping Close fast is the actual repro — waiting for the auto-dismiss always worked | |
| **BUG-06** | Fresh dev build on a second device, first-ever call | Connects; no "Not a participant"; no restart needed | |
| **BUG-07** | Provider opens Messages from the dashboard, starts a chat and a call, accepts an incoming call | All work, foreground and background | |
| **Media** | Accept a call with the two devices on different networks | Real in-app audio both ways; mute works; hangup tears down both sides; the native dialer never opens | |

## Regression checks (things this branch touched indirectly)

| Check | Why | Result |
|---|---|---|
| Provider location still reaches the customer's map when the socket drops | The REST fallback's trigger changed from a message-text match to `reason:'offline'` | |
| Creating a booking with a normal response still works | Booking creation now *fails* instead of inventing an id | |
| Chat history still loads for old messages | `chatSerializer.ts` was deleted as dead code — confirm nothing regressed | |
| Healthcare video consultation still connects | Shares `useCallSession`, which gained two new phases | |
| A user who signs in *after* app launch receives an incoming call | The ring listener now rebinds on session change | |

## BLOCKER: push notifications are dead in production

`EXPO_ACCESS_TOKEN` is **not set** on the Heroku dyno. Token *registration*
works (`[push] registered token for provider=…` appears in the logs), but every
*send* fails:

```
[push] ticket error: InvalidCredentials
```

Expo rejects the send because the project enforces push security and no access
token is presented. This is pre-existing and unrelated to this branch, but it
means:

- an offline callee is **never** woken — BUG-03's offline path stops at the
  caller's "User unavailable" and nothing reaches the callee;
- BUG-07's background incoming call cannot work;
- offline chat-message notifications never arrive.

Fix (no code change, takes effect immediately):

```bash
# expo.dev → Account Settings → Access Tokens → create
heroku config:set EXPO_ACCESS_TOKEN=<token> -a metromatrix-realtime
```

Then re-check with a real call to a backgrounded device and confirm the logs show
no `ticket error`. Until this is done, treat every "background" row in the device
matrix as expected-to-fail.

## Known gaps at hand-off

- Background ringing is a push notification that opens the in-app screen, not a
  system-level CallKit/ConnectionService ring.
- Presence, the busy map and the rate limiter are per-process — **single Heroku
  dyno only**. On two dynos a user on the other dyno reads as offline, which
  would wrongly fail their calls as "unavailable": worse than today.
- `lastSeen` resets on a dyno restart (in-memory by design); affected users show
  plain "Offline" with no time.
- The Cloudflare TURN token should be rotated before any public launch — the live
  one was pasted into a chat transcript.
