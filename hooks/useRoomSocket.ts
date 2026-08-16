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

let clientMsgCounter = 0;
const nextClientMsgId = () =>
  `${Date.now().toString(36)}-${(clientMsgCounter++).toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

export function useRoomSocket(roomId?: string, roomType: RoomType = 'homeservice') {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [providerLocation, setProviderLocation] = useState<ProviderLocationUpdate | null>(null);
  const [bookingStatus, setBookingStatus] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!roomId) return;
    let mounted = true;

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
      const onStatus = (p: { bookingId: string; status: string }) => {
        if (mounted && p.bookingId === roomId) setBookingStatus(p.status);
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
      s.on('typing', onTyping);
      s.on('messages_read', onRead);

      if (s.connected) {
        setConnected(true);
        await joinBooking(roomId, roomType);
      }

      cleanupRef.current = () => {
        s.off('connect', onConnect);
        s.off('disconnect', onDisconnect);
        s.off('new_message', onMessage);
        s.off('provider_location_update', onLocation);
        s.off('booking_status_changed', onStatus);
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
    bookingStatus,
    typing,
    connected,
  };
}
