import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  fetchAdminBannersApi,
  createBannerApi,
  updateBannerApi,
  deleteBannerApi,
  type BannerView,
  type BannerPayload,
} from '../../../../networks/shopping/bannerApi';
import { fetchAdminBrandsApi } from '../../../../networks/shopping/adminShoppingApi';

/** The editor's working copy. Empty strings mean "not set" for the form. */
export interface BannerDraft {
  title: string;
  subtitle: string;
  image: string;
  brandId: string;
  sortOrder: string;
  isActive: boolean;
}

export const emptyDraft = (): BannerDraft => ({
  title: '',
  subtitle: '',
  image: '',
  brandId: '',
  sortOrder: '0',
  isActive: true,
});

interface BannerManagementState {
  banners: BannerView[];
  /** Brand picker options for the deep-link target. */
  brands: { brandId: string; name: string }[];
  draft: BannerDraft;
  editingId: string | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: BannerManagementState = {
  banners: [],
  brands: [],
  draft: emptyDraft(),
  editingId: null,
  loading: false,
  saving: false,
  error: null,
};

export const fetchBanners = createAsyncThunk(
  'bannerManagement/fetch',
  async (_, { rejectWithValue }) => {
    try {
      // The admin list shows inactive and out-of-window banners too — the
      // public GET /banners deliberately hides those.
      const [bannersRes, brandsRes] = await Promise.all([
        fetchAdminBannersApi({ page: 1, limit: 100 }),
        fetchAdminBrandsApi({ page: 1, limit: 100 }),
      ]);
      return {
        banners: bannersRes.data,
        brands: brandsRes.data.map((b) => ({ brandId: b.brandId, name: b.name })),
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load banners');
    }
  }
);

const draftToPayload = (draft: BannerDraft): BannerPayload => ({
  title: draft.title.trim(),
  subtitle: draft.subtitle.trim(),
  image: draft.image.trim(),
  // '' clears the target server-side; a real id sets it.
  brandId: draft.brandId || null,
  sortOrder: Number(draft.sortOrder) || 0,
  isActive: draft.isActive,
});

export const saveBanner = createAsyncThunk(
  'bannerManagement/save',
  async (_, { getState, dispatch, rejectWithValue }) => {
    const { bannerManagement } = getState() as { bannerManagement: BannerManagementState };
    const { draft, editingId } = bannerManagement;

    if (!draft.title.trim()) return rejectWithValue('A title is required');
    if (!draft.image.trim()) return rejectWithValue('An image URL is required');

    try {
      const payload = draftToPayload(draft);
      const res = editingId
        ? await updateBannerApi(editingId, payload)
        : await createBannerApi(payload);
      await dispatch(fetchBanners());
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to save banner');
    }
  }
);

export const removeBanner = createAsyncThunk(
  'bannerManagement/remove',
  async (bannerId: string, { rejectWithValue }) => {
    try {
      await deleteBannerApi(bannerId);
      return bannerId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete banner');
    }
  }
);

const bannerManagementSlice = createSlice({
  name: 'bannerManagement',
  initialState,
  reducers: {
    startCreate(state) {
      state.draft = emptyDraft();
      state.editingId = null;
      state.error = null;
    },
    startEdit(state, action: PayloadAction<string>) {
      const banner = state.banners.find((b) => b.bannerId === action.payload);
      if (!banner) return;
      state.editingId = banner.bannerId;
      state.draft = {
        title: banner.title,
        subtitle: banner.subtitle || '',
        image: banner.image,
        brandId: banner.brandId || '',
        sortOrder: String(banner.sortOrder ?? 0),
        isActive: banner.isActive,
      };
      state.error = null;
    },
    updateDraft(state, action: PayloadAction<Partial<BannerDraft>>) {
      state.draft = { ...state.draft, ...action.payload };
    },
    clearBannerError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBanners.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBanners.fulfilled, (state, action) => {
        state.loading = false;
        state.banners = action.payload.banners;
        state.brands = action.payload.brands;
      })
      .addCase(fetchBanners.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(saveBanner.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(saveBanner.fulfilled, (state) => {
        state.saving = false;
        state.draft = emptyDraft();
        state.editingId = null;
      })
      .addCase(saveBanner.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      })
      .addCase(removeBanner.pending, (state) => {
        state.saving = true;
      })
      .addCase(removeBanner.fulfilled, (state, action) => {
        state.saving = false;
        state.banners = state.banners.filter((b) => b.bannerId !== action.payload);
      })
      .addCase(removeBanner.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      });
  },
});

export const { startCreate, startEdit, updateDraft, clearBannerError } =
  bannerManagementSlice.actions;

export const selectBanners = (state: { bannerManagement: BannerManagementState }) =>
  state.bannerManagement.banners;
export const selectBannerBrands = (state: { bannerManagement: BannerManagementState }) =>
  state.bannerManagement.brands;
export const selectBannerDraft = (state: { bannerManagement: BannerManagementState }) =>
  state.bannerManagement.draft;
export const selectBannerEditingId = (state: { bannerManagement: BannerManagementState }) =>
  state.bannerManagement.editingId;
export const selectBannerLoading = (state: { bannerManagement: BannerManagementState }) =>
  state.bannerManagement.loading;
export const selectBannerSaving = (state: { bannerManagement: BannerManagementState }) =>
  state.bannerManagement.saving;
export const selectBannerError = (state: { bannerManagement: BannerManagementState }) =>
  state.bannerManagement.error;

export default bannerManagementSlice.reducer;
