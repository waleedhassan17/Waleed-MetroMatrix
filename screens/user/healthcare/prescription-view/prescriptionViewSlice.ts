import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchPrescriptionDetailApi } from '../../../../networks/healthcare/providerApi';

// ── Types ───────────────────────────────────

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface Prescription {
  prescriptionId: string;
  appointmentId: string;
  doctor: {
    doctorId: string;
    name: string;
    specialty: string;
    profileImage: string;
    qualifications: string[];
  };
  patient: {
    patientId: string;
    name: string;
    age: number;
    gender: string;
  };
  diagnosis: string;
  medications: Medication[];
  testsRecommended: string[];
  specialInstructions: string;
  followUpDate: string | null;
  issuedAt: string;
}

export interface PrescriptionViewState {
  prescription: Prescription | null;
  loading: boolean;
  error: string | null;
  downloading: boolean;
  sharing: boolean;
}

const initialState: PrescriptionViewState = {
  prescription: null,
  loading: false,
  error: null,
  downloading: false,
  sharing: false,
};

// ── Async Thunks ────────────────────────────

export const fetchPrescription = createAsyncThunk<
  Prescription,
  string,
  { rejectValue: string }
>('prescriptionView/fetchPrescription', async (prescriptionId, { rejectWithValue }) => {
  try {
    const res = await fetchPrescriptionDetailApi(prescriptionId);
    if (!res.success) return rejectWithValue(res.message ?? 'Unknown error');
    return res.data as unknown as Prescription;
  } catch {
    return rejectWithValue('Failed to load prescription');
  }
});

export const downloadPDF = createAsyncThunk<
  void,
  string,
  { rejectValue: string }
>('prescriptionView/downloadPDF', async (prescriptionId, { rejectWithValue }) => {
  try {
    // TODO: Replace with real PDF generation / download logic
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } catch {
    return rejectWithValue('Failed to download PDF');
  }
});

export const sharePrescription = createAsyncThunk<
  void,
  string,
  { rejectValue: string }
>('prescriptionView/sharePrescription', async (prescriptionId, { rejectWithValue }) => {
  try {
    // TODO: Replace with real share logic (e.g. react-native-share)
    await new Promise((resolve) => setTimeout(resolve, 800));
  } catch {
    return rejectWithValue('Failed to share prescription');
  }
});

// ── Slice ───────────────────────────────────

const prescriptionViewSlice = createSlice({
  name: 'prescriptionView',
  initialState,
  reducers: {
    resetPrescription(state) {
      Object.assign(state, initialState);
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchPrescription
      .addCase(fetchPrescription.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPrescription.fulfilled, (state, action) => {
        state.loading = false;
        state.prescription = action.payload;
      })
      .addCase(fetchPrescription.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Unknown error';
      })
      // downloadPDF
      .addCase(downloadPDF.pending, (state) => {
        state.downloading = true;
      })
      .addCase(downloadPDF.fulfilled, (state) => {
        state.downloading = false;
      })
      .addCase(downloadPDF.rejected, (state) => {
        state.downloading = false;
      })
      // sharePrescription
      .addCase(sharePrescription.pending, (state) => {
        state.sharing = true;
      })
      .addCase(sharePrescription.fulfilled, (state) => {
        state.sharing = false;
      })
      .addCase(sharePrescription.rejected, (state) => {
        state.sharing = false;
      });
  },
});

export const { resetPrescription } = prescriptionViewSlice.actions;
export default prescriptionViewSlice.reducer;
