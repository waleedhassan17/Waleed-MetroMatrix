import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

import type { DoctorTransaction, EarningsRangeKey, EarningsReport } from '../../../../models/healthcare/doctorHub';
import { fetchDoctorTransactions, fetchEarningsReport } from '../../../../networks/healthcare/doctorHubApi';

// ============================================================================
// Doctor Earnings.
//
// Named periods used to send no dates, so the server summed everything since
// 1970: "This Month" was all-time earnings, with a hardcoded "+12% vs last
// period" beside it. The range is now explicit, and the previous total comes
// from the server over the equivalent complete window.
// ============================================================================

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface CustomRange {
  startDate: string;
  endDate: string;
}

export interface DoctorEarningsState {
  range: EarningsRangeKey;
  custom: CustomRange | null;
  report: EarningsReport | null;
  status: LoadStatus;
  refreshing: boolean;
  error: string | null;
  lastFetchedAt: number | null;
  transactions: DoctorTransaction[];
  transactionsStatus: LoadStatus;
  transactionsError: string | null;
}

const initialState: DoctorEarningsState = {
  range: 'thisMonth',
  custom: null,
  report: null,
  status: 'idle',
  refreshing: false,
  error: null,
  lastFetchedAt: null,
  transactions: [],
  transactionsStatus: 'idle',
  transactionsError: null,
};

const rangeId = (range: EarningsRangeKey, custom: CustomRange | null) =>
  range === 'custom' && custom ? `custom:${custom.startDate}:${custom.endDate}` : range;

export const fetchEarnings = createAsyncThunk<
  { id: string; report: EarningsReport },
  { refresh?: boolean } | undefined,
  { state: { doctorEarnings: DoctorEarningsState }; rejectValue: string }
>('doctorEarnings/fetchEarnings', async (_arg, { getState, rejectWithValue }) => {
  const { range, custom } = getState().doctorEarnings;
  const res = await fetchEarningsReport({
    range,
    startDate: range === 'custom' ? custom?.startDate : undefined,
    endDate: range === 'custom' ? custom?.endDate : undefined,
  });
  if (!res.success) return rejectWithValue(res.message || "We couldn't load your earnings");
  return { id: rangeId(range, custom), report: res.data };
});

export const fetchTransactions = createAsyncThunk<DoctorTransaction[], void, { rejectValue: string }>(
  'doctorEarnings/fetchTransactions',
  async (_arg, { rejectWithValue }) => {
    const res = await fetchDoctorTransactions({ page: 1, limit: 20 });
    if (!res.success) return rejectWithValue(res.message || "We couldn't load your consultations");
    return res.data.transactions;
  }
);

const doctorEarningsSlice = createSlice({
  name: 'doctorEarnings',
  initialState,
  reducers: {
    setRange(state, action: PayloadAction<EarningsRangeKey>) {
      state.range = action.payload;
      if (action.payload !== 'custom') state.custom = null;
    },
    setCustomRange(state, action: PayloadAction<CustomRange>) {
      state.range = 'custom';
      state.custom = action.payload;
    },
    resetDoctorEarnings() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEarnings.pending, (state, action) => {
        if (action.meta.arg?.refresh) state.refreshing = true;
        if (!state.report) state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchEarnings.fulfilled, (state, action) => {
        state.refreshing = false;
        // A slow answer for a period the doctor has already moved away from.
        if (action.payload.id !== rangeId(state.range, state.custom)) return;
        state.report = action.payload.report;
        state.status = 'ready';
        state.lastFetchedAt = Date.now();
      })
      .addCase(fetchEarnings.rejected, (state, action) => {
        state.refreshing = false;
        state.error = action.payload ?? "We couldn't load your earnings";
        state.status = state.report ? 'ready' : 'error';
      })
      .addCase(fetchTransactions.pending, (state) => {
        if (state.transactionsStatus !== 'ready') state.transactionsStatus = 'loading';
        state.transactionsError = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.transactions = action.payload;
        state.transactionsStatus = 'ready';
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        // Not an empty list: "No consultations yet" would be a fabricated fact.
        state.transactionsError = action.payload ?? "We couldn't load your consultations";
        state.transactionsStatus = state.transactions.length ? 'ready' : 'error';
      });
  },
});

export const { setRange, setCustomRange, resetDoctorEarnings } = doctorEarningsSlice.actions;

export default doctorEarningsSlice.reducer;
