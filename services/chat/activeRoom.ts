// ============================================================================
// Which conversation is on screen right now.
//
// The global unread listener (IncomingCallProvider) counts every `new_message`
// that arrives, because that is the whole point — it must work when no chat
// screen is mounted. But it would then also count the message the open thread
// is displaying and marking read, showing a badge for something the user is
// literally looking at.
//
// Deliberately a module-level value rather than Redux state: the socket handler
// needs to answer "is this room on screen" synchronously, in a callback that
// runs outside React, and a store round-trip would be both slower and subject
// to the same stale-closure problem the ref exists to avoid.
// ============================================================================

let activeRoom: string | null = null;

/** Called by the chat screen on mount/unmount. */
export function setActiveChatRoom(roomId: string | null): void {
  activeRoom = roomId || null;
}

/** The room currently being read, or null. */
export function activeChatRoomId(): string | null {
  return activeRoom;
}
