import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';

// Types
export interface Provider {
  id: string;
  name: string;
  rating: number;
  reviews: number;
  image: string;
  verified: boolean;
  experience: string;
  price: number;
  available: boolean;
  responseTime: string;
}

export type SortOption = 'rating' | 'reviews' | 'experience' | 'price';

interface ProvidersState {
  providers: Provider[];
  filteredProviders: Provider[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  searchQuery: string;
  selectedSort: SortOption;
  currentServiceType: string;
}

// One decent profile image for all providers
const PROVIDER_IMAGE = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80';

// ============================================
// DUMMY DATA FOR ELECTRICIANS
// ============================================
const electriciansData: Provider[] = [
  {
    id: 'elec1',
    name: 'Muhammad Irfan',
    rating: 4.9,
    reviews: 215,
    image: PROVIDER_IMAGE,
    verified: true,
    experience: '8 years',
    price: 1500,
    available: true,
    responseTime: '~10 min',
  },
  {
    id: 'elec2',
    name: 'Ali Hassan',
    rating: 4.8,
    reviews: 187,
    image: PROVIDER_IMAGE,
    verified: true,
    experience: '6 years',
    price: 1200,
    available: true,
    responseTime: '~15 min',
  },
  {
    id: 'elec3',
    name: 'Kashif Nawaz',
    rating: 4.7,
    reviews: 156,
    image: PROVIDER_IMAGE,
    verified: true,
    experience: '5 years',
    price: 1100,
    available: false,
    responseTime: '~20 min',
  },
  {
    id: 'elec4',
    name: 'Imran Sheikh',
    rating: 4.6,
    reviews: 134,
    image: PROVIDER_IMAGE,
    verified: false,
    experience: '4 years',
    price: 1000,
    available: true,
    responseTime: '~12 min',
  },
  {
    id: 'elec5',
    name: 'Nadeem Aslam',
    rating: 4.5,
    reviews: 98,
    image: PROVIDER_IMAGE,
    verified: true,
    experience: '3 years',
    price: 900,
    available: true,
    responseTime: '~8 min',
  },
];

// ============================================
// DUMMY DATA FOR PLUMBERS
// ============================================
const plumbersData: Provider[] = [
  {
    id: 'plumb1',
    name: 'Asad Mehmood',
    rating: 4.9,
    reviews: 198,
    image: PROVIDER_IMAGE,
    verified: true,
    experience: '7 years',
    price: 1400,
    available: true,
    responseTime: '~10 min',
  },
  {
    id: 'plumb2',
    name: 'Kamran Yousaf',
    rating: 4.8,
    reviews: 167,
    image: PROVIDER_IMAGE,
    verified: true,
    experience: '6 years',
    price: 1300,
    available: true,
    responseTime: '~15 min',
  },
  {
    id: 'plumb3',
    name: 'Shahid Iqbal',
    rating: 4.7,
    reviews: 145,
    image: PROVIDER_IMAGE,
    verified: true,
    experience: '5 years',
    price: 1100,
    available: true,
    responseTime: '~12 min',
  },
  {
    id: 'plumb4',
    name: 'Nasir Abbas',
    rating: 4.6,
    reviews: 112,
    image: PROVIDER_IMAGE,
    verified: false,
    experience: '4 years',
    price: 950,
    available: false,
    responseTime: '~20 min',
  },
  {
    id: 'plumb5',
    name: 'Rizwan Ahmed',
    rating: 4.5,
    reviews: 89,
    image: PROVIDER_IMAGE,
    verified: true,
    experience: '3 years',
    price: 850,
    available: true,
    responseTime: '~8 min',
  },
];

// ============================================
// DUMMY DATA FOR AC REPAIRERS
// ============================================
const acRepairersData: Provider[] = [
  {
    id: 'ac1',
    name: 'Ahmed Khan',
    rating: 4.8,
    reviews: 178,
    image: PROVIDER_IMAGE,
    verified: true,
    experience: '6 years',
    price: 1600,
    available: true,
    responseTime: '~10 min',
  },
  {
    id: 'ac2',
    name: 'Salman Ali',
    rating: 4.9,
    reviews: 121,
    image: PROVIDER_IMAGE,
    verified: true,
    experience: '5 years',
    price: 1500,
    available: true,
    responseTime: '~12 min',
  },
  {
    id: 'ac3',
    name: 'Usman Qureshi',
    rating: 4.7,
    reviews: 205,
    image: PROVIDER_IMAGE,
    verified: true,
    experience: '8 years',
    price: 1800,
    available: false,
    responseTime: '~15 min',
  },
  {
    id: 'ac4',
    name: 'Hassan Rafiq',
    rating: 4.6,
    reviews: 99,
    image: PROVIDER_IMAGE,
    verified: false,
    experience: '3 years',
    price: 1200,
    available: true,
    responseTime: '~8 min',
  },
  {
    id: 'ac5',
    name: 'Zeeshan Iqbal',
    rating: 4.5,
    reviews: 84,
    image: PROVIDER_IMAGE,
    verified: false,
    experience: '2 years',
    price: 1000,
    available: true,
    responseTime: '~20 min',
  },
];

// Initial State
const initialState: ProvidersState = {
  providers: [],
  filteredProviders: [],
  isLoading: false,
  isRefreshing: false,
  error: null,
  searchQuery: '',
  selectedSort: 'rating',
  currentServiceType: '',
};

// ============================================
// ASYNC THUNKS - SEPARATE API FOR EACH SERVICE
// ============================================

// Fetch Electricians API
export const fetchElectricians = createAsyncThunk(
  'providers/fetchElectricians',
  async (_, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800));
      return {
        providers: electriciansData,
        serviceType: 'electricians',
      };
    } catch (error) {
      return rejectWithValue('Failed to fetch electricians');
    }
  }
);

// Fetch Plumbers API
export const fetchPlumbers = createAsyncThunk(
  'providers/fetchPlumbers',
  async (_, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800));
      return {
        providers: plumbersData,
        serviceType: 'plumbers',
      };
    } catch (error) {
      return rejectWithValue('Failed to fetch plumbers');
    }
  }
);

// Fetch AC Repairers API
export const fetchACRepairers = createAsyncThunk(
  'providers/fetchACRepairers',
  async (_, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800));
      return {
        providers: acRepairersData,
        serviceType: 'ac-repairers',
      };
    } catch (error) {
      return rejectWithValue('Failed to fetch AC repairers');
    }
  }
);

// Helper function to sort providers
const sortProviders = (providers: Provider[], sortBy: SortOption): Provider[] => {
  const sorted = [...providers];
  switch (sortBy) {
    case 'rating':
      return sorted.sort((a, b) => b.rating - a.rating);
    case 'reviews':
      return sorted.sort((a, b) => b.reviews - a.reviews);
    case 'experience':
      return sorted.sort((a, b) => parseInt(b.experience) - parseInt(a.experience));
    case 'price':
      return sorted.sort((a, b) => a.price - b.price);
    default:
      return sorted;
  }
};

// Helper function to filter providers
const filterProviders = (providers: Provider[], query: string): Provider[] => {
  if (!query.trim()) return providers;
  
  const lowerQuery = query.toLowerCase();
  return providers.filter((provider) =>
    provider.name.toLowerCase().includes(lowerQuery)
  );
};

// Slice
const providersSlice = createSlice({
  name: 'providers',
  initialState,
  reducers: {
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
      const filtered = filterProviders(state.providers, action.payload);
      state.filteredProviders = sortProviders(filtered, state.selectedSort);
    },
    
    setSelectedSort: (state, action: PayloadAction<SortOption>) => {
      state.selectedSort = action.payload;
      const filtered = filterProviders(state.providers, state.searchQuery);
      state.filteredProviders = sortProviders(filtered, action.payload);
    },
    
    clearFilters: (state) => {
      state.searchQuery = '';
      state.selectedSort = 'rating';
      state.filteredProviders = sortProviders(state.providers, 'rating');
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    clearProviders: (state) => {
      state.providers = [];
      state.filteredProviders = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Electricians
      .addCase(fetchElectricians.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchElectricians.fulfilled, (state, action) => {
        state.isLoading = false;
        state.providers = action.payload.providers;
        state.currentServiceType = action.payload.serviceType;
        state.filteredProviders = sortProviders(action.payload.providers, state.selectedSort);
      })
      .addCase(fetchElectricians.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch Plumbers
      .addCase(fetchPlumbers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPlumbers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.providers = action.payload.providers;
        state.currentServiceType = action.payload.serviceType;
        state.filteredProviders = sortProviders(action.payload.providers, state.selectedSort);
      })
      .addCase(fetchPlumbers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch AC Repairers
      .addCase(fetchACRepairers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchACRepairers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.providers = action.payload.providers;
        state.currentServiceType = action.payload.serviceType;
        state.filteredProviders = sortProviders(action.payload.providers, state.selectedSort);
      })
      .addCase(fetchACRepairers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

// Actions
export const {
  setSearchQuery,
  setSelectedSort,
  clearFilters,
  clearError,
  clearProviders,
} = providersSlice.actions;

// Selectors
export const selectProviders = (state: { serviceProviders: ProvidersState }) =>
  state.serviceProviders.providers;

export const selectFilteredProviders = (state: { serviceProviders: ProvidersState }) =>
  state.serviceProviders.filteredProviders;

export const selectIsLoading = (state: { serviceProviders: ProvidersState }) =>
  state.serviceProviders.isLoading;

export const selectIsRefreshing = (state: { serviceProviders: ProvidersState }) =>
  state.serviceProviders.isRefreshing;

export const selectProvidersError = (state: { serviceProviders: ProvidersState }) =>
  state.serviceProviders.error;

export const selectSearchQuery = (state: { serviceProviders: ProvidersState }) =>
  state.serviceProviders.searchQuery;

export const selectSelectedSort = (state: { serviceProviders: ProvidersState }) =>
  state.serviceProviders.selectedSort;

export const selectCurrentServiceType = (state: { serviceProviders: ProvidersState }) =>
  state.serviceProviders.currentServiceType;

export const selectProviderById = (providerId: string) => (state: { serviceProviders: ProvidersState }) =>
  state.serviceProviders.providers.find((p) => p.id === providerId);

export default providersSlice.reducer;