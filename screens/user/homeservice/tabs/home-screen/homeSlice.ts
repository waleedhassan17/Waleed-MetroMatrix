import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';

// Types
export interface ServiceCategory {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  description: string;
  image: string;
  providerCount: string;
  providers: string[];
  icon: string;
}

export interface Promotion {
  id: string;
  title: string;
  subtitle: string;
  discount: string;
  badge: string;
  gradient: string[];
  cta: string;
  icon?: string;
}

interface HomeState {
  categories: ServiceCategory[];
  promotions: Promotion[];
  selectedCategories: string[];
  activePromoIndex: number;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  searchQuery: string;
}

// One decent image for all service cards
const SERVICE_IMAGE = 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80';

// Mock Data - Only 3 Service Categories
const mockCategories: ServiceCategory[] = [
  {
    id: 'electricians',
    name: 'Electricians',
    badge: 'ELECTRICAL',
    badgeColor: '#F59E0B',
    description: 'Professional electrical services for all your wiring and installation needs',
    image: SERVICE_IMAGE,
    providerCount: '150+ Experts',
    providers: [
      'https://i.pravatar.cc/100?img=1',
      'https://i.pravatar.cc/100?img=2',
      'https://i.pravatar.cc/100?img=3',
      'https://i.pravatar.cc/100?img=4',
      'https://i.pravatar.cc/100?img=5',
      'https://i.pravatar.cc/100?img=6',
    ],
    icon: 'flash-outline',
  },
  {
    id: 'plumbers',
    name: 'Plumbers',
    badge: 'PLUMBING',
    badgeColor: '#3B82F6',
    description: 'Expert plumbing solutions for repairs, installations and maintenance',
    image: SERVICE_IMAGE,
    providerCount: '100+ Experts',
    providers: [
      'https://i.pravatar.cc/100?img=10',
      'https://i.pravatar.cc/100?img=11',
      'https://i.pravatar.cc/100?img=12',
      'https://i.pravatar.cc/100?img=13',
      'https://i.pravatar.cc/100?img=14',
      'https://i.pravatar.cc/100?img=15',
    ],
    icon: 'water-outline',
  },
  {
    id: 'ac-repairers',
    name: 'AC Repairers',
    badge: 'AC REPAIR',
    badgeColor: '#06B6D4',
    description: 'AC installation, repair and maintenance by certified technicians',
    image: SERVICE_IMAGE,
    providerCount: '80+ Experts',
    providers: [
      'https://i.pravatar.cc/100?img=20',
      'https://i.pravatar.cc/100?img=21',
      'https://i.pravatar.cc/100?img=22',
      'https://i.pravatar.cc/100?img=23',
      'https://i.pravatar.cc/100?img=24',
      'https://i.pravatar.cc/100?img=25',
    ],
    icon: 'snow-outline',
  },
];

// Mock Data - Promotions
const mockPromotions: Promotion[] = [
  {
    id: 'promo-1',
    title: 'First Service Free',
    subtitle: 'Get 30% off on your first home service booking',
    discount: '30% OFF',
    badge: '🎉 NEW USER',
    gradient: ['#10B981', '#059669'],
    cta: 'Claim Now',
    icon: '🏠',
  },
  {
    id: 'promo-2',
    title: 'Weekend Special',
    subtitle: 'Book any service this weekend and save big',
    discount: '40% OFF',
    badge: '⚡ LIMITED',
    gradient: ['#8B5CF6', '#6D28D9'],
    cta: 'Book Now',
    icon: '🔧',
  },
  {
    id: 'promo-3',
    title: 'Refer & Earn',
    subtitle: 'Invite friends and earn PKR 500 each',
    discount: 'PKR 500',
    badge: '💰 BONUS',
    gradient: ['#F59E0B', '#D97706'],
    cta: 'Share Now',
    icon: '🎁',
  },
];

// Initial State
const initialState: HomeState = {
  categories: mockCategories,
  promotions: mockPromotions,
  selectedCategories: [],
  activePromoIndex: 0,
  isLoading: false,
  isRefreshing: false,
  error: null,
  searchQuery: '',
};

// Async Thunks
export const fetchHomeData = createAsyncThunk(
  'home/fetchHomeData',
  async (_, { rejectWithValue }) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return {
        categories: mockCategories,
        promotions: mockPromotions,
      };
    } catch (error) {
      return rejectWithValue('Failed to fetch home data');
    }
  }
);

export const refreshHomeData = createAsyncThunk(
  'home/refreshHomeData',
  async (_, { rejectWithValue }) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      return {
        categories: mockCategories,
        promotions: mockPromotions,
      };
    } catch (error) {
      return rejectWithValue('Failed to refresh home data');
    }
  }
);

// Slice
const homeSlice = createSlice({
  name: 'home',
  initialState,
  reducers: {
    selectCategory: (state, action: PayloadAction<string>) => {
      const categoryId = action.payload;
      if (state.selectedCategories.includes(categoryId)) {
        state.selectedCategories = state.selectedCategories.filter(
          (id) => id !== categoryId
        );
      } else {
        state.selectedCategories.push(categoryId);
      }
    },
    
    setSingleCategory: (state, action: PayloadAction<string>) => {
      state.selectedCategories = [action.payload];
    },
    
    clearSelectedCategories: (state) => {
      state.selectedCategories = [];
    },
    
    setActivePromoIndex: (state, action: PayloadAction<number>) => {
      state.activePromoIndex = action.payload;
    },
    
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHomeData.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchHomeData.fulfilled, (state, action) => {
        state.isLoading = false;
        state.categories = action.payload.categories;
        state.promotions = action.payload.promotions;
      })
      .addCase(fetchHomeData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(refreshHomeData.pending, (state) => {
        state.isRefreshing = true;
      })
      .addCase(refreshHomeData.fulfilled, (state, action) => {
        state.isRefreshing = false;
        state.categories = action.payload.categories;
        state.promotions = action.payload.promotions;
      })
      .addCase(refreshHomeData.rejected, (state, action) => {
        state.isRefreshing = false;
        state.error = action.payload as string;
      });
  },
});

// Actions
export const {
  selectCategory,
  setSingleCategory,
  clearSelectedCategories,
  setActivePromoIndex,
  setSearchQuery,
  clearError,
} = homeSlice.actions;

// Selectors
export const selectCategories = (state: { home: HomeState }) =>
  state.home.categories;

export const selectPromotions = (state: { home: HomeState }) =>
  state.home.promotions;

export const selectSelectedCategories = (state: { home: HomeState }) =>
  state.home.selectedCategories;

export const selectActivePromoIndex = (state: { home: HomeState }) =>
  state.home.activePromoIndex;

export const selectIsLoading = (state: { home: HomeState }) =>
  state.home.isLoading;

export const selectIsRefreshing = (state: { home: HomeState }) =>
  state.home.isRefreshing;

export const selectHomeError = (state: { home: HomeState }) =>
  state.home.error;

export const selectHomeSearchQuery = (state: { home: HomeState }) =>
  state.home.searchQuery;

export const selectFilteredCategories = (state: { home: HomeState }) => {
  const { categories, searchQuery } = state.home;
  if (!searchQuery) return categories;

  const query = searchQuery.toLowerCase();
  return categories.filter(
    (category) =>
      category.name.toLowerCase().includes(query) ||
      category.badge.toLowerCase().includes(query) ||
      category.description.toLowerCase().includes(query)
  );
};

export const selectCategoryById = (categoryId: string) => (state: { home: HomeState }) =>
  state.home.categories.find((cat) => cat.id === categoryId);

export default homeSlice.reducer;