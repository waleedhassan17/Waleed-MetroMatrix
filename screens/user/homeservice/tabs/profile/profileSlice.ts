import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';

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

// Mock Data
const mockUser: UserProfile = {
  id: 'user-1',
  name: 'Muhammad Ali',
  email: 'muhammad.ali@email.com',
  phone: '+92 300 1234567',
  avatar: 'https://i.pravatar.cc/200?img=68',
  isPremium: true,
  stats: {
    bookings: 12,
    reviews: 8,
    points: 240,
  },
};

const mockAddresses: Address[] = [
  {
    id: 'addr-1',
    label: 'Home',
    address: '123 Main Street, Gulberg III',
    city: 'Lahore',
    isDefault: true,
  },
  {
    id: 'addr-2',
    label: 'Office',
    address: '456 Business Park, DHA Phase 5',
    city: 'Lahore',
    isDefault: false,
  },
];

const mockPaymentMethods: PaymentMethod[] = [
  {
    id: 'pay-1',
    type: 'card',
    label: 'Visa',
    lastFour: '4242',
    isDefault: true,
  },
  {
    id: 'pay-2',
    type: 'card',
    label: 'Mastercard',
    lastFour: '8888',
    isDefault: false,
  },
  {
    id: 'pay-3',
    type: 'wallet',
    label: 'JazzCash',
    isDefault: false,
  },
];

const initialState: ProfileState = {
  user: mockUser,
  addresses: mockAddresses,
  paymentMethods: mockPaymentMethods,
  preferences: {
    notifications: true,
    darkMode: false,
    language: 'en',
  },
  isLoading: false,
  isUpdating: false,
  error: null,
};

// Async Thunks
export const fetchProfile = createAsyncThunk(
  'profile/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return {
        user: mockUser,
        addresses: mockAddresses,
        paymentMethods: mockPaymentMethods,
      };
    } catch (error) {
      return rejectWithValue('Failed to fetch profile');
    }
  }
);

export const updateProfile = createAsyncThunk(
  'profile/updateProfile',
  async (userData: Partial<UserProfile>, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800));
      return userData;
    } catch (error) {
      return rejectWithValue('Failed to update profile');
    }
  }
);

export const updateAvatar = createAsyncThunk(
  'profile/updateAvatar',
  async (avatarUri: string, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return avatarUri;
    } catch (error) {
      return rejectWithValue('Failed to update avatar');
    }
  }
);

export const addAddress = createAsyncThunk(
  'profile/addAddress',
  async (address: Omit<Address, 'id'>, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      return {
        ...address,
        id: `addr-${Date.now()}`,
      };
    } catch (error) {
      return rejectWithValue('Failed to add address');
    }
  }
);

export const deleteAddress = createAsyncThunk(
  'profile/deleteAddress',
  async (addressId: string, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      return addressId;
    } catch (error) {
      return rejectWithValue('Failed to delete address');
    }
  }
);

export const logout = createAsyncThunk(
  'profile/logout',
  async (_, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      return true;
    } catch (error) {
      return rejectWithValue('Failed to logout');
    }
  }
);

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    toggleNotifications: (state) => {
      state.preferences.notifications = !state.preferences.notifications;
    },
    toggleDarkMode: (state) => {
      state.preferences.darkMode = !state.preferences.darkMode;
    },
    setLanguage: (state, action: PayloadAction<'en' | 'ur'>) => {
      state.preferences.language = action.payload;
    },
    setDefaultAddress: (state, action: PayloadAction<string>) => {
      state.addresses = state.addresses.map((addr) => ({
        ...addr,
        isDefault: addr.id === action.payload,
      }));
    },
    setDefaultPaymentMethod: (state, action: PayloadAction<string>) => {
      state.paymentMethods = state.paymentMethods.map((method) => ({
        ...method,
        isDefault: method.id === action.payload,
      }));
    },
    clearError: (state) => {
      state.error = null;
    },
    resetProfile: (state) => {
      state.user = null;
      state.addresses = [];
      state.paymentMethods = [];
      state.preferences = initialState.preferences;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Profile
      .addCase(fetchProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.addresses = action.payload.addresses;
        state.paymentMethods = action.payload.paymentMethods;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update Profile
      .addCase(updateProfile.pending, (state) => {
        state.isUpdating = true;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isUpdating = false;
        if (state.user) {
          state.user = { ...state.user, ...action.payload };
        }
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      })
      // Update Avatar
      .addCase(updateAvatar.fulfilled, (state, action) => {
        if (state.user) {
          state.user.avatar = action.payload;
        }
      })
      // Add Address
      .addCase(addAddress.fulfilled, (state, action) => {
        state.addresses.push(action.payload);
      })
      // Delete Address
      .addCase(deleteAddress.fulfilled, (state, action) => {
        state.addresses = state.addresses.filter(
          (addr) => addr.id !== action.payload
        );
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.addresses = [];
        state.paymentMethods = [];
      });
  },
});

export const {
  toggleNotifications,
  toggleDarkMode,
  setLanguage,
  setDefaultAddress,
  setDefaultPaymentMethod,
  clearError,
  resetProfile,
} = profileSlice.actions;

// Selectors
export const selectUser = (state: { profile: ProfileState }) =>
  state.profile.user;

export const selectAddresses = (state: { profile: ProfileState }) =>
  state.profile.addresses;

export const selectDefaultAddress = (state: { profile: ProfileState }) =>
  state.profile.addresses.find((addr) => addr.isDefault);

export const selectPaymentMethods = (state: { profile: ProfileState }) =>
  state.profile.paymentMethods;

export const selectDefaultPaymentMethod = (state: { profile: ProfileState }) =>
  state.profile.paymentMethods.find((method) => method.isDefault);

export const selectPreferences = (state: { profile: ProfileState }) =>
  state.profile.preferences;

export const selectIsLoading = (state: { profile: ProfileState }) =>
  state.profile.isLoading;

export const selectIsUpdating = (state: { profile: ProfileState }) =>
  state.profile.isUpdating;

export const selectUserStats = (state: { profile: ProfileState }) =>
  state.profile.user?.stats;

export default profileSlice.reducer;