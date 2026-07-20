// ============================================
// Socket.io client singleton (HS7)
//
// Connects to the backend real-time layer (see backend SOCKET_API.md) with
// the stored JWT in handshake.auth, reconnects with backoff, and exposes
// typed on/emit helpers. disconnectSocket() must be called on logout;
// reconnectSocket() after a token refresh.
//
// NOTE: the production Vercel deployment is serverless and cannot hold
// WebSockets — every event has a REST fallback, so screens keep working via
// polling when the socket never connects.
// ============================================

import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../../config/env';
import { KeyForStorage, retrieveData } from '../../utils/storage_utils/storageUtils';

// Socket host = API host without the /api suffix
const SOCKET_HOST = API_BASE_URL.replace(/\/api\/?$/, '');

let socket: Socket | null = null;
let connecting = false;

export async function getSocket(): Promise<Socket | null> {
  if (socket && socket.connected) return socket;
  if (connecting && socket) return socket;

  const token = await retrieveData(KeyForStorage.accessToken);
  if (!token || typeof token !== 'string') return null;

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
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 10000,
  });

  socket.on('connect_error', (err) => {
    console.log('🔌 Socket connect error (REST fallback stays active):', err.message);
  });

  connecting = false;
  return socket;
}

/** Call on logout — tears the connection down completely. */
export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

/** Call after a token refresh — reconnects with the new token. */
export async function reconnectSocket() {
  disconnectSocket();
  return getSocket();
}

// ---- typed helpers ----

export interface SocketAck {
  success: boolean;
  message?: string;
  data?: any;
  throttled?: boolean;
}

export async function joinBooking(bookingId: string): Promise<SocketAck> {
  const s = await getSocket();
  if (!s) return { success: false, message: 'Socket unavailable' };
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) resolve({ success: false, message: 'join timeout' });
      settled = true;
    }, 5000);
    const emitJoin = () =>
      s.emit('join_booking', { bookingId }, (ack: SocketAck) => {
        if (!settled) {
          clearTimeout(timer);
          settled = true;
          resolve(ack || { success: true });
        }
      });
    if (s.connected) emitJoin();
    else s.once('connect', emitJoin);
  });
}

export async function leaveBooking(bookingId: string) {
  const s = await getSocket();
  s?.emit('leave_booking', { bookingId });
}

export async function emitEvent(event: string, payload: Record<string, any>): Promise<SocketAck> {
  const s = await getSocket();
  if (!s || !s.connected) return { success: false, message: 'Socket unavailable' };
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ success: false, message: 'ack timeout' }), 5000);
    s.emit(event, payload, (ack: SocketAck) => {
      clearTimeout(timer);
      resolve(ack || { success: true });
    });
  });
}
