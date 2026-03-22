import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Medication } from '../../../../models/healthcare/types';
import { savePrescriptionApi } from '../../../../networks/healthcare/providerApi';

// ── Types ───────────────────────────────────

export interface PrescriptionPatient {
  patientId: string;
  patientName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  appointmentId: string;
  type: 'in-clinic' | 'video';
}

export interface PrescriptionWriterState {
  patient: PrescriptionPatient | null;
  diagnosis: string;
  symptoms: string[];
  medications: Medication[];
  tests: string[];
  advice: string;
  followUpDate: string;
  saving: boolean;
  saveSuccess: boolean;
  error: string | null;
}

const initialState: PrescriptionWriterState = {
  patient: null,
  diagnosis: '',
  symptoms: [],
  medications: [],
  tests: [],
  advice: '',
  followUpDate: '',
  saving: false,
  saveSuccess: false,
  error: null,
};

// ── Diagnosis Suggestions (static) ──────────

export const DIAGNOSIS_SUGGESTIONS = [
  'Hypertension',
  'Type 2 Diabetes',
  'Upper Respiratory Infection',
  'Migraine',
  'Gastritis',
  'Allergic Rhinitis',
  'Bronchitis',
  'Urinary Tract Infection',
  'Anxiety Disorder',
  'Eczema',
  'Iron Deficiency Anemia',
  'Osteoarthritis',
  'Vertigo',
  'Conjunctivitis',
  'Tonsillitis',
];

// ── Async Thunks ────────────────────────────

export const savePrescription = createAsyncThunk<
  void,
  void,
  { state: { prescriptionWriter: PrescriptionWriterState }; rejectValue: string }
>('prescriptionWriter/savePrescription', async (_, { getState, rejectWithValue }) => {
  try {
    const state = getState().prescriptionWriter;
    if (!state.patient) return rejectWithValue('No patient selected');
    if (!state.diagnosis.trim()) return rejectWithValue('Diagnosis is required');
    if (state.medications.length === 0) return rejectWithValue('At least one medication is required');
    const res = await savePrescriptionApi({
      patientId: state.patient.patientId,
      appointmentId: state.patient.appointmentId,
      diagnosis: state.diagnosis,
      medications: state.medications,
      tests: state.tests,
      advice: state.advice,
      followUpDate: state.followUpDate,
    });
    if (!res.success) return rejectWithValue(res.message ?? 'Unknown error');
  } catch {
    return rejectWithValue('Failed to save prescription');
  }
});

// ── Slice ───────────────────────────────────

const prescriptionWriterSlice = createSlice({
  name: 'prescriptionWriter',
  initialState,
  reducers: {
    setPatient(state, action: PayloadAction<PrescriptionPatient>) {
      state.patient = action.payload;
      state.saveSuccess = false;
    },
    setDiagnosis(state, action: PayloadAction<string>) {
      state.diagnosis = action.payload;
      state.saveSuccess = false;
    },
    addSymptom(state, action: PayloadAction<string>) {
      const symptom = action.payload.trim();
      if (symptom && !state.symptoms.includes(symptom)) {
        state.symptoms.push(symptom);
        state.saveSuccess = false;
      }
    },
    removeSymptom(state, action: PayloadAction<string>) {
      state.symptoms = state.symptoms.filter((s) => s !== action.payload);
      state.saveSuccess = false;
    },
    addMedication(state, action: PayloadAction<Medication>) {
      state.medications.push(action.payload);
      state.saveSuccess = false;
    },
    removeMedication(state, action: PayloadAction<number>) {
      state.medications.splice(action.payload, 1);
      state.saveSuccess = false;
    },
    addTest(state, action: PayloadAction<string>) {
      const test = action.payload.trim();
      if (test && !state.tests.includes(test)) {
        state.tests.push(test);
        state.saveSuccess = false;
      }
    },
    removeTest(state, action: PayloadAction<string>) {
      state.tests = state.tests.filter((t) => t !== action.payload);
      state.saveSuccess = false;
    },
    setAdvice(state, action: PayloadAction<string>) {
      state.advice = action.payload;
      state.saveSuccess = false;
    },
    setFollowUpDate(state, action: PayloadAction<string>) {
      state.followUpDate = action.payload;
      state.saveSuccess = false;
    },
    clearSaveSuccess(state) {
      state.saveSuccess = false;
    },
    clearPrescription() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(savePrescription.pending, (state) => {
        state.saving = true;
        state.error = null;
        state.saveSuccess = false;
      })
      .addCase(savePrescription.fulfilled, (state) => {
        state.saving = false;
        state.saveSuccess = true;
      })
      .addCase(savePrescription.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload ?? 'Unknown error';
      });
  },
});

export const {
  setPatient,
  setDiagnosis,
  addSymptom,
  removeSymptom,
  addMedication,
  removeMedication,
  addTest,
  removeTest,
  setAdvice,
  setFollowUpDate,
  clearSaveSuccess,
  clearPrescription,
} = prescriptionWriterSlice.actions;

export default prescriptionWriterSlice.reducer;
