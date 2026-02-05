import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';

// Types
export interface Provider {
  id: string;
  name: string;
  image: string;
  rating: number;
  reviews: number;
  experience: string;
  price: number;
  verified: boolean;
  available: boolean;
  responseTime: string;
  specialty?: string;
  phone?: string;
  email?: string;
  address?: string;
  bio?: string;
  skills?: string[];
  completedJobs?: number;
  joinedDate?: string;
}

export type SortOption = 'rating' | 'reviews' | 'experience' | 'price';

export interface ProvidersState {
  // Provider lists by category
  electricians: Provider[];
  plumbers: Provider[];
  acRepairers: Provider[];
  
  // Current active providers (filtered/sorted)
  filteredProviders: Provider[];
  
  // Search and filter state
  searchQuery: string;
  selectedSort: SortOption;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Selected provider for detail view
  selectedProvider: Provider | null;
}

// Dummy data for electricians
const DUMMY_ELECTRICIANS: Provider[] = [
  {
    id: 'elec1',
    name: 'Ahmed Hassan',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
    rating: 4.9,
    reviews: 187,
    experience: '8 Years',
    price: 1500,
    verified: true,
    available: true,
    responseTime: '~15 min',
    specialty: 'Wiring & Installation',
    completedJobs: 520,
  },
  {
    id: 'elec2',
    name: 'Muhammad Ali',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80',
    rating: 4.8,
    reviews: 142,
    experience: '6 Years',
    price: 1200,
    verified: true,
    available: true,
    responseTime: '~20 min',
    specialty: 'Commercial Electrical',
    completedJobs: 380,
  },
  {
    id: 'elec3',
    name: 'Usman Khan',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80',
    rating: 4.7,
    reviews: 98,
    experience: '5 Years',
    price: 1000,
    verified: true,
    available: false,
    responseTime: '~30 min',
    specialty: 'Repairs & Maintenance',
    completedJobs: 245,
  },
  {
    id: 'elec4',
    name: 'Bilal Ahmed',
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&q=80',
    rating: 4.6,
    reviews: 76,
    experience: '4 Years',
    price: 900,
    verified: false,
    available: true,
    responseTime: '~25 min',
    specialty: 'Home Electrical',
    completedJobs: 180,
  },
  {
    id: 'elec5',
    name: 'Farhan Malik',
    image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&q=80',
    rating: 4.9,
    reviews: 215,
    experience: '10 Years',
    price: 2000,
    verified: true,
    available: true,
    responseTime: '~10 min',
    specialty: 'Industrial Electrical',
    completedJobs: 680,
  },
];

// Dummy data for plumbers
const DUMMY_PLUMBERS: Provider[] = [
  {
    id: 'plumb1',
    name: 'Imran Sheikh',
    image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&q=80',
    rating: 4.9,
    reviews: 203,
    experience: '12 Years',
    price: 1800,
    verified: true,
    available: true,
    responseTime: '~15 min',
    specialty: 'Pipe Installation',
    completedJobs: 720,
  },
  {
    id: 'plumb2',
    name: 'Tariq Mehmood',
    image: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&q=80',
    rating: 4.7,
    reviews: 156,
    experience: '8 Years',
    price: 1400,
    verified: true,
    available: true,
    responseTime: '~20 min',
    specialty: 'Leak Repairs',
    completedJobs: 450,
  },
  {
    id: 'plumb3',
    name: 'Kashif Raza',
    image: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=200&q=80',
    rating: 4.8,
    reviews: 178,
    experience: '9 Years',
    price: 1600,
    verified: true,
    available: false,
    responseTime: '~25 min',
    specialty: 'Bathroom Fitting',
    completedJobs: 520,
  },
  {
    id: 'plumb4',
    name: 'Nasir Abbas',
    image: 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=200&q=80',
    rating: 4.5,
    reviews: 89,
    experience: '5 Years',
    price: 1100,
    verified: false,
    available: true,
    responseTime: '~30 min',
    specialty: 'Emergency Services',
    completedJobs: 280,
  },
  {
    id: 'plumb5',
    name: 'Waqar Hussain',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80',
    rating: 4.6,
    reviews: 112,
    experience: '7 Years',
    price: 1300,
    verified: true,
    available: true,
    responseTime: '~18 min',
    specialty: 'Water Heater Install',
    completedJobs: 340,
  },
];

// Dummy data for AC repairers
const DUMMY_AC_REPAIRERS: Provider[] = [
  {
    id: 'ac1',
    name: 'Rizwan Ahmed',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
    rating: 4.9,
    reviews: 234,
    experience: '10 Years',
    price: 2000,
    verified: true,
    available: true,
    responseTime: '~12 min',
    specialty: 'AC Installation',
    completedJobs: 850,
  },
  {
    id: 'ac2',
    name: 'Kamran Ali',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80',
    rating: 4.8,
    reviews: 189,
    experience: '8 Years',
    price: 1700,
    verified: true,
    available: true,
    responseTime: '~18 min',
    specialty: 'Gas Refilling',
    completedJobs: 620,
  },
  {
    id: 'ac3',
    name: 'Faisal Iqbal',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80',
    rating: 4.7,
    reviews: 145,
    experience: '6 Years',
    price: 1400,
    verified: true,
    available: false,
    responseTime: '~22 min',
    specialty: 'Cooling Issues',
    completedJobs: 420,
  },
  {
    id: 'ac4',
    name: 'Shahid Latif',
    image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&q=80',
    rating: 4.6,
    reviews: 98,
    experience: '5 Years',
    price: 1200,
    verified: false,
    available: true,
    responseTime: '~28 min',
    specialty: 'AC Servicing',
    completedJobs: 310,
  },
  {
    id: 'ac5',
    name: 'Junaid Khan',
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&q=80',
    rating: 4.9,
    reviews: 267,
    experience: '12 Years',
    price: 2200,
    verified: true,
    available: true,
    responseTime: '~10 min',
    specialty: 'Central AC Systems',
    completedJobs: 920,
  },
  {
    id: 'ac6',
    name: 'Asad Mahmood',
    image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&q=80',
    rating: 4.5,
    reviews: 78,
    experience: '4 Years',
    price: 1000,
    verified: true,
    available: true,
    responseTime: '~35 min',
    specialty: 'Window AC Repair',
    completedJobs: 195,
  },
];

// Initial state
const initialState: ProvidersState = {
  electricians: [],
  plumbers: [],
  acRepairers: [],
  filteredProviders: [],
  searchQuery: '',
  selectedSort: 'rating',
  isLoading: false,
  error: null,
  selectedProvider: null,
};

// Helper function to sort providers
const sortProviders = (providers: Provider[], sortBy: SortOption): Provider[] => {
  const sorted = [...providers];
  switch (sortBy) {
    case 'rating':
      return sorted.sort((a, b) => b.rating - a.rating);
    case 'reviews':
      return sorted.sort((a, b) => b.reviews - a.reviews);
    case 'experience':
      return sorted.sort((a, b) => {
        const aYears = parseInt(a.experience) || 0;
        const bYears = parseInt(b.experience) || 0;
        return bYears - aYears;
      });
    case 'price':
      return sorted.sort((a, b) => a.price - b.price);
    default:
      return sorted;
  }
};

// Helper function to filter providers by search query
const filterBySearch = (providers: Provider[], query: string): Provider[] => {
  if (!query.trim()) return providers;
  const lowercaseQuery = query.toLowerCase();
  return providers.filter(
    (p) =>
      p.name.toLowerCase().includes(lowercaseQuery) ||
      p.specialty?.toLowerCase().includes(lowercaseQuery) ||
      p.experience.toLowerCase().includes(lowercaseQuery)
  );
};

// Async Thunks

// Fetch Electricians
export const fetchElectricians = createAsyncThunk(
  'providers/fetchElectricians',
  async (_, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800));
      return DUMMY_ELECTRICIANS;
    } catch (error) {
      return rejectWithValue('Failed to fetch electricians');
    }
  }
);

// Fetch Plumbers
export const fetchPlumbers = createAsyncThunk(
  'providers/fetchPlumbers',
  async (_, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800));
      return DUMMY_PLUMBERS;
    } catch (error) {
      return rejectWithValue('Failed to fetch plumbers');
    }
  }
);

// Fetch AC Repairers
export const fetchACRepairers = createAsyncThunk(
  'providers/fetchACRepairers',
  async (_, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800));
      return DUMMY_AC_REPAIRERS;
    } catch (error) {
      return rejectWithValue('Failed to fetch AC repairers');
    }
  }
);

// Fetch Provider by ID
export const fetchProviderById = createAsyncThunk(
  'providers/fetchProviderById',
  async (
    { id, category }: { id: string; category: 'electricians' | 'plumbers' | 'ac-repairers' },
    { rejectWithValue }
  ) => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      let providers: Provider[];
      switch (category) {
        case 'electricians':
          providers = DUMMY_ELECTRICIANS;
          break;
        case 'plumbers':
          providers = DUMMY_PLUMBERS;
          break;
        case 'ac-repairers':
          providers = DUMMY_AC_REPAIRERS;
          break;
        default:
          providers = [];
      }

      const provider = providers.find((p) => p.id === id);
      if (!provider) {
        return rejectWithValue('Provider not found');
      }
      return provider;
    } catch (error) {
      return rejectWithValue('Failed to fetch provider');
    }
  }
);

// Slice
const providersSlice = createSlice({
  name: 'providers',
  initialState,
  reducers: {
    // Set search query
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
      // Re-filter providers
      const currentProviders = [...state.filteredProviders];
      state.filteredProviders = sortProviders(
        filterBySearch(currentProviders, action.payload),
        state.selectedSort
      );
    },

    // Set sort option
    setSelectedSort: (state, action: PayloadAction<SortOption>) => {
      state.selectedSort = action.payload;
      state.filteredProviders = sortProviders(state.filteredProviders, action.payload);
    },

    // Clear search
    clearSearch: (state) => {
      state.searchQuery = '';
    },

    // Clear selected provider
    clearSelectedProvider: (state) => {
      state.selectedProvider = null;
    },

    // Clear error
    clearError: (state) => {
      state.error = null;
    },

    // Reset providers state
    resetProviders: (state) => {
      state.filteredProviders = [];
      state.searchQuery = '';
      state.selectedSort = 'rating';
      state.error = null;
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
        state.electricians = action.payload;
        state.filteredProviders = sortProviders(
          filterBySearch(action.payload, state.searchQuery),
          state.selectedSort
        );
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
        state.plumbers = action.payload;
        state.filteredProviders = sortProviders(
          filterBySearch(action.payload, state.searchQuery),
          state.selectedSort
        );
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
        state.acRepairers = action.payload;
        state.filteredProviders = sortProviders(
          filterBySearch(action.payload, state.searchQuery),
          state.selectedSort
        );
      })
      .addCase(fetchACRepairers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Fetch Provider by ID
      .addCase(fetchProviderById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProviderById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedProvider = action.payload;
      })
      .addCase(fetchProviderById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

// Actions
export const {
  setSearchQuery,
  setSelectedSort,
  clearSearch,
  clearSelectedProvider,
  clearError,
  resetProviders,
} = providersSlice.actions;

// Selectors
export const selectElectricians = (state: { serviceProviders: ProvidersState }) =>
  state.serviceProviders.electricians;

export const selectPlumbers = (state: { serviceProviders: ProvidersState }) =>
  state.serviceProviders.plumbers;

export const selectACRepairers = (state: { serviceProviders: ProvidersState }) =>
  state.serviceProviders.acRepairers;

export const selectFilteredProviders = (state: { serviceProviders: ProvidersState }) =>
  state.serviceProviders.filteredProviders;

export const selectSearchQuery = (state: { serviceProviders: ProvidersState }) =>
  state.serviceProviders.searchQuery;

export const selectSelectedSort = (state: { serviceProviders: ProvidersState }) =>
  state.serviceProviders.selectedSort;

export const selectIsLoading = (state: { serviceProviders: ProvidersState }) =>
  state.serviceProviders.isLoading;

export const selectProvidersError = (state: { serviceProviders: ProvidersState }) =>
  state.serviceProviders.error;

export const selectSelectedProvider = (state: { serviceProviders: ProvidersState }) =>
  state.serviceProviders.selectedProvider;

// Get provider by ID from local state
export const selectProviderById = (id: string, category: 'electricians' | 'plumbers' | 'ac-repairers') =>
  (state: { serviceProviders: ProvidersState }) => {
    switch (category) {
      case 'electricians':
        return state.serviceProviders.electricians.find((p) => p.id === id);
      case 'plumbers':
        return state.serviceProviders.plumbers.find((p) => p.id === id);
      case 'ac-repairers':
        return state.serviceProviders.acRepairers.find((p) => p.id === id);
      default:
        return undefined;
    }
  };

export default providersSlice.reducer;