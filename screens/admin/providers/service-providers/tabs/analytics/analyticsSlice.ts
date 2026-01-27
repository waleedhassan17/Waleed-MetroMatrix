// FILE: screens/admin/providers/service-providers/tabs/analytics/analyticsSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../../../../../store/store';

interface RevenueData {
  month: string;
  lahore: number;
  faisalabad: number;
}

interface CategoryData {
  label: string;
  value: number;
  color: string;
  icon: string;
}

interface CityPerformance {
  name: string;
  bookings: number;
  revenue: number;
  growth: string;
  icon: string;
  completion: string;
  rating: number;
}

interface StatData {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  color: string;
  bgColor: string;
  trend: string;
}

interface AnalyticsState {
  revenueData: RevenueData[];
  categoryData: CategoryData[];
  cityPerformance: CityPerformance[];
  stats: StatData[];
  isLoading: boolean;
  error: string | null;
  dateRange: {
    start: string;
    end: string;
  };
  selectedCity: string | null;
  totalRevenue: number;
  revenueGrowth: number;
}

const initialState: AnalyticsState = {
  revenueData: [
    { month: 'Jan', lahore: 420000, faisalabad: 190000 },
    { month: 'Feb', lahore: 580000, faisalabad: 240000 },
    { month: 'Mar', lahore: 520000, faisalabad: 220000 },
    { month: 'Apr', lahore: 680000, faisalabad: 280000 },
    { month: 'May', lahore: 750000, faisalabad: 320000 },
    { month: 'Jun', lahore: 620000, faisalabad: 290000 },
  ],
  categoryData: [
    { label: 'Electrical', value: 245000, color: '#3B82F6', icon: 'flash' },
    { label: 'Plumbing', value: 189000, color: '#10B981', icon: 'water' },
    { label: 'AC Service', value: 156000, color: '#20C997', icon: 'snow' },
  ],
  cityPerformance: [
    {
      name: 'Lahore',
      bookings: 3245,
      revenue: 620000,
      growth: '+8%',
      icon: '🕌',
      completion: '94%',
      rating: 4.8
    },
    {
      name: 'Faisalabad',
      bookings: 1879,
      revenue: 290000,
      growth: '+12%',
      icon: '🏭',
      completion: '92%',
      rating: 4.6
    },
  ],
  stats: [
    {
      title: 'Total Services',
      value: '5,124',
      subtitle: 'Completed jobs',
      icon: 'bar-chart',
      color: '#3B82F6',
      bgColor: '#EFF6FF',
      trend: '+18%'
    },
    {
      title: 'Avg. Rating',
      value: '4.7',
      subtitle: 'Satisfaction',
      icon: 'star',
      color: '#F59E0B',
      bgColor: '#FFFBEB',
      trend: '+5%'
    },
    {
      title: 'Revenue',
      value: 'Rs 910k',
      subtitle: 'This month',
      icon: 'card',
      color: '#10B981',
      bgColor: '#F0FDF4',
      trend: '+24%'
    },
    {
      title: 'Providers',
      value: '892',
      subtitle: 'Active workers',
      icon: 'people',
      color: '#8B5CF6',
      bgColor: '#F5F3FF',
      trend: '+12%'
    },
  ],
  isLoading: false,
  error: null,
  dateRange: {
    start: '2025-01-01',
    end: '2025-06-30',
  },
  selectedCity: null,
  totalRevenue: 910000,
  revenueGrowth: 24,
};

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    updateRevenueData: (state, action: PayloadAction<RevenueData[]>) => {
      state.revenueData = action.payload;
    },
    updateCategoryData: (state, action: PayloadAction<CategoryData[]>) => {
      state.categoryData = action.payload;
    },
    updateCityPerformance: (state, action: PayloadAction<CityPerformance[]>) => {
      state.cityPerformance = action.payload;
    },
    updateStats: (state, action: PayloadAction<StatData[]>) => {
      state.stats = action.payload;
    },
    setDateRange: (
      state,
      action: PayloadAction<{ start: string; end: string }>
    ) => {
      state.dateRange = action.payload;
    },
    setSelectedCity: (state, action: PayloadAction<string | null>) => {
      state.selectedCity = action.payload;
    },
    updateTotalRevenue: (state, action: PayloadAction<number>) => {
      state.totalRevenue = action.payload;
    },
    calculateRevenueGrowth: (state) => {
      if (state.revenueData.length >= 2) {
        const currentMonth = state.revenueData[state.revenueData.length - 1];
        const previousMonth = state.revenueData[state.revenueData.length - 2];
        
        const currentTotal = currentMonth.lahore + currentMonth.faisalabad;
        const previousTotal = previousMonth.lahore + previousMonth.faisalabad;
        
        state.revenueGrowth = Math.round(
          ((currentTotal - previousTotal) / previousTotal) * 100
        );
      }
    },
    addRevenueDataPoint: (state, action: PayloadAction<RevenueData>) => {
      state.revenueData.push(action.payload);
      if (state.revenueData.length > 6) {
        state.revenueData.shift();
      }
    },
  },
});

export const {
  setLoading,
  setError,
  updateRevenueData,
  updateCategoryData,
  updateCityPerformance,
  updateStats,
  setDateRange,
  setSelectedCity,
  updateTotalRevenue,
  calculateRevenueGrowth,
  addRevenueDataPoint,
} = analyticsSlice.actions;

// Selectors
export const selectTotalRevenue = (state: RootState) =>
  state.adminSPAnalytics.totalRevenue;

export const selectRevenueByCity = (
  state: RootState,
  cityName: string
) => {
  const city = state.adminSPAnalytics.cityPerformance.find((c: CityPerformance) => c.name === cityName);
  return city?.revenue || 0;
};

export const selectTopCategory = (state: RootState) => {
  if (state.adminSPAnalytics.categoryData.length === 0) return null;
  return state.adminSPAnalytics.categoryData.reduce((max: CategoryData, category: CategoryData) =>
    category.value > max.value ? category : max
  );
};

export const selectAverageRating = (state: RootState) => {
  const ratings = state.adminSPAnalytics.cityPerformance.map((c: CityPerformance) => c.rating);
  if (ratings.length === 0) return 0;
  return ratings.reduce((sum: number, rating: number) => sum + rating, 0) / ratings.length;
};

export default analyticsSlice.reducer;