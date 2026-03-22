import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// ── Types ───────────────────────────────────

export type MessageType = 'text' | 'image' | 'file';

export interface Attachment {
  uri: string;
  name: string;
  mimeType: string;
  size: number; // bytes
}

export interface InCallMessage {
  id: string;
  senderId: string;
  senderName: string;
  type: MessageType;
  text: string;
  attachment?: Attachment;
  timestamp: string;
}

// ── State ───────────────────────────────────

interface InCallChatState {
  messages: InCallMessage[];
  inputText: string;
  sending: boolean;
  error: string | null;
}

const initialState: InCallChatState = {
  messages: [],
  inputText: '',
  sending: false,
  error: null,
};

// ── Slice ───────────────────────────────────

const inCallChatSlice = createSlice({
  name: 'inCallChat',
  initialState,
  reducers: {
    setInputText(state, action: PayloadAction<string>) {
      state.inputText = action.payload;
    },

    sendMessageStart(state) {
      state.sending = true;
      state.error = null;
    },
    sendMessageSuccess(state, action: PayloadAction<InCallMessage>) {
      state.messages.push(action.payload);
      state.inputText = '';
      state.sending = false;
    },
    sendMessageFailure(state, action: PayloadAction<string>) {
      state.sending = false;
      state.error = action.payload;
    },

    receiveMessage(state, action: PayloadAction<InCallMessage>) {
      state.messages.push(action.payload);
    },

    clearChat() {
      return initialState;
    },
  },
});

export const {
  setInputText,
  sendMessageStart,
  sendMessageSuccess,
  sendMessageFailure,
  receiveMessage,
  clearChat,
} = inCallChatSlice.actions;

export default inCallChatSlice.reducer;
