import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  fetchMyBrandApi,
  updateMyBrandApi,
  uploadBrandLogoApi,
  uploadBrandBannerApi,
} from '../../../../networks/shopping/vendorApi';
import type { BrandConfig } from '../../../../types/shopping';

export interface BrandProfileState {
  brand: BrandConfig | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  noBrand: boolean; // vendor has not created a brand profile yet
}

const initialState: BrandProfileState = {
  brand: null,
  loading: false,
  saving: false,
  error: null,
  noBrand: false,
};

export const fetchMyBrand = createAsyncThunk('brandProfile/fetch', async (_, { rejectWithValue }) => {
  try {
    const res = await fetchMyBrandApi();
    return res.data;
  } catch (error: any) {
    return rejectWithValue(error.message || 'Failed to load your brand');
  }
});

export const updateMyBrand = createAsyncThunk(
  'brandProfile/update',
  async (payload: Partial<BrandConfig>, { rejectWithValue }) => {
    try {
      const res = await updateMyBrandApi(payload);
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update your brand');
    }
  }
);

export const uploadLogo = createAsyncThunk(
  'brandProfile/uploadLogo',
  async (imageBase64: string, { rejectWithValue }) => {
    try {
      const res = await uploadBrandLogoApi(imageBase64);
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to upload logo');
    }
  }
);

export const uploadBanner = createAsyncThunk(
  'brandProfile/uploadBanner',
  async (imageBase64: string, { rejectWithValue }) => {
    try {
      const res = await uploadBrandBannerApi(imageBase64);
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to upload banner');
    }
  }
);

const brandProfileSlice = createSlice({
  name: 'brandProfile',
  initialState,
  reducers: {
    clearBrandProfileError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyBrand.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyBrand.fulfilled, (state, action) => {
        state.loading = false;
        state.brand = action.payload;
        state.noBrand = false;
      })
      .addCase(fetchMyBrand.rejected, (state, action) => {
        state.loading = false;
        const message = action.payload as string;
        if (message && message.toLowerCase().includes('no brand')) {
          state.noBrand = true;
        } else {
          state.error = message;
        }
      });
    [updateMyBrand, uploadLogo, uploadBanner].forEach((thunk) => {
      builder
        .addCase(thunk.pending, (state) => {
          state.saving = true;
          state.error = null;
        })
        .addCase(thunk.fulfilled, (state, action: PayloadAction<BrandConfig>) => {
          state.saving = false;
          state.brand = action.payload;
        })
        .addCase(thunk.rejected, (state, action) => {
          state.saving = false;
          state.error = action.payload as string;
        });
    });
  },
});

export const { clearBrandProfileError } = brandProfileSlice.actions;
export const selectBrandProfile = (state: { brandProfile: BrandProfileState }) => state.brandProfile;
export default brandProfileSlice.reducer;
