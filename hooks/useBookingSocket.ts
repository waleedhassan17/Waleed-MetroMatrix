// ============================================
// useBookingSocket (HS7) — joins booking:<id> on mount, leaves on unmount.
// Exposes { messages, sendMessage, providerLocation, bookingStatus, typing,
// connected }. REST history load stays the responsibility of the screen
// (fetchChatData) — this hook only handles the live layer.
// ============================================

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { getSocket, joinBooking, leaveBooking, emitEvent } from '../services/socket/socketClient';
import { ChatMessage } from '../models/serviceProviders';
import { sendChatMessage } from '../networks/serviceProviders/chatNetwork';

export interface ProviderLocationUpdate {
  bookingId: string;
  latitude: number;
  longitude: number;
  heading: number | null;
  timestamp: string;
}

export function useBookingSocket(bookingId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [providerLocation, setProviderLocation] = useState<ProviderLocationUpdate | null>(null);
  const [bookingStatus, setBookingStatus] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    let mounted = true;

    (async () => {
      const s = await getSocket();
      if (!s || !mounted) return;
      socketRef.current = s;

      const onConnect = () => mounted && setConnected(true);
      const onDisconnect = () => mounted && setConnected(false);
      const onMessage = (m: ChatMessage & { bookingId?: string }) => {
        if (!mounted) return;
        setMessages((prev) =>
          prev.some((x) => x.id === m.id) ? prev : [...prev, m]
        );
      };
      const onLocation = (loc: ProviderLocationUpdate) => {
        if (mounted && loc.bookingId === bookingId) setProviderLocation(loc);
      };
      const onStatus = (p: { bookingId: string; status: string }) => {
        if (mounted && p.bookingId === bookingId) setBookingStatus(p.status);
      };
      const onTyping = (p: { bookingId: string; isTyping: boolean }) => {
        if (mounted && p.bookingId === bookingId) setTyping(p.isTyping);
      };

      s.on('connect', onConnect);
      s.on('disconnect', onDisconnect);
      s.on('new_message', onMessage);
      s.on('provider_location_update', onLocation);
      s.on('booking_status_changed', onStatus);
      s.on('typing', onTyping);
      if (s.connected) setConnected(true);

      await joinBooking(bookingId);

      // store cleanup handles on the ref
      (socketRef as any).cleanup = () => {
        s.off('connect', onConnect);
        s.off('disconnect', onDisconnect);
        s.off('new_message', onMessage);
        s.off('provider_location_update', onLocation);
        s.off('booking_status_changed', onStatus);
        s.off('typing', onTyping);
      };
    })();

    return () => {
      mounted = false;
      (socketRef as any).cleanup?.();
      if (bookingId) leaveBooking(bookingId);
    };
  }, [bookingId]);

  /** Optimistic send: socket first, REST fallback when the socket is down. */
  const sendMessage = useCallback(
    async (text: string): Promise<ChatMessage | null> => {
      if (!bookingId || !text.trim()) return null;
      const ack = await emitEvent('send_message', { bookingId, text: text.trim() });
      if (ack.success && ack.data) {
        const m = ack.data as ChatMessage;
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        return m;
      }
      // REST fallback (serverless host / socket down)
      const res = await sendChatMessage({ bookingId, message: text.trim() });
      if (res.success && res.data) {
        setMessages((prev) =>
          prev.some((x) => x.id === res.data.id) ? prev : [...prev, res.data]
        );
        return res.data;
      }
      return null;
    },
    [bookingId]
  );

  const emitTyping = useCallback(
    (isTyping: boolean) => {
      if (bookingId) emitEvent('typing', { bookingId, isTyping });
    },
    [bookingId]
  );

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
    providerLocation,
    bookingStatus,
    typing,
    connected,
  };
}
