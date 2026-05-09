import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { OutletConfig, OutletLocation } from '../../../../types/shopping';
import { createOutletApi } from '../../../../networks/shopping/outletApi';

export type OutletWizardStep = 1 | 2 | 3 | 4 | 5;

export interface OutletFormData {
  name: string;
  slug: string;
  description: string;
  location: OutletLocation;
  phone: string;
  email: string;
  openingHours: string;
  managerName: string;
  brandId: string;
  brandName: string;
  brandPrimaryColor: string;
  colorScheme: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    headerBg: string;
    textOnHeader: string;
  };
  isActive: boolean;
  images: string[];
}

interface AddOutletState {
  step: OutletWizardStep;
  data: OutletFormData;
  errors: Record<string, string>;
  isSaving: boolean;
  createError: string | null;
  createdOutletId: string | null;
}

const defaultLocation: OutletLocation = {
  address: '',
  city: '',
  state: '',
  country: 'Pakistan',
  postalCode: '',
};

const defaultData: OutletFormData = {
  name: '',
  slug: '',
  description: '',
  location: defaultLocation,
  phone: '',
  email: '',
  openingHours: '10:00 AM - 10:00 PM',
  managerName: '',
  brandId: '',
  brandName: '',
  brandPrimaryColor: '#E67E22',
  colorScheme: {
    primaryColor: '#E67E22',
    secondaryColor: '#2C3E50',
    accentColor: '#F1C40F',
    headerBg: '#E67E22',
    textOnHeader: '#FFFFFF',
  },
  isActive: true,
  images: [],
};

const initialState: AddOutletState = {
  step: 1,
  data: defaultData,
  errors: {},
  isSaving: false,
  createError: null,
  createdOutletId: null,
};

export const createOutletAsync = createAsyncThunk(
  'addOutlet/create',
  async (_, { getState, rejectWithValue }) => {
    const state = (getState() as { addOutlet: AddOutletState }).addOutlet;
    const { data } = state;
    try {
      const payload: Omit<OutletConfig, 'outletId' | 'createdAt' | 'updatedAt'> = {
        name: data.name,
        slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-'),
        description: data.description,
        location: data.location,
        phone: data.phone,
        email: data.email,
        openingHours: data.openingHours,
        managerName: data.managerName,
        brandId: data.brandId || undefined,
        brandName: data.brandName || undefined,
        brandPrimaryColor: data.brandPrimaryColor || undefined,
        colorScheme: data.colorScheme,
        isActive: data.isActive,
        images: data.images,
      };
      const response = await createOutletApi(payload);
      return response.data;
    } catch (e: any) {
      return rejectWithValue(e.message || 'Failed to create outlet');
    }
  }
);

const validate = (step: OutletWizardStep, data: OutletFormData): Record<string, string> => {
  const errors: Record<string, string> = {};
  if (step === 1) {
    if (!data.name.trim()) errors.name = 'Outlet name is required';
    if (!data.description.trim()) errors.description = 'Description is required';
  }
  if (step === 2) {
    if (!data.location.address.trim()) errors.address = 'Address is required';
    if (!data.location.city.trim()) errors.city = 'City is required';
    if (!data.location.state.trim()) errors.state = 'State/Province is required';
  }
  if (step === 3) {
    if (!data.phone.trim()) errors.phone = 'Phone is required';
    if (!data.email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'Invalid email format';
  }
  return errors;
};

const addOutletSlice = createSlice({
  name: 'addOutlet',
  initialState,
  reducers: {
    setStep(state, action: PayloadAction<OutletWizardStep>) {
      state.step = action.payload;
    },
    updateOutletData(state, action: PayloadAction<Partial<OutletFormData>>) {
      state.data = { ...state.data, ...action.payload };
      if (action.payload.name && !state.data.slug) {
        state.data.slug = action.payload.name.toLowerCase().replace(/\s+/g, '-');
      }
    },
    updateLocation(state, action: PayloadAction<Partial<OutletLocation>>) {
      state.data.location = { ...state.data.location, ...action.payload };
    },
    updateColorScheme(state, action: PayloadAction<Partial<OutletFormData['colorScheme']>>) {
      state.data.colorScheme = { ...state.data.colorScheme, ...action.payload };
    },
    applyBrandColors(state, action: PayloadAction<{ brandId: string; brandName: string; primaryColor: string; secondaryColor: string; accentColor: string }>) {
      const { brandId, brandName, primaryColor, secondaryColor, accentColor } = action.payload;
      state.data.brandId = brandId;
      state.data.brandName = brandName;
      state.data.brandPrimaryColor = primaryColor;
      state.data.colorScheme = {
        primaryColor,
        secondaryColor,
        accentColor,
        headerBg: primaryColor,
        textOnHeader: '#FFFFFF',
      };
    },
    validateStep(state, action: PayloadAction<OutletWizardStep>) {
      state.errors = validate(action.payload, state.data);
    },
    clearErrors(state) {
      state.errors = {};
      state.createError = null;
    },
    resetWizard(state) {
      state.step = 1;
      state.data = defaultData;
      state.errors = {};
      state.isSaving = false;
      state.createError = null;
      state.createdOutletId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createOutletAsync.pending, (state) => { state.isSaving = true; state.createError = null; })
      .addCase(createOutletAsync.fulfilled, (state, action) => {
        state.isSaving = false;
        state.createdOutletId = action.payload.outletId;
      })
      .addCase(createOutletAsync.rejected, (state, action) => {
        state.isSaving = false;
        state.createError = action.payload as string || 'Failed to create outlet';
      });
  },
});

export const {
  setStep,
  updateOutletData,
  updateLocation,
  updateColorScheme,
  applyBrandColors,
  validateStep,
  clearErrors,
  resetWizard,
} = addOutletSlice.actions;

export const selectOutletWizardStep = (state: { addOutlet: AddOutletState }) => state.addOutlet.step;
export const selectOutletData = (state: { addOutlet: AddOutletState }) => state.addOutlet.data;
export const selectOutletErrors = (state: { addOutlet: AddOutletState }) => state.addOutlet.errors;
export const selectOutletIsSaving = (state: { addOutlet: AddOutletState }) => state.addOutlet.isSaving;
export const selectOutletCreateError = (state: { addOutlet: AddOutletState }) => state.addOutlet.createError;
export const selectCreatedOutletId = (state: { addOutlet: AddOutletState }) => state.addOutlet.createdOutletId;

export default addOutletSlice.reducer;
