import { realtimeRequest } from './realtimeClient';

// ============================================================================
// The REST half of calling.
//
// Everything about a call normally travels over the socket. This exists for the
// one case where there is no socket: the Decline button on a lock-screen call
// notification, pressed while the app is backgrounded or killed.
//
// Notifee's background handler runs in a process that may have no React tree,
// no Redux store and no Socket.IO connection. Opening a socket purely to hang
// up would defeat the point of declining without opening the app, and would
// race the OS suspending the process again.
// ============================================================================

/**
 * Decline a ringing call without opening the app.
 *
 * Best-effort by nature: if it fails the caller simply sees the ring time out,
 * which is the behaviour that existed before this path at all.
 */
export async function declineCallApi(
  callId: string,
  roomId: string,
  roomType: string
): Promise<void> {
  try {
    await realtimeRequest(`/calls/${encodeURIComponent(callId)}/decline`, {
      method: 'POST',
      // realtimeRequest takes a JSON string and parses it back out.
      body: JSON.stringify({ roomId, roomType }),
    });
  } catch {
    /* the ring will time out on its own */
  }
}
