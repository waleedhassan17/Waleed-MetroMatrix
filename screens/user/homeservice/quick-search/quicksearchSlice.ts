import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';

// Types
export interface LocationData {
  address: string;
  latitude: number | null;
  longitude: number | null;
  city?: string;
  region?: string;
}

export interface QuickSearchFormState {
  // Form fields
  jobDescription: string;
  location: LocationData;
  serviceType: 'electricians' | 'plumbers' | 'ac-repairers';
  
  // Form validation
  isJobDescriptionValid: boolean;
  isLocationValid: boolean;
  
  // Location loading
  isLoadingLocation: boolean;
  locationError: string | null;
  
  // Form submission
  isSubmitting: boolean;
  submitError: string | null;
  
  // Recent searches (for suggestions)
  recentSearches: {
    id: string;
    jobDescription: string;
    location: string;
    serviceType: string;
    timestamp: string;
  }[];
}

// Initial state
const initialState: QuickSearchFormState = {
  jobDescription: '',
  location: {
    address: '',
    latitude: null,
    longitude: null,
  },
  serviceType: 'electricians',
  isJobDescriptionValid: false,
  isLocationValid: false,
  isLoadingLocation: false,
  locationError: null,
  isSubmitting: false,
  submitError: null,
  recentSearches: [],
};

// Async Thunks

// Get current location
export const getCurrentLocation = createAsyncThunk(
  'quickSearchForm/getCurrentLocation',
  async (_, { rejectWithValue }) => {
    try {
      // This would use expo-location in the actual component
      // Simulating the async operation here
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      // Simulated location data
      const locationData: LocationData = {
        address: 'Gulberg III, Lahore, Punjab',
        latitude: 31.5204,
        longitude: 74.3587,
        city: 'Lahore',
        region: 'Punjab',
      };
      
      return locationData;
    } catch (error) {
      return rejectWithValue('Failed to get current location. Please enter manually.');
    }
  }
);

// Submit quick search request
export const submitQuickSearch = createAsyncThunk(
  'quickSearchForm/submitQuickSearch',
  async (
    params: {
      serviceType: 'electricians' | 'plumbers' | 'ac-repairers';
      jobDescription: string;
      location: LocationData;
    },
    { rejectWithValue }
  ) => {
    try {
      // Validate inputs
      if (!params.jobDescription.trim()) {
        return rejectWithValue('Please describe the job you need help with.');
      }
      if (!params.location.address.trim()) {
        return rejectWithValue('Please enter your location.');
      }

      // Simulate API call to create search request
      await new Promise((resolve) => setTimeout(resolve, 500));

      const searchRequest = {
        id: `qs-${Date.now()}`,
        serviceType: params.serviceType,
        jobDescription: params.jobDescription.trim(),
        location: params.location,
        radius: 10, // 10km default
        status: 'created',
        createdAt: new Date().toISOString(),
      };

      return searchRequest;
    } catch (error) {
      return rejectWithValue('Failed to submit search request. Please try again.');
    }
  }
);

// Save to recent searches
export const saveRecentSearch = createAsyncThunk(
  'quickSearchForm/saveRecentSearch',
  async (
    params: {
      jobDescription: string;
      location: string;
      serviceType: string;
    },
    { getState }
  ) => {
    const state = getState() as { quickSearchForm: QuickSearchFormState };
    
    const newSearch = {
      id: `recent-${Date.now()}`,
      jobDescription: params.jobDescription,
      location: params.location,
      serviceType: params.serviceType,
      timestamp: new Date().toISOString(),
    };

    // Keep only last 5 searches
    const updatedSearches = [newSearch, ...state.quickSearchForm.recentSearches].slice(0, 5);
    
    return updatedSearches;
  }
);

// Slice
const quickSearchFormSlice = createSlice({
  name: 'quickSearchForm',
  initialState,
  reducers: {
    // Set job description
    setJobDescription: (state, action: PayloadAction<string>) => {
      state.jobDescription = action.payload;
      state.isJobDescriptionValid = action.payload.trim().length >= 10;
    },

    // Set location manually
    setLocation: (state, action: PayloadAction<string>) => {
      state.location.address = action.payload;
      state.isLocationValid = action.payload.trim().length > 0;
      state.locationError = null;
    },

    // Set full location data
    setLocationData: (state, action: PayloadAction<LocationData>) => {
      state.location = action.payload;
      state.isLocationValid = action.payload.address.trim().length > 0;
      state.locationError = null;
    },

    // Set service type
    setServiceType: (state, action: PayloadAction<'electricians' | 'plumbers' | 'ac-repairers'>) => {
      state.serviceType = action.payload;
    },

    // Clear location
    clearLocation: (state) => {
      state.location = {
        address: '',
        latitude: null,
        longitude: null,
      };
      state.isLocationValid = false;
      state.locationError = null;
    },

    // Clear form
    clearForm: (state) => {
      state.jobDescription = '';
      state.location = {
        address: '',
        latitude: null,
        longitude: null,
      };
      state.isJobDescriptionValid = false;
      state.isLocationValid = false;
      state.submitError = null;
    },

    // Clear errors
    clearErrors: (state) => {
      state.locationError = null;
      state.submitError = null;
    },

    // Remove recent search
    removeRecentSearch: (state, action: PayloadAction<string>) => {
      state.recentSearches = state.recentSearches.filter((s) => s.id !== action.payload);
    },

    // Clear all recent searches
    clearRecentSearches: (state) => {
      state.recentSearches = [];
    },

    // Use recent search
    useRecentSearch: (state, action: PayloadAction<string>) => {
      const search = state.recentSearches.find((s) => s.id === action.payload);
      if (search) {
        state.jobDescription = search.jobDescription;
        state.location.address = search.location;
        state.isJobDescriptionValid = search.jobDescription.trim().length >= 10;
        state.isLocationValid = search.location.trim().length > 0;
      }
    },

    // Reset form state
    resetForm: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Get current location
      .addCase(getCurrentLocation.pending, (state) => {
        state.isLoadingLocation = true;
        state.locationError = null;
      })
      .addCase(getCurrentLocation.fulfilled, (state, action) => {
        state.isLoadingLocation = false;
        state.location = action.payload;
        state.isLocationValid = true;
      })
      .addCase(getCurrentLocation.rejected, (state, action) => {
        state.isLoadingLocation = false;
        state.locationError = action.payload as string;
      })

      // Submit quick search
      .addCase(submitQuickSearch.pending, (state) => {
        state.isSubmitting = true;
        state.submitError = null;
      })
      .addCase(submitQuickSearch.fulfilled, (state) => {
        state.isSubmitting = false;
      })
      .addCase(submitQuickSearch.rejected, (state, action) => {
        state.isSubmitting = false;
        state.submitError = action.payload as string;
      })

      // Save recent search
      .addCase(saveRecentSearch.fulfilled, (state, action) => {
        state.recentSearches = action.payload;
      });
  },
});

// Actions
export const {
  setJobDescription,
  setLocation,
  setLocationData,
  setServiceType,
  clearLocation,
  clearForm,
  clearErrors,
  removeRecentSearch,
  clearRecentSearches,
  useRecentSearch,
  resetForm,
} = quickSearchFormSlice.actions;

// Selectors
export const selectJobDescription = (state: { quickSearchForm: QuickSearchFormState }) =>
  state.quickSearchForm.jobDescription;

export const selectLocation = (state: { quickSearchForm: QuickSearchFormState }) =>
  state.quickSearchForm.location;

export const selectServiceType = (state: { quickSearchForm: QuickSearchFormState }) =>
  state.quickSearchForm.serviceType;

export const selectIsJobDescriptionValid = (state: { quickSearchForm: QuickSearchFormState }) =>
  state.quickSearchForm.isJobDescriptionValid;

export const selectIsLocationValid = (state: { quickSearchForm: QuickSearchFormState }) =>
  state.quickSearchForm.isLocationValid;

export const selectIsFormValid = (state: { quickSearchForm: QuickSearchFormState }) =>
  state.quickSearchForm.isJobDescriptionValid && state.quickSearchForm.isLocationValid;

export const selectIsLoadingLocation = (state: { quickSearchForm: QuickSearchFormState }) =>
  state.quickSearchForm.isLoadingLocation;

export const selectLocationError = (state: { quickSearchForm: QuickSearchFormState }) =>
  state.quickSearchForm.locationError;

export const selectIsSubmitting = (state: { quickSearchForm: QuickSearchFormState }) =>
  state.quickSearchForm.isSubmitting;

export const selectSubmitError = (state: { quickSearchForm: QuickSearchFormState }) =>
  state.quickSearchForm.submitError;

export const selectRecentSearches = (state: { quickSearchForm: QuickSearchFormState }) =>
  state.quickSearchForm.recentSearches;

export default quickSearchFormSlice.reducer;