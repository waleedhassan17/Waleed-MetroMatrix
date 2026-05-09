import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface WriteReviewState {
  rating: number;
  title: string;
  comment: string;
  submitting: boolean;
}

const initialState: WriteReviewState = {
  rating: 5,
  title: '',
  comment: '',
  submitting: false,
};

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
});

export const { setRating, setTitle, setComment, setSubmitting, resetReview } = writeReviewSlice.actions;
export const selectWriteReview = (state: { writeReview: WriteReviewState }) => state.writeReview;
export default writeReviewSlice.reducer;