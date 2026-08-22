// ============================================================================
// ICE servers for a WebRTC call.
//
// The app holds NO TURN secret. The realtime service owns the Cloudflare API
// token and mints a short-lived username/credential pair per call; we only
// ever receive the result. That is why this is a network call and not a
// constant — and why it must happen immediately before connecting rather than
// at app start: the credential expires (TURN_TTL_SECONDS, currently 1h), and a
// stale one fails mid-negotiation, which looks like a network fault rather
// than an auth problem.
// ============================================================================

import { realtimeRequest } from './realtimeClient';

/** Matches RTCIceServer from react-native-webrtc. */
export interface IceServer {
  urls: string[];
  username?: string;
  credential?: string;
}

/**
 * Fetch ICE servers for one call.
 *
 * Throws on failure rather than returning an empty array. A peer connection
 * built with no ICE servers does not fail loudly — it half-works, connecting
 * on the same Wi-Fi and silently failing across networks, which is the hardest
 * kind of bug to reproduce. Callers must abort the call attempt instead.
 */
export async function getIceServers(): Promise<IceServer[]> {
  const res = await realtimeRequest<{ iceServers: IceServer[] }>('/turn/credentials');

  if (!res.success || !res.data?.iceServers?.length) {
    throw new Error(res.message || 'Could not start the call. Please try again.');
  }

  return res.data.iceServers;
}
