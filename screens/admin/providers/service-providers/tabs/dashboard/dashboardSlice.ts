// FILE: store/slices/dashboardSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface StatData {
  title: string;
  value: string;
  change: string;
  icon: string;
  color: string;
  bgColor: string;
}

interface CategoryData {
  label: string;
  value: number;
  color: string;
  icon: string;
}

interface CityData {
  name: string;
  count: string;
  color: string;
  percentage: number;
  growth: string;
}

interface DashboardState {
  stats: StatData[];
  categories: CategoryData[];
  cities: CityData[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

const initialState: DashboardState = {
  stats: [
    {
      title: "Total Users",
      value: "12,847",
      change: "+12%",
      icon: "people",
      color: "#3B82F6",
      bgColor: '#EFF6FF',
    },
    {
      title: "Providers",
      value: "2,456",
      change: "+8%",
      icon: "checkmark-circle",
      color: "#10B981",
      bgColor: '#F0FDF4',
    },
    {
      title: "Bookings",
      value: "1,247",
      change: "+5%",
      icon: "calendar",
      color: "#20C997",
      bgColor: '#ECFDF5',
    },
    {
      title: "Revenue",
      value: "₨2.4M",
      change: "+15%",
      icon: "card",
      color: "#8B5CF6",
      bgColor: '#F5F3FF',
    },
  ],
  categories: [
    { label: 'Electric', value: 245, color: '#3B82F6', icon: 'flash' },
    { label: 'Plumber', value: 189, color: '#10B981', icon: 'water' },
    { label: 'AC Repair', value: 156, color: '#20C997', icon: 'snow' },
  ],
  cities: [
    { name: 'Lahore', count: '3,245', color: '#10B981', percentage: 100, growth: '+12%' },
    { name: 'Faisalabad', count: '2,156', color: '#3B82F6', percentage: 66, growth: '+8%' },
  ],
  isLoading: false,
  error: null,
  lastUpdated: null,
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    updateStats: (state, action: PayloadAction<StatData[]>) => {
      state.stats = action.payload;
      state.lastUpdated = new Date().toISOString();
    },
    updateCategories: (state, action: PayloadAction<CategoryData[]>) => {
      state.categories = action.payload;
      state.lastUpdated = new Date().toISOString();
    },
    updateCities: (state, action: PayloadAction<CityData[]>) => {
      state.cities = action.payload;
      state.lastUpdated = new Date().toISOString();
    },
    refreshDashboard: (state) => {
      state.isLoading = true;
      state.lastUpdated = new Date().toISOString();
      // Simulate data refresh - in real app, dispatch async thunk
      setTimeout(() => {
        state.isLoading = false;
      }, 1000);
    },
  },
});

export const {
  setLoading,
  setError,
  updateStats,
  updateCategories,
  updateCities,
  refreshDashboard,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;