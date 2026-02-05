import { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '../../../../../store/createAppSlice';
import type { RootState } from '../../../../../store/store';
import { fetchProviderEarnings, requestPayout as requestPayoutApi } from '../../../../../networks/serviceProviders/earningsNetwork';
import { earningsDataSerializer } from '../../../../../serializers/serviceProviders';
import type { EarningsData } from '../../../../../models/serviceProviders';

// Types
export interface MonthlyData {
  month: string;
  amount: number;
  jobs: number;
  year: number;
}

export interface Payment {
  id: string;
  amount: number;
  date: string;
  status: 'completed' | 'pending' | 'processing' | 'failed';
  description: string;
  type: 'payout' | 'earning';
  category?: string;
  transactionId?: string;
}

export interface EarningsStats {
  totalEarnings: number;
  thisMonthEarnings: number;
  pendingPayouts: number;
  completedJobsCount: number;
  avgRating: number;
  monthlyGrowth: number;
  weeklyEarnings: number;
  todayEarnings: number;
}

export interface PerformanceMetrics {
  avgRating: number;
  onTimeRate: number;
  statusTier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  repeatCustomerRate: number;
  responseTime: number;
}

interface EarningsState {
  stats: EarningsStats;
  monthlyData: MonthlyData[];
  recentPayments: Payment[];
  performanceMetrics: PerformanceMetrics;
  selectedPeriod: 'weekly' | 'monthly' | 'yearly' | 'all';
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  filters: {
    status: string[];
    type: string[];
    dateRange: { start: string; end: string } | null;
  };
}

const initialState: EarningsState = {
  stats: {
    totalEarnings: 0,
    thisMonthEarnings: 0,
    pendingPayouts: 0,
    completedJobsCount: 0,
    avgRating: 0,
    monthlyGrowth: 0,
    weeklyEarnings: 0,
    todayEarnings: 0,
  },
  monthlyData: [],
  recentPayments: [],
  performanceMetrics: {
    avgRating: 0,
    onTimeRate: 0,
    statusTier: 'Bronze',
    repeatCustomerRate: 0,
    responseTime: 0,
  },
  selectedPeriod: 'monthly',
  loading: false,
  error: null,
  lastUpdated: null,
  filters: {
    status: [],
    type: [],
    dateRange: null,
  },
};

// Helper function to map API earnings data to local format
const mapApiEarningsToLocal = (apiData: EarningsData) => {
  const stats: EarningsStats = {
    totalEarnings: apiData.stats.totalEarnings,
    thisMonthEarnings: apiData.stats.thisMonthEarnings,
    pendingPayouts: apiData.stats.pendingPayouts,
    completedJobsCount: apiData.stats.completedJobsCount,
    avgRating: apiData.performance?.avgRating || 0,
    monthlyGrowth: apiData.stats.monthlyGrowth,
    weeklyEarnings: 0, // Not in API, calculate if needed
    todayEarnings: 0, // Not in API, calculate if needed
  };

  const monthlyData: MonthlyData[] = apiData.monthlyData.map((item) => ({
    month: item.month,
    amount: item.amount,
    jobs: item.jobs,
    year: new Date().getFullYear(),
  }));

  const recentPayments: Payment[] = apiData.recentPayments.map((t) => ({
    id: t.id,
    amount: t.amount,
    date: t.date,
    status: t.status as Payment['status'],
    description: t.description,
    type: t.type as Payment['type'],
    category: undefined,
    transactionId: undefined,
  }));

  const performanceMetrics: PerformanceMetrics = {
    avgRating: apiData.performance?.avgRating || 0,
    onTimeRate: apiData.performance?.onTimeRate || 0,
    statusTier: (apiData.performance?.statusTier as PerformanceMetrics['statusTier']) || 'Bronze',
    repeatCustomerRate: apiData.performance?.repeatCustomerRate || 0,
    responseTime: 0, // Not in API
  };

  return { stats, monthlyData, recentPayments, performanceMetrics };
};

const earningsSlice = createAppSlice({
  name: 'earnings',
  initialState,
  reducers: (create) => ({
    // Async Thunks
    fetchEarningsData: create.asyncThunk(
      async (_params: void, { rejectWithValue }) => {
        const response = await fetchProviderEarnings();
        if (!response.success || !response.data) {
          return rejectWithValue(response.message || 'Failed to fetch earnings data');
        }
        const serialized = earningsDataSerializer(response.data);
        return mapApiEarningsToLocal(serialized);
      },
      {
        pending: (state) => {
          state.loading = true;
          state.error = null;
        },
        fulfilled: (state, action) => {
          state.loading = false;
          state.stats = action.payload.stats;
          state.monthlyData = action.payload.monthlyData;
          state.recentPayments = action.payload.recentPayments;
          state.performanceMetrics = action.payload.performanceMetrics;
          state.lastUpdated = new Date().toISOString();
        },
        rejected: (state, action) => {
          state.loading = false;
          state.error = action.payload as string;
        },
      }
    ),

    refreshEarnings: create.asyncThunk(
      async (_params: void, { rejectWithValue }) => {
        const response = await fetchProviderEarnings();
        if (!response.success || !response.data) {
          return rejectWithValue(response.message || 'Failed to refresh earnings');
        }
        const serialized = earningsDataSerializer(response.data);
        return mapApiEarningsToLocal(serialized);
      },
      {
        pending: (state) => {
          state.error = null;
        },
        fulfilled: (state, action) => {
          state.stats = action.payload.stats;
          state.monthlyData = action.payload.monthlyData;
          state.recentPayments = action.payload.recentPayments;
          state.performanceMetrics = action.payload.performanceMetrics;
          state.lastUpdated = new Date().toISOString();
        },
        rejected: (state, action) => {
          state.error = action.payload as string;
        },
      }
    ),

    requestPayout: create.asyncThunk(
      async (params: { amount: number; method: string }, { rejectWithValue }) => {
        const response = await requestPayoutApi({
          amount: params.amount,
          method: params.method,
        });
        if (!response.success || !response.data) {
          return rejectWithValue(response.message || 'Failed to request payout');
        }
        const payment: Payment = {
          id: response.data.payoutId,
          amount: params.amount,
          date: new Date().toISOString(),
          status: response.data.status as Payment['status'],
          description: 'Payout request',
          type: 'payout',
          category: 'manual_payout',
          transactionId: response.data.payoutId,
        };
        return { payment, amount: params.amount };
      },
      {
        pending: (state) => {
          state.loading = true;
          state.error = null;
        },
        fulfilled: (state, action) => {
          state.loading = false;
          state.recentPayments.unshift(action.payload.payment);
          state.stats.pendingPayouts -= action.payload.amount;
        },
        rejected: (state, action) => {
          state.loading = false;
          state.error = action.payload as string;
        },
      }
    ),

    // Sync reducers
    setPeriod: create.reducer(
      (state, action: PayloadAction<EarningsState['selectedPeriod']>) => {
        state.selectedPeriod = action.payload;
      }
    ),

    setFilters: create.reducer(
      (state, action: PayloadAction<Partial<EarningsState['filters']>>) => {
        state.filters = { ...state.filters, ...action.payload };
      }
    ),

    clearFilters: create.reducer((state) => {
      state.filters = initialState.filters;
    }),

    updatePaymentStatus: create.reducer(
      (state, action: PayloadAction<{ id: string; status: Payment['status'] }>) => {
        const payment = state.recentPayments.find((p) => p.id === action.payload.id);
        if (payment) {
          payment.status = action.payload.status;
        }
      }
    ),

    addPayment: create.reducer((state, action: PayloadAction<Payment>) => {
      state.recentPayments.unshift(action.payload);
      if (action.payload.type === 'earning' && action.payload.status === 'completed') {
        state.stats.totalEarnings += action.payload.amount;
        state.stats.thisMonthEarnings += action.payload.amount;
      }
    }),

    clearError: create.reducer((state) => {
      state.error = null;
    }),
  }),
  selectors: {
    selectEarningsStats: (state) => state.stats,
    selectMonthlyData: (state) => state.monthlyData,
    selectRecentPayments: (state) => state.recentPayments,
    selectPerformanceMetrics: (state) => state.performanceMetrics,
    selectSelectedPeriod: (state) => state.selectedPeriod,
    selectEarningsLoading: (state) => state.loading,
    selectEarningsError: (state) => state.error,
    selectEarningsFilters: (state) => state.filters,
    selectLastUpdated: (state) => state.lastUpdated,
  },
});

// Actions
export const {
  fetchEarningsData,
  refreshEarnings,
  requestPayout,
  setPeriod,
  setFilters,
  clearFilters,
  updatePaymentStatus,
  addPayment,
  clearError,
} = earningsSlice.actions;

// Selectors
export const {
  selectEarningsStats,
  selectMonthlyData,
  selectRecentPayments,
  selectPerformanceMetrics,
  selectSelectedPeriod,
  selectEarningsLoading,
  selectEarningsError,
  selectEarningsFilters,
  selectLastUpdated,
} = earningsSlice.selectors;

// Computed selectors (need RootState access)
export const selectFilteredPayments = (state: RootState) => {
  const { recentPayments, filters } = state.earnings;

  return recentPayments.filter((payment) => {
    if (filters.status.length > 0 && !filters.status.includes(payment.status)) {
      return false;
    }

    if (filters.type.length > 0 && !filters.type.includes(payment.type)) {
      return false;
    }

    if (filters.dateRange) {
      const paymentDate = new Date(payment.date);
      const startDate = new Date(filters.dateRange.start);
      const endDate = new Date(filters.dateRange.end);

      if (paymentDate < startDate || paymentDate > endDate) {
        return false;
      }
    }

    return true;
  });
};

export const selectTotalPendingAmount = (state: RootState) => {
  return state.earnings.recentPayments
    .filter((p) => p.status === 'pending' || p.status === 'processing')
    .reduce((sum, p) => sum + p.amount, 0);
};

export const selectEarningsTrend = (state: RootState) => {
  const { monthlyData } = state.earnings;
  if (monthlyData.length < 2) return 0;

  const current = monthlyData[monthlyData.length - 1].amount;
  const previous = monthlyData[monthlyData.length - 2].amount;

  return ((current - previous) / previous) * 100;
};

export default earningsSlice.reducer;