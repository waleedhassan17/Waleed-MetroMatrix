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
  const s = await getSocket();
  if (!s) return { success: false, message: 'Socket unavailable' };
  // `bookingId` is sent alongside `roomId` because the server accepts either.
  const payload = { roomId, bookingId: roomId, roomType };
  if (s.connected) return ackEmit(s, 'join_booking', payload);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ success: false, message: 'join timeout' }), 10000);
    s.once('connect', async () => {
      clearTimeout(timer);
      resolve(await ackEmit(s, 'join_booking', payload));
    });
  });
}

export async function leaveBooking(roomId: string) {
  const s = await getSocket();
  s?.emit('leave_booking', { roomId, bookingId: roomId });
}

export async function emitEvent(
  event: string,
  payload: Record<string, any>
): Promise<SocketAck> {
  const s = await getSocket();
  if (!s || !s.connected) return { success: false, message: 'Socket unavailable' };
  return ackEmit(s, event, payload);
}
