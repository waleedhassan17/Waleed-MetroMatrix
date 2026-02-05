import { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '../../../../store/createAppSlice';
import {
  fetchProviderProfile,
  updateProviderProfile,
  updateProviderOnlineStatus,
} from '../../../../networks/serviceProviders/providerNetwork';
import { providerDetailsSerializer } from '../../../../serializers/serviceProviders';
import type { ProviderDetails } from '../../../../models/serviceProviders';

export interface Provider {
  id: string;
  name: string;
  email: string;
  category: string;
  location: string;
  profileImage: string | null;
  jobsDone: number;
  rating: number;
  earnings: string;
  reviews: number;
  points: number;
  membershipLevel: string;
  isVerified: boolean;
  joinedDate: string;
  phone?: string;
  bio?: string;
}

export interface ProviderProfileState {
  provider: Provider;
  isAvailable: boolean;
  notificationsEnabled: boolean;
  isDarkMode: boolean;
  isUrdu: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: ProviderProfileState = {
  provider: {
    id: '',
    name: '',
    email: '',
    category: '',
    location: '',
    profileImage: null,
    jobsDone: 0,
    rating: 0,
    earnings: '0',
    reviews: 0,
    points: 0,
    membershipLevel: '',
    isVerified: false,
    joinedDate: '',
    phone: '',
    bio: '',
  },
  isAvailable: false,
  notificationsEnabled: true,
  isDarkMode: false,
  isUrdu: false,
  loading: false,
  error: null,
};

// Helper function to map API provider to local format
const mapApiProviderToLocal = (apiData: ProviderDetails): Provider => ({
  id: apiData.id,
  name: apiData.name,
  email: apiData.email,
  category: apiData.category,
  location: apiData.address,
  profileImage: apiData.image,
  jobsDone: apiData.completedJobs,
  rating: apiData.rating,
  earnings: '0K', // Will be fetched from earnings API
  reviews: apiData.reviews,
  points: 0, // Will be fetched separately if needed
  membershipLevel: apiData.verified ? 'Verified Professional' : 'Standard',
  isVerified: apiData.verified,
  joinedDate: apiData.createdAt,
  phone: apiData.phoneNumber,
  bio: apiData.bio,
});

const providerProfileSlice = createAppSlice({
  name: 'providerProfile',
  initialState,
  reducers: (create) => ({
    // Async Thunks
    fetchProfile: create.asyncThunk(
      async (_params: void, { rejectWithValue }) => {
        const response = await fetchProviderProfile();
        if (!response.success || !response.data) {
          return rejectWithValue(response.message || 'Failed to fetch profile');
        }
        const serialized = providerDetailsSerializer(response.data);
        return {
          provider: mapApiProviderToLocal(serialized),
          isAvailable: serialized.isOnline,
        };
      },
      {
        pending: (state) => {
          state.loading = true;
          state.error = null;
        },
        fulfilled: (state, action) => {
          state.loading = false;
          state.provider = action.payload.provider;
          state.isAvailable = action.payload.isAvailable;
        },
        rejected: (state, action) => {
          state.loading = false;
          state.error = action.payload as string;
        },
      }
    ),

    updateProfile: create.asyncThunk(
      async (params: { updates: Partial<Provider> }, { rejectWithValue }) => {
        const response = await updateProviderProfile({
          name: params.updates.name,
          phoneNumber: params.updates.phone,
          bio: params.updates.bio,
          address: params.updates.location,
          image: params.updates.profileImage || undefined,
        });
        if (!response.success) {
          return rejectWithValue(response.message || 'Failed to update profile');
        }
        return params.updates;
      },
      {
        pending: (state) => {
          state.loading = true;
          state.error = null;
        },
        fulfilled: (state, action) => {
          state.loading = false;
          state.provider = { ...state.provider, ...action.payload };
        },
        rejected: (state, action) => {
          state.loading = false;
          state.error = action.payload as string;
        },
      }
    ),

    updateAvailability: create.asyncThunk(
      async (params: { isOnline: boolean }, { rejectWithValue }) => {
        const response = await updateProviderOnlineStatus(params.isOnline);
        if (!response.success) {
          return rejectWithValue(response.message || 'Failed to update availability');
        }
        return params.isOnline;
      },
      {
        pending: (state) => {
          state.error = null;
        },
        fulfilled: (state, action) => {
          state.isAvailable = action.payload;
        },
        rejected: (state, action) => {
          state.error = action.payload as string;
        },
      }
    ),

    // Sync reducers
    setProvider: create.reducer((state, action: PayloadAction<Provider>) => {
      state.provider = action.payload;
    }),

    updateProvider: create.reducer((state, action: PayloadAction<Partial<Provider>>) => {
      state.provider = { ...state.provider, ...action.payload };
    }),

    updateProfileImage: create.reducer((state, action: PayloadAction<string>) => {
      state.provider.profileImage = action.payload;
    }),

    toggleAvailability: create.reducer((state) => {
      state.isAvailable = !state.isAvailable;
    }),

    setAvailability: create.reducer((state, action: PayloadAction<boolean>) => {
      state.isAvailable = action.payload;
    }),

    toggleNotifications: create.reducer((state) => {
      state.notificationsEnabled = !state.notificationsEnabled;
    }),

    setNotifications: create.reducer((state, action: PayloadAction<boolean>) => {
      state.notificationsEnabled = action.payload;
    }),

    toggleDarkMode: create.reducer((state) => {
      state.isDarkMode = !state.isDarkMode;
    }),

    setDarkMode: create.reducer((state, action: PayloadAction<boolean>) => {
      state.isDarkMode = action.payload;
    }),

    toggleLanguage: create.reducer((state) => {
      state.isUrdu = !state.isUrdu;
    }),

    setLanguage: create.reducer((state, action: PayloadAction<boolean>) => {
      state.isUrdu = action.payload;
    }),

    updateJobStats: create.reducer((state, action: PayloadAction<{ 
      jobsDone?: number; 
      rating?: number; 
      earnings?: string; 
      reviews?: number;
      points?: number;
    }>) => {
      if (action.payload.jobsDone !== undefined) {
        state.provider.jobsDone = action.payload.jobsDone;
      }
      if (action.payload.rating !== undefined) {
        state.provider.rating = action.payload.rating;
      }
      if (action.payload.earnings !== undefined) {
        state.provider.earnings = action.payload.earnings;
      }
      if (action.payload.reviews !== undefined) {
        state.provider.reviews = action.payload.reviews;
      }
      if (action.payload.points !== undefined) {
        state.provider.points = action.payload.points;
      }
    }),

    setLoading: create.reducer((state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    }),

    setError: create.reducer((state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    }),

    resetProfile: create.reducer(() => {
      return initialState;
    }),
  }),
  selectors: {
    selectProvider: (state) => state.provider,
    selectIsAvailable: (state) => state.isAvailable,
    selectNotificationsEnabled: (state) => state.notificationsEnabled,
    selectIsDarkMode: (state) => state.isDarkMode,
    selectIsUrdu: (state) => state.isUrdu,
    selectLoading: (state) => state.loading,
    selectError: (state) => state.error,
  },
});

export const {
  fetchProfile,
  updateProfile,
  updateAvailability,
  setProvider,
  updateProvider,
  updateProfileImage,
  toggleAvailability,
  setAvailability,
  toggleNotifications,
  setNotifications,
  toggleDarkMode,
  setDarkMode,
  toggleLanguage,
  setLanguage,
  updateJobStats,
  setLoading,
  setError,
  resetProfile,
} = providerProfileSlice.actions;

// Selectors
export const {
  selectProvider,
  selectIsAvailable,
  selectNotificationsEnabled,
  selectIsDarkMode,
  selectIsUrdu,
  selectLoading,
  selectError,
} = providerProfileSlice.selectors;

export type RootState = {
  providerProfile: ProviderProfileState;
};

export default providerProfileSlice.reducer;