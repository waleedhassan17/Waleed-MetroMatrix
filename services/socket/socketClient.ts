// ============================================================================
// Socket.io client singleton — REALTIME SERVICE (chat + call)
//
// Connects to the persistent realtime service on Heroku, NOT the main Vercel
// API. Vercel is serverless and cannot hold a WebSocket open, which is why the
// main backend's socket layer is dead in production and this service exists.
//
// The realtime service verifies the SAME JWT the main backend issued at login
// (they share JWT_SECRET), so the stored access token goes straight into
// handshake.auth.
//
// disconnectSocket() must be called on logout; refreshSocketAuth() after a
// token refresh — the server rejects an expired handshake and will actively
// disconnect a socket whose token has expired mid-session.
// ============================================================================

import { io, Socket } from 'socket.io-client';
import { REALTIME_BASE_URL } from '../../config/env';
import { getRealtimeToken } from '../../networks/realtime/realtimeClient';

const SOCKET_HOST = REALTIME_BASE_URL;

export type RoomType = 'homeservice' | 'healthcare';

let socket: Socket | null = null;
let connecting = false;

export async function getSocket(): Promise<Socket | null> {
  if (socket && socket.connected) return socket;
  if (connecting && socket) return socket;

  const token = await getRealtimeToken();
  if (!token) return null;

  connecting = true;
  if (socket) {
    socket.auth = { token };
    if (!socket.connected) socket.connect();
    connecting = false;
    return socket;
  }

  socket = io(SOCKET_HOST, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 10000,
  });

  socket.on('connect_error', (err) => {
    console.log('🔌 Socket connect error (REST fallback stays active):', err.message);
  });

  // The server sweeps sockets whose access token has expired and emits this
  // before disconnecting. Reconnect with a fresh token rather than letting the
  // socket sit dead for the rest of the session.
  socket.on('token_expired', () => {
    console.log('🔌 Socket token expired — reconnecting with a fresh token');
    refreshSocketAuth();
  });

  socket.on('server_shutdown', ({ reconnectInMs = 1000 } = {}) => {
    // The dyno is cycling. Back off deliberately instead of stampeding.
    setTimeout(() => socket?.connect(), reconnectInMs);
  });

  connecting = false;
  return socket;
}

/**
 * Is the socket live RIGHT NOW — synchronous, never opens a connection.
 *
 * Exists for callers that must decide something instantly and cannot await
 * getSocket(), which would connect as a side effect. The notification handler
 * is the motivating case: it has microseconds to decide whether to show an
 * incoming-call banner, and the answer depends on whether the in-app call
 * sheet is already going to appear.
 */
export function isSocketConnected(): boolean {
  return !!socket && socket.connected;
}

/** Call on logout — tears the connection down completely. */
export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

/**
 * Re-handshake with the current stored token.
 *
 * Call this from the token-refresh path. Without it a long session keeps the
 * handshake token it opened with, which the server eventually rejects — the
 * socket then stays down while REST calls carry on working, so chat silently
 * stops updating live.
 */
export async function refreshSocketAuth(newToken?: string): Promise<Socket | null> {
  const token = newToken || (await getRealtimeToken());
  if (!token) return null;
  if (!socket) return getSocket();

  socket.auth = { token };
  // A reconnect is required — auth is only read at handshake time.
  if (socket.connected) socket.disconnect();
  socket.connect();
  return socket;
}

// ---- typed helpers ----

export interface SocketAck {
  success: boolean;
  message?: string;
  data?: any;
  reason?: string;
  throttled?: boolean;
}

/**
 * Resolve once the socket is actually connected.
 *
 * THIS IS THE FIX FOR "Socket Unavailable" ON THE FIRST CALL AFTER LAUNCH.
 * getSocket() returns as soon as the socket OBJECT exists; connecting is
 * asynchronous and takes a handshake. Anything that emitted immediately after
 * awaiting it — which is every call and every message on a cold start — found
 * `connected === false` and gave up, so the very first action after launch
 * failed and the same action succeeded on the second try. Restarting the app
 * "fixed" it only because by then the socket had had time to come up.
 *
 * joinBooking already deferred on `once('connect')`; this generalises that so
 * every emit gets the same treatment rather than only the one that happened to
 * be written carefully.
 *
 * @returns true if the socket is connected, false if it did not come up in time.
 *   Deliberately does not throw — callers turn this into a retryable message,
 *   and an exception at this layer would have to be caught at every call site.
 */
export async function whenReady(timeoutMs = 8000): Promise<boolean> {
  const s = await getSocket();
  if (!s) return false;
  if (s.connected) return true;

  return new Promise((resolve) => {
    let settled = false;
    const done = (value: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      s.off('connect', onConnect);
      resolve(value);
    };
    const onConnect = () => done(true);
    const timer = setTimeout(() => done(false), timeoutMs);
    s.on('connect', onConnect);
  });
}

function ackEmit(s: Socket, event: string, payload: Record<string, any>): Promise<SocketAck> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve({ success: false, message: 'ack timeout' });
      }
    }, 8000);
    s.emit(event, payload, (ack: SocketAck) => {
      if (settled) return;
      clearTimeout(timer);
      settled = true;
      resolve(ack || { success: true });
    });
  });
}

export async function joinBooking(
  roomId: string,
  roomType: RoomType = 'homeservice'
): Promise<SocketAck> {
  const ready = await whenReady(10000);
  const s = await getSocket();
  if (!s || !ready) {
    return { success: false, reason: 'offline', message: 'Reconnecting…' };
  }
  // `bookingId` is sent alongside `roomId` because the server accepts either.
  return ackEmit(s, 'join_booking', { roomId, bookingId: roomId, roomType });
}

export async function leaveBooking(roomId: string) {
  const s = await getSocket();
  s?.emit('leave_booking', { roomId, bookingId: roomId });
}

export async function emitEvent(
  event: string,
  payload: Record<string, any>
): Promise<SocketAck> {
  // Wait for the handshake instead of failing the moment it hasn't finished.
  // The `reason` matters: callers distinguish "we never got on the network"
  // (retryable, show "Reconnecting…") from a real server refusal, and the raw
  // string "Socket unavailable" must never reach a user again. Callers that
  // branch on this MUST test `reason`, not the message text.
  const ready = await whenReady();
  const s = await getSocket();
  if (!s || !ready) {
    return { success: false, reason: 'offline', message: 'Reconnecting…' };
  }
  return ackEmit(s, event, payload);
}
