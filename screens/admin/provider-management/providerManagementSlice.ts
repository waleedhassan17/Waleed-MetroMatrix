import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  Provider,
  PaginationInfo,
  ProviderFilters,
  ProviderType,
} from '../../../models/admin';
import {
  getAllProvidersAPI,
  getPendingProvidersAPI,
  getProviderDetailsAPI,
  approveProviderAPI,
  rejectProviderAPI,
  activateProviderAPI,
  deactivateProviderAPI,
  deleteProviderAPI,
} from '../../../networks/admin/adminAPIs';

interface ProviderManagementState {
  allProviders: Provider[];
  pendingProviders: Provider[];
  selectedProvider: Provider | null;
  pagination: PaginationInfo | null;
  pendingPagination: PaginationInfo | null;
  filters: ProviderFilters;
  pendingFilters: {
    providerType: ProviderType | 'all';
    page: number;
    limit: number;
  };
  status: 'idle' | 'loading' | 'failed';
  error: string | null;
  actionStatus: 'idle' | 'loading' | 'success' | 'failed';
  actionError: string | null;
}

const initialState: ProviderManagementState = {
  allProviders: [],
  pendingProviders: [],
  selectedProvider: null,
  pagination: null,
  pendingPagination: null,
  filters: {
    status: 'all',
    providerType: 'all',
    search: '',
    page: 1,
    limit: 15,
  },
  pendingFilters: {
    providerType: 'all',
    page: 1,
    limit: 10,
  },
  status: 'idle',
  error: null,
  actionStatus: 'idle',
  actionError: null,
};

export const getAllProvidersAsync = createAsyncThunk(
  'providerManagement/getAllProviders',
  async (filters: Partial<ProviderFilters> = {}, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { admin: { accessToken: string | null } };
      const token = state.admin.accessToken;
      if (!token) return rejectWithValue('No authentication token found');
      const response = await getAllProvidersAPI(token, filters.page || 1, filters.limit || 15, filters.status, filters.providerType, filters.search, filters.isActive);
      return { ...response, filters };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch providers');
    }
  }
);

export const getPendingProvidersAsync = createAsyncThunk(
  'providerManagement/getPendingProviders',
  async (params: { page?: number; limit?: number; providerType?: string } = {}, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { admin: { accessToken: string | null } };
      const token = state.admin.accessToken;
      if (!token) return rejectWithValue('No authentication token found');
      const { page = 1, limit = 10, providerType } = params;
      const response = await getPendingProvidersAPI(token, page, limit, providerType as ProviderType | undefined);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch pending providers');
    }
  }
);

export const getProviderDetailsAsync = createAsyncThunk(
  'providerManagement/getProviderDetails',
  async (providerId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { admin: { accessToken: string | null } };
      const token = state.admin.accessToken;
      if (!token) return rejectWithValue('No authentication token found');
      const response = await getProviderDetailsAPI(token, providerId);
      return response.provider;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch provider details');
    }
  }
);

export const approveProviderAsync = createAsyncThunk(
  'providerManagement/approveProvider',
  async (providerId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { admin: { accessToken: string | null } };
      const token = state.admin.accessToken;
      if (!token) return rejectWithValue('No authentication token found');
      const response = await approveProviderAPI(token, providerId);
      return { providerId, provider: response.provider };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to approve provider');
    }
  }
);

export const rejectProviderAsync = createAsyncThunk(
  'providerManagement/rejectProvider',
  async ({ providerId, reason, adminNotes }: { providerId: string; reason: string; adminNotes?: string }, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { admin: { accessToken: string | null } };
      const token = state.admin.accessToken;
      if (!token) return rejectWithValue('No authentication token found');
      const response = await rejectProviderAPI(token, providerId, reason, adminNotes);
      return { providerId };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to reject provider');
    }
  }
);

export const activateProviderAsync = createAsyncThunk(
  'providerManagement/activateProvider',
  async (providerId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { admin: { accessToken: string | null } };
      const token = state.admin.accessToken;
      if (!token) return rejectWithValue('No authentication token found');
      await activateProviderAPI(token, providerId);
      return { providerId };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to activate provider');
    }
  }
);

export const deactivateProviderAsync = createAsyncThunk(
  'providerManagement/deactivateProvider',
  async (providerId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { admin: { accessToken: string | null } };
      const token = state.admin.accessToken;
      if (!token) return rejectWithValue('No authentication token found');
      await deactivateProviderAPI(token, providerId);
      return { providerId };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to deactivate provider');
    }
  }
);

export const deleteProviderAsync = createAsyncThunk(
  'providerManagement/deleteProvider',
  async (providerId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { admin: { accessToken: string | null } };
      const token = state.admin.accessToken;
      if (!token) return rejectWithValue('No authentication token found');
      await deleteProviderAPI(token, providerId);
      return { providerId };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete provider');
    }
  }
);

const providerManagementSlice = createSlice({
  name: 'providerManagement',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.actionError = null;
    },
    clearActionStatus: (state) => {
      state.actionStatus = 'idle';
      state.actionError = null;
    },
    clearSelectedProvider: (state) => {
      state.selectedProvider = null;
    },
    setFilters: (state, action: PayloadAction<Partial<ProviderFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setPendingFilters: (state, action: PayloadAction<Partial<typeof initialState.pendingFilters>>) => {
      state.pendingFilters = { ...state.pendingFilters, ...action.payload };
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.filters.page = action.payload;
    },
    setPendingPage: (state, action: PayloadAction<number>) => {
      state.pendingFilters.page = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getAllProvidersAsync.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(getAllProvidersAsync.fulfilled, (state, action) => {
        state.status = 'idle';
        state.allProviders = action.payload.providers || [];
        state.pagination = action.payload.pagination;
        if (action.payload.filters) {
          state.filters = { ...state.filters, ...action.payload.filters };
        }
        state.error = null;
      })
      .addCase(getAllProvidersAsync.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });

    builder
      .addCase(getPendingProvidersAsync.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(getPendingProvidersAsync.fulfilled, (state, action) => {
        state.status = 'idle';
        state.pendingProviders = action.payload.providers || [];
        state.pendingPagination = action.payload.pagination || null;
        state.error = null;
      })
      .addCase(getPendingProvidersAsync.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });

    builder
      .addCase(getProviderDetailsAsync.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(getProviderDetailsAsync.fulfilled, (state, action) => {
        state.status = 'idle';
        state.selectedProvider = action.payload || null;
        state.error = null;
      })
      .addCase(getProviderDetailsAsync.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });

    builder
      .addCase(approveProviderAsync.pending, (state) => {
        state.actionStatus = 'loading';
        state.actionError = null;
      })
      .addCase(approveProviderAsync.fulfilled, (state, action) => {
        state.actionStatus = 'success';
        state.pendingProviders = state.pendingProviders.filter(
          (p) => p.id !== action.payload.providerId && p._id !== action.payload.providerId
        );
        const index = state.allProviders.findIndex(
          (p) => p.id === action.payload.providerId || p._id === action.payload.providerId
        );
        if (index !== -1) {
          state.allProviders[index].verificationStatus = 'approved';
        }
        state.actionError = null;
      })
      .addCase(approveProviderAsync.rejected, (state, action) => {
        state.actionStatus = 'failed';
        state.actionError = action.payload as string;
      });

    builder
      .addCase(rejectProviderAsync.pending, (state) => {
        state.actionStatus = 'loading';
        state.actionError = null;
      })
      .addCase(rejectProviderAsync.fulfilled, (state, action) => {
        state.actionStatus = 'success';
        state.pendingProviders = state.pendingProviders.filter(
          (p) => p.id !== action.payload.providerId && p._id !== action.payload.providerId
        );
        const index = state.allProviders.findIndex(
          (p) => p.id === action.payload.providerId || p._id === action.payload.providerId
        );
        if (index !== -1) {
          state.allProviders[index].verificationStatus = 'rejected';
        }
        state.actionError = null;
      })
      .addCase(rejectProviderAsync.rejected, (state, action) => {
        state.actionStatus = 'failed';
        state.actionError = action.payload as string;
      });

    builder
      .addCase(activateProviderAsync.pending, (state) => {
        state.actionStatus = 'loading';
        state.actionError = null;
      })
      .addCase(activateProviderAsync.fulfilled, (state, action) => {
        state.actionStatus = 'success';
        const index = state.allProviders.findIndex(
          (p) => p.id === action.payload.providerId || p._id === action.payload.providerId
        );
        if (index !== -1) {
          state.allProviders[index].isActive = true;
        }
        if (state.selectedProvider && (state.selectedProvider.id === action.payload.providerId || state.selectedProvider._id === action.payload.providerId)) {
          state.selectedProvider.isActive = true;
        }
        state.actionError = null;
      })
      .addCase(activateProviderAsync.rejected, (state, action) => {
        state.actionStatus = 'failed';
        state.actionError = action.payload as string;
      });

    builder
      .addCase(deactivateProviderAsync.pending, (state) => {
        state.actionStatus = 'loading';
        state.actionError = null;
      })
      .addCase(deactivateProviderAsync.fulfilled, (state, action) => {
        state.actionStatus = 'success';
        const index = state.allProviders.findIndex(
          (p) => p.id === action.payload.providerId || p._id === action.payload.providerId
        );
        if (index !== -1) {
          state.allProviders[index].isActive = false;
        }
        if (state.selectedProvider && (state.selectedProvider.id === action.payload.providerId || state.selectedProvider._id === action.payload.providerId)) {
          state.selectedProvider.isActive = false;
        }
        state.actionError = null;
      })
      .addCase(deactivateProviderAsync.rejected, (state, action) => {
        state.actionStatus = 'failed';
        state.actionError = action.payload as string;
      });

    builder
      .addCase(deleteProviderAsync.pending, (state) => {
        state.actionStatus = 'loading';
        state.actionError = null;
      })
      .addCase(deleteProviderAsync.fulfilled, (state, action) => {
        state.actionStatus = 'success';
        state.allProviders = state.allProviders.filter(
          (p) => p.id !== action.payload.providerId && p._id !== action.payload.providerId
        );
        state.pendingProviders = state.pendingProviders.filter(
          (p) => p.id !== action.payload.providerId && p._id !== action.payload.providerId
        );
        if (state.selectedProvider && (state.selectedProvider.id === action.payload.providerId || state.selectedProvider._id === action.payload.providerId)) {
          state.selectedProvider = null;
        }
        state.actionError = null;
      })
      .addCase(deleteProviderAsync.rejected, (state, action) => {
        state.actionStatus = 'failed';
        state.actionError = action.payload as string;
      });
  },
});

export const {
  clearError,
  clearActionStatus,
  clearSelectedProvider,
  setFilters,
  setPendingFilters,
  resetFilters,
  setPage,
  setPendingPage,
} = providerManagementSlice.actions;

export const selectAllProviders = (state: any) => state.providerManagement.allProviders as Provider[];
export const selectPendingProviders = (state: any) => state.providerManagement.pendingProviders as Provider[];
export const selectSelectedProvider = (state: any) => state.providerManagement.selectedProvider as Provider | null;
export const selectPagination = (state: any) => state.providerManagement.pagination as PaginationInfo | null;
export const selectPendingPagination = (state: any) => state.providerManagement.pendingPagination as PaginationInfo | null;
export const selectFilters = (state: any) => state.providerManagement.filters as ProviderFilters;
export const selectPendingFilters = (state: any) => state.providerManagement.pendingFilters as { providerType: ProviderType | 'all'; page: number; limit: number };
export const selectIsLoading = (state: any) => state.providerManagement.status === 'loading';
export const selectIsActionLoading = (state: any) => state.providerManagement.actionStatus === 'loading';

export default providerManagementSlice.reducer;