import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Appointment, Doctor } from '../../../../models/healthcare/types';
import { startVideoCallApi } from '../../../../networks/healthcare/appointmentApi';
import { fetchDoctorByIdApi } from '../../../../networks/healthcare/doctorApi';

// ── Types ───────────────────────────────────

export type WaitingStatus =
  | 'connecting'
  | 'waiting'
  | 'doctor-joining'
  | 'ready'
  | 'error';

export interface DevicePermissions {
  camera: 'granted' | 'denied' | 'undetermined';
  microphone: 'granted' | 'denied' | 'undetermined';
}

// ── State ───────────────────────────────────

interface VideoWaitingRoomState {
  appointment: Appointment | null;
  doctor: Doctor | null;
  waitingStatus: WaitingStatus;
  estimatedWait: number | null; // minutes
  devicePermissions: DevicePermissions;
  loading: boolean;
  error: string | null;
}

const initialState: VideoWaitingRoomState = {
  appointment: null,
  doctor: null,
  waitingStatus: 'connecting',
  estimatedWait: null,
  devicePermissions: {
    camera: 'undetermined',
    microphone: 'undetermined',
  },
  loading: false,
  error: null,
};

// ── Async Thunks ────────────────────────────

export const joinWaitingRoom = createAsyncThunk<
  { appointment: Appointment; doctor: Doctor; estimatedWait: number },
  { appointmentId: string; doctorId: string },
  { rejectValue: string }
>('videoWaitingRoom/joinWaitingRoom', async ({ appointmentId, doctorId }, { rejectWithValue }) => {
  try {
    const [callRes, doctorRes] = await Promise.all([
      startVideoCallApi(appointmentId),
      fetchDoctorByIdApi(doctorId),
    ]);

    if (!callRes.success) return rejectWithValue(callRes.message ?? 'Failed to start video call');
    if (!doctorRes.success) return rejectWithValue(doctorRes.message ?? 'Failed to load doctor');

    return {
      appointment: {
        appointmentId,
        patientId: '',
        doctorId,
        type: 'video' as const,
        date: new Date().toISOString().split('T')[0],
        status: 'confirmed' as const,
        createdAt: new Date().toISOString(),
      } as Appointment,
      doctor: doctorRes.data,
      estimatedWait: 3,
    };
  } catch {
    return rejectWithValue('Failed to join waiting room');
  }
});

// ── Slice ───────────────────────────────────

const videoWaitingRoomSlice = createSlice({
  name: 'videoWaitingRoom',
  initialState,
  reducers: {
    // Permission checks (local device operation)
    setDevicePermissions(state, action: PayloadAction<DevicePermissions>) {
      state.devicePermissions = action.payload;
    },

    // Update status
    updateWaitingStatus(state, action: PayloadAction<WaitingStatus>) {
      state.waitingStatus = action.payload;
    },
    updateEstimatedWait(state, action: PayloadAction<number>) {
      state.estimatedWait = action.payload;
    },

    // Leave waiting room
    leaveWaitingRoom() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(joinWaitingRoom.pending, (state) => {
        state.loading = true;
        state.waitingStatus = 'connecting';
        state.error = null;
      })
      .addCase(joinWaitingRoom.fulfilled, (state, action) => {
        state.loading = false;
        state.appointment = action.payload.appointment;
        state.doctor = action.payload.doctor;
        state.estimatedWait = action.payload.estimatedWait;
        state.waitingStatus = 'waiting';
      })
      .addCase(joinWaitingRoom.rejected, (state, action) => {
        state.loading = false;
        state.waitingStatus = 'error';
        state.error = action.payload ?? 'Unknown error';
      });
  },
});

export const {
  setDevicePermissions,
  updateWaitingStatus,
  updateEstimatedWait,
  leaveWaitingRoom,
} = videoWaitingRoomSlice.actions;

export default videoWaitingRoomSlice.reducer;
