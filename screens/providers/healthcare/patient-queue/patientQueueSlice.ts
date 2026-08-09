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
  /** Undefined when the backend has no demographic on file — the card omits
   *  the line rather than printing "0y, Other". */
  age?: number;
  gender?: 'Male' | 'Female' | 'Other';
  appointmentId: string;
  type: 'in-clinic' | 'video';
  timeSlot: { start: string; end: string };
  symptoms: string;
  status: QueueStatus;
  /** 1-based position in today's list. NOT a clinic-issued token number, and
   *  deliberately not a wait estimate — the backend provides neither. */
  position: number;
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
  /** Failure of a queue ACTION (start/complete/skip/next), not of the fetch. */
  actionError: string | null;
}

const initialState: PatientQueueState = {
  queue: [],
  currentPatient: null,
  loading: false,
  error: null,
  actionError: null,
};

// ── Async Thunks ────────────────────────────

/** `silent` suppresses the loading flag — used by the 30s background poll so
 *  it cannot replace a populated queue with a full-screen spinner. */
export const fetchQueue = createAsyncThunk<
  QueuePatient[],
  { silent?: boolean } | undefined,
  { rejectValue: string }
>('patientQueue/fetchQueue', async (_arg, { rejectWithValue }) => {
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
    clearQueueActionError(state) {
      state.actionError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchQueue
      .addCase(fetchQueue.pending, (state, action) => {
        if (!(action.meta.arg as { silent?: boolean } | undefined)?.silent) {
          state.loading = true;
        }
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
        state.error = (action.payload as string) ?? 'Unknown error';
      })
      // startConsultation
      .addCase(startConsultation.fulfilled, (state, action) => {
        const patient = state.queue.find((p) => p.queueId === action.payload);
        if (patient) {
          patient.status = 'in-progress';
          patient.startedAt = new Date().toISOString();
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
            state.currentPatient = action.payload;
          }
        }
      })
      // These four had NO rejected case: a failed "Mark Complete" changed
      // nothing and reported nothing, so the doctor could not tell whether the
      // consultation had been recorded. Surface it as actionError; the screen
      // alerts on it and clears it.
      .addMatcher(
        (action): action is { type: string; payload?: string } =>
          /^patientQueue\/(startConsultation|completeConsultation|skipPatient|callNextPatient)\/rejected$/.test(
            action.type,
          ),
        (state, action) => {
          state.actionError =
            (action.payload as string) ?? 'Could not update the queue. Please try again.';
        },
      );
  },
});

export const { resetPatientQueue, clearQueueActionError } = patientQueueSlice.actions;

export default patientQueueSlice.reducer;
