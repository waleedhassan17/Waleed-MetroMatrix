import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { fetchDoctorEarningsApi, fetchDoctorTransactionsApi } from '../../../../networks/healthcare/providerApi';
import { APP_CURRENCY } from '../../../../constants/Currency';

// ── Types ───────────────────────────────────

export type PeriodFilter = 'today' | 'thisWeek' | 'thisMonth' | 'custom';

export interface EarningTransaction {
  transactionId: string;
  patientName: string;
  appointmentId: string;
  type: 'in-clinic' | 'video';
  amount: number;
  method: 'cash' | 'card' | 'online' | 'insurance';
  status: 'completed' | 'pending' | 'refunded';
  date: string;
}

export interface ConsultationBreakdown {
  type: 'in-clinic' | 'video';
  count: number;
  total: number;
  percentage: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface DoctorEarningsState {
  totalEarnings: number;
  periodFilter: PeriodFilter;
  transactions: EarningTransaction[];
  chartData: ChartDataPoint[];
  breakdown: ConsultationBreakdown[];
  currency: string;
  loading: boolean;
  transactionsLoading: boolean;
  transactionsError: string | null;
  error: string | null;
}

const initialState: DoctorEarningsState = {
  totalEarnings: 0,
  periodFilter: 'thisMonth',
  transactions: [],
  chartData: [],
  breakdown: [],
  currency: APP_CURRENCY,
  loading: false,
  transactionsLoading: false,
  transactionsError: null,
  error: null,
};

// ── Async Thunks ────────────────────────────

export const fetchEarnings = createAsyncThunk<
  { total: number; chart: ChartDataPoint[]; breakdown: ConsultationBreakdown[] },
  PeriodFilter | undefined,
  { state: { doctorEarnings: DoctorEarningsState }; rejectValue: string }
>('doctorEarnings/fetchEarnings', async (period, { getState, rejectWithValue }) => {
  try {
    const filter = period ?? getState().doctorEarnings.periodFilter;
    const res = await fetchDoctorEarningsApi(filter);
    if (!res.success) return rejectWithValue(res.message ?? 'Unknown error');
    return res.data;
  } catch {
    return rejectWithValue('Failed to load earnings data');
  }
});

export const fetchTransactions = createAsyncThunk<
  EarningTransaction[],
  void,
  { state: { doctorEarnings: DoctorEarningsState }; rejectValue: string }
>('doctorEarnings/fetchTransactions', async (_, { rejectWithValue }) => {
  try {
    const res = await fetchDoctorTransactionsApi();
    if (!res.success) return rejectWithValue(res.message ?? 'Unknown error');
    return res.data;
  } catch {
    return rejectWithValue('Failed to load transactions');
  }
});

// ── Slice ───────────────────────────────────

const doctorEarningsSlice = createSlice({
  name: 'doctorEarnings',
  initialState,
  reducers: {
    setPeriodFilter(state, action: PayloadAction<PeriodFilter>) {
      state.periodFilter = action.payload;
    },
    resetDoctorEarnings() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchEarnings
      .addCase(fetchEarnings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEarnings.fulfilled, (state, action) => {
        state.loading = false;
        state.totalEarnings = action.payload.total;
        state.chartData = action.payload.chart;
        state.breakdown = action.payload.breakdown;
      })
      .addCase(fetchEarnings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Unknown error';
      })
      // fetchTransactions
      .addCase(fetchTransactions.pending, (state) => {
        state.transactionsLoading = true;
        state.transactionsError = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.transactionsLoading = false;
        state.transactions = action.payload;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.transactionsLoading = false;
        // Was swallowed entirely, so a network failure rendered the
        // "No transactions yet" empty state — a fabricated fact.
        state.transactionsError = (action.payload as string) ?? 'Could not load transactions';
      });
  },
});

export const { setPeriodFilter, resetDoctorEarnings } = doctorEarningsSlice.actions;

export default doctorEarningsSlice.reducer;
