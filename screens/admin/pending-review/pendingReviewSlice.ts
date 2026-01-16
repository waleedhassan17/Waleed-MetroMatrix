import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '../../../store/store';
import type { Provider, PaginationInfo, ProviderType } from '../../../models/admin';
import {
  getPendingProvidersAPI,
  getProviderDetailsAPI,
  approveProviderAPI,
  rejectProviderAPI,
} from '../../../networks/admin/adminAPIs';

// ============================================
// STATE INTERFACE
// ============================================

interface PendingReviewState {
  pendingProviders: Provider[];
  selectedProvider: Provider | null;
  pagination: PaginationInfo | null;
  stats: {
    total: number;
    doctors: number;
    homeServices: number;
    vendors: number;
  };
  filters: {
    providerType: ProviderType | 'all';
    page: number;
    limit: number;
  };
  status: 'idle' | 'loading' | 'failed';
  actionStatus: 'idle' | 'loading' | 'failed';
  error: string | null;
}

// ============================================
// INITIAL STATE
// ============================================

const initialState: PendingReviewState = {
  pendingProviders: [],
  selectedProvider: null,
  pagination: null,
  stats: {
    total: 0,
    doctors: 0,
    homeServices: 0,
    vendors: 0,
  },
  filters: {
    providerType: 'all',
    page: 1,
    limit: 15,
  },
  status: 'idle',
  actionStatus: 'idle',
  error: null,
};

// ============================================
// ASYNC THUNKS
// ============================================

export const fetchPendingProvidersAsync = createAsyncThunk(
  'pendingReview/fetchPendingProviders',
  async (
    filters: {
      page?: number;
      limit?: number;
      providerType?: ProviderType;
    } = {},
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as RootState;
      const token = state.admin.accessToken;
      
      if (!token) {
        return rejectWithValue('No authentication token found');
      }
      
      const { page = 1, limit = 15, providerType } = filters;
      const response = await getPendingProvidersAPI(token, page, limit, providerType);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch pending providers');
    }
  }
);

export const fetchProviderDetailsAsync = createAsyncThunk(
  'pendingReview/fetchProviderDetails',
  async (providerId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const token = state.admin.accessToken;
      
      if (!token) {
        return rejectWithValue('No authentication token found');
      }
      
      const response = await getProviderDetailsAPI(token, providerId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch provider details');
    }
  }
);

export const approveProviderAsync = createAsyncThunk(
  'pendingReview/approveProvider',
  async (providerId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const token = state.admin.accessToken;
      
      if (!token) {
        return rejectWithValue('No authentication token found');
      }
      
      await approveProviderAPI(token, providerId);
      return { providerId };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to approve provider');
    }
  }
);

export const rejectProviderAsync = createAsyncThunk(
  'pendingReview/rejectProvider',
  async (
    { providerId, reason, adminNotes }: { providerId: string; reason: string; adminNotes?: string },
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as RootState;
      const token = state.admin.accessToken;
      
      if (!token) {
        return rejectWithValue('No authentication token found');
      }
      
      await rejectProviderAPI(token, providerId, reason, adminNotes);
      return { providerId };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to reject provider');
    }
  }
);

// ============================================
// SLICE
// ============================================

export const pendingReviewSlice = createSlice({
  name: 'pendingReview',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    
    setSelectedProvider: (state, action) => {
      state.selectedProvider = action.payload;
    },
    
    clearSelectedProvider: (state) => {
      state.selectedProvider = null;
    },
    
    setProviderTypeFilter: (state, action) => {
      state.filters.providerType = action.payload;
      state.filters.page = 1; // Reset to first page when filter changes
    },
    
    setPage: (state, action) => {
      state.filters.page = action.payload;
    },
    
    resetFilters: (state) => {
      state.filters = initialState.filters;
    },
  },
  
  extraReducers: (builder) => {
    // Fetch Pending Providers
    builder
      .addCase(fetchPendingProvidersAsync.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchPendingProvidersAsync.fulfilled, (state, action) => {
        state.status = 'idle';
        state.pendingProviders = action.payload.providers || [];
        state.pagination = action.payload.pagination || null;
        
        // Calculate stats
        const providers = action.payload.providers || [];
        state.stats = {
          total: action.payload.pagination?.total || providers.length,
          doctors: providers.filter((p: Provider) => p.providerType === 'doctor').length,
          homeServices: providers.filter((p: Provider) => p.providerType === 'home_service').length,
          vendors: providers.filter((p: Provider) => p.providerType === 'vendor').length,
        };
        
        state.error = null;
      })
      .addCase(fetchPendingProvidersAsync.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
    
    // Fetch Provider Details
    builder
      .addCase(fetchProviderDetailsAsync.pending, (state) => {
        state.actionStatus = 'loading';
      })
      .addCase(fetchProviderDetailsAsync.fulfilled, (state, action) => {
        state.actionStatus = 'idle';
        state.selectedProvider = action.payload.provider;
      })
      .addCase(fetchProviderDetailsAsync.rejected, (state, action) => {
        state.actionStatus = 'failed';
        state.error = action.payload as string;
      });
    
    // Approve Provider
    builder
      .addCase(approveProviderAsync.pending, (state) => {
        state.actionStatus = 'loading';
      })
      .addCase(approveProviderAsync.fulfilled, (state, action) => {
        state.actionStatus = 'idle';
        
        // Remove from pending list
        const removedProvider = state.pendingProviders.find(
          (p) => p.id === action.payload.providerId || p._id === action.payload.providerId
        );
        
        state.pendingProviders = state.pendingProviders.filter(
          (p) => p.id !== action.payload.providerId && p._id !== action.payload.providerId
        );
        
        // Update stats
        if (removedProvider) {
          state.stats.total -= 1;
          if (removedProvider.providerType === 'doctor') state.stats.doctors -= 1;
          if (removedProvider.providerType === 'home_service') state.stats.homeServices -= 1;
          if (removedProvider.providerType === 'vendor') state.stats.vendors -= 1;
        }
        
        if (state.selectedProvider && 
            (state.selectedProvider.id === action.payload.providerId || 
             state.selectedProvider._id === action.payload.providerId)) {
          state.selectedProvider = null;
        }
      })
      .addCase(approveProviderAsync.rejected, (state, action) => {
        state.actionStatus = 'failed';
        state.error = action.payload as string;
      });
    
    // Reject Provider
    builder
      .addCase(rejectProviderAsync.pending, (state) => {
        state.actionStatus = 'loading';
      })
      .addCase(rejectProviderAsync.fulfilled, (state, action) => {
        state.actionStatus = 'idle';
        
        // Remove from pending list
        const removedProvider = state.pendingProviders.find(
          (p) => p.id === action.payload.providerId || p._id === action.payload.providerId
        );
        
        state.pendingProviders = state.pendingProviders.filter(
          (p) => p.id !== action.payload.providerId && p._id !== action.payload.providerId
        );
        
        // Update stats
        if (removedProvider) {
          state.stats.total -= 1;
          if (removedProvider.providerType === 'doctor') state.stats.doctors -= 1;
          if (removedProvider.providerType === 'home_service') state.stats.homeServices -= 1;
          if (removedProvider.providerType === 'vendor') state.stats.vendors -= 1;
        }
        
        if (state.selectedProvider && 
            (state.selectedProvider.id === action.payload.providerId || 
             state.selectedProvider._id === action.payload.providerId)) {
          state.selectedProvider = null;
        }
      })
      .addCase(rejectProviderAsync.rejected, (state, action) => {
        state.actionStatus = 'failed';
        state.error = action.payload as string;
      });
  },
});

// ============================================
// ACTIONS
// ============================================

export const {
  clearError,
  setSelectedProvider,
  clearSelectedProvider,
  setProviderTypeFilter,
  setPage,
  resetFilters,
} = pendingReviewSlice.actions;

// ============================================
// SELECTORS
// ============================================

export const selectPendingProviders = (state: any) => state.pendingReview?.pendingProviders || [];
export const selectSelectedProvider = (state: any) => state.pendingReview?.selectedProvider || null;
export const selectPagination = (state: any) => state.pendingReview?.pagination || null;
export const selectStats = (state: any) => state.pendingReview?.stats || { total: 0, pending: 0, approved: 0, rejected: 0 };
export const selectFilters = (state: any) => state.pendingReview?.filters || {};
export const selectStatus = (state: any) => state.pendingReview?.status || 'idle';
export const selectActionStatus = (state: any) => state.pendingReview?.actionStatus || 'idle';
export const selectError = (state: any) => state.pendingReview?.error || null;
export const selectIsLoading = (state: any) => state.pendingReview?.status === 'loading';
export const selectIsActionLoading = (state: any) => state.pendingReview?.actionStatus === 'loading';

export default pendingReviewSlice.reducer;