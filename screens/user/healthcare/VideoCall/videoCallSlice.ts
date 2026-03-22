import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// ── Types ───────────────────────────────────

export type CallStatus =
  | 'idle'
  | 'connecting'
  | 'reconnecting'
  | 'connected'
  | 'ended'
  | 'failed';

export type NetworkQuality = 'excellent' | 'good' | 'poor' | 'disconnected';

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
}

// ── State ───────────────────────────────────

interface VideoCallState {
  callId: string | null;
  callStatus: CallStatus;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isSpeakerOn: boolean;
  duration: number; // seconds
  chatMessages: ChatMessage[];
  networkQuality: NetworkQuality;
  reconnectAttempts: number;
  error: string | null;
}

const MAX_RECONNECT_ATTEMPTS = 5;

const initialState: VideoCallState = {
  callId: null,
  callStatus: 'idle',
  isMuted: false,
  isVideoEnabled: true,
  isSpeakerOn: true,
  duration: 0,
  chatMessages: [],
  networkQuality: 'good',
  reconnectAttempts: 0,
  error: null,
};

// ── Slice ───────────────────────────────────

const videoCallSlice = createSlice({
  name: 'videoCall',
  initialState,
  reducers: {
    // Connection lifecycle
    startConnecting(state, action: PayloadAction<string>) {
      state.callId = action.payload;
      state.callStatus = 'connecting';
      state.error = null;
    },
    connectionEstablished(state) {
      state.callStatus = 'connected';
      state.reconnectAttempts = 0;
      state.error = null;
    },
    startReconnecting(state) {
      if (state.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        state.callStatus = 'reconnecting';
        state.reconnectAttempts += 1;
      } else {
        state.callStatus = 'failed';
        state.error = 'Connection lost. Maximum reconnection attempts reached.';
      }
    },
    connectionFailed(state, action: PayloadAction<string>) {
      state.callStatus = 'failed';
      state.error = action.payload;
    },

    // Call controls
    toggleMute(state) {
      state.isMuted = !state.isMuted;
    },
    toggleVideo(state) {
      state.isVideoEnabled = !state.isVideoEnabled;
    },
    toggleSpeaker(state) {
      state.isSpeakerOn = !state.isSpeakerOn;
    },

    // Status & duration
    updateCallStatus(state, action: PayloadAction<CallStatus>) {
      state.callStatus = action.payload;
    },
    updateDuration(state, action: PayloadAction<number>) {
      state.duration = action.payload;
    },
    updateNetworkQuality(state, action: PayloadAction<NetworkQuality>) {
      state.networkQuality = action.payload;
    },

    // Chat
    sendChatMessage(state, action: PayloadAction<ChatMessage>) {
      state.chatMessages.push(action.payload);
    },
    receiveChatMessage(state, action: PayloadAction<ChatMessage>) {
      state.chatMessages.push(action.payload);
    },

    // End / Reset
    endCall(state) {
      state.callStatus = 'ended';
    },
    resetCall() {
      return initialState;
    },
  },
});

export const {
  startConnecting,
  connectionEstablished,
  startReconnecting,
  connectionFailed,
  toggleMute,
  toggleVideo,
  toggleSpeaker,
  updateCallStatus,
  updateDuration,
  updateNetworkQuality,
  sendChatMessage,
  receiveChatMessage,
  endCall,
  resetCall,
} = videoCallSlice.actions;

export default videoCallSlice.reducer;
