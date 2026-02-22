// screens/user/homeservice/providers-chat/providersChatSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { chatNetwork } from '../../../../networks/serviceProviders/chatNetwork';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ChatMessage {
  _id: string;
  senderId: string;
  senderType: 'User' | 'Provider';
  content: string;
  type: 'text' | 'image' | 'location' | 'call_log';
  mediaUrl?: string | null;
  status: 'sent' | 'delivered' | 'read';
  createdAt: string;
}

export interface ChatRoom {
  _id: string;
  userId: string;
  providerId: string;
  serviceType: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCountUser: number;
  unreadCountProvider: number;
}

interface ProvidersChatState {
  roomId: string | null;
  messages: ChatMessage[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  isTyping: boolean;
  hasMore: boolean;
  page: number;
  // Inbox
  rooms: ChatRoom[];
  roomsLoading: boolean;
}

const initialState: ProvidersChatState = {
  roomId: null,
  messages: [],
  isLoading: false,
  isSending: false,
  error: null,
  isTyping: false,
  hasMore: true,
  page: 1,
  rooms: [],
  roomsLoading: false,
};

// ─── Thunks ─────────────────────────────────────────────────────────────────

/**
 * Ensure a chat room exists and load initial messages.
 */
export const initChatRoom = createAsyncThunk(
  'providersChat/initChatRoom',
  async (
    { providerId, serviceType }: { providerId: string; serviceType: string },
    { rejectWithValue }
  ) => {
    try {
      const { room } = await chatNetwork.findOrCreateRoom(providerId, serviceType);
      const { messages, pagination } = await chatNetwork.getMessages(room._id, 1);
      return { roomId: room._id, messages: messages.reverse(), hasMore: pagination.hasMore };
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || 'Failed to load chat');
    }
  }
);

/**
 * Load older messages (pagination).
 */
export const loadMoreMessages = createAsyncThunk(
  'providersChat/loadMoreMessages',
  async (
    { roomId, page }: { roomId: string; page: number },
    { rejectWithValue }
  ) => {
    try {
      const { messages, pagination } = await chatNetwork.getMessages(roomId, page);
      return { messages: messages.reverse(), hasMore: pagination.hasMore };
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || 'Failed to load messages');
    }
  }
);

/**
 * Fetch all chat rooms (inbox).
 */
export const fetchChatRooms = createAsyncThunk(
  'providersChat/fetchChatRooms',
  async (_, { rejectWithValue }) => {
    try {
      const { rooms } = await chatNetwork.getChatRooms();
      return rooms;
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || 'Failed to load rooms');
    }
  }
);

// ─── Slice ───────────────────────────────────────────────────────────────────

const providersChatSlice = createSlice({
  name: 'providersChat',
  initialState,
  reducers: {
    // Called when Socket.IO delivers a real-time message
    receiveMessage: (state, action: PayloadAction<{ roomId: string; message: ChatMessage }>) => {
      if (action.payload.roomId === state.roomId) {
        // Avoid duplicate messages
        const exists = state.messages.some((m) => m._id === action.payload.message._id);
        if (!exists) {
          state.messages.push(action.payload.message);
        }
      }
    },

    // Optimistic UI: add message immediately before server confirms
    addOptimisticMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.messages.push(action.payload);
    },

    // Update message status (sent → delivered → read)
    updateMessageStatus: (
      state,
      action: PayloadAction<{ messageId: string; status: 'delivered' | 'read' }>
    ) => {
      const msg = state.messages.find((m) => m._id === action.payload.messageId);
      if (msg) msg.status = action.payload.status;
    },

    setTyping: (state, action: PayloadAction<boolean>) => {
      state.isTyping = action.payload;
    },

    clearChat: (state) => {
      state.roomId = null;
      state.messages = [];
      state.page = 1;
      state.hasMore = true;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // initChatRoom
    builder
      .addCase(initChatRoom.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(initChatRoom.fulfilled, (state, action) => {
        state.isLoading = false;
        state.roomId = action.payload.roomId;
        state.messages = action.payload.messages;
        state.hasMore = action.payload.hasMore;
        state.page = 1;
      })
      .addCase(initChatRoom.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // loadMoreMessages
    builder
      .addCase(loadMoreMessages.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadMoreMessages.fulfilled, (state, action) => {
        state.isLoading = false;
        // Prepend older messages
        state.messages = [...action.payload.messages, ...state.messages];
        state.hasMore = action.payload.hasMore;
        state.page += 1;
      })
      .addCase(loadMoreMessages.rejected, (state) => {
        state.isLoading = false;
      });

    // fetchChatRooms
    builder
      .addCase(fetchChatRooms.pending, (state) => {
        state.roomsLoading = true;
      })
      .addCase(fetchChatRooms.fulfilled, (state, action) => {
        state.roomsLoading = false;
        state.rooms = action.payload;
      })
      .addCase(fetchChatRooms.rejected, (state) => {
        state.roomsLoading = false;
      });
  },
});

export const {
  receiveMessage,
  addOptimisticMessage,
  updateMessageStatus,
  setTyping,
  clearChat,
} = providersChatSlice.actions;

export default providersChatSlice.reducer;
