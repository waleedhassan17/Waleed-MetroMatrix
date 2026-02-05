import { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '../../../../store/createAppSlice';
import {
  fetchChatData,
  sendChatMessage,
} from '../../../../networks/serviceProviders/chatNetwork';
import {
  createBooking,
} from '../../../../networks/serviceProviders/bookingNetwork';
import {
  chatDataSerializer,
} from '../../../../serializers/serviceProviders/chatSerializer';

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

// Helper to map API chat data to local format
const mapApiChatToLocal = (apiData: ReturnType<typeof chatDataSerializer>) => {
  const provider: ProviderInfo = {
    id: apiData.participants.provider.id,
    name: apiData.participants.provider.name,
    image: apiData.participants.provider.image || '',
    rating: 0,
    reviews: 0,
    experience: '',
    specialty: '',
    phone: '',
    isOnline: true,
  };

  const messages: ChatMessage[] = apiData.messages.map((msg) => ({
    id: msg.id,
    senderId: msg.sender === 'user' ? 'user' : apiData.participants.provider.id,
    senderType: msg.sender as ChatMessage['senderType'],
    text: msg.text,
    timestamp: msg.timestamp,
    status: msg.status as ChatMessage['status'],
    messageType: 'text' as ChatMessage['messageType'],
    imageUrl: undefined,
  }));

  return { provider, messages };
};

// Slice
const providerChatSlice = createAppSlice({
  name: 'providerChat',
  initialState,
  reducers: (create) => ({
    // Async Thunks
    initializeChat: create.asyncThunk(
      async (
        params: { provider: ProviderInfo; jobDetails: JobDetails },
        { rejectWithValue }
      ) => {
        try {
          const response = await fetchChatData(params.provider.id);
          
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

          if (response.success && response.data) {
            const serialized = chatDataSerializer(response.data);
            const { messages } = mapApiChatToLocal(serialized);
            return {
              provider: params.provider,
              jobDetails: params.jobDetails,
              messages: [initialMessage, ...messages],
            };
          }

          return {
            provider: params.provider,
            jobDetails: params.jobDetails,
            messages: [initialMessage],
          };
        } catch (error) {
          return rejectWithValue('Failed to initialize chat.');
        }
      },
      {
        pending: (state) => {
          state.isLoading = true;
          state.error = null;
        },
        fulfilled: (state, action) => {
          state.isLoading = false;
          state.provider = action.payload.provider;
          state.jobDetails = action.payload.jobDetails;
          state.messages = action.payload.messages;
          state.isBookingConfirmed = false;
          state.showBookingBanner = true;
          state.booking = null;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.payload as string;
        },
      }
    ),

    sendMessageAsync: create.asyncThunk(
      async (text: string, { getState, dispatch, rejectWithValue }) => {
        try {
          const state = getState() as { providerChat: ProviderChatState };
          
          if (!text.trim()) {
            return rejectWithValue('Message cannot be empty.');
          }

          const userMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            senderId: 'user',
            senderType: 'user',
            text: text.trim(),
            timestamp: new Date().toISOString(),
            status: 'sending',
            messageType: 'text',
          };

          // Send to API
          const response = await sendChatMessage({
            bookingId: state.providerChat.provider?.id || '',
            message: text.trim(),
          });

          // Simulate provider typing after user sends message
          setTimeout(() => {
            dispatch(providerChatSlice.actions.setProviderTyping(true));
            
            setTimeout(() => {
              dispatch(providerChatSlice.actions.setProviderTyping(false));
              
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
              
              dispatch(providerChatSlice.actions.addMessage(providerMessage));
            }, 2000 + Math.random() * 2000);
          }, 1000);

          return {
            ...userMessage,
            status: 'sent' as const,
          };
        } catch (error) {
          return rejectWithValue('Failed to send message.');
        }
      },
      {
        pending: (state) => {
          state.isSending = true;
          state.error = null;
        },
        fulfilled: (state, action) => {
          state.isSending = false;
          const exists = state.messages.find((m) => m.id === action.payload.id);
          if (!exists) {
            state.messages.push(action.payload);
          }
        },
        rejected: (state, action) => {
          state.isSending = false;
          state.error = action.payload as string;
        },
      }
    ),

    confirmBookingAsync: create.asyncThunk(
      async (_, { getState, rejectWithValue }) => {
        try {
          const state = getState() as { providerChat: ProviderChatState };
          const { provider, jobDetails } = state.providerChat;

          if (!provider || !jobDetails) {
            return rejectWithValue('Missing provider or job details.');
          }

          const response = await createBooking({
            providerId: provider.id,
            selectedDate: jobDetails.scheduledDate || new Date().toISOString().split('T')[0],
            selectedTime: jobDetails.scheduledTime || '10:00',
            addressId: 'default-address',
            instructions: jobDetails.description,
          });

          if (!response.success) {
            return rejectWithValue(response.message || 'Failed to confirm booking.');
          }

          const booking: BookingDetails = {
            id: response.data?.bookingId || `booking-${Date.now()}`,
            providerId: provider.id,
            providerName: provider.name,
            jobDetails,
            status: 'confirmed',
            confirmedAt: new Date().toISOString(),
          };

          const confirmationMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            senderId: 'system',
            senderType: 'provider',
            text: `🎉 Booking confirmed! ${provider.name} will arrive at your location as scheduled. You can contact them directly if needed.`,
            timestamp: new Date().toISOString(),
            status: 'delivered',
            messageType: 'system',
          };

          return { booking, confirmationMessage };
        } catch (error) {
          return rejectWithValue('Failed to confirm booking.');
        }
      },
      {
        pending: (state) => {
          state.isConfirmingBooking = true;
          state.error = null;
        },
        fulfilled: (state, action) => {
          state.isConfirmingBooking = false;
          state.booking = action.payload.booking;
          state.isBookingConfirmed = true;
          state.showBookingBanner = false;
          state.showConfirmationModal = false;
          state.messages.push(action.payload.confirmationMessage);
        },
        rejected: (state, action) => {
          state.isConfirmingBooking = false;
          state.error = action.payload as string;
        },
      }
    ),

    cancelBookingAsync: create.asyncThunk(
      async (_, { getState, rejectWithValue }) => {
        try {
          const state = getState() as { providerChat: ProviderChatState };
          
          if (!state.providerChat.booking) {
            return rejectWithValue('No booking to cancel.');
          }

          await new Promise((resolve) => setTimeout(resolve, 500));
          return state.providerChat.booking.id;
        } catch (error) {
          return rejectWithValue('Failed to cancel booking.');
        }
      },
      {
        fulfilled: (state) => {
          state.booking = null;
          state.isBookingConfirmed = false;
          state.showBookingBanner = true;
        },
        rejected: (state, action) => {
          state.error = action.payload as string;
        },
      }
    ),

    // Sync reducers
    setProvider: create.reducer((state, action: PayloadAction<ProviderInfo>) => {
      state.provider = action.payload;
    }),

    setJobDetails: create.reducer((state, action: PayloadAction<JobDetails>) => {
      state.jobDetails = action.payload;
    }),

    addMessage: create.reducer((state, action: PayloadAction<ChatMessage>) => {
      const exists = state.messages.find((m) => m.id === action.payload.id);
      if (!exists) {
        state.messages.push(action.payload);
      }
    }),

    updateMessageStatus: create.reducer(
      (state, action: PayloadAction<{ messageId: string; status: ChatMessage['status'] }>) => {
        const message = state.messages.find((m) => m.id === action.payload.messageId);
        if (message) {
          message.status = action.payload.status;
        }
      }
    ),

    setProviderTyping: create.reducer((state, action: PayloadAction<boolean>) => {
      state.isProviderTyping = action.payload;
    }),

    setShowBookingBanner: create.reducer((state, action: PayloadAction<boolean>) => {
      state.showBookingBanner = action.payload;
    }),

    setShowConfirmationModal: create.reducer((state, action: PayloadAction<boolean>) => {
      state.showConfirmationModal = action.payload;
    }),

    dismissBookingBanner: create.reducer((state) => {
      state.showBookingBanner = false;
    }),

    clearError: create.reducer((state) => {
      state.error = null;
    }),

    resetChat: create.reducer(() => initialState),

    markAllAsRead: create.reducer((state) => {
      state.messages.forEach((message) => {
        if (message.senderType === 'provider' && message.status !== 'read') {
          message.status = 'read';
        }
      });
    }),
  }),
  selectors: {
    selectProvider: (state) => state.provider,
    selectJobDetails: (state) => state.jobDetails,
    selectMessages: (state) => state.messages,
    selectIsProviderTyping: (state) => state.isProviderTyping,
    selectBooking: (state) => state.booking,
    selectIsBookingConfirmed: (state) => state.isBookingConfirmed,
    selectShowBookingBanner: (state) => state.showBookingBanner,
    selectShowConfirmationModal: (state) => state.showConfirmationModal,
    selectIsLoading: (state) => state.isLoading,
    selectIsSending: (state) => state.isSending,
    selectIsConfirmingBooking: (state) => state.isConfirmingBooking,
    selectChatError: (state) => state.error,
  },
});

// Actions
export const {
  initializeChat,
  sendMessageAsync,
  confirmBookingAsync,
  cancelBookingAsync,
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

// Legacy action aliases for backward compatibility
export const sendMessage = sendMessageAsync;
export const confirmBooking = confirmBookingAsync;
export const cancelBooking = cancelBookingAsync;

// Selectors
export const {
  selectProvider,
  selectJobDetails,
  selectMessages,
  selectIsProviderTyping,
  selectBooking,
  selectIsBookingConfirmed,
  selectShowBookingBanner,
  selectShowConfirmationModal,
  selectIsLoading,
  selectIsSending,
  selectIsConfirmingBooking,
  selectChatError,
} = providerChatSlice.selectors;

// Computed selectors
export const selectUnreadCount = (state: { providerChat: ProviderChatState }) =>
  state.providerChat.messages.filter(
    (m) => m.senderType === 'provider' && m.status !== 'read'
  ).length;

export const selectLastMessage = (state: { providerChat: ProviderChatState }) =>
  state.providerChat.messages[state.providerChat.messages.length - 1];

export default providerChatSlice.reducer;