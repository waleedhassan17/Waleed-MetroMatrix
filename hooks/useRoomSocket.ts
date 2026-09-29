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
import { AppState, type AppStateStatus } from 'react-native';
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
  /** 'requested' | 'paid' (home services) or paid | refunded (healthcare). */
  status: string;
  amount?: number;
  refundAmount?: number;
  /** Set on 'paid': how it was settled, and the server's transaction id. */
  method?: string;
  transactionId?: string;
  paidAt?: string;
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

/**
 * @param myRole Which side of the conversation the viewer is, when the caller
 *   knows. Only the chat screen does — it gets it from the server, which
 *   derives it from real booking/appointment membership rather than the token.
 *   Used to decide whose bubbles a `messages_read` frame applies to; see
 *   `onRead` below for what went wrong without it.
 */
export function useRoomSocket(
  roomId?: string,
  roomType: RoomType = 'homeservice',
  myRole?: 'user' | 'provider'
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [providerLocation, setProviderLocation] = useState<ProviderLocationUpdate | null>(null);
  const [bookingStatus, setBookingStatus] = useState<string | null>(null);
  const [roomStatus, setRoomStatus] = useState<RoomStatusUpdate | null>(null);
  const [payment, setPayment] = useState<RoomPaymentUpdate | null>(null);
  const [videoCall, setVideoCall] = useState<RoomVideoCallUpdate | null>(null);
  const [typing, setTyping] = useState(false);
  const [connected, setConnected] = useState(false);
  // Bumped when the app returns to the foreground and re-joins the room. The
  // consumer watches it to refetch history, because anything that arrived
  // while backgrounded came as a push rather than over this socket.
  const [resumedAt, setResumedAt] = useState(0);
  // The COUNTERPART's presence, from the server. Distinct from `connected`,
  // which is our own socket — see the note on the return value below.
  const [counterpartPresence, setCounterpartPresence] = useState<CounterpartPresence | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const counterpartIdRef = useRef<string | null>(null);
  // Read through a ref, not a dependency. `myRole` arrives from the server a
  // moment after mount, and re-running the effect for it would tear down every
  // listener, LEAVE the room and re-join — a membership flap that a mark_read
  // or an incoming message could land in the middle of.
  const myRoleRef = useRef(myRole);
  myRoleRef.current = myRole;

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
      const onMessage = (m: ChatMessage & { roomId?: string; bookingId?: string }) => {
        if (!mounted || !m?.id) return;
        // The realtime service does not currently put a room on this payload
        // (see SOCKET_API.md), so there is usually nothing to check — but when
        // it is present it must be honoured, or a message for another room is
        // appended to this one's list. Every sibling handler already does this.
        const frameRoom = m.roomId || m.bookingId;
        if (frameRoom && frameRoom !== roomId) return;
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

      // The customer actually paid. Distinct from `payment_requested`, which is
      // only the provider ASKING — binding just that one is why the provider's
      // payment screen had no way to hear about the money arriving and fell
      // back to a random timer. Normalised to status 'paid' so consumers test
      // one field rather than the event name.
      const onPaymentReceived = (p: {
        roomId?: string;
        bookingId?: string;
        amount?: number;
        method?: string;
        transactionId?: string;
        paidAt?: string;
      }) => {
        if (!mounted || (p.roomId || p.bookingId) !== roomId) return;
        setPayment({
          roomId,
          status: 'paid',
          amount: p.amount,
          method: p.method,
          transactionId: p.transactionId,
          paidAt: p.paidAt,
        });
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
      // ------------------------------------------------------------------
      // WHOSE MESSAGES DID THE OTHER PERSON JUST READ?
      //
      // This used to flip `m.sender === 'user'` — a hardcoded role, in a hook
      // shared by both sides of every conversation. `sender` is a ROLE, not an
      // id, and the ticks render only on bubbles where `sender === myRole`.
      // So for a customer it happened to flip their own messages (correct, by
      // luck), and for a PROVIDER it flipped the customer's bubbles — which
      // carry no ticks — while their own stayed 'delivered'. The provider's
      // single grey tick only became a double blue one via the REST reload on
      // mount or foreground resume: exactly the reported "go back and open the
      // chat again".
      //
      // `readerRole` is the right field and the server already sends it
      // (SOCKET_API.md: `messages_read { bookingId, readerRole }`). The reader
      // read the messages they did NOT send, whoever either party is. Keying
      // off it also makes a self-echo harmless: if the service broadcasts to
      // the whole room including the reader, `readerRole` is the viewer's own
      // role, so their own unread messages are left alone rather than being
      // falsely marked read.
      // ------------------------------------------------------------------
      const onRead = (p?: {
        bookingId?: string;
        roomId?: string;
        readerRole?: 'user' | 'provider';
      }) => {
        if (!mounted) return;
        // Every other handler here guards on the room; this one did not, and
        // nine screens mount this hook — several can be alive at once with
        // different rooms.
        const frameRoom = p?.roomId || p?.bookingId;
        if (frameRoom && frameRoom !== roomId) return;
        const reader = p?.readerRole;
        const mine = myRoleRef.current;
        setMessages((prev) =>
          prev.map((m) =>
            (reader ? m.sender !== reader : !!mine && m.sender !== mine)
              ? { ...m, status: 'read' }
              : m
          )
        );
      };

      s.on('connect', onConnect);
      s.on('disconnect', onDisconnect);
      s.on('new_message', onMessage);
      s.on('provider_location_update', onLocation);
      s.on('booking_status_changed', onStatus);
      s.on('appointment_status_changed', onAppointmentStatus);
      s.on('payment_requested', onPaymentRequested);
      s.on('payment_received', onPaymentReceived);
      s.on('payment_status_changed', onPaymentStatus);
      s.on('video_call_started', onVideoStarted);
      s.on('video_call_ended', onVideoEnded);
      // Presence of the OTHER party. The server sends this directly on join and
      // again on every transition, so the header tracks their real state rather
      // than inferring it from our own connection.
      //
      // Frames are matched against the counterpart id that presence_get below
      // establishes, and IGNORED until it has. A room broadcast carries
      // whichever user changed, and the direct join frame is indistinguishable
      // from it on the wire — so with two devices signed into the same account,
      // trusting the first frame to arrive could pin the viewer's OWN id and
      // then render their own status as the other person's.
      //
      // Nothing is lost by waiting: presence_get is emitted immediately after
      // the join and returns the counterpart's current state, so any transition
      // during that window is already reflected in its answer.
      const onPresence = (p: CounterpartPresence & { roomId?: string }) => {
        if (!mounted || !p?.userId) return;
        if (counterpartIdRef.current !== p.userId) return;
        setCounterpartPresence({ userId: p.userId, status: p.status, lastSeen: p.lastSeen ?? null });
      };
      s.on('presence_update', onPresence);

      s.on('typing', onTyping);
      s.on('messages_read', onRead);

      // REGISTERED BEFORE THE AWAITS BELOW, deliberately.
      //
      // Every listener is attached by this point, and what follows can block
      // for seconds — joinBooking waits on the handshake, and presence_get
      // waits up to 8s for an ack that an older server will never send at all.
      // Assigning cleanup after those awaits left a window in which the effect
      // had live listeners but no way to remove them: leave the chat inside it
      // and the teardown found `cleanupRef.current` still null, so every
      // handler stayed attached and re-entering the screen stacked another set.
      cleanupRef.current = () => {
        s.off('connect', onConnect);
        s.off('disconnect', onDisconnect);
        s.off('new_message', onMessage);
        s.off('provider_location_update', onLocation);
        s.off('booking_status_changed', onStatus);
        s.off('appointment_status_changed', onAppointmentStatus);
        s.off('payment_requested', onPaymentRequested);
        s.off('payment_received', onPaymentReceived);
        s.off('payment_status_changed', onPaymentStatus);
        s.off('video_call_started', onVideoStarted);
        s.off('video_call_ended', onVideoEnded);
        s.off('presence_update', onPresence);
        s.off('typing', onTyping);
        s.off('messages_read', onRead);
      };

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
    })();

    // ------------------------------------------------------------------
    // LEAVE THE ROOM WHEN THE APP GOES TO THE BACKGROUND.
    //
    // The server suppresses a chat push when the recipient is already IN the
    // room, on the reasonable assumption that someone looking at the thread
    // does not need to be told about it (chatService.deliverMessage ->
    // isUserInRoom). But nothing ever left the room: press Home with a thread
    // open and the socket stays connected and joined, so the server keeps
    // believing you are reading it and sends NOTHING. The message lands in a
    // handler attached to a screen that is not on the display.
    //
    // That was the most likely real-world silent miss in the whole chat
    // feature, and it needed no network failure to happen — just backgrounding
    // the app without navigating away first.
    //
    // Leaving on background makes the server's check honest. Re-joining on
    // foreground restores live delivery, and history is refetched because
    // anything missed while away arrived as a push instead.
    // ------------------------------------------------------------------
    const onAppStateChange = (next: AppStateStatus) => {
      if (!mounted || !roomId) return;
      if (next === 'active') {
        joinBooking(roomId, roomType);
        // Anything that arrived while we were away was delivered as a push, not
        // over this socket, so the in-memory list is stale. Bump a timestamp
        // the consumer watches to refetch history.
        setResumedAt(Date.now());
      } else if (next === 'background' || next === 'inactive') {
        leaveBooking(roomId);
      }
    };
    const appStateSub = AppState.addEventListener('change', onAppStateChange);

    return () => {
      mounted = false;
      appStateSub.remove();
      cleanupRef.current?.();
      cleanupRef.current = null;
      if (roomId) leaveBooking(roomId);
    };
    // Deliberately NOT depending on `myRole` — onRead reads it through
    // myRoleRef so a late role does not force a room re-join. See the ref.
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

  // ------------------------------------------------------------------
  // MARK THE THREAD READ — AND KNOW WHETHER IT WORKED.
  //
  // This used to be fire-and-forget: it never awaited the ack, never checked
  // `success`, and never retried. `emitEvent` resolves
  // `{ success: false, reason: 'offline' }` after an 8s handshake timeout,
  // silently, and read state has no REST fallback at all (chatNetwork exposes
  // only history and send). Meanwhile the caller cleared the unread badge
  // unconditionally — so a lost emit looked exactly like a successful one
  // until the next `loadUnread()` re-seeded the old count from the server and
  // the conversation went unread again. That is the "older chats still showing
  // as unread after I opened them" report.
  //
  // Two further reasons it was lost, both fixed by joining first:
  //   - `emitEvent` waits only for the socket handshake, not for the
  //     `join_booking` ack. Mark-read is triggered by REST history landing, on
  //     an independent timeline, so on a cold start it could reach the server
  //     BEFORE the join — and room membership is the server's authorization
  //     check for room events.
  //
  // The join is on the RETRY, not the first attempt: this runs again on every
  // incoming message, and joining up front would add a round trip per message
  // to a conversation that is already in the room. A refused mark_read is
  // exactly the symptom of not being a member, so pay for the join only then.
  //
  // Returns whether the server accepted it, so the caller can clear the badge
  // only when it is actually true.
  // ------------------------------------------------------------------
  const markRead = useCallback(async (): Promise<boolean> => {
    if (!roomId) return false;
    const payload = { roomId, bookingId: roomId, roomType };
    const ack = await emitEvent('mark_read', payload);
    if (ack.success) return true;

    // Re-join and try once more. Covers both the cold-start ordering race and
    // a reconnect that silently dropped membership. Anything past this is a
    // real refusal or a dead network, and the next open — or the next
    // loadUnread — is the correction path.
    await joinBooking(roomId, roomType);
    const retry = await emitEvent('mark_read', payload);
    return !!retry.success;
  }, [roomId, roomType]);

  const seedMessages = useCallback((history: ChatMessage[]) => {
    setMessages((prev) => {
      const ids = new Set(prev.map((m) => m.id));
      return [...history.filter((m) => !ids.has(m.id)), ...prev];
    });
  }, []);

  return {
    messages,
    resumedAt,
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
