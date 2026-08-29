// ============================================================================
// useCallSession — one call, from either side.
//
// SIGNALLING. ring / accept / decline / end travel over the socket so both apps
// agree on call state. The MEDIA is owned by usePeerConnection, which this hook
// drives: audio (and video, for healthcare) flows peer-to-peer over WebRTC,
// relayed through TURN only when a direct path is impossible.
//
// This previously handed the audio to the phone's native dialer via a `tel:`
// URL. Both sides did that independently, so two phones opened two dialers and
// neither call ever connected in-app — that is the bug this replaces. It also
// meant the app could not observe the call at all once the OS took over;
// now 'connected' is a real state backed by a real connection.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket, emitEvent, joinBooking, RoomType } from '../socket/socketClient';
import { usePeerConnection, type MediaKind } from './usePeerConnection';

export type CallPhase =
  | 'idle'
  | 'calling'      // we have asked the server to place the call
  | 'ringing'      // THEIR device has confirmed it is presenting the call
  | 'incoming'     // they are calling us
  | 'connected'    // accepted; media is negotiating or live
  | 'busy'         // callee is on another call
  | 'unavailable'  // callee has no live socket — never rang
  | 'declined'
  | 'missed'
  | 'ended';

// CALLING AND RINGING ARE NOT THE SAME STATE, and the gap between them is
// exactly where the old UI lied. It showed "Ringing…" the instant the user
// pressed call — before the server had accepted the request, before anyone had
// checked whether the callee was even connected, and before their device had
// seen anything. A callee with the app closed produced a full 30 seconds of
// "Ringing…" followed by "No answer", describing a phone that never rang.
//
// Now 'calling' means "we asked", and only the callee's own `call_ringing`
// acknowledgement — sent when their device actually presents the call —
// advances to 'ringing'. If the server reports them offline first, the phase
// goes to 'unavailable' and never passes through 'ringing' at all.

// Mirrors the server's RING_TIMEOUT_MS. The server is authoritative (it marks
// the CallLog 'missed'); this is the UI's own guard so the screen never hangs
// on "Ringing…" if a signalling frame is lost.
const RING_TIMEOUT_MS = 30_000;

export interface CallSessionOptions {
  roomId?: string;
  roomType?: RoomType;
  counterpartName?: string;
  /** 'video' adds a camera track — healthcare consultations. Audio otherwise. */
  media?: MediaKind;
  /** Pre-existing call being answered (from a ring or a notification tap). */
  incomingCallId?: string;
  onClosed?: (phase: CallPhase) => void;
}

export function useCallSession({
  roomId,
  roomType = 'homeservice',
  counterpartName,
  media = 'audio',
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

  // The media half. `isCaller` is decided by how this session began: a session
  // seeded with an incoming callId is answering, everything else is placing.
  // Both sides must agree, or they either deadlock or glare.
  const isCaller = !incomingCallId;

  const peer = usePeerConnection({
    callId,
    roomId,
    roomType,
    media,
    isCaller,
    onFailed: (message) => {
      setError(message);
      // Tell the other side, so they aren't left on a live call screen alone.
      if (roomId && callId) {
        emitEvent('call_end', { callId, roomId, bookingId: roomId, roomType });
      }
      close('ended');
    },
  });

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
        // They picked up. This used to read their phone number out of the
        // payload and open the dialer; now it starts the peer connection, and
        // as the caller we create the offer.
        setPhase('connected');
        peer.start();
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

      // Their device is presenting the call. This is the ONLY thing that may
      // advance us to 'ringing'.
      const onRinging = (p: any) => {
        if (!mounted || !sameCall(p)) return;
        setPhase((current) => (current === 'calling' ? 'ringing' : current));
      };

      const onUnavailable = (p: any) => {
        if (!mounted) return;
        if (p?.roomId && roomId && p.roomId !== roomId) return;
        setError(`${counterpartName || 'They'} are not available right now`);
        close('unavailable');
      };

      s.on('call_accept', onAccept);
      s.on('call_ringing', onRinging);
      s.on('call_unavailable', onUnavailable);
      s.on('call_decline', onDecline);
      s.on('call_end', onEnd);
      s.on('call_missed', onMissed);
      s.on('call_busy', onBusy);

      detach = () => {
        s.off('call_accept', onAccept);
        s.off('call_ringing', onRinging);
        s.off('call_unavailable', onUnavailable);
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
  }, [callId, roomId, counterpartName, close, peer]);

  useEffect(() => () => clearRingTimer(), []);

  /** Outgoing: place the call. */
  const ring = useCallback(async () => {
    if (!roomId) return;
    closedRef.current = false;
    setError(null);
    // "Calling…", not "Ringing…" — nothing has reached the other device yet.
    setPhase('calling');

    // Be in the room BEFORE asking to ring. The server puts us there anyway
    // while authorizing, but doing it explicitly first means call_accept and
    // the WebRTC frames — which are addressed to the room — cannot arrive
    // before we are in it.
    await joinBooking(roomId, roomType);

    const ack = await emitEvent('call_ring', { roomId, bookingId: roomId, roomType });

    if (!ack.success) {
      if (ack.reason === 'busy') {
        setError(`${counterpartName || 'They'} are on another call`);
        close('busy');
      } else if (ack.reason === 'unavailable') {
        setError(`${counterpartName || 'They'} are not available right now`);
        close('unavailable');
      } else if (ack.reason === 'offline') {
        // Our own connection, not theirs. Recoverable, and the user can simply
        // press call again — so do not close the session out from under them.
        setError('Reconnecting… check your connection and try again');
        setPhase('idle');
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
    // Build the peer connection now and wait for the caller's offer. Starting
    // before the ack would race the server's own accept check.
    peer.start();
  }, [callId, roomId, roomType, close, peer]);

  const decline = useCallback(async () => {
    if (roomId && callId) {
      await emitEvent('call_decline', { callId, roomId, bookingId: roomId, roomType });
    }
    peer.teardown();
    close('declined');
  }, [callId, roomId, roomType, close, peer]);

  const end = useCallback(async () => {
    if (roomId && callId) {
      await emitEvent('call_end', { callId, roomId, bookingId: roomId, roomType });
    }
    // Release the mic/camera immediately. Waiting for unmount leaves the OS
    // recording indicator lit after the user has clearly ended the call.
    peer.teardown();
    close('ended');
  }, [callId, roomId, roomType, close, peer]);

  // A call ended by the OTHER side (decline/end/missed) closes the signalling
  // session through close(); the media must follow or the mic stays open.
  useEffect(() => {
    if (
      phase === 'ended' ||
      phase === 'declined' ||
      phase === 'missed' ||
      phase === 'busy' ||
      phase === 'unavailable'
    ) {
      peer.teardown();
    }
  }, [phase, peer]);

  return {
    phase,
    callId,
    error,
    ring,
    accept,
    decline,
    end,
    // Media surface for the in-call UI.
    media: peer,
  };
}
