import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { fetchPatientQueueApi, updateQueuePatientApi } from '../../../../networks/healthcare/providerApi';

// ── Types ───────────────────────────────────

export type QueueStatus = 'waiting' | 'in-progress' | 'completed' | 'skipped';

export interface PatientHistoryItem {
  date: string;
  diagnosis: string;
  type: 'in-clinic' | 'video';
}

export interface QueuePatient {
  queueId: string;
  patientId: string;
  patientName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  appointmentId: string;
  type: 'in-clinic' | 'video';
  timeSlot: { start: string; end: string };
  symptoms: string;
  status: QueueStatus;
  tokenNumber: number;
  estimatedWaitMinutes: number;
  checkedInAt?: string;
  startedAt?: string;
  completedAt?: string;
  history: PatientHistoryItem[];
}

export interface PatientQueueState {
  queue: QueuePatient[];
  currentPatient: string | null; // queueId of in-progress patient
  loading: boolean;
  error: string | null;
}

const initialState: PatientQueueState = {
  queue: [],
  currentPatient: null,
  loading: false,
  error: null,
};

// ── Async Thunks ────────────────────────────

export const fetchQueue = createAsyncThunk<
  QueuePatient[],
  void,
  { rejectValue: string }
>('patientQueue/fetchQueue', async (_, { rejectWithValue }) => {
  try {
    const res = await fetchPatientQueueApi();
    if (!res.success) return rejectWithValue(res.message ?? 'Unknown error');
    return res.data;
  } catch {
    return rejectWithValue('Failed to load patient queue');
  }
});

export const startConsultation = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>('patientQueue/startConsultation', async (queueId, { rejectWithValue }) => {
  try {
    const res = await updateQueuePatientApi(queueId, 'start');
    if (!res.success) return rejectWithValue(res.message ?? 'Unknown error');
    return queueId;
  } catch {
    return rejectWithValue('Failed to start consultation');
  }
});

export const completeConsultation = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>('patientQueue/completeConsultation', async (queueId, { rejectWithValue }) => {
  try {
    const res = await updateQueuePatientApi(queueId, 'complete');
    if (!res.success) return rejectWithValue(res.message ?? 'Unknown error');
    return queueId;
  } catch {
    return rejectWithValue('Failed to complete consultation');
  }
});

export const skipPatient = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>('patientQueue/skipPatient', async (queueId, { rejectWithValue }) => {
  try {
    const res = await updateQueuePatientApi(queueId, 'skip');
    if (!res.success) return rejectWithValue(res.message ?? 'Unknown error');
    return queueId;
  } catch {
    return rejectWithValue('Failed to skip patient');
  }
});

export const callNextPatient = createAsyncThunk<
  string | null,
  void,
  { state: { patientQueue: PatientQueueState }; rejectValue: string }
>('patientQueue/callNextPatient', async (_, { getState, rejectWithValue }) => {
  try {
    const { queue } = getState().patientQueue;
    const next = queue.find((p) => p.status === 'waiting');
    if (!next) return null;
    const res = await updateQueuePatientApi(next.queueId, 'call-next');
    if (!res.success) return rejectWithValue(res.message ?? 'Unknown error');
    return next.queueId;
  } catch {
    return rejectWithValue('Failed to call next patient');
  }
});

// ── Slice ───────────────────────────────────

const patientQueueSlice = createSlice({
  name: 'patientQueue',
  initialState,
  reducers: {
    resetPatientQueue() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchQueue
      .addCase(fetchQueue.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchQueue.fulfilled, (state, action) => {
        state.loading = false;
        state.queue = action.payload;
        const inProgress = action.payload.find((p) => p.status === 'in-progress');
        state.currentPatient = inProgress?.queueId ?? null;
      })
      .addCase(fetchQueue.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Unknown error';
      })
      // startConsultation
      .addCase(startConsultation.fulfilled, (state, action) => {
        const patient = state.queue.find((p) => p.queueId === action.payload);
        if (patient) {
          patient.status = 'in-progress';
          patient.startedAt = new Date().toISOString();
          patient.estimatedWaitMinutes = 0;
          state.currentPatient = action.payload;
        }
      })
      // completeConsultation
      .addCase(completeConsultation.fulfilled, (state, action) => {
        const patient = state.queue.find((p) => p.queueId === action.payload);
        if (patient) {
          patient.status = 'completed';
          patient.completedAt = new Date().toISOString();
        }
        if (state.currentPatient === action.payload) {
          state.currentPatient = null;
        }
      })
      // skipPatient
      .addCase(skipPatient.fulfilled, (state, action) => {
        const patient = state.queue.find((p) => p.queueId === action.payload);
        if (patient) {
          patient.status = 'skipped';
        }
        if (state.currentPatient === action.payload) {
          state.currentPatient = null;
        }
      })
      // callNextPatient
      .addCase(callNextPatient.fulfilled, (state, action) => {
        if (action.payload) {
          const patient = state.queue.find((p) => p.queueId === action.payload);
          if (patient) {
            patient.status = 'in-progress';
            patient.startedAt = new Date().toISOString();
            patient.estimatedWaitMinutes = 0;
            state.currentPatient = action.payload;
          }
        }
      });
  },
});

export const { resetPatientQueue } = patientQueueSlice.actions;

export default patientQueueSlice.reducer;
