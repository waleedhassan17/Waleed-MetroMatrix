import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { OutletConfig, OutletColorScheme } from '../../../../types/shopping';
import {
  fetchOutletByIdApi,
  updateOutletApi,
  assignBrandToOutletApi,
  updateOutletColorSchemeApi,
} from '../../../../networks/shopping/outletApi';

interface OutletDetailState {
  outlet: OutletConfig | null;
  editedOutlet: Partial<OutletConfig> | null;
  isLoading: boolean;
  isSaving: boolean;
  isAssigning: boolean;
  isUpdatingColors: boolean;
  error: string | null;
  successMessage: string | null;
  activeTab: 'info' | 'brand' | 'colors';
}

const initialState: OutletDetailState = {
  outlet: null,
  editedOutlet: null,
  isLoading: false,
  isSaving: false,
  isAssigning: false,
  isUpdatingColors: false,
  error: null,
  successMessage: null,
  activeTab: 'info',
};

export const fetchOutletDetail = createAsyncThunk(
  'outletDetail/fetch',
  async (outletId: string, { rejectWithValue }) => {
    try {
      const response = await fetchOutletByIdApi(outletId);
      return response.data;
    } catch (e: any) {
      return rejectWithValue(e.message);
    }
  }
);

export const saveOutletChanges = createAsyncThunk(
  'outletDetail/save',
  async (_, { getState, rejectWithValue }) => {
    const state = (getState() as { outletDetail: OutletDetailState }).outletDetail;
    if (!state.outlet || !state.editedOutlet) return rejectWithValue('No changes');
    try {
      const response = await updateOutletApi(state.outlet.outletId, state.editedOutlet);
      return response.data;
    } catch (e: any) {
      return rejectWithValue(e.message);
    }
  }
);

export const assignBrand = createAsyncThunk(
  'outletDetail/assignBrand',
  async ({ outletId, brandId }: { outletId: string; brandId: string }, { rejectWithValue }) => {
    try {
      const response = await assignBrandToOutletApi(outletId, brandId);
      return response.data;
    } catch (e: any) {
      return rejectWithValue(e.message);
    }
  }
);

export const applyColorScheme = createAsyncThunk(
  'outletDetail/applyColors',
  async ({ outletId, colorScheme }: { outletId: string; colorScheme: OutletColorScheme }, { rejectWithValue }) => {
    try {
      const response = await updateOutletColorSchemeApi(outletId, colorScheme);
      return response.data;
    } catch (e: any) {
      return rejectWithValue(e.message);
    }
  }
);

const outletDetailSlice = createSlice({
  name: 'outletDetail',
  initialState,
  reducers: {
    setActiveTab(state, action: PayloadAction<'info' | 'brand' | 'colors'>) {
      state.activeTab = action.payload;
    },
    patchEdit(state, action: PayloadAction<Partial<OutletConfig>>) {
      state.editedOutlet = { ...(state.editedOutlet || {}), ...action.payload };
    },
    patchColorScheme(state, action: PayloadAction<Partial<OutletColorScheme>>) {
      const current = state.editedOutlet?.colorScheme || state.outlet?.colorScheme || {
        primaryColor: '#E67E22', secondaryColor: '#2C3E50',
        accentColor: '#F1C40F', headerBg: '#E67E22', textOnHeader: '#FFFFFF',
      };
      state.editedOutlet = {
        ...(state.editedOutlet || {}),
        colorScheme: { ...current, ...action.payload },
      };
    },
    clearMessages(state) {
      state.error = null;
      state.successMessage = null;
    },
    resetDetail(state) {
      state.outlet = null;
      state.editedOutlet = null;
      state.error = null;
      state.successMessage = null;
      state.activeTab = 'info';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOutletDetail.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchOutletDetail.fulfilled, (state, action) => {
        state.isLoading = false;
        state.outlet = action.payload;
        state.editedOutlet = { ...action.payload };
      })
      .addCase(fetchOutletDetail.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(saveOutletChanges.pending, (state) => { state.isSaving = true; })
      .addCase(saveOutletChanges.fulfilled, (state, action) => {
        state.isSaving = false;
        state.outlet = action.payload;
        state.successMessage = 'Outlet updated successfully!';
      })
      .addCase(saveOutletChanges.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload as string;
      })
      .addCase(assignBrand.pending, (state) => { state.isAssigning = true; })
      .addCase(assignBrand.fulfilled, (state, action) => {
        state.isAssigning = false;
        state.outlet = action.payload;
        state.editedOutlet = { ...action.payload };
        state.successMessage = `Brand assigned successfully!`;
      })
      .addCase(assignBrand.rejected, (state, action) => {
        state.isAssigning = false;
        state.error = action.payload as string;
      })
      .addCase(applyColorScheme.pending, (state) => { state.isUpdatingColors = true; })
      .addCase(applyColorScheme.fulfilled, (state, action) => {
        state.isUpdatingColors = false;
        state.outlet = action.payload;
        state.editedOutlet = { ...action.payload };
        state.successMessage = 'Color scheme updated!';
      })
      .addCase(applyColorScheme.rejected, (state, action) => {
        state.isUpdatingColors = false;
        state.error = action.payload as string;
      });
  },
});

export const { setActiveTab, patchEdit, patchColorScheme, clearMessages, resetDetail } = outletDetailSlice.actions;

export const selectOutletDetail = (state: { outletDetail: OutletDetailState }) => state.outletDetail.outlet;
export const selectEditedOutlet = (state: { outletDetail: OutletDetailState }) => state.outletDetail.editedOutlet;
export const selectOutletDetailLoading = (state: { outletDetail: OutletDetailState }) => state.outletDetail.isLoading;
export const selectOutletDetailSaving = (state: { outletDetail: OutletDetailState }) => state.outletDetail.isSaving;
export const selectOutletDetailAssigning = (state: { outletDetail: OutletDetailState }) => state.outletDetail.isAssigning;
export const selectOutletDetailUpdatingColors = (state: { outletDetail: OutletDetailState }) => state.outletDetail.isUpdatingColors;
export const selectOutletDetailError = (state: { outletDetail: OutletDetailState }) => state.outletDetail.error;
export const selectOutletDetailSuccess = (state: { outletDetail: OutletDetailState }) => state.outletDetail.successMessage;
export const selectOutletActiveTab = (state: { outletDetail: OutletDetailState }) => state.outletDetail.activeTab;

export default outletDetailSlice.reducer;
