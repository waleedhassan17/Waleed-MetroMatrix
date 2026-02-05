import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';

// Types
export interface ChatMessage {
  id: string;
  senderId: string;
  senderType: 'user' | 'provider';
  text: string;
  timestamp: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  messageType: 'text' | 'image' | 'location' | 'system';
  imageUrl?: string;
}

export interface ProviderInfo {
  id: string;
  name: string;
  image: string;
  rating: number;
  reviews: number;
  experience: string;
  specialty: string;
  phone?: string;
  isOnline: boolean;
}

export interface JobDetails {
  id: string;
  serviceType: 'electricians' | 'plumbers' | 'ac-repairers';
  description: string;
  location: string;
  estimatedPrice?: number;
  scheduledDate?: string;
  scheduledTime?: string;
}

export interface BookingDetails {
  id: string;
  providerId: string;
  providerName: string;
  jobDetails: JobDetails;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  confirmedAt?: string;
  completedAt?: string;
  totalPrice?: number;
}

export interface ProviderChatState {
  // Provider info
  provider: ProviderInfo | null;
  
  // Job details
  jobDetails: JobDetails | null;
  
  // Chat messages
  messages: ChatMessage[];
  
  // Typing indicator
  isProviderTyping: boolean;
  
  // Booking state
  booking: BookingDetails | null;
  isBookingConfirmed: boolean;
  showBookingBanner: boolean;
  showConfirmationModal: boolean;
  
  // Loading states
  isLoading: boolean;
  isSending: boolean;
  isConfirmingBooking: boolean;
  
  // Error state
  error: string | null;
}

// Auto-response messages for simulation
const AUTO_RESPONSES = [
  "I've received your message. Let me check and get back to you.",
  "Thank you for the details. I can definitely help with this.",
  "I'm available to come over. What time works best for you?",
  "I'll bring all the necessary tools and equipment.",
  "My estimated price includes labor and basic materials.",
  "I have great reviews for similar jobs. You can trust my work.",
  "I can offer you a discount if you book now.",
  "Let me know if you have any other questions.",
];

// Initial state
const initialState: ProviderChatState = {
  provider: null,
  jobDetails: null,
  messages: [],
  isProviderTyping: false,
  booking: null,
  isBookingConfirmed: false,
  showBookingBanner: true,
  showConfirmationModal: false,
  isLoading: false,
  isSending: false,
  isConfirmingBooking: false,
  error: null,
};

// Async Thunks

// Initialize chat
export const initializeChat = createAsyncThunk(
  'providerChat/initializeChat',
  async (
    params: {
      provider: ProviderInfo;
      jobDetails: JobDetails;
    },
    { rejectWithValue }
  ) => {
    try {
      // Simulate API call to initialize/load chat
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Create initial system message
      const initialMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        senderId: 'system',
        senderType: 'provider',
        text: `You are now connected with ${params.provider.name}. Discuss your job requirements and confirm booking when ready.`,
        timestamp: new Date().toISOString(),
        status: 'delivered',
        messageType: 'system',
      };

      return {
        provider: params.provider,
        jobDetails: params.jobDetails,
        initialMessage,
      };
    } catch (error) {
      return rejectWithValue('Failed to initialize chat.');
    }
  }
);

// Send message
export const sendMessage = createAsyncThunk(
  'providerChat/sendMessage',
  async (text: string, { getState, dispatch, rejectWithValue }) => {
    try {
      const state = getState() as { providerChat: ProviderChatState };
      
      if (!text.trim()) {
        return rejectWithValue('Message cannot be empty.');
      }

      // Create user message
      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        senderId: 'user',
        senderType: 'user',
        text: text.trim(),
        timestamp: new Date().toISOString(),
        status: 'sending',
        messageType: 'text',
      };

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Simulate provider typing after user sends message
      setTimeout(() => {
        dispatch(setProviderTyping(true));
        
        // Simulate provider response after typing
        setTimeout(() => {
          dispatch(setProviderTyping(false));
          
          const randomResponse = AUTO_RESPONSES[Math.floor(Math.random() * AUTO_RESPONSES.length)];
          const providerMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            senderId: state.providerChat.provider?.id || 'provider',
            senderType: 'provider',
            text: randomResponse,
            timestamp: new Date().toISOString(),
            status: 'delivered',
            messageType: 'text',
          };
          
          dispatch(addMessage(providerMessage));
        }, 2000 + Math.random() * 2000); // Random delay 2-4 seconds
      }, 1000);

      return {
        ...userMessage,
        status: 'sent' as const,
      };
    } catch (error) {
      return rejectWithValue('Failed to send message.');
    }
  }
);

// Confirm booking
export const confirmBooking = createAsyncThunk(
  'providerChat/confirmBooking',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { providerChat: ProviderChatState };
      const { provider, jobDetails } = state.providerChat;

      if (!provider || !jobDetails) {
        return rejectWithValue('Missing provider or job details.');
      }

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const booking: BookingDetails = {
        id: `booking-${Date.now()}`,
        providerId: provider.id,
        providerName: provider.name,
        jobDetails,
        status: 'confirmed',
        confirmedAt: new Date().toISOString(),
      };

      // Create system message for booking confirmation
      const confirmationMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        senderId: 'system',
        senderType: 'provider',
        text: `🎉 Booking confirmed! ${provider.name} will arrive at your location as scheduled. You can contact them directly if needed.`,
        timestamp: new Date().toISOString(),
        status: 'delivered',
        messageType: 'system',
      };

      return {
        booking,
        confirmationMessage,
      };
    } catch (error) {
      return rejectWithValue('Failed to confirm booking.');
    }
  }
);

// Cancel booking
export const cancelBooking = createAsyncThunk(
  'providerChat/cancelBooking',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { providerChat: ProviderChatState };
      
      if (!state.providerChat.booking) {
        return rejectWithValue('No booking to cancel.');
      }

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      return state.providerChat.booking.id;
    } catch (error) {
      return rejectWithValue('Failed to cancel booking.');
    }
  }
);

// Call provider
export const callProvider = createAsyncThunk(
  'providerChat/callProvider',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { providerChat: ProviderChatState };
      
      if (!state.providerChat.provider?.phone) {
        return rejectWithValue('Provider phone number not available.');
      }

      // In real app, would initiate phone call
      return state.providerChat.provider.phone;
    } catch (error) {
      return rejectWithValue('Failed to initiate call.');
    }
  }
);

// Slice
const providerChatSlice = createSlice({
  name: 'providerChat',
  initialState,
  reducers: {
    // Set provider info
    setProvider: (state, action: PayloadAction<ProviderInfo>) => {
      state.provider = action.payload;
    },

    // Set job details
    setJobDetails: (state, action: PayloadAction<JobDetails>) => {
      state.jobDetails = action.payload;
    },

    // Add message
    addMessage: (state, action: PayloadAction<ChatMessage>) => {
      const exists = state.messages.find((m) => m.id === action.payload.id);
      if (!exists) {
        state.messages.push(action.payload);
      }
    },

    // Update message status
    updateMessageStatus: (
      state,
      action: PayloadAction<{ messageId: string; status: ChatMessage['status'] }>
    ) => {
      const message = state.messages.find((m) => m.id === action.payload.messageId);
      if (message) {
        message.status = action.payload.status;
      }
    },

    // Set provider typing
    setProviderTyping: (state, action: PayloadAction<boolean>) => {
      state.isProviderTyping = action.payload;
    },

    // Show/hide booking banner
    setShowBookingBanner: (state, action: PayloadAction<boolean>) => {
      state.showBookingBanner = action.payload;
    },

    // Show/hide confirmation modal
    setShowConfirmationModal: (state, action: PayloadAction<boolean>) => {
      state.showConfirmationModal = action.payload;
    },

    // Dismiss booking banner
    dismissBookingBanner: (state) => {
      state.showBookingBanner = false;
    },

    // Clear error
    clearError: (state) => {
      state.error = null;
    },

    // Reset chat state
    resetChat: () => initialState,

    // Mark all messages as read
    markAllAsRead: (state) => {
      state.messages.forEach((message) => {
        if (message.senderType === 'provider' && message.status !== 'read') {
          message.status = 'read';
        }
      });
    },
  },
  extraReducers: (builder) => {
    builder
      // Initialize chat
      .addCase(initializeChat.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(initializeChat.fulfilled, (state, action) => {
        state.isLoading = false;
        state.provider = action.payload.provider;
        state.jobDetails = action.payload.jobDetails;
        state.messages = [action.payload.initialMessage];
        state.isBookingConfirmed = false;
        state.showBookingBanner = true;
        state.booking = null;
      })
      .addCase(initializeChat.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Send message
      .addCase(sendMessage.pending, (state) => {
        state.isSending = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.isSending = false;
        // Add user message to the list
        const exists = state.messages.find((m) => m.id === action.payload.id);
        if (!exists) {
          state.messages.push(action.payload);
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.isSending = false;
        state.error = action.payload as string;
      })

      // Confirm booking
      .addCase(confirmBooking.pending, (state) => {
        state.isConfirmingBooking = true;
        state.error = null;
      })
      .addCase(confirmBooking.fulfilled, (state, action) => {
        state.isConfirmingBooking = false;
        state.booking = action.payload.booking;
        state.isBookingConfirmed = true;
        state.showBookingBanner = false;
        state.showConfirmationModal = false;
        // Add confirmation message
        state.messages.push(action.payload.confirmationMessage);
      })
      .addCase(confirmBooking.rejected, (state, action) => {
        state.isConfirmingBooking = false;
        state.error = action.payload as string;
      })

      // Cancel booking
      .addCase(cancelBooking.fulfilled, (state) => {
        state.booking = null;
        state.isBookingConfirmed = false;
        state.showBookingBanner = true;
      })
      .addCase(cancelBooking.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

// Actions
export const {
  setProvider,
  setJobDetails,
  addMessage,
  updateMessageStatus,
  setProviderTyping,
  setShowBookingBanner,
  setShowConfirmationModal,
  dismissBookingBanner,
  clearError,
  resetChat,
  markAllAsRead,
} = providerChatSlice.actions;

// Selectors
export const selectProvider = (state: { providerChat: ProviderChatState }) =>
  state.providerChat.provider;

export const selectJobDetails = (state: { providerChat: ProviderChatState }) =>
  state.providerChat.jobDetails;

export const selectMessages = (state: { providerChat: ProviderChatState }) =>
  state.providerChat.messages;

export const selectIsProviderTyping = (state: { providerChat: ProviderChatState }) =>
  state.providerChat.isProviderTyping;

export const selectBooking = (state: { providerChat: ProviderChatState }) =>
  state.providerChat.booking;

export const selectIsBookingConfirmed = (state: { providerChat: ProviderChatState }) =>
  state.providerChat.isBookingConfirmed;

export const selectShowBookingBanner = (state: { providerChat: ProviderChatState }) =>
  state.providerChat.showBookingBanner;

export const selectShowConfirmationModal = (state: { providerChat: ProviderChatState }) =>
  state.providerChat.showConfirmationModal;

export const selectIsLoading = (state: { providerChat: ProviderChatState }) =>
  state.providerChat.isLoading;

export const selectIsSending = (state: { providerChat: ProviderChatState }) =>
  state.providerChat.isSending;

export const selectIsConfirmingBooking = (state: { providerChat: ProviderChatState }) =>
  state.providerChat.isConfirmingBooking;

export const selectChatError = (state: { providerChat: ProviderChatState }) =>
  state.providerChat.error;

export const selectUnreadCount = (state: { providerChat: ProviderChatState }) =>
  state.providerChat.messages.filter(
    (m) => m.senderType === 'provider' && m.status !== 'read'
  ).length;

export const selectLastMessage = (state: { providerChat: ProviderChatState }) =>
  state.providerChat.messages[state.providerChat.messages.length - 1];

export default providerChatSlice.reducer;