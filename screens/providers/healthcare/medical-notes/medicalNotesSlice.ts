import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { fetchPatientNotesApi, saveNoteApi, deleteNoteApi, attachFileApi } from '../../../../networks/healthcare/providerApi';

// ── Types ───────────────────────────────────

export interface NoteAttachment {
  id: string;
  name: string;
  type: 'image' | 'file';
  uri: string;
  size: number;
}

export interface MedicalNote {
  noteId: string;
  appointmentId: string;
  date: string;
  title: string;
  content: string;
  attachments: NoteAttachment[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NotePatient {
  patientId: string;
  patientName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  bloodGroup: string;
  allergies: string[];
  chronicConditions: string[];
}

export interface MedicalNotesState {
  patient: NotePatient | null;
  notes: MedicalNote[];
  currentNote: MedicalNote | null;
  saving: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: MedicalNotesState = {
  patient: null,
  notes: [],
  currentNote: null,
  saving: false,
  loading: false,
  error: null,
};

// ── Async Thunks ────────────────────────────

export const fetchPatientNotes = createAsyncThunk<
  { patient: NotePatient; notes: MedicalNote[] },
  string,
  { rejectValue: string }
>('medicalNotes/fetchPatientNotes', async (patientId, { rejectWithValue }) => {
  try {
    const res = await fetchPatientNotesApi(patientId);
    if (!res.success) return rejectWithValue(res.message ?? 'Unknown error');
    return res.data;
  } catch {
    return rejectWithValue('Failed to fetch patient notes');
  }
});

export const saveNote = createAsyncThunk<
  MedicalNote,
  MedicalNote,
  { rejectValue: string }
>('medicalNotes/saveNote', async (note, { rejectWithValue }) => {
  try {
    const res = await saveNoteApi(note);
    if (!res.success) return rejectWithValue(res.message ?? 'Unknown error');
    return res.data;
  } catch {
    return rejectWithValue('Failed to save note');
  }
});

export const deleteNote = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>('medicalNotes/deleteNote', async (noteId, { rejectWithValue }) => {
  try {
    const res = await deleteNoteApi(noteId);
    if (!res.success) return rejectWithValue(res.message ?? 'Unknown error');
    return noteId;
  } catch {
    return rejectWithValue('Failed to delete note');
  }
});

export const attachFile = createAsyncThunk<
  NoteAttachment,
  { noteId: string; attachment: NoteAttachment },
  { rejectValue: string }
>('medicalNotes/attachFile', async ({ noteId, attachment }, { rejectWithValue }) => {
  try {
    const res = await attachFileApi(noteId, attachment);
    if (!res.success) return rejectWithValue(res.message ?? 'Unknown error');
    return res.data;
  } catch {
    return rejectWithValue('Failed to attach file');
  }
});

// ── Slice ───────────────────────────────────

const medicalNotesSlice = createSlice({
  name: 'medicalNotes',
  initialState,
  reducers: {
    setCurrentNote(state, action: PayloadAction<MedicalNote | null>) {
      state.currentNote = action.payload;
    },
    updateCurrentNoteContent(state, action: PayloadAction<string>) {
      if (state.currentNote) {
        state.currentNote.content = action.payload;
      }
    },
    updateCurrentNoteTitle(state, action: PayloadAction<string>) {
      if (state.currentNote) {
        state.currentNote.title = action.payload;
      }
    },
    addTagToCurrentNote(state, action: PayloadAction<string>) {
      if (state.currentNote) {
        const tag = action.payload.trim();
        if (tag && !state.currentNote.tags.includes(tag)) {
          state.currentNote.tags.push(tag);
        }
      }
    },
    removeTagFromCurrentNote(state, action: PayloadAction<string>) {
      if (state.currentNote) {
        state.currentNote.tags = state.currentNote.tags.filter((t) => t !== action.payload);
      }
    },
    removeAttachmentFromCurrentNote(state, action: PayloadAction<string>) {
      if (state.currentNote) {
        state.currentNote.attachments = state.currentNote.attachments.filter(
          (a) => a.id !== action.payload,
        );
      }
    },
    createNewNote(state) {
      state.currentNote = {
        noteId: '',
        appointmentId: '',
        date: new Date().toISOString().split('T')[0],
        title: '',
        content: '',
        attachments: [],
        tags: [],
        createdAt: '',
        updatedAt: '',
      };
    },
    clearNotes() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchPatientNotes
      .addCase(fetchPatientNotes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPatientNotes.fulfilled, (state, action) => {
        state.loading = false;
        state.patient = action.payload.patient;
        state.notes = action.payload.notes;
      })
      .addCase(fetchPatientNotes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Unknown error';
      })
      // saveNote
      .addCase(saveNote.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(saveNote.fulfilled, (state, action) => {
        state.saving = false;
        const idx = state.notes.findIndex((n) => n.noteId === action.payload.noteId);
        if (idx >= 0) {
          state.notes[idx] = action.payload;
        } else {
          state.notes.unshift(action.payload);
        }
        state.currentNote = null;
      })
      .addCase(saveNote.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload ?? 'Unknown error';
      })
      // deleteNote
      .addCase(deleteNote.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(deleteNote.fulfilled, (state, action) => {
        state.saving = false;
        state.notes = state.notes.filter((n) => n.noteId !== action.payload);
        if (state.currentNote?.noteId === action.payload) {
          state.currentNote = null;
        }
      })
      .addCase(deleteNote.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload ?? 'Unknown error';
      })
      // attachFile
      .addCase(attachFile.fulfilled, (state, action) => {
        if (state.currentNote) {
          state.currentNote.attachments.push(action.payload);
        }
      })
      .addCase(attachFile.rejected, (state, action) => {
        state.error = action.payload ?? 'Unknown error';
      });
  },
});

export const {
  setCurrentNote,
  updateCurrentNoteContent,
  updateCurrentNoteTitle,
  addTagToCurrentNote,
  removeTagFromCurrentNote,
  removeAttachmentFromCurrentNote,
  createNewNote,
  clearNotes,
} = medicalNotesSlice.actions;

export default medicalNotesSlice.reducer;
