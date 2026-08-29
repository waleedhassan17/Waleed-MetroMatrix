# Chat & Call — production hardening

Branch `feat/chat-call-production`, across all three repos.

## What this was not

The remediation brief this work started from assumed chat and calling were
barely built — that calls opened the native dialer, that there was no WebRTC, no
TURN, no room authorization, no push. None of that was still true. `main`
already had real peer-to-peer media, server-minted Cloudflare TURN credentials,
DB-backed room membership with the Doctor→Provider identity hop, Expo push, and
a unified Chat/Call screen pair.

So this is a set of targeted repairs, not a rebuild. Each bug turned out to have
a narrow, specific cause; one was already fixed and needed only verification.
Working code was left alone.

Deliberately **not** done, because it would have duplicated working
infrastructure: a TURN endpoint on Vercel (one exists on Heroku, correctly
holding the Cloudflare token server-side), a `/bookings/:id/participants`
endpoint (the realtime service reads the shared Mongo directly), an
`auth`/`auth:ok` round-trip (handshake auth already gates the connection; a
second round-trip would slow the first call, not fix it), and an app-level
heartbeat (Socket.IO's engine ping already covers the detection window).

---

## Phase 1 — Presence on the realtime service (BUG-04)

**Root cause.** Nothing on the server tracked whether a user had a live socket.
With no server truth to render, the chat header fell back to
`connected ? 'online' : …` — the *viewer's own* socket state, which answers a
different question and is essentially always true. A provider could force-close
their app and the customer went on being told they were online indefinitely.

**Fix.** New `services/presence.js`: `Map<userId, Set<socketId>>` maintained from
the authenticated connect and disconnect handlers, with transition-only
broadcasts so a second device or an overlapping reconnect never flaps someone
offline. No application heartbeat — Socket.IO's engine ping (25s/20s) already
reaps a dead device in ~45s. `presence_get` is scoped to a room rather than
taking user ids, so `resolveRoom`'s existing authorization covers it and it
cannot be used to probe arbitrary users.

**Files.** `metromatrix-realtime`: `src/services/presence.js` (new),
`src/sockets/index.js`, `src/utils/access.js` (lifted `counterpartOf`/`selfOf`),
`server.js`.

## Phase 2 — Calling vs Ringing, and unavailable (BUG-03)

**Root cause.** Two halves. The server's `call_ring` checked `isBusy` but never
reachability, so a ring went into an empty personal room. The client set
`phase='ringing'` the instant the user pressed call — a guess, wrong exactly
when it mattered. Together: 30 seconds of "Ringing…" then "No answer", for a
device that never rang.

**Fix.** The server checks presence before ringing and returns
`call_unavailable` with a new `CallLog` status `unavailable`, kept distinct from
`missed` because "nobody picked up" and "it never rang" are different facts. The
push still fires — offline means backgrounded, not unreachable. A new
`call_ringing` ack, accepted only from the callee, is emitted when their device
actually presents the call; that is the only thing that advances the caller from
"Calling…" to "Ringing…".

**Files.** `metromatrix-realtime`: `src/sockets/callHandler.js`,
`src/models/CallLog.js`. App: `services/call/useCallSession.ts`,
`components/call/OutgoingCallView.tsx`, `components/call/IncomingCallProvider.tsx`.

## Phase 3 — Socket readiness (BUG-01, BUG-06)

**Root cause.** `getSocket()` returns as soon as the socket *object* exists, but
connecting takes a handshake. `emitEvent` found `connected === false` and gave
up, so the first action after a cold start failed and the identical retry
worked — which is why restarting the app appeared to fix it. `joinBooking` had
already solved this correctly with `once('connect')`; nothing else had.

**Fix.** `whenReady()` generalises that pattern; `emitEvent` and `joinBooking`
both wait for the handshake. A genuine timeout returns a typed
`reason: 'offline'` with "Reconnecting…" — the raw string "Socket unavailable"
no longer reaches a user. `ring()` also joins the room before asking to ring, so
`call_accept` and the WebRTC frames cannot arrive before we are in the room.

Also removed two fabricated-id fallbacks (`BK-${Date.now()}`, `b${Date.now()}`)
that stood in when a booking response lacked an id. That id addresses nothing,
and since chat and calling key their room off it, the failure surfaced much
later and somewhere else as "Not a participant".

**Files.** `services/socket/socketClient.ts`, `services/call/useCallSession.ts`,
`serializers/serviceProviders/bookingSerializer.ts`,
`screens/user/homeservice/tabs/booking-screen/bookingSlice.ts`.

## Phase 4 — Call-screen navigation (BUG-05)

**Root cause.** Not a stack reset — there are none in any chat or call screen. A
terminal phase scheduled an unconditional `goBack()` on a 1800ms timer, and the
Close button called `goBack()` too. Pressing Close inside that window, the
natural thing to do, popped **two** screens and landed the user one level above
where they started.

**Fix.** The timer is owned and cancelled on unmount and on Close; both exits go
through one guarded path, so the screen pops exactly one entry however it is
dismissed.

**Files.** `components/call/OutgoingCallView.tsx`.

## Phase 5 — Provider parity and the inbox (BUG-07)

**Root cause.** Chat was reachable only by drilling into a specific booking, so
neither side had a screen that would ever show a message had arrived. The
provider Jobs tab had Phone and Message buttons with no `onPress` at all. Three
booking-context screens still handed off to the phone's dialer and SMS while
job-detail had already moved in-app.

**Fix.** New `GET /api/conversations` on the realtime service (which owns chat,
the read state, and the authorization rules) returning every reachable room
across both verticals, with last message and unread count from a single
aggregation. One `ConversationsScreen` serves both roles. Entry points on the
provider dashboard, the doctor's quick actions, and the customer's profile. The
Jobs-tab buttons now work, and provider job-in-progress, provider map, and
customer live-tracking route through the booking room.

Emergency numbers, clinic landlines, a doctor's listed phone and the support
hotline keep the real dialer — there is no WebRTC peer on the other end of any
of them.

Also fixed: the incoming-call listener bound once on mount and never retried, so
anyone who signed in after mount had no ring listener until an app restart.

**Files.** `metromatrix-realtime`: `src/controllers/conversationsController.js`
(new), `src/routes/index.js`. App: `screens/shared/communication/ConversationsScreen.tsx`
(new), `networks/realtime/conversationsNetwork.ts` (new), `navigation-maps/Base.tsx`,
provider/doctor/user entry-point screens.

## Phase 6 — Presence in the chat header (BUG-04, app half)

`useRoomSocket` now tracks the counterpart's presence, filtered against the known
counterpart id so a second device signed into the same account cannot show a user
their own presence as the other person's. The header renders online / "last seen
…" / offline, coarsened to the minute — this is a courtesy signal, not a reason
to report someone's exact activity time. The self-connection banner stays,
answering the separate question of whether your messages are sending.

**Files.** `hooks/useRoomSocket.ts`, `components/chat/ChatThread.tsx`.

## Phase 7 — Cleanup

- Deleted dead `serializers/serviceProviders/chatSerializer.ts` (imported
  nowhere; its `phoneNumber` field was commented "the call screen dials this").
- Corrected comments that contradicted the code: `config/env.ts` claimed
  telemedicine was Jitsi-in-a-WebView; `jobDetail.tsx` claimed the native dialer
  still placed calls; `callService.js` asserted there was no WebRTC.
- Fixed a REST fallback in the provider map screen that matched `ack.message`
  against `/unavailable/i` — coupling a fallback to human-facing copy, which
  broke silently the moment that copy changed. It matches the typed reason now.
- `metromatrix-realtime`: documented the three TURN vars in `.env.example`;
  refreshed `README.md`, whose event tables predated WebRTC and whose calling
  section still described the dialer handoff.
- `MetroMatrix-Backend`: `src/config/passport.js` used
  `process.env.JWT_SECRET || 'missing-jwt-secret'` — a literal committed to a
  public repo, so an unset `JWT_SECRET` meant the strategy would verify tokens
  anyone could forge. Now a random per-process key, which keeps `require()` safe
  (the reason the fallback existed) while making every token fail instead.

---

## BUG-02, for the record

Already fixed in commit `339d5d0`, before this work. `ChatThread` uses
`useSafeAreaInsets` with `paddingBottom: Math.max(insets.bottom, 8) + 6` and a
`KeyboardAvoidingView`. Left alone; needs on-device confirmation only.

## Known follow-ups

- **CallKit / ConnectionService** for true background VoIP ringing. Today a
  closed app is woken by a high-priority push that opens the in-app incoming-call
  screen, which is sufficient but is not a system ring.
- **Redis adapter before a second Heroku dyno.** Presence, the busy map and the
  rate limiter are all per-process. At 2+ dynos a user connected to another dyno
  reads as offline here, which would wrongly fail their calls as `unavailable` —
  strictly worse than the current single-dyno constraint. Move all three together.
- **Rotate the Cloudflare TURN token** (`heroku config:set CF_TURN_API_TOKEN=… -a
  metromatrix-realtime`); the live one was pasted into a chat transcript.
- `lastSeen` does not survive a dyno restart; it is in-memory by design.
- Group calls, and video for home services, are unbuilt.

---

# Round 2 — device testing findings

Three problems surfaced on real devices after round 1 shipped.

## A user could not call a provider (and the socket died after 4 minutes)

**Root cause, from production logs — not what the symptom suggested.** The
server rang the provider, the provider's socket was connected and in its
personal room, and the provider's *app* never presented the call: no
`call_ringing` ack, timing out as `missed` after exactly 30s. Every
provider→user ring acked in half a second. Outgoing calls never touch
`IncomingCallProvider`, which is why the failure looked one-directional.

The cause was a gate added in round 1: the ring listener early-returned on
`sessionKey = currentUser?.id || currentProvider?.id`. That identity was
unreliable twice over — `getUserProfile` returns an explicit `{ id: user._id }`
while `getProviderProfile` returned the raw document (whose `toJSON` is
`toObject()` without virtuals, so `_id` and no `id`), and the app was calling
`/user/me` and `/provider/me`, both **404 in production**. So `fetchMe` always
rejected and identity existed only after a fresh in-session login.

Fixed at every level: the listener now binds on the socket and retries, the
endpoints are corrected to `/users/profile` and `/providers/profile`, the store
normalises `_id`→`id`, and `getProviderProfile` returns `id`.

**Separately**, the same logs showed both sockets hitting `token expired —
disconnecting` and never reconnecting: `refreshSocketAuth()` replayed the same
expired token. Now renews through the axios layer's single-flight refresh
(rotating the refresh token twice concurrently would log the user out).

*Verified on production: both directions ring, ack, and connect.*

## Calls never rang; notifications were unreliable

- **No audio library was installed at all.** Added `expo-audio` and a generated
  ringtone (440/480 Hz pair — one sine reads as an alarm, the pair as a
  telephone; 2s/3s cadence so looping sounds like a phone). `accept()` awaits
  the stop before WebRTC takes the mic, or the call starts on a route media
  playback already owns.
- **A backgrounded callee could never be rung.** The server treated "no socket"
  as `unavailable` and sent a past-tense "Missed call" — but no socket is
  exactly what a pocketed phone looks like. Now only a callee with neither a
  socket nor a push token is unavailable; everyone else gets a real ring push
  carrying `callId`.
- **Channels moved to `calls_v2`.** Android channels are immutable once created,
  so existing installs had `calls` frozen at the system blip. Client and server
  constants must move together or call pushes fall back to the quiet default.
- Notifee full-screen intent gives a lock-screen Accept/Decline when the app is
  alive but backgrounded.
- Chat pushes are gated on room membership — they previously fired over the
  conversation the recipient was reading.

## The provider had no notifications

Added a persisted `HSNotification` with a polymorphic recipient (User or
Provider `_id`), emitted from `bookingService.transition` — the single choke
point every status change passes through. One set of endpoints serves both roles
because `protect` resolves either and every query is scoped by `req.user._id`.

The dashboard bell had **no `onPress` at all**, and its badge was the count of
*pending bookings* under a notifications label — unclearable by definition. Both
fixed; the badge is now a real unread count.

## Still outstanding

- **`EXPO_ACCESS_TOKEN` is unset on the dyno.** Every push is still rejected
  with `InvalidCredentials`, so none of the notification work above is
  observable until `heroku config:set EXPO_ACCESS_TOKEN=<token>` is run.
- A **fully killed** app has no JS to raise the full-screen call UI; it gets the
  loud `calls_v2` heads-up notification instead. A true full-screen intent from
  a dead process needs a data-only FCM message and a native background handler —
  a push-transport change (Expo → `@react-native-firebase/messaging`), not a UI
  one.
- `calls_v2` means the old APK must be **uninstalled, not upgraded**, for a
  clean channel.
