import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  AppSettings,
} from '../../../models/admin';
import {
  getSettingsAPI,
  updateSettingsAPI,
} from '../../../networks/admin/adminAPIs';

type AdminSettings = AppSettings;

interface SettingsState {
  settings: AppSettings;
  status: 'idle' | 'loading' | 'failed';
  error: string | null;
  saveStatus: 'idle' | 'saving' | 'success' | 'failed';
  saveError: string | null;
  hasUnsavedChanges: boolean;
  activeSection: 'general' | 'notifications' | 'security' | 'appearance';
}

const defaultSettings: AppSettings = {
  general: {
    appName: 'MetroMatrix',
    appVersion: '1.0.0',
    platformName: 'MetroMatrix',
    contactEmail: '',
    supportPhone: '',
    autoApproveProviders: false,
    requireEmailVerification: true,
    maintenanceMode: false,
    maintenanceMessage: '',
  },
  notifications: {
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: true,
    notifyOnNewProvider: true,
    notifyOnNewUser: true,
    dailyDigest: false,
    providerRegistrations: true,
    userRegistrations: true,
    systemAlerts: true,
    weeklyReports: false,
  },
  providers: {
    autoApproveProviders: false,
    requireDocumentVerification: true,
    maxPendingDays: 7,
    allowedProviderTypes: [],
  },
  security: {
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    requireTwoFactor: false,
    twoFactorEnabled: false,
    passwordMinLength: 8,
    passwordExpiry: 90,
  },
  appearance: {
    theme: 'light',
    primaryColor: '#6366f1',
  },
};

const initialState: SettingsState = {
  settings: defaultSettings,
  status: 'idle',
  error: null,
  saveStatus: 'idle',
  saveError: null,
  hasUnsavedChanges: false,
  activeSection: 'general',
};

export const getSettingsAsync = createAsyncThunk(
  'settings/getSettings',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { admin: { accessToken: string | null } };
      const token = state.admin.accessToken;
      if (!token) return rejectWithValue('No authentication token found');
      const response = await getSettingsAPI(token);
      return response.settings;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch settings');
    }
  }
);

export const updateGeneralSettingsAsync = createAsyncThunk(
  'settings/updateGeneralSettings',
  async (settings: Partial<AppSettings['general']>, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { admin: { accessToken: string | null } };
      const token = state.admin.accessToken;
      if (!token) return rejectWithValue('No authentication token found');
      const response = await updateSettingsAPI(token, 'general', settings);
      return response.settings;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update general settings');
    }
  }
);

export const updateNotificationSettingsAsync = createAsyncThunk(
  'settings/updateNotificationSettings',
  async (settings: Partial<AppSettings['notifications']>, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { admin: { accessToken: string | null } };
      const token = state.admin.accessToken;
      if (!token) return rejectWithValue('No authentication token found');
      const response = await updateSettingsAPI(token, 'notifications', settings);
      return response.settings;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update notification settings');
    }
  }
);

export const updateSecuritySettingsAsync = createAsyncThunk(
  'settings/updateSecuritySettings',
  async (settings: Partial<AppSettings['security']>, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { admin: { accessToken: string | null } };
      const token = state.admin.accessToken;
      if (!token) return rejectWithValue('No authentication token found');
      const response = await updateSettingsAPI(token, 'security', settings);
      return response.settings;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update security settings');
    }
  }
);

export const updateAppearanceSettingsAsync = createAsyncThunk(
  'settings/updateAppearanceSettings',
  async (settings: Partial<AppSettings['appearance']>, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { admin: { accessToken: string | null } };
      const token = state.admin.accessToken;
      if (!token) return rejectWithValue('No authentication token found');
      const response = await updateSettingsAPI(token, 'appearance', settings);
      return response.settings;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update appearance settings');
    }
  }
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.saveError = null;
    },
    clearSaveStatus: (state) => {
      state.saveStatus = 'idle';
      state.saveError = null;
    },
    setActiveSection: (state, action: PayloadAction<SettingsState['activeSection']>) => {
      state.activeSection = action.payload;
    },
    updateLocalGeneralSettings: (state, action: PayloadAction<Partial<AppSettings['general']>>) => {
      state.settings.general = { ...state.settings.general, ...action.payload };
      state.hasUnsavedChanges = true;
    },
    updateLocalNotificationSettings: (state, action: PayloadAction<Partial<AppSettings['notifications']>>) => {
      state.settings.notifications = { ...state.settings.notifications, ...action.payload };
      state.hasUnsavedChanges = true;
    },
    updateLocalSecuritySettings: (state, action: PayloadAction<Partial<AppSettings['security']>>) => {
      state.settings.security = { ...state.settings.security, ...action.payload };
      state.hasUnsavedChanges = true;
    },
    updateLocalAppearanceSettings: (state, action: PayloadAction<Partial<NonNullable<AppSettings['appearance']>>>) => {
      // Ensure appearance object exists
      if (!state.settings.appearance) {
        state.settings.appearance = defaultSettings.appearance!;
      }
      // Update appearance settings
      state.settings.appearance = { ...state.settings.appearance, ...action.payload };
      state.hasUnsavedChanges = true;
    },
    markChangesSaved: (state) => {
      state.hasUnsavedChanges = false;
    },
    resetToDefaults: (state) => {
      state.settings = defaultSettings;
      state.hasUnsavedChanges = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getSettingsAsync.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(getSettingsAsync.fulfilled, (state, action) => {
        state.status = 'idle';
        if (action.payload) {
          const mergedAppearance = action.payload.appearance 
            ? { ...defaultSettings.appearance, ...action.payload.appearance }
            : defaultSettings.appearance;
          
          state.settings = {
            ...defaultSettings,
            ...action.payload,
            general: { ...defaultSettings.general, ...action.payload.general },
            notifications: { ...defaultSettings.notifications, ...action.payload.notifications },
            providers: { ...defaultSettings.providers, ...action.payload.providers },
            security: { ...defaultSettings.security, ...action.payload.security },
            appearance: mergedAppearance,
          };
        }
        state.hasUnsavedChanges = false;
        state.error = null;
      })
      .addCase(getSettingsAsync.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });

    builder
      .addCase(updateGeneralSettingsAsync.pending, (state) => {
        state.saveStatus = 'saving';
        state.saveError = null;
      })
      .addCase(updateGeneralSettingsAsync.fulfilled, (state, action) => {
        state.saveStatus = 'success';
        if (action.payload) {
          state.settings.general = { ...state.settings.general, ...action.payload };
        }
        state.hasUnsavedChanges = false;
        state.saveError = null;
      })
      .addCase(updateGeneralSettingsAsync.rejected, (state, action) => {
        state.saveStatus = 'failed';
        state.saveError = action.payload as string;
      });

    builder
      .addCase(updateNotificationSettingsAsync.pending, (state) => {
        state.saveStatus = 'saving';
        state.saveError = null;
      })
      .addCase(updateNotificationSettingsAsync.fulfilled, (state, action) => {
        state.saveStatus = 'success';
        if (action.payload) {
          state.settings.notifications = { ...state.settings.notifications, ...action.payload };
        }
        state.hasUnsavedChanges = false;
        state.saveError = null;
      })
      .addCase(updateNotificationSettingsAsync.rejected, (state, action) => {
        state.saveStatus = 'failed';
        state.saveError = action.payload as string;
      });

    builder
      .addCase(updateSecuritySettingsAsync.pending, (state) => {
        state.saveStatus = 'saving';
        state.saveError = null;
      })
      .addCase(updateSecuritySettingsAsync.fulfilled, (state, action) => {
        state.saveStatus = 'success';
        if (action.payload) {
          state.settings.security = { ...state.settings.security, ...action.payload };
        }
        state.hasUnsavedChanges = false;
        state.saveError = null;
      })
      .addCase(updateSecuritySettingsAsync.rejected, (state, action) => {
        state.saveStatus = 'failed';
        state.saveError = action.payload as string;
      });

    builder
      .addCase(updateAppearanceSettingsAsync.pending, (state) => {
        state.saveStatus = 'saving';
        state.saveError = null;
      })
      .addCase(updateAppearanceSettingsAsync.fulfilled, (state, action) => {
        state.saveStatus = 'success';
        if (action.payload?.appearance) {
          // Ensure appearance object exists
          if (!state.settings.appearance) {
            state.settings.appearance = defaultSettings.appearance!;
          }
          // Merge appearance settings
          state.settings.appearance = { ...state.settings.appearance, ...action.payload.appearance };
        }
        state.hasUnsavedChanges = false;
        state.saveError = null;
      })
      .addCase(updateAppearanceSettingsAsync.rejected, (state, action) => {
        state.saveStatus = 'failed';
        state.saveError = action.payload as string;
      });
  },
});

export const {
  clearError,
  clearSaveStatus,
  setActiveSection,
  updateLocalGeneralSettings,
  updateLocalNotificationSettings,
  updateLocalSecuritySettings,
  updateLocalAppearanceSettings,
  markChangesSaved,
  resetToDefaults,
} = settingsSlice.actions;

export const selectSettings = (state: any) => state.settings?.settings || defaultSettings;
export const selectGeneralSettings = (state: any) => state.settings?.settings?.general || defaultSettings.general;
export const selectNotificationSettings = (state: any) => state.settings?.settings?.notifications || defaultSettings.notifications;
export const selectProvidersSettings = (state: any) => state.settings?.settings?.providers || defaultSettings.providers;
export const selectSecuritySettings = (state: any) => state.settings?.settings?.security || defaultSettings.security;
export const selectAppearanceSettings = (state: any) => state.settings?.settings?.appearance || defaultSettings.appearance;
export const selectHasUnsavedChanges = (state: any) => state.settings?.hasUnsavedChanges || false;
export const selectActiveSection = (state: any) => state.settings?.activeSection || 'general';
export const selectIsLoading = (state: any) => state.settings?.status === 'loading';
export const selectIsSaving = (state: any) => state.settings?.saveStatus === 'saving';

export default settingsSlice.reducer;