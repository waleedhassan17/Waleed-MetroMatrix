import { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '../../../../../store/createAppSlice';
import {
  fetchUserProfile,
  updateUserProfile,
  updateUserAvatar,
  addUserAddress,
  deleteUserAddress,
  logoutUser,
  UserProfile as ApiUserProfile,
  UserAddress as ApiUserAddress,
  UserPaymentMethod as ApiUserPaymentMethod,
} from '../../../../../networks/serviceProviders/userNetwork';

// Types
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  isPremium: boolean;
  stats: {
    bookings: number;
    reviews: number;
    points: number;
  };
}

export interface Address {
  id: string;
  label: string;
  address: string;
  city: string;
  isDefault: boolean;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'wallet' | 'bank';
  label: string;
  lastFour?: string;
  isDefault: boolean;
}

export interface Preferences {
  notifications: boolean;
  darkMode: boolean;
  language: 'en' | 'ur';
}

interface ProfileState {
  user: UserProfile | null;
  addresses: Address[];
  paymentMethods: PaymentMethod[];
  preferences: Preferences;
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
}

const initialState: ProfileState = {
  user: null,
  addresses: [],
  paymentMethods: [],
  preferences: {
    notifications: true,
    darkMode: false,
    language: 'en',
  },
  isLoading: false,
  isUpdating: false,
  error: null,
};

// Helpers to map API types to local types
const mapApiUserToLocal = (apiUser: ApiUserProfile): UserProfile => ({
  id: apiUser.id,
  name: apiUser.name,
  email: apiUser.email,
  phone: apiUser.phone,
  avatar: apiUser.avatar,
  isPremium: apiUser.isPremium,
  stats: apiUser.stats,
});

const mapApiAddressToLocal = (apiAddr: ApiUserAddress): Address => ({
  id: apiAddr.id,
  label: apiAddr.label,
  address: apiAddr.address,
  city: apiAddr.city,
  isDefault: apiAddr.isDefault,
});

const mapApiPaymentMethodToLocal = (apiMethod: ApiUserPaymentMethod): PaymentMethod => ({
  id: apiMethod.id,
  type: apiMethod.type,
  label: apiMethod.label,
  lastFour: apiMethod.lastFour,
  isDefault: apiMethod.isDefault,
});

const profileSlice = createAppSlice({
  name: 'profile',
  initialState,
  reducers: (create) => ({
    // Async Thunks
    fetchProfile: create.asyncThunk(
      async (_, { rejectWithValue }) => {
        try {
          const response = await fetchUserProfile();
          if (!response.success) {
            return rejectWithValue(response.message || 'Failed to fetch profile.');
          }
          return {
            user: mapApiUserToLocal(response.data.user),
            addresses: response.data.addresses.map(mapApiAddressToLocal),
            paymentMethods: response.data.paymentMethods.map(mapApiPaymentMethodToLocal),
          };
        } catch (error) {
          return rejectWithValue('Failed to fetch profile.');
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
          state.paymentMethods = action.payload.paymentMethods;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.payload as string;
        },
      }
    ),

    updateProfile: create.asyncThunk(
      async (userData: Partial<UserProfile>, { rejectWithValue }) => {
        try {
          const response = await updateUserProfile(userData);
          if (!response.success) {
            return rejectWithValue(response.message || 'Failed to update profile.');
          }
          return mapApiUserToLocal(response.data);
        } catch (error) {
          return rejectWithValue('Failed to update profile.');
        }
      },
      {
        pending: (state) => {
          state.isUpdating = true;
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

    updateAvatar: create.asyncThunk(
      async (avatarUri: string, { rejectWithValue }) => {
        try {
          const response = await updateUserAvatar(avatarUri);
          if (!response.success) {
            return rejectWithValue(response.message || 'Failed to update avatar.');
          }
          return response.data.avatar;
        } catch (error) {
          return rejectWithValue('Failed to update avatar.');
        }
      },
      {
        fulfilled: (state, action) => {
          if (state.user) {
            state.user.avatar = action.payload;
          }
        },
      }
    ),

    addAddress: create.asyncThunk(
      async (address: Omit<Address, 'id'>, { rejectWithValue }) => {
        try {
          const response = await addUserAddress(address);
          if (!response.success) {
            return rejectWithValue(response.message || 'Failed to add address.');
          }
          return mapApiAddressToLocal(response.data);
        } catch (error) {
          return rejectWithValue('Failed to add address.');
        }
      },
      {
        fulfilled: (state, action) => {
          state.addresses.push(action.payload);
        },
      }
    ),

    deleteAddress: create.asyncThunk(
      async (addressId: string, { rejectWithValue }) => {
        try {
          const response = await deleteUserAddress(addressId);
          if (!response.success) {
            return rejectWithValue(response.message || 'Failed to delete address.');
          }
          return addressId;
        } catch (error) {
          return rejectWithValue('Failed to delete address.');
        }
      },
      {
        fulfilled: (state, action) => {
          state.addresses = state.addresses.filter(
            (addr) => addr.id !== action.payload
          );
        },
      }
    ),

    logout: create.asyncThunk(
      async (_, { rejectWithValue }) => {
        try {
          const response = await logoutUser();
          if (!response.success) {
            return rejectWithValue(response.message || 'Failed to logout.');
          }
          return true;
        } catch (error) {
          return rejectWithValue('Failed to logout.');
        }
      },
      {
        fulfilled: (state) => {
          state.user = null;
          state.addresses = [];
          state.paymentMethods = [];
        },
      }
    ),

    // Sync reducers
    toggleNotifications: create.reducer((state) => {
      state.preferences.notifications = !state.preferences.notifications;
    }),

    toggleDarkMode: create.reducer((state) => {
      state.preferences.darkMode = !state.preferences.darkMode;
    }),

    setLanguage: create.reducer((state, action: PayloadAction<'en' | 'ur'>) => {
      state.preferences.language = action.payload;
    }),

    setDefaultAddress: create.reducer((state, action: PayloadAction<string>) => {
      state.addresses = state.addresses.map((addr) => ({
        ...addr,
        isDefault: addr.id === action.payload,
      }));
    }),

    setDefaultPaymentMethod: create.reducer((state, action: PayloadAction<string>) => {
      state.paymentMethods = state.paymentMethods.map((method) => ({
        ...method,
        isDefault: method.id === action.payload,
      }));
    }),

    clearError: create.reducer((state) => {
      state.error = null;
    }),

    resetProfile: create.reducer((state) => {
      state.user = null;
      state.addresses = [];
      state.paymentMethods = [];
      state.preferences = initialState.preferences;
    }),
  }),
  selectors: {
    selectUser: (state) => state.user,
    selectAddresses: (state) => state.addresses,
    selectPaymentMethods: (state) => state.paymentMethods,
    selectPreferences: (state) => state.preferences,
    selectIsLoading: (state) => state.isLoading,
    selectIsUpdating: (state) => state.isUpdating,
    selectProfileError: (state) => state.error,
  },
});

export const {
  fetchProfile,
  updateProfile,
  updateAvatar,
  addAddress,
  deleteAddress,
  logout,
  toggleNotifications,
  toggleDarkMode,
  setLanguage,
  setDefaultAddress,
  setDefaultPaymentMethod,
  clearError,
  resetProfile,
} = profileSlice.actions;

export const {
  selectUser,
  selectAddresses,
  selectPaymentMethods,
  selectPreferences,
  selectIsLoading,
  selectIsUpdating,
  selectProfileError,
} = profileSlice.selectors;

// Computed selectors
export const selectDefaultAddress = (state: { profile: ProfileState }) =>
  state.profile.addresses.find((addr) => addr.isDefault);

export const selectDefaultPaymentMethod = (state: { profile: ProfileState }) =>
  state.profile.paymentMethods.find((method) => method.isDefault);

export const selectUserStats = (state: { profile: ProfileState }) =>
  state.profile.user?.stats;

export default profileSlice.reducer;