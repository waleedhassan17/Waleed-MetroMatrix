import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  fetchShoppingSettingsApi,
  updateShoppingSettingsApi,
  type ShoppingSettingsView,
} from '../../../../networks/shopping/adminShoppingApi';

export interface AdminShoppingSettingsState {
  settings: ShoppingSettingsView | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: AdminShoppingSettingsState = {
  settings: null,
  loading: false,
  saving: false,
  error: null,
};

export const fetchShoppingSettings = createAsyncThunk(
  'adminShoppingSettings/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetchShoppingSettingsApi();
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load settings');
    }
  }
);

export const saveShoppingSettings = createAsyncThunk(
  'adminShoppingSettings/save',
  async (patch: Partial<ShoppingSettingsView>, { rejectWithValue }) => {
    try {
      const res = await updateShoppingSettingsApi(patch);
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to save settings');
    }
  }
);

const adminShoppingSettingsSlice = createSlice({
  name: 'adminShoppingSettings',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchShoppingSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchShoppingSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = action.payload;
      })
      .addCase(fetchShoppingSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(saveShoppingSettings.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(saveShoppingSettings.fulfilled, (state, action) => {
        state.saving = false;
        state.settings = action.payload;
      })
      .addCase(saveShoppingSettings.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      });
  },
});

export const selectAdminShoppingSettings = (state: {
  adminShoppingSettings: AdminShoppingSettingsState;
}) => state.adminShoppingSettings;
export default adminShoppingSettingsSlice.reducer;
