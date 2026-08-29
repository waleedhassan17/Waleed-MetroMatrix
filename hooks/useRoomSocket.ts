// ============================================================================
// useRoomSocket — joins a conversation room on mount, leaves on unmount.
//
// A "room" is polymorphic:
//   roomType 'homeservice' → roomId is an HSBooking  _id (user <-> provider)
//   roomType 'healthcare'  → roomId is an Appointment _id (patient <-> doctor)
//
// Both verticals use the SAME events and the same server code path, so every
// chat screen in the app can share this hook.
//
// REST history loading stays the responsibility of the screen (fetchChatData);
// this hook only handles the live layer.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import {
  getSocket,
  joinBooking,
  leaveBooking,
  emitEvent,
  RoomType,
} from '../services/socket/socketClient';
import { ChatMessage } from '../models/serviceProviders';
import { sendChatMessage } from '../networks/serviceProviders/chatNetwork';

export interface ProviderLocationUpdate {
  bookingId: string;
  latitude: number;
  longitude: number;
  heading: number | null;
  timestamp: string;
}

/**
 * Server-originated room events. These are published by the MAIN backend
 * through the realtime service's internal bridge — it holds no socket of its
 * own — so both verticals arrive over this one connection.
 */
export interface RoomStatusUpdate {
  /** HSBooking status (EN_ROUTE, ARRIVED, …) or Appointment status (confirmed, cancelled, …). */
  status: string;
  roomId: string;
  changedAt?: string;
  /** Healthcare reschedules reuse the status event. */
  rescheduled?: boolean;
  reason?: string;
}

export interface RoomPaymentUpdate {
  roomId: string;
  /** 'requested' (home services) or paid | refunded (healthcare). */
  status: string;
  amount?: number;
  refundAmount?: number;
}

export interface RoomVideoCallUpdate {
  roomId: string;
  phase: 'started' | 'ended';
  callId?: string;
  roomUrl?: string;
  duration?: number;
}

let clientMsgCounter = 0;
const nextClientMsgId = () =>
  `${Date.now().toString(36)}-${(clientMsgCounter++).toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

/** Server-reported presence of the other party in the room. */
export interface CounterpartPresence {
  userId: string;
  status: 'online' | 'offline';
  /** ISO timestamp, or null when unknown (or currently online). */
  lastSeen: string | null;
}

export function useRoomSocket(roomId?: string, roomType: RoomType = 'homeservice') {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [providerLocation, setProviderLocation] = useState<ProviderLocationUpdate | null>(null);
  const [bookingStatus, setBookingStatus] = useState<string | null>(null);
  const [roomStatus, setRoomStatus] = useState<RoomStatusUpdate | null>(null);
  const [payment, setPayment] = useState<RoomPaymentUpdate | null>(null);
  const [videoCall, setVideoCall] = useState<RoomVideoCallUpdate | null>(null);
  const [typing, setTyping] = useState(false);
  const [connected, setConnected] = useState(false);
  // The COUNTERPART's presence, from the server. Distinct from `connected`,
  // which is our own socket — see the note on the return value below.
  const [counterpartPresence, setCounterpartPresence] = useState<CounterpartPresence | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const counterpartIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!roomId) return;
    let mounted = true;
    // A different room means a different counterpart; carrying the previous
    // one's presence over would briefly label the new person with the old
    // person's status.
    counterpartIdRef.current = null;
    setCounterpartPresence(null);

    (async () => {
      const s = await getSocket();
      if (!s || !mounted) return;
      socketRef.current = s;

      const onConnect = () => {
        if (!mounted) return;
        setConnected(true);
        // Rooms are per-connection: a reconnect (dyno cycle, network flap,
        // token refresh) drops membership, so re-join every time.
        joinBooking(roomId, roomType);
      };
      const onDisconnect = () => mounted && setConnected(false);
      const onMessage = (m: ChatMessage) => {
        if (!mounted || !m?.id) return;
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      };
      const onLocation = (loc: ProviderLocationUpdate) => {
        if (mounted && loc.bookingId === roomId) setProviderLocation(loc);
      };
      // Home services. `bookingStatus` is kept as a bare string because
      // liveTracking already consumes it that way.
      const onStatus = (p: { bookingId?: string; roomId?: string; status: string; changedAt?: string }) => {
        if (!mounted || (p.roomId || p.bookingId) !== roomId) return;
        setBookingStatus(p.status);
        setRoomStatus({ status: p.status, roomId, changedAt: p.changedAt });
      };

      // Healthcare. The room is the appointment, so both the patient and the
      // doctor receive this over the room they already joined for chat.
      const onAppointmentStatus = (p: {
        appointmentId?: string;
        roomId?: string;
        status: string;
        changedAt?: string;
        rescheduled?: boolean;
        reason?: string;
      }) => {
        if (!mounted || (p.roomId || p.appointmentId) !== roomId) return;
        setRoomStatus({
          status: p.status,
          roomId,
          changedAt: p.changedAt,
          rescheduled: p.rescheduled,
          reason: p.reason,
        });
      };

      const onPaymentRequested = (p: { roomId?: string; bookingId?: string; amount?: number }) => {
        if (!mounted || (p.roomId || p.bookingId) !== roomId) return;
        setPayment({ roomId, status: 'requested', amount: p.amount });
      };

      const onPaymentStatus = (p: {
        roomId?: string;
        appointmentId?: string;
        status: string;
        refundAmount?: number;
      }) => {
        if (!mounted || (p.roomId || p.appointmentId) !== roomId) return;
        setPayment({ roomId, status: p.status, refundAmount: p.refundAmount });
      };

      const onVideoStarted = (p: { roomId?: string; callId?: string; roomUrl?: string }) => {
        if (!mounted || (p.roomId && p.roomId !== roomId)) return;
        setVideoCall({ roomId, phase: 'started', callId: p.callId, roomUrl: p.roomUrl });
      };

      const onVideoEnded = (p: { roomId?: string; callId?: string; duration?: number }) => {
        if (!mounted || (p.roomId && p.roomId !== roomId)) return;
        setVideoCall({ roomId, phase: 'ended', callId: p.callId, duration: p.duration });
      };
      const onTyping = (p: { bookingId?: string; roomId?: string; isTyping: boolean }) => {
        if (!mounted) return;
        if ((p.roomId || p.bookingId) !== roomId) return;
        setTyping(p.isTyping);
      };
      const onRead = () => {
        if (!mounted) return;
        setMessages((prev) => prev.map((m) => (m.sender === 'user' ? { ...m, status: 'read' } : m)));
      };

      s.on('connect', onConnect);
      s.on('disconnect', onDisconnect);
      s.on('new_message', onMessage);
      s.on('provider_location_update', onLocation);
      s.on('booking_status_changed', onStatus);
      s.on('appointment_status_changed', onAppointmentStatus);
      s.on('payment_requested', onPaymentRequested);
      s.on('payment_status_changed', onPaymentStatus);
      s.on('video_call_started', onVideoStarted);
      s.on('video_call_ended', onVideoEnded);
      // Presence of the OTHER party. The server sends this directly on join and
      // again on every transition, so the header tracks their real state rather
      // than inferring it from our own connection.
      //
      // Frames are filtered against the known counterpart id. A room broadcast
      // carries whichever user changed, and with two devices signed into the
      // same account that can be US — accepting it unfiltered would show a user
      // their own presence as if it were the other person's.
      const onPresence = (p: CounterpartPresence & { roomId?: string }) => {
        if (!mounted || !p?.userId) return;
        if (counterpartIdRef.current && counterpartIdRef.current !== p.userId) return;
        counterpartIdRef.current = p.userId;
        setCounterpartPresence({ userId: p.userId, status: p.status, lastSeen: p.lastSeen ?? null });
      };
      s.on('presence_update', onPresence);

      s.on('typing', onTyping);
      s.on('messages_read', onRead);

      if (s.connected) {
        setConnected(true);
        await joinBooking(roomId, roomType);
      }

      // Ask outright as well as listening. A transition only fires when
      // something changes; a screen opening onto a counterpart who has been
      // offline for an hour would otherwise wait forever for an event that
      // never comes, and render nothing.
      const presenceAck = await emitEvent('presence_get', {
        roomId,
        bookingId: roomId,
        roomType,
      });
      if (mounted && presenceAck.success && presenceAck.data?.userId) {
        // Authoritative on WHO the counterpart is, which is what lets the
        // listener above reject frames about anyone else.
        counterpartIdRef.current = presenceAck.data.userId;
        setCounterpartPresence({
          userId: presenceAck.data.userId,
          status: presenceAck.data.status,
          lastSeen: presenceAck.data.lastSeen ?? null,
        });
      }

      cleanupRef.current = () => {
        s.off('connect', onConnect);
        s.off('disconnect', onDisconnect);
        s.off('new_message', onMessage);
        s.off('provider_location_update', onLocation);
        s.off('booking_status_changed', onStatus);
        s.off('appointment_status_changed', onAppointmentStatus);
        s.off('payment_requested', onPaymentRequested);
        s.off('payment_status_changed', onPaymentStatus);
        s.off('video_call_started', onVideoStarted);
        s.off('video_call_ended', onVideoEnded);
        s.off('presence_update', onPresence);
        s.off('typing', onTyping);
        s.off('messages_read', onRead);
      };
    })();

    return () => {
      mounted = false;
      cleanupRef.current?.();
      cleanupRef.current = null;
      if (roomId) leaveBooking(roomId);
    };
  }, [roomId, roomType]);

  /** Socket first, REST fallback when the socket is down. */
  const sendMessage = useCallback(
    async (text: string): Promise<ChatMessage | null> => {
      if (!roomId || !text.trim()) return null;
      const body = text.trim();
      // Idempotency key: if the socket ack times out and we fall back to REST,
      // the server recognises the retry instead of storing the message twice.
      const clientMsgId = nextClientMsgId();

      const ack = await emitEvent('send_message', {
        roomId,
        bookingId: roomId,
        roomType,
        text: body,
        clientMsgId,
      });
      if (ack.success && ack.data) {
        const m = ack.data as ChatMessage;
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        return m;
      }

      const res = await sendChatMessage({
        bookingId: roomId,
        message: body,
        roomType,
        clientMsgId,
      });
      if (res.success && res.data) {
        const m = res.data;
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        return m;
      }
      return null;
    },
    [roomId, roomType]
  );

  const emitTyping = useCallback(
    (isTyping: boolean) => {
      if (roomId) emitEvent('typing', { roomId, bookingId: roomId, roomType, isTyping });
    },
    [roomId, roomType]
  );

  const markRead = useCallback(() => {
    if (roomId) emitEvent('mark_read', { roomId, bookingId: roomId, roomType });
  }, [roomId, roomType]);

  const seedMessages = useCallback((history: ChatMessage[]) => {
    setMessages((prev) => {
      const ids = new Set(prev.map((m) => m.id));
      return [...history.filter((m) => !ids.has(m.id)), ...prev];
    });
  }, []);

  return {
    messages,
    seedMessages,
    sendMessage,
    emitTyping,
    markRead,
    providerLocation,
    /** Home services only, bare string — kept for liveTracking. */
    bookingStatus,
    /** Either vertical: booking OR appointment status, with context. */
    roomStatus,
    payment,
    videoCall,
    typing,
    /**
     * OUR OWN socket. Answers "are my messages sending?" — NOT whether the
     * other person is there. The chat header used to render this as "online",
     * which is why a provider who had force-closed their app still showed as
     * online to the customer: the customer's own socket was fine.
     */
    connected,
    /** The OTHER party, from the server. Null until the first frame arrives. */
    counterpartPresence,
  };
}
