import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchPrescriptionDetailApi } from '../../../../networks/healthcare/providerApi';
import { downloadAndShareAuthedPdf } from '../../../../utils/healthcare/documents';

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
  /**
   * Why the last download or share failed.
   *
   * Kept apart from `error`, which drives the whole-screen "could not load"
   * state — a failed download must not blank out a prescription that is on
   * screen and perfectly readable.
   */
  actionError: string | null;
}

const initialState: PrescriptionViewState = {
  prescription: null,
  loading: false,
  error: null,
  downloading: false,
  sharing: false,
  actionError: null,
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

/**
 * The prescription PDF the backend renders with PDFKit.
 *
 * Both of these were `setTimeout` placeholders — the spinner ran, the promise
 * resolved, and nothing whatsoever happened. The route is behind `requireUser`
 * and only the patient or the prescribing doctor may read it, so the token has
 * to travel with the request; that is what `downloadAndShareAuthedPdf` does
 * before handing the file to the OS.
 */
const prescriptionPdfPath = (prescriptionId: string) =>
  `/v1/healthcare/prescriptions/${encodeURIComponent(prescriptionId)}/pdf`;

const shortId = (prescriptionId: string) =>
  prescriptionId.slice(-8).toUpperCase() || 'document';

export const downloadPDF = createAsyncThunk<
  void,
  string,
  { rejectValue: string }
>('prescriptionView/downloadPDF', async (prescriptionId, { rejectWithValue }) => {
  try {
    await downloadAndShareAuthedPdf(
      prescriptionPdfPath(prescriptionId),
      `prescription-${shortId(prescriptionId)}.pdf`,
      'Save prescription'
    );
  } catch (e: any) {
    return rejectWithValue(e?.message || 'Failed to download PDF');
  }
});

export const sharePrescription = createAsyncThunk<
  void,
  string,
  { rejectValue: string }
>('prescriptionView/sharePrescription', async (prescriptionId, { rejectWithValue }) => {
  try {
    // Same file, same sheet — only the wording of the prompt differs. Sharing a
    // link instead would be useless to the recipient: the endpoint is PHI and
    // answers nobody but this patient and their doctor.
    await downloadAndShareAuthedPdf(
      prescriptionPdfPath(prescriptionId),
      `prescription-${shortId(prescriptionId)}.pdf`,
      'Share prescription'
    );
  } catch (e: any) {
    return rejectWithValue(e?.message || 'Failed to share prescription');
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
    clearActionError(state) {
      state.actionError = null;
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
        state.actionError = null;
      })
      .addCase(downloadPDF.fulfilled, (state) => {
        state.downloading = false;
      })
      .addCase(downloadPDF.rejected, (state, action) => {
        state.downloading = false;
        state.actionError = action.payload ?? 'Failed to download PDF';
      })
      // sharePrescription
      .addCase(sharePrescription.pending, (state) => {
        state.sharing = true;
        state.actionError = null;
      })
      .addCase(sharePrescription.fulfilled, (state) => {
        state.sharing = false;
      })
      .addCase(sharePrescription.rejected, (state, action) => {
        state.sharing = false;
        state.actionError = action.payload ?? 'Failed to share prescription';
      });
  },
});

export const { resetPrescription, clearActionError } = prescriptionViewSlice.actions;
export default prescriptionViewSlice.reducer;
