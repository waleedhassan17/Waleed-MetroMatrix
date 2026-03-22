import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { MedicalRecord } from '../../../../models/healthcare/types';
import {
  fetchHealthRecordsApi,
  deleteHealthRecordApi,
} from '../../../../networks/healthcare/providerApi';
import { uploadMedicalRecordApi } from '../../../../networks/healthcare/appointmentApi';

// ── Category Type ───────────────────────────

export type RecordCategory =
  | 'All'
  | 'Prescriptions'
  | 'Lab Reports'
  | 'Imaging'
  | 'Vaccination'
  | 'Other';

export const RECORD_CATEGORIES: RecordCategory[] = [
  'All',
  'Prescriptions',
  'Lab Reports',
  'Imaging',
  'Vaccination',
  'Other',
];

// ── State ───────────────────────────────────

export interface HealthRecordsState {
  records: MedicalRecord[];
  categories: RecordCategory[];
  selectedCategory: RecordCategory;
  selectedRecord: MedicalRecord | null;
  loading: boolean;
  refreshing: boolean;
  uploading: boolean;
  deleting: string | null; // recordId being deleted
  error: string | null;
  uploadProgress: number;
  lastUpdated: number | null;
  // Search & Filter
  searchQuery: string;
  sortBy: 'date' | 'name' | 'type';
  sortOrder: 'asc' | 'desc';
}

const initialState: HealthRecordsState = {
  records: [],
  categories: RECORD_CATEGORIES,
  selectedCategory: 'All',
  selectedRecord: null,
  loading: false,
  refreshing: false,
  uploading: false,
  deleting: null,
  error: null,
  uploadProgress: 0,
  lastUpdated: null,
  searchQuery: '',
  sortBy: 'date',
  sortOrder: 'desc',
};

// ── Helpers ─────────────────────────────────

const mapCategoryToType = (category: RecordCategory): string | null => {
  switch (category) {
    case 'Prescriptions':
      return 'prescription';
    case 'Lab Reports':
      return 'report';
    case 'Imaging':
      return 'imaging';
    case 'Vaccination':
      return 'vaccination';
    case 'Other':
      return 'other';
    default:
      return null;
  }
};

const mapTypeToCategory = (type: string): RecordCategory => {
  switch (type) {
    case 'prescription':
      return 'Prescriptions';
    case 'report':
      return 'Lab Reports';
    case 'imaging':
      return 'Imaging';
    case 'vaccination':
      return 'Vaccination';
    default:
      return 'Other';
  }
};

// ── Async Thunks ────────────────────────────

export const fetchRecords = createAsyncThunk<
  MedicalRecord[],
  void,
  { rejectValue: string }
>('healthRecords/fetchRecords', async (_, { rejectWithValue }) => {
  try {
    // In real app, get patientId from auth state
    const patientId = 'pat-001';
    const res = await fetchHealthRecordsApi(patientId);

    if (!res.success) {
      return rejectWithValue(res.message ?? 'Failed to load records');
    }

    return res.data;
  } catch (error: any) {
    if (error.message?.includes('Network')) {
      return rejectWithValue('No internet connection. Please check your network.');
    }
    return rejectWithValue('Failed to load health records. Please try again.');
  }
});

export const deleteRecord = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>('healthRecords/deleteRecord', async (recordId, { rejectWithValue }) => {
  try {
    const res = await deleteHealthRecordApi(recordId);

    if (!res.success) {
      return rejectWithValue(res.message ?? 'Failed to delete record');
    }

    return recordId;
  } catch (error: any) {
    return rejectWithValue('Failed to delete record. Please try again.');
  }
});

export const uploadRecord = createAsyncThunk<
  MedicalRecord,
  {
    file: any;
    title: string;
    description?: string;
    type: string;
    linkedAppointmentId?: string;
  },
  { rejectValue: string }
>(
  'healthRecords/uploadRecord',
  async (payload, { dispatch, rejectWithValue }) => {
    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        dispatch(setUploadProgress(Math.random() * 30 + 70));
      }, 300);

      const res = await uploadMedicalRecordApi(payload as any);

      clearInterval(progressInterval);
      dispatch(setUploadProgress(100));

      if (!res.success) {
        return rejectWithValue(res.message ?? 'Failed to upload record');
      }

      return res.data;
    } catch (error: any) {
      return rejectWithValue('Failed to upload record. Please try again.');
    }
  }
);

// ── Slice ───────────────────────────────────

const healthRecordsSlice = createSlice({
  name: 'healthRecords',
  initialState,
  reducers: {
    setSelectedCategory(state, action: PayloadAction<RecordCategory>) {
      state.selectedCategory = action.payload;
    },
    setSelectedRecord(state, action: PayloadAction<MedicalRecord | null>) {
      state.selectedRecord = action.payload;
    },
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
    setSortBy(state, action: PayloadAction<'date' | 'name' | 'type'>) {
      state.sortBy = action.payload;
    },
    setSortOrder(state, action: PayloadAction<'asc' | 'desc'>) {
      state.sortOrder = action.payload;
    },
    toggleSortOrder(state) {
      state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
    },
    setUploadProgress(state, action: PayloadAction<number>) {
      state.uploadProgress = action.payload;
    },
    addRecord(state, action: PayloadAction<MedicalRecord>) {
      state.records.unshift(action.payload);
      state.lastUpdated = Date.now();
    },
    updateRecord(state, action: PayloadAction<MedicalRecord>) {
      const index = state.records.findIndex(
        (r) => r.recordId === action.payload.recordId
      );
      if (index !== -1) {
        state.records[index] = action.payload;
      }
    },
    clearError(state) {
      state.error = null;
    },
    resetHealthRecords() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchRecords
      .addCase(fetchRecords.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRecords.fulfilled, (state, action) => {
        state.loading = false;
        state.refreshing = false;
        state.records = action.payload;
        state.lastUpdated = Date.now();
      })
      .addCase(fetchRecords.rejected, (state, action) => {
        state.loading = false;
        state.refreshing = false;
        state.error = action.payload ?? 'Unknown error';
      })

      // deleteRecord
      .addCase(deleteRecord.pending, (state, action) => {
        state.deleting = action.meta.arg;
      })
      .addCase(deleteRecord.fulfilled, (state, action) => {
        state.deleting = null;
        state.records = state.records.filter((r) => r.recordId !== action.payload);
        // Clear selected record if it was deleted
        if (state.selectedRecord?.recordId === action.payload) {
          state.selectedRecord = null;
        }
      })
      .addCase(deleteRecord.rejected, (state, action) => {
        state.deleting = null;
        state.error = action.payload ?? 'Failed to delete';
      })

      // uploadRecord
      .addCase(uploadRecord.pending, (state) => {
        state.uploading = true;
        state.uploadProgress = 0;
        state.error = null;
      })
      .addCase(uploadRecord.fulfilled, (state, action) => {
        state.uploading = false;
        state.uploadProgress = 0;
        state.records.unshift(action.payload);
        state.lastUpdated = Date.now();
      })
      .addCase(uploadRecord.rejected, (state, action) => {
        state.uploading = false;
        state.uploadProgress = 0;
        state.error = action.payload ?? 'Upload failed';
      });
  },
});

// ── Selectors ───────────────────────────────

// Get filtered records by category
export const selectFilteredRecords = (state: { healthRecords: HealthRecordsState }) => {
  const { records, selectedCategory, sortBy, sortOrder } = state.healthRecords;

  // Filter by category
  let filtered = records;
  if (selectedCategory !== 'All') {
    const type = mapCategoryToType(selectedCategory);
    if (type) {
      filtered = records.filter((r) => r.type === type);
    }
  }

  // Sort records
  const sorted = [...filtered].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'date':
        comparison = new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
        break;
      case 'name':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'type':
        comparison = a.type.localeCompare(b.type);
        break;
    }

    return sortOrder === 'asc' ? -comparison : comparison;
  });

  return sorted;
};

// Get records grouped by category
export const selectRecordsByCategory = (state: { healthRecords: HealthRecordsState }) => {
  const { records } = state.healthRecords;

  const grouped: Record<RecordCategory, MedicalRecord[]> = {
    All: records,
    Prescriptions: [],
    'Lab Reports': [],
    Imaging: [],
    Vaccination: [],
    Other: [],
  };

  records.forEach((record) => {
    const category = mapTypeToCategory(record.type);
    grouped[category].push(record);
  });

  return grouped;
};

// Get record statistics
export const selectRecordStats = (state: { healthRecords: HealthRecordsState }) => {
  const { records } = state.healthRecords;

  return {
    total: records.length,
    prescriptions: records.filter((r) => r.type === 'prescription').length,
    reports: records.filter((r) => r.type === 'report').length,
    imaging: records.filter((r) => r.type === 'imaging').length,
    vaccination: 0,
    other: records.filter((r) => r.type === 'discharge').length,
  };
};

// Get category counts for badges
export const selectCategoryCounts = (state: { healthRecords: HealthRecordsState }) => {
  const { records } = state.healthRecords;

  const counts: Record<RecordCategory, number> = {
    All: records.length,
    Prescriptions: 0,
    'Lab Reports': 0,
    Imaging: 0,
    Vaccination: 0,
    Other: 0,
  };

  records.forEach((record) => {
    const category = mapTypeToCategory(record.type);
    counts[category]++;
  });

  return counts;
};

// Get recent records (last 7 days)
export const selectRecentRecords = (state: { healthRecords: HealthRecordsState }) => {
  const { records } = state.healthRecords;
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  return records.filter((r) => new Date(r.uploadedAt) >= weekAgo);
};

// Search records
export const selectSearchResults = (state: { healthRecords: HealthRecordsState }) => {
  const { records, searchQuery } = state.healthRecords;

  if (!searchQuery.trim()) return [];

  const query = searchQuery.toLowerCase();
  return records.filter(
    (r) =>
      r.title.toLowerCase().includes(query) ||
      r.description?.toLowerCase().includes(query) ||
      r.type.toLowerCase().includes(query)
  );
};

// Get a specific record by ID
export const selectRecordById = (recordId: string) => (
  state: { healthRecords: HealthRecordsState }
) => {
  return state.healthRecords.records.find((r) => r.recordId === recordId) || null;
};

// Check if any operation is in progress
export const selectIsOperationInProgress = (state: { healthRecords: HealthRecordsState }) => {
  return (
    state.healthRecords.loading ||
    state.healthRecords.uploading ||
    state.healthRecords.deleting !== null
  );
};

// ── Exports ─────────────────────────────────

export const {
  setSelectedCategory,
  setSelectedRecord,
  setSearchQuery,
  setSortBy,
  setSortOrder,
  toggleSortOrder,
  setUploadProgress,
  addRecord,
  updateRecord,
  clearError,
  resetHealthRecords,
} = healthRecordsSlice.actions;

export default healthRecordsSlice.reducer;