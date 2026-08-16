import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  uploadMedicalRecordApi,
  type HealthRecordCategory,
  type HealthRecordFileInput,
} from '../../../../networks/healthcare/appointmentApi';

// ── Types ───────────────────────────────────

export type UploadRecordType = 'prescription' | 'report' | 'imaging' | 'discharge' | 'other';

export const RECORD_TYPE_OPTIONS: { label: string; value: UploadRecordType; icon: string }[] = [
  { label: 'Prescription', value: 'prescription', icon: 'document-text' },
  { label: 'Lab Report', value: 'report', icon: 'flask' },
  { label: 'Imaging', value: 'imaging', icon: 'scan' },
  { label: 'Vaccination', value: 'discharge', icon: 'shield-checkmark' },
  { label: 'Other', value: 'other', icon: 'folder-open' },
];

export interface PickedFile {
  id: string;
  uri: string;
  name: string;
  type: 'image' | 'pdf';
  size: number;
}

/**
 * UI record types → the backend's HealthRecord.category enum
 * ('prescriptions' | 'lab_reports' | 'imaging' | 'vaccination').
 * The UI's "Vaccination" option carries the legacy value 'discharge', and
 * "Other" has no backend equivalent, so both are mapped explicitly here
 * rather than being sent through as-is and rejected with a 400.
 */
const CATEGORY_BY_RECORD_TYPE: Record<UploadRecordType, HealthRecordCategory> = {
  prescription: 'prescriptions',
  report: 'lab_reports',
  imaging: 'imaging',
  discharge: 'vaccination',
  other: 'lab_reports',
};

/** multer accepts JPEG, PNG and PDF only — anything else is rejected server-side. */
const mimeTypeFor = (file: PickedFile): string => {
  if (file.type === 'pdf') return 'application/pdf';
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'pdf') return 'application/pdf';
  return 'image/jpeg';
};

export interface UploadRecordState {
  files: PickedFile[];
  recordType: UploadRecordType;
  title: string;
  date: string;
  uploading: boolean;
  uploadProgress: number;
  error: string | null;
}

const initialState: UploadRecordState = {
  files: [],
  recordType: 'prescription',
  title: '',
  date: new Date().toISOString().split('T')[0],
  uploading: false,
  uploadProgress: 0,
  error: null,
};

// ── Async Thunks ────────────────────────────

export const uploadRecord = createAsyncThunk<
  void,
  void,
  { state: { uploadRecord: UploadRecordState }; rejectValue: string }
>('uploadRecord/uploadRecord', async (_, { getState, dispatch, rejectWithValue }) => {
  try {
    const { title, files, recordType, date } = getState().uploadRecord;

    if (!title.trim()) return rejectWithValue('Please enter a title');
    if (files.length === 0) return rejectWithValue('Please add at least one file');

    dispatch(updateProgress(30));

    // Every attached file is sent — the endpoint takes up to 5. Previously only
    // files[0] was sent, and it was sent as a local file:// string the server
    // could never read.
    const payloadFiles: HealthRecordFileInput[] = files.map((file) => ({
      uri: file.uri,
      name: file.name,
      mimeType: mimeTypeFor(file),
      size: file.size,
    }));

    const res = await uploadMedicalRecordApi({
      title: title.trim(),
      category: CATEGORY_BY_RECORD_TYPE[recordType],
      date,
      notes: '',
      files: payloadFiles,
    });

    dispatch(updateProgress(100));

    if (!res.success) return rejectWithValue(res.message ?? 'Unknown error');
  } catch {
    return rejectWithValue('Upload failed. Please try again.');
  }
});

// ── Slice ───────────────────────────────────

const uploadRecordSlice = createSlice({
  name: 'uploadRecord',
  initialState,
  reducers: {
    setRecordType(state, action: PayloadAction<UploadRecordType>) {
      state.recordType = action.payload;
    },
    setTitle(state, action: PayloadAction<string>) {
      state.title = action.payload;
    },
    setDate(state, action: PayloadAction<string>) {
      state.date = action.payload;
    },
    addFiles(state, action: PayloadAction<PickedFile[]>) {
      state.files = [...state.files, ...action.payload];
    },
    removeFile(state, action: PayloadAction<string>) {
      state.files = state.files.filter((f) => f.id !== action.payload);
    },
    updateProgress(state, action: PayloadAction<number>) {
      state.uploadProgress = action.payload;
    },
    resetUploadRecord() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(uploadRecord.pending, (state) => {
        state.uploading = true;
        state.uploadProgress = 0;
        state.error = null;
      })
      .addCase(uploadRecord.fulfilled, (state) => {
        state.uploading = false;
        state.uploadProgress = 100;
      })
      .addCase(uploadRecord.rejected, (state, action) => {
        state.uploading = false;
        state.uploadProgress = 0;
        state.error = action.payload ?? 'Unknown error';
      });
  },
});

export const {
  setRecordType,
  setTitle,
  setDate,
  addFiles,
  removeFile,
  updateProgress,
  resetUploadRecord,
} = uploadRecordSlice.actions;

export default uploadRecordSlice.reducer;
