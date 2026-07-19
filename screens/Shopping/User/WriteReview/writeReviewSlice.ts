import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { submitProductReviewApi } from '../../../../networks/shopping/productApi';

export interface WriteReviewState {
  rating: number;
  title: string;
  comment: string;
  submitting: boolean;
  error: string | null;
  submitted: boolean;
}

const initialState: WriteReviewState = {
  rating: 5,
  title: '',
  comment: '',
  submitting: false,
  error: null,
  submitted: false,
};

// Submit the review — the server only accepts reviews for products in a
// delivered order of this user (verified purchase).
export const submitReview = createAsyncThunk(
  'writeReview/submit',
  async ({ productId }: { productId: string }, { getState, rejectWithValue }) => {
    try {
      const { writeReview } = getState() as { writeReview: WriteReviewState };
      if (!writeReview.comment.trim()) {
        return rejectWithValue('Please write a few words about the product');
      }
      const res = await submitProductReviewApi(productId, {
        rating: writeReview.rating,
        title: writeReview.title || undefined,
        comment: writeReview.comment.trim(),
      });
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to submit review');
    }
  }
);

const writeReviewSlice = createSlice({
  name: 'writeReview',
  initialState,
  reducers: {
    setRating(state, action: PayloadAction<number>) { state.rating = action.payload; },
    setTitle(state, action: PayloadAction<string>) { state.title = action.payload; },
    setComment(state, action: PayloadAction<string>) { state.comment = action.payload; },
    setSubmitting(state, action: PayloadAction<boolean>) { state.submitting = action.payload; },
    resetReview(state) { Object.assign(state, initialState); },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitReview.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(submitReview.fulfilled, (state) => {
        state.submitting = false;
        state.submitted = true;
      })
      .addCase(submitReview.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload as string;
      });
  },
});

export const { setRating, setTitle, setComment, setSubmitting, resetReview } = writeReviewSlice.actions;
export const selectWriteReview = (state: { writeReview: WriteReviewState }) => state.writeReview;
export default writeReviewSlice.reducer;
