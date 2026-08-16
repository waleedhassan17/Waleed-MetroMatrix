// ============================================================================
// useCallSession — one call, from either side.
//
// SIGNALLING ONLY. ring / accept / decline / end travel over the socket so both
// apps agree on call state; the actual audio is handed to the phone's native
// dialer via a `tel:` URL. There is no in-app audio, no WebRTC, no Agora — that
// is a deliberate product decision (it keeps the app in Expo's managed
// workflow, with no native modules and no prebuild).
//
// A consequence worth knowing: once the dialer takes over, the OS owns the
// call. The app cannot observe when it ends, so the user hangs up in the dialer
// and the app's own "End" button is what closes the signalling session.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Alert } from 'react-native';
import { getSocket, emitEvent, joinBooking, RoomType } from '../socket/socketClient';

export type CallPhase =
  | 'idle'
  | 'ringing'      // we are calling out
  | 'incoming'     // they are calling us
  | 'connected'    // accepted; dialer handoff happens here
  | 'busy'         // callee is on another call
  | 'declined'
  | 'missed'
  | 'ended';

// Mirrors the server's RING_TIMEOUT_MS. The server is authoritative (it marks
// the CallLog 'missed'); this is the UI's own guard so the screen never hangs
// on "Ringing…" if a signalling frame is lost.
const RING_TIMEOUT_MS = 30_000;

export interface CallSessionOptions {
  roomId?: string;
  roomType?: RoomType;
  /** Phone number to dial on connect — from the chat endpoint's participants. */
  counterpartPhone?: string;
  counterpartName?: string;
  /** Pre-existing call being answered (from a ring or a notification tap). */
  incomingCallId?: string;
  onClosed?: (phase: CallPhase) => void;
}

export function useCallSession({
  roomId,
  roomType = 'homeservice',
  counterpartPhone,
  counterpartName,
  incomingCallId,
  onClosed,
}: CallSessionOptions) {
  const [phase, setPhase] = useState<CallPhase>(incomingCallId ? 'incoming' : 'idle');
  const [callId, setCallId] = useState<string | null>(incomingCallId || null);
  const [error, setError] = useState<string | null>(null);
  const ringTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closedRef = useRef(false);

  const clearRingTimer = () => {
    if (ringTimer.current) {
      clearTimeout(ringTimer.current);
      ringTimer.current = null;
    }
  };

  const close = useCallback(
    (next: CallPhase) => {
      if (closedRef.current) return;
      closedRef.current = true;
      clearRingTimer();
      setPhase(next);
      onClosed?.(next);
    },
    [onClosed]
  );

  // Join the room so call frames for it reach this socket.
  useEffect(() => {
    if (roomId) joinBooking(roomId, roomType);
  }, [roomId, roomType]);

  // Server -> client call frames.
  useEffect(() => {
    let mounted = true;
    let detach: (() => void) | null = null;

    (async () => {
      const s = await getSocket();
      if (!s || !mounted) return;

      const sameCall = (p: any) => !callId || !p?.callId || p.callId === callId;

      const onAccept = (p: any) => {
        if (!mounted || !sameCall(p)) return;
        clearRingTimer();
        setPhase('connected');
        // The accepter's number rides along with the accept, so the caller can
        // dial without another round-trip.
        const number = p?.peer?.phoneNumber || counterpartPhone;
        dial(number);
      };
      const onDecline = (p: any) => mounted && sameCall(p) && close('declined');
      const onEnd = (p: any) => mounted && sameCall(p) && close('ended');
      const onMissed = (p: any) => mounted && sameCall(p) && close('missed');
      const onBusy = (p: any) => {
        if (!mounted) return;
        if (p?.roomId && roomId && p.roomId !== roomId) return;
        setError(`${counterpartName || 'They'} are on another call`);
        close('busy');
      };

      s.on('call_accept', onAccept);
      s.on('call_decline', onDecline);
      s.on('call_end', onEnd);
      s.on('call_missed', onMissed);
      s.on('call_busy', onBusy);

      detach = () => {
        s.off('call_accept', onAccept);
        s.off('call_decline', onDecline);
        s.off('call_end', onEnd);
        s.off('call_missed', onMissed);
        s.off('call_busy', onBusy);
      };
    })();

    return () => {
      mounted = false;
      detach?.();
    };
  }, [callId, roomId, counterpartPhone, counterpartName, close]);

  useEffect(() => () => clearRingTimer(), []);

  const dial = useCallback(async (number?: string) => {
    const target = (number || '').replace(/\s|-/g, '');
    if (!target) {
      Alert.alert('No phone number', 'This contact has no phone number on file.');
      return;
    }
    const url = `tel:${target}`;
    try {
      const can = await Linking.canOpenURL(url);
      if (!can) {
        Alert.alert('Cannot place call', 'This device cannot open the phone dialer.');
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('Cannot place call', 'The dialer could not be opened.');
    }
  }, []);

  /** Outgoing: start ringing the counterpart. */
  const ring = useCallback(async () => {
    if (!roomId) return;
    closedRef.current = false;
    setError(null);
    setPhase('ringing');

    const ack = await emitEvent('call_ring', { roomId, bookingId: roomId, roomType });

    if (!ack.success) {
      if (ack.reason === 'busy') {
        setError(`${counterpartName || 'They'} are on another call`);
        close('busy');
      } else {
        setError(ack.message || 'Could not place the call');
        close('ended');
      }
      return;
    }

    setCallId(ack.data?.callId || null);
    clearRingTimer();
    ringTimer.current = setTimeout(() => close('missed'), RING_TIMEOUT_MS);
  }, [roomId, roomType, counterpartName, close]);

  /** Incoming: answer. */
  const accept = useCallback(async () => {
    if (!roomId || !callId) return;
    const ack = await emitEvent('call_accept', { callId, roomId, bookingId: roomId, roomType });
    if (!ack.success) {
      setError(ack.message || 'Call is no longer active');
      close('ended');
      return;
    }
    clearRingTimer();
    setPhase('connected');
    dial(counterpartPhone);
  }, [callId, roomId, roomType, counterpartPhone, close, dial]);

  const decline = useCallback(async () => {
    if (roomId && callId) {
      await emitEvent('call_decline', { callId, roomId, bookingId: roomId, roomType });
    }
    close('declined');
  }, [callId, roomId, roomType, close]);

  const end = useCallback(async () => {
    if (roomId && callId) {
      await emitEvent('call_end', { callId, roomId, bookingId: roomId, roomType });
    }
    close('ended');
  }, [callId, roomId, roomType, close]);

  return { phase, callId, error, ring, accept, decline, end, dial };
}
