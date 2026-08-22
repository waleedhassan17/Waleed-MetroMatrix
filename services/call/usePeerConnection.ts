// ============================================================================
// The media half of a call.
//
// useCallSession owns the SIGNALLING state machine (ring / accept / decline /
// end). This hook owns the MEDIA: microphone (and camera, for healthcare
// video), the RTCPeerConnection, and the offer/answer/ICE exchange that runs
// over the same socket.
//
// The two are separate on purpose. Signalling works without media — a call can
// ring, be declined and be logged with no peer connection ever existing — and
// keeping the media out of that state machine means a WebRTC failure degrades
// to "call didn't connect" instead of corrupting the call log.
//
// WHO OFFERS: the CALLER creates the offer, on receiving `call_accept`. The
// callee answers. Both sides must agree on this or they deadlock (both
// waiting) or glare (both offering).
//
// react-native-webrtc is imported LAZILY. It is a native module, so a plain
// top-level import crashes the entire JS bundle in any environment where it
// isn't linked — Expo Go, or a stale build — taking down chat and bookings
// along with it. Calling should fail alone.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket, emitEvent, type RoomType } from '../socket/socketClient';
import { getIceServers } from '../../networks/realtime/turnCredentials';

export type MediaKind = 'audio' | 'video';

export type PeerState =
  | 'idle'
  | 'preparing'   // fetching ICE servers, opening the mic/camera
  | 'negotiating' // offer/answer in flight
  | 'connected'
  | 'failed'
  | 'closed';

interface Options {
  callId?: string | null;
  roomId?: string;
  roomType?: RoomType;
  media?: MediaKind;
  /** True on the side that placed the call — it creates the offer. */
  isCaller: boolean;
  onFailed?: (message: string) => void;
}

/** Loaded once, lazily. Null means the native module isn't available. */
let webrtcModule: any = null;
function loadWebRTC(): any {
  if (webrtcModule) return webrtcModule;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  webrtcModule = require('react-native-webrtc');
  return webrtcModule;
}

export function usePeerConnection({
  callId,
  roomId,
  roomType = 'homeservice',
  media = 'audio',
  isCaller,
  onFailed,
}: Options) {
  const [state, setState] = useState<PeerState>('idle');
  const [localStream, setLocalStream] = useState<any>(null);
  const [remoteStream, setRemoteStream] = useState<any>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(media === 'video');

  const pcRef = useRef<any>(null);
  const localRef = useRef<any>(null);
  const closedRef = useRef(false);

  // ICE candidates that arrived before setRemoteDescription. Adding one early
  // throws; dropping it costs a connectivity path. So they queue here and are
  // flushed once the remote description lands.
  const pendingRemoteIce = useRef<any[]>([]);
  // Our own candidates, held while the socket is briefly down. emitEvent fails
  // outright rather than queueing when disconnected (socketClient.ts), and a
  // lost candidate silently weakens connectivity rather than erroring.
  const pendingLocalIce = useRef<any[]>([]);

  const signal = useCallback(
    async (event: string, frame: Record<string, unknown>) => {
      if (!callId || !roomId) return { success: false as const };
      return emitEvent(event, { callId, roomId, bookingId: roomId, roomType, ...frame });
    },
    [callId, roomId, roomType]
  );

  const flushLocalIce = useCallback(async () => {
    if (!pendingLocalIce.current.length) return;
    const queued = pendingLocalIce.current;
    pendingLocalIce.current = [];
    for (const candidate of queued) {
      const ack = await signal('webrtc_ice', { candidate });
      // Still down — put it back rather than losing it.
      if (!ack.success) pendingLocalIce.current.push(candidate);
    }
  }, [signal]);

  /** Fully tear down. Safe to call repeatedly. */
  const teardown = useCallback(() => {
    closedRef.current = true;
    try {
      localRef.current?.getTracks?.().forEach((t: any) => t.stop());
    } catch {
      /* the track may already be dead */
    }
    try {
      pcRef.current?.close?.();
    } catch {
      /* likewise */
    }
    pcRef.current = null;
    localRef.current = null;
    pendingRemoteIce.current = [];
    pendingLocalIce.current = [];
    setLocalStream(null);
    setRemoteStream(null);
    setState('closed');
  }, []);

  const fail = useCallback(
    (message: string) => {
      if (closedRef.current) return;
      console.log(`[call] media failed: ${message}`);
      setState('failed');
      onFailed?.(message);
    },
    [onFailed]
  );

  /**
   * Open the mic/camera and build the peer connection. Both sides call this;
   * only the caller then creates an offer.
   */
  const start = useCallback(async () => {
    if (pcRef.current || closedRef.current) return;
    setState('preparing');

    let rtc: any;
    try {
      rtc = loadWebRTC();
    } catch (e: any) {
      return fail('In-app calling is not available in this build.');
    }

    // ICE servers FIRST. Without them the connection would still be created
    // and would still "work" on a shared network, so the failure would only
    // show up across networks — the worst possible time to discover it.
    let iceServers;
    try {
      iceServers = await getIceServers();
    } catch (e: any) {
      return fail(e?.message || 'Could not start the call. Please try again.');
    }
    if (closedRef.current) return;

    let stream: any;
    try {
      stream = await rtc.mediaDevices.getUserMedia({
        audio: true,
        video: media === 'video' ? { facingMode: 'user' } : false,
      });
    } catch (e: any) {
      return fail(
        media === 'video'
          ? 'Camera or microphone permission is required for video calls.'
          : 'Microphone permission is required to make a call.'
      );
    }
    if (closedRef.current) {
      stream.getTracks().forEach((t: any) => t.stop());
      return;
    }

    localRef.current = stream;
    setLocalStream(stream);

    const pc = new rtc.RTCPeerConnection({ iceServers });
    pcRef.current = pc;

    stream.getTracks().forEach((track: any) => pc.addTrack(track, stream));

    pc.addEventListener('track', (event: any) => {
      if (event.streams && event.streams[0]) setRemoteStream(event.streams[0]);
    });

    pc.addEventListener('icecandidate', (event: any) => {
      if (!event.candidate) return; // null marks end-of-candidates
      signal('webrtc_ice', { candidate: event.candidate }).then((ack) => {
        if (!ack.success) pendingLocalIce.current.push(event.candidate);
      });
    });

    pc.addEventListener('connectionstatechange', () => {
      const cs = pc.connectionState;
      if (cs === 'connected') {
        setState('connected');
        flushLocalIce();
      } else if (cs === 'failed') {
        // Both peers are unreachable even via TURN. Nothing to retry against.
        fail('The connection dropped. Please try again.');
      }
    });

    setState('negotiating');

    if (isCaller) {
      try {
        const offer = await pc.createOffer({});
        await pc.setLocalDescription(offer);
        const ack = await signal('webrtc_offer', { sdp: pc.localDescription });
        if (!ack.success) return fail(ack.message || 'Could not reach the other person.');
      } catch (e: any) {
        return fail('Could not start the call. Please try again.');
      }
    }
  }, [media, isCaller, signal, fail, flushLocalIce]);

  // Inbound signalling. Mounted for the whole call so a frame is never missed
  // between "accepted" and "peer connection built".
  useEffect(() => {
    if (!callId || !roomId) return;
    let mounted = true;
    let detach: (() => void) | undefined;

    (async () => {
      const s = await getSocket();
      if (!s || !mounted) return;

      const sameCall = (p: any) => !p?.callId || String(p.callId) === String(callId);

      const drainRemoteIce = async (pc: any) => {
        const queued = pendingRemoteIce.current;
        pendingRemoteIce.current = [];
        for (const c of queued) {
          try {
            await pc.addIceCandidate(new (loadWebRTC().RTCIceCandidate)(c));
          } catch {
            /* a rejected candidate costs one path, not the call */
          }
        }
      };

      const onOffer = async (p: any) => {
        if (!mounted || !sameCall(p)) return;
        const pc = pcRef.current;
        if (!pc) return;
        try {
          const rtc = loadWebRTC();
          await pc.setRemoteDescription(new rtc.RTCSessionDescription(p.sdp));
          await drainRemoteIce(pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await signal('webrtc_answer', { sdp: pc.localDescription });
        } catch {
          fail('Could not connect the call.');
        }
      };

      const onAnswer = async (p: any) => {
        if (!mounted || !sameCall(p)) return;
        const pc = pcRef.current;
        if (!pc) return;
        try {
          const rtc = loadWebRTC();
          await pc.setRemoteDescription(new rtc.RTCSessionDescription(p.sdp));
          await drainRemoteIce(pc);
        } catch {
          fail('Could not connect the call.');
        }
      };

      const onIce = async (p: any) => {
        if (!mounted || !sameCall(p) || !p?.candidate) return;
        const pc = pcRef.current;
        // Before the remote description exists, addIceCandidate throws. Queue.
        if (!pc || !pc.remoteDescription) {
          pendingRemoteIce.current.push(p.candidate);
          return;
        }
        try {
          await pc.addIceCandidate(new (loadWebRTC().RTCIceCandidate)(p.candidate));
        } catch {
          /* one lost path, not a lost call */
        }
      };

      s.on('webrtc_offer', onOffer);
      s.on('webrtc_answer', onAnswer);
      s.on('webrtc_ice', onIce);
      s.on('connect', flushLocalIce);

      detach = () => {
        s.off('webrtc_offer', onOffer);
        s.off('webrtc_answer', onAnswer);
        s.off('webrtc_ice', onIce);
        s.off('connect', flushLocalIce);
      };
    })();

    return () => {
      mounted = false;
      detach?.();
    };
  }, [callId, roomId, signal, fail, flushLocalIce]);

  useEffect(() => teardown, [teardown]);

  const toggleMic = useCallback(() => {
    const tracks = localRef.current?.getAudioTracks?.() || [];
    const next = !micEnabled;
    tracks.forEach((t: any) => {
      t.enabled = next;
    });
    setMicEnabled(next);
  }, [micEnabled]);

  const toggleCamera = useCallback(() => {
    const tracks = localRef.current?.getVideoTracks?.() || [];
    if (!tracks.length) return;
    const next = !cameraEnabled;
    tracks.forEach((t: any) => {
      t.enabled = next;
    });
    setCameraEnabled(next);
  }, [cameraEnabled]);

  const switchCamera = useCallback(() => {
    const tracks = localRef.current?.getVideoTracks?.() || [];
    tracks.forEach((t: any) => t._switchCamera?.());
  }, []);

  return {
    state,
    localStream,
    remoteStream,
    micEnabled,
    cameraEnabled,
    start,
    teardown,
    toggleMic,
    toggleCamera,
    switchCamera,
  };
}
