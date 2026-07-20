import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { createBrandApi } from '../../../../networks/shopping/brandApi';
import type { BrandConfig } from '../../../../types/shopping';
import type { RootState } from '../../../../store/store';

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

export interface AddBrandState {
  step: WizardStep;
  brandData: Partial<BrandConfig>;
  errors: Record<string, string>;
  saving: boolean;
  createError: string | null;
  createdBrandId: string | null;
}

const initialBrandData: Partial<BrandConfig> = {
  name: '',
  slug: '',
  tagline: '',
  description: '',
  logo: '',
  bannerImage: '',
  primaryColor: '#E67E22',
  secondaryColor: '#2C3E50',
  accentColor: '#F1C40F',
  categories: [],
  policies: {
    returnDays: 7,
    shippingInfo: '',
    paymentMethods: [],
  },
  contactEmail: '',
  contactPhone: '',
  website: '',
  socialLinks: {
    facebook: '',
    instagram: '',
    twitter: '',
  },
  isActive: true,
};

const initialState: AddBrandState = {
  step: 1,
  brandData: initialBrandData,
  errors: {},
  saving: false,
  createError: null,
  createdBrandId: null,
};

// ── Async Thunk: Create Brand ─────────────────

export const createBrandAsync = createAsyncThunk(
  'addBrand/createBrand',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const data = state.addBrand.brandData;
      const payload = {
        odexId: '',
        name: data.name || '',
        slug: data.slug || '',
        tagline: data.tagline || '',
        logo: data.logo || '',
        bannerImage: data.bannerImage || '',
        primaryColor: data.primaryColor || '#E67E22',
        secondaryColor: data.secondaryColor || '#2C3E50',
        accentColor: data.accentColor || '#F1C40F',
        categories: data.categories || [],
        policies: data.policies || {
          returnDays: 7,
          shippingInfo: '',
          paymentMethods: [],
        },
        contactEmail: data.contactEmail || '',
        contactPhone: data.contactPhone || '',
        website: data.website || '',
        socialLinks: data.socialLinks || {},
        isActive: data.isActive ?? true,
      };
      const response = await createBrandApi(payload as any);
      return response.data;
    } catch (e: any) {
      return rejectWithValue(e.message || 'Failed to create brand');
    }
  }
);

// Pure validator shared by the `validateStep` reducer and the screen's
// goNext handler — the screen needs the result synchronously (a dispatched
// reducer updates the store immediately, but the component's own `errors`
// selector value is still the PREVIOUS render's snapshot until React
// re-renders, so reading it right after dispatch silently uses stale data).
export const computeStepErrors = (
  step: WizardStep,
  data: Partial<BrandConfig>
): Record<string, string> => {
  const errors: Record<string, string> = {};
  switch (step) {
    case 1:
      if (!data.name?.trim()) errors.name = 'Brand name is required';
      if (!data.slug?.trim()) errors.slug = 'Slug is required';
      if (!data.description?.trim()) errors.description = 'Description is required';
      break;
    case 2:
      if (!data.primaryColor) errors.primaryColor = 'Primary color is required';
      break;
    case 4:
      if (data.policies?.returnDays == null || data.policies.returnDays < 0)
        errors.returnDays = 'Invalid return days';
      break;
    case 5:
      if (!data.contactEmail?.trim()) errors.contactEmail = 'Email is required';
      break;
  }
  return errors;
};

// ── Slice ─────────────────────────────────────

const addBrandSlice = createSlice({
  name: 'addBrand',
  initialState,
  reducers: {
    setStep(state, action: PayloadAction<WizardStep>) {
      state.step = action.payload;
      state.errors = {};
    },
    updateBrandData(state, action: PayloadAction<Partial<BrandConfig>>) {
      state.brandData = { ...state.brandData, ...action.payload };
      // Auto-generate slug from name if empty
      if (action.payload.name && !state.brandData.slug) {
        state.brandData.slug = action.payload.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
      }
    },
    validateStep(state, action: PayloadAction<WizardStep>) {
      state.errors = computeStepErrors(action.payload, state.brandData);
    },
    clearErrors(state) {
      state.errors = {};
    },
    resetWizard(state) {
      state.step = 1;
      state.brandData = initialBrandData;
      state.errors = {};
      state.saving = false;
      state.createError = null;
      state.createdBrandId = null;
    },
    clearCreateError(state) {
      state.createError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createBrandAsync.pending, (state) => {
        state.saving = true;
        state.createError = null;
      })
      .addCase(createBrandAsync.fulfilled, (state, action) => {
        state.saving = false;
        state.createdBrandId = action.payload?.brandId || null;
      })
      .addCase(createBrandAsync.rejected, (state, action) => {
        state.saving = false;
        state.createError = (action.payload as string) || 'Failed to create brand';
      });
  },
});

export const {
  setStep,
  updateBrandData,
  validateStep,
  clearErrors,
  resetWizard,
  clearCreateError,
} = addBrandSlice.actions;

export default addBrandSlice.reducer;

// ── Selectors ─────────────────────────────────

export const selectAddBrand = (state: RootState) => state.addBrand;
export const selectWizardStep = (state: RootState) => state.addBrand.step;
export const selectBrandData = (state: RootState) => state.addBrand.brandData;
export const selectWizardErrors = (state: RootState) => state.addBrand.errors;
export const selectIsSaving = (state: RootState) => state.addBrand.saving;
export const selectCreateError = (state: RootState) => state.addBrand.createError;
export const selectCreatedBrandId = (state: RootState) => state.addBrand.createdBrandId;
