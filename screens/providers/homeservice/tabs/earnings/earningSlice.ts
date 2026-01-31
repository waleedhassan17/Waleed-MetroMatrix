import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../../../../store/store';

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
    totalEarnings: 145600,
    thisMonthEarnings: 34200,
    pendingPayouts: 12400,
    completedJobsCount: 87,
    avgRating: 4.8,
    monthlyGrowth: 15.3,
    weeklyEarnings: 8500,
    todayEarnings: 1500,
  },
  monthlyData: [
    { month: 'Aug', amount: 18500, jobs: 12, year: 2024 },
    { month: 'Sep', amount: 22100, jobs: 15, year: 2024 },
    { month: 'Oct', amount: 28400, jobs: 18, year: 2024 },
    { month: 'Nov', amount: 31200, jobs: 21, year: 2024 },
    { month: 'Dec', amount: 26800, jobs: 16, year: 2024 },
    { month: 'Jan', amount: 34200, jobs: 19, year: 2025 },
  ],
  recentPayments: [
    {
      id: '1',
      amount: 8500,
      date: '2025-01-24',
      status: 'completed',
      description: 'AC Installation - Khan Residence',
      type: 'earning',
      category: 'job_payment',
      transactionId: 'TXN-2025-001',
    },
    {
      id: '2',
      amount: 3200,
      date: '2025-01-23',
      status: 'pending',
      description: 'Plumbing Repair - Office Complex',
      type: 'earning',
      category: 'job_payment',
      transactionId: 'TXN-2025-002',
    },
    {
      id: '3',
      amount: 5000,
      date: '2025-01-22',
      status: 'processing',
      description: 'Payout to Bank Account',
      type: 'payout',
      category: 'manual_payout',
      transactionId: 'TXN-2025-003',
    },
    {
      id: '4',
      amount: 2800,
      date: '2025-01-20',
      status: 'completed',
      description: 'Electrical Work - Ahmed House',
      type: 'earning',
      category: 'job_payment',
      transactionId: 'TXN-2025-004',
    },
  ],
  performanceMetrics: {
    avgRating: 4.8,
    onTimeRate: 96,
    statusTier: 'Gold',
    repeatCustomerRate: 78,
    responseTime: 15,
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

// Async Thunks
export const fetchEarningsData = createAsyncThunk(
  'earnings/fetchData',
  async (_, { rejectWithValue }) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return {
        stats: initialState.stats,
        monthlyData: initialState.monthlyData,
        recentPayments: initialState.recentPayments,
        performanceMetrics: initialState.performanceMetrics,
      };
    } catch (error) {
      return rejectWithValue('Failed to fetch earnings data');
    }
  }
);

export const fetchPaymentHistory = createAsyncThunk(
  'earnings/fetchPaymentHistory',
  async (_filters: { page: number; limit: number }, { rejectWithValue }) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      return initialState.recentPayments;
    } catch (error) {
      return rejectWithValue('Failed to fetch payment history');
    }
  }
);

export const requestPayout = createAsyncThunk(
  'earnings/requestPayout',
  async (amount: number, { rejectWithValue }) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const newPayout: Payment = {
        id: `payout-${Date.now()}`,
        amount,
        date: new Date().toISOString().split('T')[0],
        status: 'processing',
        description: 'Payout request',
        type: 'payout',
        category: 'manual_payout',
        transactionId: `TXN-${Date.now()}`,
      };

      return newPayout;
    } catch (error) {
      return rejectWithValue('Failed to request payout');
    }
  }
);

const earningsSlice = createSlice({
  name: 'earnings',
  initialState,
  reducers: {
    setPeriod: (state, action: PayloadAction<EarningsState['selectedPeriod']>) => {
      state.selectedPeriod = action.payload;
    },
    setFilters: (state, action: PayloadAction<Partial<EarningsState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    updatePaymentStatus: (
      state,
      action: PayloadAction<{ id: string; status: Payment['status'] }>
    ) => {
      const payment = state.recentPayments.find((p) => p.id === action.payload.id);
      if (payment) {
        payment.status = action.payload.status;
      }
    },
    addPayment: (state, action: PayloadAction<Payment>) => {
      state.recentPayments.unshift(action.payload);

      if (action.payload.type === 'earning' && action.payload.status === 'completed') {
        state.stats.totalEarnings += action.payload.amount;
        state.stats.thisMonthEarnings += action.payload.amount;
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEarningsData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEarningsData.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload.stats;
        state.monthlyData = action.payload.monthlyData;
        state.recentPayments = action.payload.recentPayments;
        state.performanceMetrics = action.payload.performanceMetrics;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchEarningsData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchPaymentHistory.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchPaymentHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.recentPayments = action.payload;
      })
      .addCase(fetchPaymentHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(requestPayout.pending, (state) => {
        state.loading = true;
      })
      .addCase(requestPayout.fulfilled, (state, action) => {
        state.loading = false;
        state.recentPayments.unshift(action.payload);
        state.stats.pendingPayouts -= action.payload.amount;
      })
      .addCase(requestPayout.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

// Actions
export const {
  setPeriod,
  setFilters,
  clearFilters,
  updatePaymentStatus,
  addPayment,
  clearError,
} = earningsSlice.actions;

// Selectors
export const selectEarningsStats = (state: RootState) => state.earnings.stats;
export const selectMonthlyData = (state: RootState) => state.earnings.monthlyData;
export const selectRecentPayments = (state: RootState) => state.earnings.recentPayments;
export const selectPerformanceMetrics = (state: RootState) => state.earnings.performanceMetrics;
export const selectSelectedPeriod = (state: RootState) => state.earnings.selectedPeriod;
export const selectEarningsLoading = (state: RootState) => state.earnings.loading;
export const selectEarningsError = (state: RootState) => state.earnings.error;
export const selectEarningsFilters = (state: RootState) => state.earnings.filters;

// Computed selectors
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