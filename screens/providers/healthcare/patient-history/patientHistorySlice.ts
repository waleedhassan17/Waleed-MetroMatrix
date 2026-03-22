import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { fetchPatientHistoryApi } from '../../../../networks/healthcare/providerApi';

// ── Types ───────────────────────────────────

export interface PastVisit {
  visitId: string;
  date: string;
  type: 'in-clinic' | 'video';
  diagnosis: string;
  symptoms: string[];
  prescriptionId?: string;
  notes?: string;
  followUp?: string;
}

export interface PatientRecord {
  patientId: string;
  patientName: string;
  age: number;
  gender: string;
  bloodGroup: string;
  phone: string;
  allergies: string[];
  chronicConditions: string[];
  visits: PastVisit[];
}

export interface PatientHistoryState {
  patient: PatientRecord | null;
  selectedVisit: PastVisit | null;
  loading: boolean;
  error: string | null;
}

const initialState: PatientHistoryState = {
  patient: null,
  selectedVisit: null,
  loading: false,
  error: null,
};

// ── Async Thunks ────────────────────────────

export const fetchPatientHistory = createAsyncThunk<
  PatientRecord,
  string,
  { rejectValue: string }
>('patientHistory/fetchPatientHistory', async (patientId, { rejectWithValue }) => {
  try {
    const res = await fetchPatientHistoryApi(patientId);
    if (!res.success) return rejectWithValue(res.message ?? 'Unknown error');
    return res.data as unknown as PatientRecord;
  } catch {
    return rejectWithValue('Failed to load patient history');
  }
});

// ── Slice ───────────────────────────────────

const patientHistorySlice = createSlice({
  name: 'patientHistory',
  initialState,
  reducers: {
    selectVisit(state, action: PayloadAction<PastVisit | null>) {
      state.selectedVisit = action.payload;
    },
    resetPatientHistory() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPatientHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPatientHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.patient = action.payload;
      })
      .addCase(fetchPatientHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Unknown error';
      });
  },
});

export const { selectVisit, resetPatientHistory } = patientHistorySlice.actions;

export default patientHistorySlice.reducer;
