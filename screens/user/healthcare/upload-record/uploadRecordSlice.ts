import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { uploadMedicalRecordApi } from '../../../../networks/healthcare/appointmentApi';

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

    const res = await uploadMedicalRecordApi({
      patientId: 'patient-1',
      type: recordType === 'other' ? 'report' : recordType as 'report' | 'prescription' | 'discharge' | 'imaging',
      title,
      description: `Uploaded on ${date}`,
      fileUrl: files[0]?.uri ?? '',
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
