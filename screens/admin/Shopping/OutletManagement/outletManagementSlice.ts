import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { OutletConfig } from '../../../../types/shopping';
import {
  fetchOutletsApi,
  deleteOutletApi,
  toggleOutletStatusApi,
} from '../../../../networks/shopping/outletApi';

export type OutletStatusFilter = 'all' | 'active' | 'inactive' | 'unassigned';

interface OutletManagementState {
  outlets: OutletConfig[];
  filteredOutlets: OutletConfig[];
  statusFilter: OutletStatusFilter;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
}

const initialState: OutletManagementState = {
  outlets: [],
  filteredOutlets: [],
  statusFilter: 'all',
  searchQuery: '',
  isLoading: false,
  error: null,
};

export const fetchOutletsAsync = createAsyncThunk('outletManagement/fetchOutlets', async () => {
  const response = await fetchOutletsApi({ limit: 100 });
  return response.data;
});

export const deleteOutlet = createAsyncThunk('outletManagement/delete', async (outletId: string) => {
  await deleteOutletApi(outletId);
  return outletId;
});

export const toggleOutletStatus = createAsyncThunk('outletManagement/toggle', async (outletId: string) => {
  const response = await toggleOutletStatusApi(outletId);
  return response.data;
});

const applyFilters = (
  outlets: OutletConfig[],
  filter: OutletStatusFilter,
  query: string
): OutletConfig[] => {
  let result = outlets;
  if (filter === 'active') result = result.filter((o) => o.isActive);
  else if (filter === 'inactive') result = result.filter((o) => !o.isActive);
  else if (filter === 'unassigned') result = result.filter((o) => !o.brandId);
  if (query.trim()) {
    const q = query.toLowerCase();
    result = result.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        (o.brandName || '').toLowerCase().includes(q) ||
        o.location.city.toLowerCase().includes(q)
    );
  }
  return result;
};

const outletManagementSlice = createSlice({
  name: 'outletManagement',
  initialState,
  reducers: {
    setStatusFilter(state, action: PayloadAction<OutletStatusFilter>) {
      state.statusFilter = action.payload;
      state.filteredOutlets = applyFilters(state.outlets, action.payload, state.searchQuery);
    },
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
      state.filteredOutlets = applyFilters(state.outlets, state.statusFilter, action.payload);
    },
    clearError(state) {
      state.error = null;
    },
    updateOutletInList(state, action: PayloadAction<OutletConfig>) {
      const idx = state.outlets.findIndex((o) => o.outletId === action.payload.outletId);
      if (idx !== -1) {
        state.outlets[idx] = action.payload;
        state.filteredOutlets = applyFilters(state.outlets, state.statusFilter, state.searchQuery);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOutletsAsync.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchOutletsAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.outlets = action.payload;
        state.filteredOutlets = applyFilters(action.payload, state.statusFilter, state.searchQuery);
      })
      .addCase(fetchOutletsAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to load outlets';
      })
      .addCase(deleteOutlet.fulfilled, (state, action) => {
        state.outlets = state.outlets.filter((o) => o.outletId !== action.payload);
        state.filteredOutlets = applyFilters(state.outlets, state.statusFilter, state.searchQuery);
      })
      .addCase(deleteOutlet.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to delete outlet';
      })
      .addCase(toggleOutletStatus.fulfilled, (state, action) => {
        const idx = state.outlets.findIndex((o) => o.outletId === action.payload.outletId);
        if (idx !== -1) {
          state.outlets[idx] = action.payload;
          state.filteredOutlets = applyFilters(state.outlets, state.statusFilter, state.searchQuery);
        }
      })
      .addCase(toggleOutletStatus.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to update outlet status';
      });
  },
});

export const { setStatusFilter, setSearchQuery, clearError, updateOutletInList } = outletManagementSlice.actions;

export const selectFilteredOutlets = (state: { outletManagement: OutletManagementState }) =>
  state.outletManagement.filteredOutlets;
export const selectOutletStatusFilter = (state: { outletManagement: OutletManagementState }) =>
  state.outletManagement.statusFilter;
export const selectOutletSearchQuery = (state: { outletManagement: OutletManagementState }) =>
  state.outletManagement.searchQuery;
export const selectOutletMgmtLoading = (state: { outletManagement: OutletManagementState }) =>
  state.outletManagement.isLoading;
export const selectOutletMgmtError = (state: { outletManagement: OutletManagementState }) =>
  state.outletManagement.error;

export default outletManagementSlice.reducer;
