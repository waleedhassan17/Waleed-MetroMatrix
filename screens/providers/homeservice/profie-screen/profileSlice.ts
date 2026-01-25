import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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
    id: '1',
    name: 'Waleed Hassan',
    email: 'waleed@gmail.com',
    category: 'Service Provider',
    location: 'Lahore, Punjab',
    profileImage: null,
    jobsDone: 247,
    rating: 4.8,
    earnings: '45K',
    reviews: 189,
    points: 240,
    membershipLevel: 'Verified Professional',
    isVerified: true,
    joinedDate: '2023-01-15',
    phone: '+92 300 1234567',
    bio: 'Professional service provider with 5+ years of experience',
  },
  isAvailable: true,
  notificationsEnabled: true,
  isDarkMode: false,
  isUrdu: false,
  loading: false,
  error: null,
};

const providerProfileSlice = createSlice({
  name: 'providerProfile',
  initialState,
  reducers: {
    setProvider: (state, action: PayloadAction<Provider>) => {
      state.provider = action.payload;
    },
    updateProvider: (state, action: PayloadAction<Partial<Provider>>) => {
      state.provider = { ...state.provider, ...action.payload };
    },
    updateProfileImage: (state, action: PayloadAction<string>) => {
      state.provider.profileImage = action.payload;
    },
    toggleAvailability: (state) => {
      state.isAvailable = !state.isAvailable;
    },
    setAvailability: (state, action: PayloadAction<boolean>) => {
      state.isAvailable = action.payload;
    },
    toggleNotifications: (state) => {
      state.notificationsEnabled = !state.notificationsEnabled;
    },
    setNotifications: (state, action: PayloadAction<boolean>) => {
      state.notificationsEnabled = action.payload;
    },
    toggleDarkMode: (state) => {
      state.isDarkMode = !state.isDarkMode;
    },
    setDarkMode: (state, action: PayloadAction<boolean>) => {
      state.isDarkMode = action.payload;
    },
    toggleLanguage: (state) => {
      state.isUrdu = !state.isUrdu;
    },
    setLanguage: (state, action: PayloadAction<boolean>) => {
      state.isUrdu = action.payload;
    },
    updateJobStats: (state, action: PayloadAction<{ 
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
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    resetProfile: () => {
      return initialState;
    },
  },
});

export const {
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
export const selectProvider = (state: { providerProfile: ProviderProfileState }) => 
  state.providerProfile.provider;
export const selectIsAvailable = (state: { providerProfile: ProviderProfileState }) => 
  state.providerProfile.isAvailable;
export const selectNotificationsEnabled = (state: { providerProfile: ProviderProfileState }) => 
  state.providerProfile.notificationsEnabled;
export const selectIsDarkMode = (state: { providerProfile: ProviderProfileState }) => 
  state.providerProfile.isDarkMode;
export const selectIsUrdu = (state: { providerProfile: ProviderProfileState }) => 
  state.providerProfile.isUrdu;
export const selectLoading = (state: { providerProfile: ProviderProfileState }) => 
  state.providerProfile.loading;
export const selectError = (state: { providerProfile: ProviderProfileState }) => 
  state.providerProfile.error;

export type RootState = {
  providerProfile: ProviderProfileState;
};

export default providerProfileSlice.reducer;