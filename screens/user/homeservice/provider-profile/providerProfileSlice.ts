import { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '../../../../store/createAppSlice';
import { ProviderDetails, ProviderService, GalleryItem, Review } from '../../../../models/serviceProviders';
import { providerDetailsSerializer } from '../../../../serializers/serviceProviders/providerSerializer';
import { fetchProviderDetails } from '../../../../networks/serviceProviders/providerNetwork';

// Types - Re-export from models for backward compatibility
export type { ProviderDetails as Provider } from '../../../../models/serviceProviders';
// Re-export types used by UI components
export type { Review, GalleryItem } from '../../../../models/serviceProviders';
export type { ProviderService as Service } from '../../../../models/serviceProviders';

export interface ProviderProfileState {
  provider: ProviderDetails | null;
  isLoading: boolean;
  error: string | null;
  selectedTab: 'overview' | 'reviews' | 'gallery' | 'availability';
}

// Initial State
const initialState: ProviderProfileState = {
  provider: null,
  isLoading: false,
  error: null,
  selectedTab: 'overview',
};

// Slice using createAppSlice
const providerProfileSlice = createAppSlice({
  name: 'providerProfile',
  initialState,
  reducers: (create) => ({
    // Fetch provider by ID
    fetchProviderById: create.asyncThunk(
      async ({ providerId, category }: { providerId: string; category: 'electricians' | 'plumbers' | 'ac-repairers' }, { rejectWithValue }) => {
        const response = await fetchProviderDetails(providerId);
        
        if (!response.success) {
          return rejectWithValue(response.message || 'Failed to fetch provider');
        }

        return providerDetailsSerializer(response.data);
      },
      {
        pending: (state) => {
          state.isLoading = true;
          state.error = null;
        },
        fulfilled: (state, action) => {
          state.isLoading = false;
          state.provider = action.payload;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.payload as string || 'Failed to fetch provider';
        },
      }
    ),

    // Sync reducers
    setSelectedTab: create.reducer(
      (state, action: PayloadAction<'overview' | 'reviews' | 'gallery' | 'availability'>) => {
        state.selectedTab = action.payload;
      }
    ),

    clearProvider: create.reducer((state) => {
      state.provider = null;
      state.error = null;
      state.selectedTab = 'overview';
    }),

    clearError: create.reducer((state) => {
      state.error = null;
    }),
  }),
  selectors: {
    selectProvider: (state) => state.provider,
    selectIsLoading: (state) => state.isLoading,
    selectError: (state) => state.error,
    selectSelectedTab: (state) => state.selectedTab,
  },
});

// Actions
export const { fetchProviderById, setSelectedTab, clearProvider, clearError } = providerProfileSlice.actions;

// Selectors
export const { selectProvider, selectIsLoading, selectError, selectSelectedTab } = providerProfileSlice.selectors;

export default providerProfileSlice.reducer;
