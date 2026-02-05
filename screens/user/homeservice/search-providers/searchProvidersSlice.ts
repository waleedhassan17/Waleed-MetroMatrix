import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';

// Types
export interface RespondingProvider {
  id: string;
  name: string;
  image: string;
  rating: number;
  reviews: number;
  experience: string;
  specialty: string;
  distance: string;
  responseTime: string;
  estimatedPrice?: number;
  message?: string;
  respondedAt: string;
}

export interface SearchRequest {
  id: string;
  serviceType: 'electricians' | 'plumbers' | 'ac-repairers';
  jobDescription: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
}

export interface SearchingProvidersState {
  // Current search request
  currentRequest: SearchRequest | null;
  
  // Timer state
  searchTimeRemaining: number; // in seconds
  totalSearchTime: number; // in seconds (default 120 = 2 minutes)
  isSearching: boolean;
  isSearchComplete: boolean;
  
  // Responding providers
  respondingProviders: RespondingProvider[];
  maxProviders: number;
  
  // Selected provider (for communication)
  selectedProviderId: string | null;
  
  // Error state
  error: string | null;
  
  // Search cancelled
  isCancelled: boolean;
}

// Dummy provider data for simulation
const DUMMY_RESPONDING_PROVIDERS: Omit<RespondingProvider, 'respondedAt'>[] = [
  {
    id: 'resp-1',
    name: 'Ahmed Hassan',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
    rating: 4.9,
    reviews: 187,
    experience: '8 Years',
    specialty: 'Wiring & Installation',
    distance: '2.3 km',
    responseTime: '~15 min',
    estimatedPrice: 1500,
    message: 'I can help with this job. Available immediately.',
  },
  {
    id: 'resp-2',
    name: 'Muhammad Ali',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80',
    rating: 4.8,
    reviews: 142,
    experience: '6 Years',
    specialty: 'Commercial Work',
    distance: '3.1 km',
    responseTime: '~20 min',
    estimatedPrice: 1200,
    message: 'Interested in this job. Can arrive within 30 minutes.',
  },
  {
    id: 'resp-3',
    name: 'Usman Khan',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80',
    rating: 4.7,
    reviews: 98,
    experience: '5 Years',
    specialty: 'Repairs & Maintenance',
    distance: '4.5 km',
    responseTime: '~25 min',
    estimatedPrice: 1000,
    message: 'I specialize in this type of work. Let me know!',
  },
  {
    id: 'resp-4',
    name: 'Bilal Ahmed',
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&q=80',
    rating: 4.6,
    reviews: 76,
    experience: '4 Years',
    specialty: 'Residential Work',
    distance: '5.8 km',
    responseTime: '~30 min',
    estimatedPrice: 900,
    message: 'Available for this job today.',
  },
  {
    id: 'resp-5',
    name: 'Farhan Malik',
    image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&q=80',
    rating: 4.9,
    reviews: 215,
    experience: '10 Years',
    specialty: 'Industrial & Commercial',
    distance: '6.2 km',
    responseTime: '~35 min',
    estimatedPrice: 2000,
    message: 'Expert in this field. Happy to assist.',
  },
];

// Initial state
const initialState: SearchingProvidersState = {
  currentRequest: null,
  searchTimeRemaining: 120,
  totalSearchTime: 120,
  isSearching: false,
  isSearchComplete: false,
  respondingProviders: [],
  maxProviders: 5,
  selectedProviderId: null,
  error: null,
  isCancelled: false,
};

// Async Thunks

// Start the search
export const startSearch = createAsyncThunk(
  'searchingProviders/startSearch',
  async (
    params: {
      serviceType: 'electricians' | 'plumbers' | 'ac-repairers';
      jobDescription: string;
      location: string;
      latitude?: number | null;
      longitude?: number | null;
    },
    { rejectWithValue }
  ) => {
    try {
      // Simulate API call to start search
      await new Promise((resolve) => setTimeout(resolve, 500));

      const searchRequest: SearchRequest = {
        id: `search-${Date.now()}`,
        serviceType: params.serviceType,
        jobDescription: params.jobDescription,
        location: params.location,
        latitude: params.latitude || null,
        longitude: params.longitude || null,
        createdAt: new Date().toISOString(),
      };

      return searchRequest;
    } catch (error) {
      return rejectWithValue('Failed to start search. Please try again.');
    }
  }
);

// Cancel the search
export const cancelSearch = createAsyncThunk(
  'searchingProviders/cancelSearch',
  async (searchId: string, { rejectWithValue }) => {
    try {
      // Simulate API call to cancel search
      await new Promise((resolve) => setTimeout(resolve, 300));
      return searchId;
    } catch (error) {
      return rejectWithValue('Failed to cancel search.');
    }
  }
);

// Simulate provider response (for demo purposes)
export const simulateProviderResponse = createAsyncThunk(
  'searchingProviders/simulateProviderResponse',
  async (providerIndex: number, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { searchingProviders: SearchingProvidersState };
      
      if (providerIndex >= DUMMY_RESPONDING_PROVIDERS.length) {
        return rejectWithValue('No more providers');
      }

      // Check if already responded
      const provider = DUMMY_RESPONDING_PROVIDERS[providerIndex];
      const alreadyResponded = state.searchingProviders.respondingProviders.find(
        (p) => p.id === provider.id
      );

      if (alreadyResponded) {
        return rejectWithValue('Provider already responded');
      }

      const respondingProvider: RespondingProvider = {
        ...provider,
        respondedAt: new Date().toISOString(),
      };

      return respondingProvider;
    } catch (error) {
      return rejectWithValue('Failed to get provider response.');
    }
  }
);

// Select provider for communication
export const selectProviderForChat = createAsyncThunk(
  'searchingProviders/selectProviderForChat',
  async (providerId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { searchingProviders: SearchingProvidersState };
      const provider = state.searchingProviders.respondingProviders.find(
        (p) => p.id === providerId
      );

      if (!provider) {
        return rejectWithValue('Provider not found');
      }

      return provider;
    } catch (error) {
      return rejectWithValue('Failed to select provider.');
    }
  }
);

// Slice
const searchingProvidersSlice = createSlice({
  name: 'searchingProviders',
  initialState,
  reducers: {
    // Set current request (from navigation params)
    setCurrentRequest: (state, action: PayloadAction<SearchRequest>) => {
      state.currentRequest = action.payload;
      state.isSearching = true;
      state.isSearchComplete = false;
      state.isCancelled = false;
      state.searchTimeRemaining = state.totalSearchTime;
      state.respondingProviders = [];
      state.error = null;
    },

    // Update timer
    decrementTimer: (state) => {
      if (state.searchTimeRemaining > 0) {
        state.searchTimeRemaining -= 1;
      }
      if (state.searchTimeRemaining === 0) {
        state.isSearching = false;
        state.isSearchComplete = true;
      }
    },

    // Set time remaining directly
    setTimeRemaining: (state, action: PayloadAction<number>) => {
      state.searchTimeRemaining = action.payload;
    },

    // Add responding provider
    addRespondingProvider: (state, action: PayloadAction<RespondingProvider>) => {
      const exists = state.respondingProviders.find((p) => p.id === action.payload.id);
      if (!exists && state.respondingProviders.length < state.maxProviders) {
        state.respondingProviders.push(action.payload);
      }
    },

    // Remove responding provider
    removeRespondingProvider: (state, action: PayloadAction<string>) => {
      state.respondingProviders = state.respondingProviders.filter(
        (p) => p.id !== action.payload
      );
    },

    // Select provider
    setSelectedProvider: (state, action: PayloadAction<string | null>) => {
      state.selectedProviderId = action.payload;
    },

    // Complete search manually
    completeSearch: (state) => {
      state.isSearching = false;
      state.isSearchComplete = true;
    },

    // Cancel search locally
    cancelSearchLocal: (state) => {
      state.isSearching = false;
      state.isCancelled = true;
    },

    // Set error
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },

    // Clear error
    clearError: (state) => {
      state.error = null;
    },

    // Reset state
    resetSearch: () => initialState,

    // Set total search time (if needed to customize)
    setTotalSearchTime: (state, action: PayloadAction<number>) => {
      state.totalSearchTime = action.payload;
      state.searchTimeRemaining = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Start search
      .addCase(startSearch.pending, (state) => {
        state.isSearching = true;
        state.error = null;
        state.isCancelled = false;
        state.isSearchComplete = false;
        state.respondingProviders = [];
      })
      .addCase(startSearch.fulfilled, (state, action) => {
        state.currentRequest = action.payload;
        state.searchTimeRemaining = state.totalSearchTime;
      })
      .addCase(startSearch.rejected, (state, action) => {
        state.isSearching = false;
        state.error = action.payload as string;
      })

      // Cancel search
      .addCase(cancelSearch.pending, (state) => {
        state.error = null;
      })
      .addCase(cancelSearch.fulfilled, (state) => {
        state.isSearching = false;
        state.isCancelled = true;
      })
      .addCase(cancelSearch.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // Simulate provider response
      .addCase(simulateProviderResponse.fulfilled, (state, action) => {
        const exists = state.respondingProviders.find((p) => p.id === action.payload.id);
        if (!exists && state.respondingProviders.length < state.maxProviders) {
          state.respondingProviders.push(action.payload);
        }
      })

      // Select provider for chat
      .addCase(selectProviderForChat.fulfilled, (state, action) => {
        state.selectedProviderId = action.payload.id;
      });
  },
});

// Actions
export const {
  setCurrentRequest,
  decrementTimer,
  setTimeRemaining,
  addRespondingProvider,
  removeRespondingProvider,
  setSelectedProvider,
  completeSearch,
  cancelSearchLocal,
  setError,
  clearError,
  resetSearch,
  setTotalSearchTime,
} = searchingProvidersSlice.actions;

// Selectors
export const selectCurrentRequest = (state: { searchingProviders: SearchingProvidersState }) =>
  state.searchingProviders.currentRequest;

export const selectSearchTimeRemaining = (state: { searchingProviders: SearchingProvidersState }) =>
  state.searchingProviders.searchTimeRemaining;

export const selectTotalSearchTime = (state: { searchingProviders: SearchingProvidersState }) =>
  state.searchingProviders.totalSearchTime;

export const selectIsSearching = (state: { searchingProviders: SearchingProvidersState }) =>
  state.searchingProviders.isSearching;

export const selectIsSearchComplete = (state: { searchingProviders: SearchingProvidersState }) =>
  state.searchingProviders.isSearchComplete;

export const selectRespondingProviders = (state: { searchingProviders: SearchingProvidersState }) =>
  state.searchingProviders.respondingProviders;

export const selectRespondingProvidersCount = (state: { searchingProviders: SearchingProvidersState }) =>
  state.searchingProviders.respondingProviders.length;

export const selectSelectedProviderId = (state: { searchingProviders: SearchingProvidersState }) =>
  state.searchingProviders.selectedProviderId;

export const selectSelectedProvider = (state: { searchingProviders: SearchingProvidersState }) =>
  state.searchingProviders.respondingProviders.find(
    (p) => p.id === state.searchingProviders.selectedProviderId
  );

export const selectSearchError = (state: { searchingProviders: SearchingProvidersState }) =>
  state.searchingProviders.error;

export const selectIsCancelled = (state: { searchingProviders: SearchingProvidersState }) =>
  state.searchingProviders.isCancelled;

export const selectTimerProgress = (state: { searchingProviders: SearchingProvidersState }) => {
  const { searchTimeRemaining, totalSearchTime } = state.searchingProviders;
  return totalSearchTime > 0 ? (totalSearchTime - searchTimeRemaining) / totalSearchTime : 0;
};

export const selectFormattedTimeRemaining = (state: { searchingProviders: SearchingProvidersState }) => {
  const seconds = state.searchingProviders.searchTimeRemaining;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Export dummy providers for testing
export const getDummyProviders = () => DUMMY_RESPONDING_PROVIDERS;

export default searchingProvidersSlice.reducer;