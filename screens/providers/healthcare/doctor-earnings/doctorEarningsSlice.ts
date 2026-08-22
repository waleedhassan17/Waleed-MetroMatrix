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
  /** Set only while periodFilter === 'custom'. */
  customRange: { startDate: string; endDate: string } | undefined;
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
  customRange: undefined,
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
    const state = getState().doctorEarnings;
    const filter = period ?? state.periodFilter;
    // Only a custom filter carries a range; the named periods are derived
    // server-side and must not be narrowed by a stale one.
    const range = filter === 'custom' ? state.customRange : undefined;
    const res = await fetchDoctorEarningsApi(filter, range);
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
    setCustomRange(state, action: PayloadAction<{ startDate: string; endDate: string }>) {
      state.customRange = action.payload;
      state.periodFilter = 'custom';
    },
    setPeriodFilter(state, action: PayloadAction<PeriodFilter>) {
      state.periodFilter = action.payload;
      // Leaving Custom drops its range so a named period is never narrowed by
      // a range the user can no longer see.
      if (action.payload !== 'custom') state.customRange = undefined;
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

export const { setPeriodFilter, setCustomRange, resetDoctorEarnings } =
  doctorEarningsSlice.actions;

export default doctorEarningsSlice.reducer;
