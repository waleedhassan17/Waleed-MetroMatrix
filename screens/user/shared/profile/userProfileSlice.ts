import { PayloadAction, createSelector } from '@reduxjs/toolkit';
import { createAppSlice } from '../../../../store/createAppSlice';
import { getUserProfile, updateUserProfile } from '../../../../networks/authcalls/userProfile';
import { getProviderProfile } from '../../../../networks/authcalls/providerProfile';
import { retrieveData, KeyForStorage } from '../../../../utils/storage_utils/storageUtils';

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

// ── Backend → UserProfile mapping ───────────
//
// The screen used to render a hardcoded "Muhammad Ali / Premium Member /
// Cardiologist" object that was seeded straight into initialState, so every
// signed-in account saw the same fabricated identity and stats. Both shapes
// below come from the live profile endpoints instead.

const defaultNotificationPreferences: NotificationPreferences = {
  pushEnabled: true,
  emailEnabled: true,
  smsEnabled: false,
  promotionalEnabled: true,
};

const emptyStats: UserStats = {
  totalBookings: 0,
  homeServiceBookings: 0,
  healthcareBookings: 0,
  reviews: 0,
  points: 0,
  memberSince: '',
};

/** "Jan 2024" from an ISO createdAt, for the "Since …" chip. */
const formatMemberSince = (isoDate?: string): string => {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const composeAddress = (address: any): string =>
  [address?.street, address?.area].filter(Boolean).join(', ') || address?.street || '';

/** Backend keeps one address object on the account, not a list. */
const mapAddresses = (address: any): UserAddress[] => {
  if (!address || (!address.street && !address.city)) return [];
  return [{
    id: 'primary',
    label: 'home',
    address: composeAddress(address),
    city: address.city ?? '',
    postalCode: address.postalCode,
    isDefault: true,
  }];
};

const mapUserResponse = (raw: any): UserProfile => ({
  id: raw?.id ?? raw?._id ?? '',
  name: raw?.fullName ?? raw?.name ?? '',
  email: raw?.email ?? '',
  phone: raw?.phoneNumber ?? raw?.phone ?? '',
  avatar: raw?.profilePhoto ?? raw?.profilePhotoUrl ?? raw?.avatar ?? '',
  isPremium: raw?.isPremium ?? false,
  isVerified: raw?.isVerified ?? raw?.emailVerified === 'active',
  language: raw?.preferences?.language === 'ur' ? 'ur' : 'en',
  darkMode: raw?.preferences?.theme === 'dark',
  stats: {
    ...emptyStats,
    totalBookings: raw?.stats?.totalBookings ?? 0,
    homeServiceBookings: raw?.stats?.homeServiceBookings ?? 0,
    healthcareBookings: raw?.stats?.healthcareBookings ?? 0,
    reviews: raw?.stats?.reviews ?? 0,
    points: raw?.stats?.points ?? 0,
    memberSince: formatMemberSince(raw?.createdAt),
  },
  notificationPreferences: {
    ...defaultNotificationPreferences,
    pushEnabled: raw?.preferences?.notifications ?? defaultNotificationPreferences.pushEnabled,
  },
});

const mapProviderResponse = (raw: any): UserProfile => {
  const base = mapUserResponse(raw);
  const isDoctor = raw?.providerType === 'doctor';
  return {
    ...base,
    // Only doctors carry clinical fields — a plumber rendered through the
    // healthcare block was how "Cardiologist" ended up on every account.
    healthcareProvider: isDoctor
      ? {
          isProvider: true,
          specialization: raw?.specialization,
          qualification: raw?.qualification,
          experience: raw?.experience,
          pmcNumber: raw?.pmcNumber,
          bio: raw?.bio,
          clinicName: raw?.clinicName,
          clinicAddress: raw?.clinicAddress,
          consultationFee: raw?.consultationFee,
          videoConsultationFee: raw?.videoConsultationFee,
          currency: raw?.currency ?? 'Rs',
          languages: raw?.languages,
          rating: raw?.rating,
          totalReviews: raw?.totalReviews,
          totalPatients: raw?.totalPatients,
          isAvailable: raw?.isAvailable,
        }
      : undefined,
  };
};

// Initial State — empty until the profile is fetched.
const initialState: UserProfileState = {
  user: null,
  addresses: [],
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
          // Which endpoint applies depends on how the account signed in — the
          // provider record lives behind a different route than the customer.
          const userType = await retrieveData(KeyForStorage.userType);

          if (userType === 'provider') {
            const res = await getProviderProfile();
            const provider = res.provider;
            return {
              user: mapProviderResponse(provider),
              addresses: mapAddresses(provider?.address ?? {
                street: provider?.streetAddress,
                city: provider?.city,
                postalCode: provider?.postalCode,
              }),
            };
          }

          const user = await getUserProfile();
          return {
            user: mapUserResponse(user),
            addresses: mapAddresses(user?.address),
          };
        } catch (error: any) {
          return rejectWithValue(error?.message || 'Failed to fetch user profile');
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
          const res = await updateUserProfile({
            fullName: profileData.name,
            phoneNumber: profileData.phone,
          });
          // Prefer the server's echo so the screen shows what was persisted,
          // not what was typed.
          return res.user ? mapUserResponse(res.user) : profileData;
        } catch (error: any) {
          return rejectWithValue(error?.message || 'Failed to save profile');
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
    name: user?.name ?? '',
    email: user?.email ?? '',
    // No stock-photo fallback: it put a picture of a stranger where the
    // signed-in user's face belongs. Callers render initials when empty.
    avatar: user?.avatar ?? '',
    isPremium: user?.isPremium ?? false,
    isVerified: user?.isVerified ?? false,
    memberSince: stats?.memberSince ?? '',
    totalBookings: stats?.totalBookings ?? 0,
    points: stats?.points ?? 0,
  })
);

export default userProfileSlice.reducer;
