import { PayloadAction, createSelector } from '@reduxjs/toolkit';
import { createAppSlice } from '../../../../store/createAppSlice';

// Types
export interface UserAddress {
  id: string;
  label: 'home' | 'work' | 'other';
  address: string;
  city: string;
  postalCode?: string;
  isDefault: boolean;
}

export interface UserStats {
  totalBookings: number;
  homeServiceBookings: number;
  healthcareBookings: number;
  reviews: number;
  points: number;
  memberSince: string;
}

export interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  promotionalEnabled: boolean;
}

export interface HealthcareProviderInfo {
  isProvider: boolean;
  specialization?: string;
  qualification?: string;
  experience?: number;
  pmcNumber?: string;
  bio?: string;
  clinicName?: string;
  clinicAddress?: string;
  consultationFee?: number;
  videoConsultationFee?: number;
  currency?: string;
  languages?: string[];
  rating?: number;
  totalReviews?: number;
  totalPatients?: number;
  isAvailable?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  isPremium: boolean;
  isVerified: boolean;
  language: 'en' | 'ur';
  darkMode: boolean;
  stats: UserStats;
  notificationPreferences: NotificationPreferences;
  healthcareProvider?: HealthcareProviderInfo;
}

export interface UserProfileState {
  user: UserProfile | null;
  addresses: UserAddress[];
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
}

// Mock User Data
const mockUser: UserProfile = {
  id: 'user-1',
  name: 'Muhammad Ali',
  email: 'muhammad.ali@email.com',
  phone: '+92 300 1234567',
  avatar: 'https://i.pravatar.cc/200?img=68',
  isPremium: true,
  isVerified: true,
  language: 'en',
  darkMode: false,
  stats: {
    totalBookings: 15,
    homeServiceBookings: 8,
    healthcareBookings: 7,
    reviews: 12,
    points: 340,
    memberSince: 'Jan 2024',
  },
  notificationPreferences: {
    pushEnabled: true,
    emailEnabled: true,
    smsEnabled: false,
    promotionalEnabled: true,
  },
  // Example: User who is also a healthcare provider (remove this for regular users)
  healthcareProvider: {
    isProvider: true,
    specialization: 'Cardiologist',
    qualification: 'MD, FACC',
    experience: 12,
    pmcNumber: 'PMC-12345',
    bio: 'Experienced cardiologist with over 12 years of practice in interventional cardiology and heart health management.',
    clinicName: 'Heart Care Clinic',
    clinicAddress: 'Medical Complex, Block C, Gulberg III, Lahore',
    consultationFee: 2500,
    videoConsultationFee: 1500,
    currency: 'Rs',
    languages: ['English', 'Urdu', 'Punjabi'],
    rating: 4.8,
    totalReviews: 156,
    totalPatients: 3200,
    isAvailable: true,
  },
};

const mockAddresses: UserAddress[] = [
  {
    id: 'addr-1',
    label: 'home',
    address: '123 Main Street, Block A',
    city: 'Lahore',
    postalCode: '54000',
    isDefault: true,
  },
  {
    id: 'addr-2',
    label: 'work',
    address: '456 Corporate Tower, Office 502',
    city: 'Lahore',
    postalCode: '54000',
    isDefault: false,
  },
];

// Initial State
const initialState: UserProfileState = {
  user: mockUser,
  addresses: mockAddresses,
  isLoading: false,
  isUpdating: false,
  error: null,
};

// Slice
const userProfileSlice = createAppSlice({
  name: 'userProfile',
  initialState,
  reducers: (create) => ({
    // Sync reducers
    updateProfile: create.reducer((state, action: PayloadAction<Partial<UserProfile>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    }),

    updateAvatar: create.reducer((state, action: PayloadAction<string>) => {
      if (state.user) {
        state.user.avatar = action.payload;
      }
    }),

    addAddress: create.reducer((state, action: PayloadAction<UserAddress>) => {
      // If new address is default, unset others
      if (action.payload.isDefault) {
        state.addresses = state.addresses.map(addr => ({
          ...addr,
          isDefault: false
        }));
      }
      state.addresses.push(action.payload);
    }),

    updateAddress: create.reducer((state, action: PayloadAction<UserAddress>) => {
      const index = state.addresses.findIndex(addr => addr.id === action.payload.id);
      if (index !== -1) {
        // If updated address is default, unset others
        if (action.payload.isDefault) {
          state.addresses = state.addresses.map(addr => ({
            ...addr,
            isDefault: addr.id === action.payload.id
          }));
        }
        state.addresses[index] = action.payload;
      }
    }),

    deleteAddress: create.reducer((state, action: PayloadAction<string>) => {
      state.addresses = state.addresses.filter(addr => addr.id !== action.payload);
    }),

    setDefaultAddress: create.reducer((state, action: PayloadAction<string>) => {
      state.addresses = state.addresses.map(addr => ({
        ...addr,
        isDefault: addr.id === action.payload
      }));
    }),

    toggleNotificationPreference: create.reducer(
      (state, action: PayloadAction<keyof NotificationPreferences>) => {
        if (state.user) {
          const key = action.payload;
          state.user.notificationPreferences[key] = !state.user.notificationPreferences[key];
        }
      }
    ),

    updateNotificationPreferences: create.reducer(
      (state, action: PayloadAction<Partial<NotificationPreferences>>) => {
        if (state.user) {
          state.user.notificationPreferences = {
            ...state.user.notificationPreferences,
            ...action.payload
          };
        }
      }
    ),

    toggleDarkMode: create.reducer((state) => {
      if (state.user) {
        state.user.darkMode = !state.user.darkMode;
      }
    }),

    toggleProviderAvailability: create.reducer((state) => {
      if (state.user?.healthcareProvider) {
        state.user.healthcareProvider.isAvailable = !state.user.healthcareProvider.isAvailable;
      }
    }),

    setLanguage: create.reducer((state, action: PayloadAction<'en' | 'ur'>) => {
      if (state.user) {
        state.user.language = action.payload;
      }
    }),

    clearProfileError: create.reducer((state) => {
      state.error = null;
    }),

    // Async thunks
    fetchUserProfile: create.asyncThunk(
      async (_, { rejectWithValue }) => {
        try {
          // TODO: Replace with actual API call
          await new Promise(resolve => setTimeout(resolve, 500));
          return {
            user: mockUser,
            addresses: mockAddresses,
          };
        } catch (error) {
          return rejectWithValue('Failed to fetch user profile');
        }
      },
      {
        pending: (state) => {
          state.isLoading = true;
          state.error = null;
        },
        fulfilled: (state, action) => {
          state.isLoading = false;
          state.user = action.payload.user;
          state.addresses = action.payload.addresses;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.payload as string;
        },
      }
    ),

    saveUserProfile: create.asyncThunk(
      async (profileData: Partial<UserProfile>, { rejectWithValue }) => {
        try {
          // TODO: Replace with actual API call
          await new Promise(resolve => setTimeout(resolve, 800));
          return profileData;
        } catch (error) {
          return rejectWithValue('Failed to save profile');
        }
      },
      {
        pending: (state) => {
          state.isUpdating = true;
          state.error = null;
        },
        fulfilled: (state, action) => {
          state.isUpdating = false;
          if (state.user) {
            state.user = { ...state.user, ...action.payload };
          }
        },
        rejected: (state, action) => {
          state.isUpdating = false;
          state.error = action.payload as string;
        },
      }
    ),
  }),
  selectors: {
    selectUser: (state) => state.user,
    selectUserAddresses: (state) => state.addresses,
    selectDefaultAddress: (state) => 
      state.addresses.find(addr => addr.isDefault),
    selectProfileLoading: (state) => state.isLoading,
    selectProfileUpdating: (state) => state.isUpdating,
    selectProfileError: (state) => state.error,
    selectIsPremium: (state) => state.user?.isPremium ?? false,
    selectIsVerified: (state) => state.user?.isVerified ?? false,
    selectIsHealthcareProvider: (state) => state.user?.healthcareProvider?.isProvider ?? false,
    selectHealthcareProviderInfo: (state) => state.user?.healthcareProvider,
    selectUserStats: (state) => state.user?.stats,
    selectTotalBookings: (state) => state.user?.stats.totalBookings ?? 0,
    selectUserPoints: (state) => state.user?.stats.points ?? 0,
  },
});

// Actions
export const {
  updateProfile,
  updateAvatar,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  toggleNotificationPreference,
  updateNotificationPreferences,
  toggleDarkMode,
  toggleProviderAvailability,
  setLanguage,
  clearProfileError,
  fetchUserProfile,
  saveUserProfile,
} = userProfileSlice.actions;

// Selectors
export const {
  selectUser,
  selectUserAddresses,
  selectDefaultAddress,
  selectProfileLoading,
  selectProfileUpdating,
  selectProfileError,
  selectIsPremium,
  selectIsVerified,
  selectIsHealthcareProvider,
  selectHealthcareProviderInfo,
  selectUserStats,
  selectTotalBookings,
  selectUserPoints,
} = userProfileSlice.selectors;

// Memoized selector for sidebar user data (returns new object - must be memoized)
export const selectSidebarUserData = createSelector(
  [selectUser, selectUserStats],
  (user, stats) => ({
    name: user?.name ?? 'Guest User',
    email: user?.email ?? '',
    avatar: user?.avatar ?? 'https://i.pravatar.cc/200?img=68',
    isPremium: user?.isPremium ?? false,
    isVerified: user?.isVerified ?? false,
    memberSince: stats?.memberSince ?? '',
    totalBookings: stats?.totalBookings ?? 0,
    points: stats?.points ?? 0,
  })
);

export default userProfileSlice.reducer;
