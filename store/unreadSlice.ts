import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { fetchConversations } from '../networks/realtime/conversationsNetwork';

// ============================================================================
// Unread messages, app-wide.
//
// WHY THIS EXISTS
// ---------------
// `new_message` was bound in exactly one place: inside useRoomSocket, which
// only the open chat screen mounts. Leave the thread and nothing in the app
// listened any more. There was no global listener, no toast, and no tab badge
// anywhere — and the server's `totalUnread` was typed in the network layer and
// never read by a single component.
//
// So a message produced NO in-app signal at all unless you already had that
// exact conversation open. The push was the only other channel, and pushes are
// suppressed for a foregrounded recipient by design — meaning a message
// arriving while you sat on another screen showed you nothing whatsoever.
//
// This is the missing piece: one count per room, seeded from the server on
// launch and kept live by a global socket listener, so a badge can exist.
// ============================================================================

export interface UnreadState {
  /** roomId -> unread count. */
  byRoom: Record<string, number>;
  /** Populated at least once, so a badge can distinguish 0 from "unknown". */
  loaded: boolean;
}

const initialState: UnreadState = { byRoom: {}, loaded: false };

/** Seed from the server — authoritative, and survives a reinstall. */
export const loadUnread = createAsyncThunk('unread/load', async (_, { rejectWithValue }) => {
  const res = await fetchConversations();
  if (!res.success || !res.data) return rejectWithValue('failed');
  const byRoom: Record<string, number> = {};
  for (const c of res.data.conversations || []) {
    if (c.unread > 0) byRoom[c.roomId] = c.unread;
  }
  return byRoom;
});

const unreadSlice = createSlice({
  name: 'unread',
  initialState,
  reducers: {
    /** A message arrived for a room the user is not currently reading. */
    messageReceived(state, action: PayloadAction<{ roomId: string }>) {
      const { roomId } = action.payload;
      if (!roomId) return;
      state.byRoom[roomId] = (state.byRoom[roomId] || 0) + 1;
    },
    /** The user opened (or marked read) this room. */
    roomRead(state, action: PayloadAction<{ roomId: string }>) {
      delete state.byRoom[action.payload.roomId];
    },
    clearUnread(state) {
      state.byRoom = {};
      state.loaded = false;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadUnread.fulfilled, (state, action) => {
      state.byRoom = action.payload;
      state.loaded = true;
    });
    // A failed seed leaves whatever the live listener has accumulated rather
    // than zeroing a badge that may be legitimately non-zero.
    builder.addCase(loadUnread.rejected, (state) => {
      state.loaded = true;
    });
  },
});

export const { messageReceived, roomRead, clearUnread } = unreadSlice.actions;
export default unreadSlice.reducer;

/** Total across every room — what a tab badge renders. */
export const selectTotalUnread = (state: any): number =>
  Object.values((state.unread?.byRoom || {}) as Record<string, number>).reduce(
    (n, v) => n + v,
    0
  );

export const selectRoomUnread = (state: any, roomId: string): number =>
  (state.unread?.byRoom || {})[roomId] || 0;
