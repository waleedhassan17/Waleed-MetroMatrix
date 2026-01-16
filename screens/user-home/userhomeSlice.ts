import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// ============================================
// TYPE DEFINITIONS
// ============================================
export interface ServiceStats {
  label: string;
  value: string;
}

export interface Service {
  id: string;
  title: string;
  subtitle: string;      // Category badge text (RETAIL, MEDICAL, MAINTENANCE)
  description: string;
  stats: ServiceStats;
  isAvailable: boolean;
}

export interface UserHomeState {
  selectedService: string | null;
  services: Service[];
  isLoading: boolean;
  error: string | null;
}

// ============================================
// INITIAL STATE - Matches design exactly
// Images are loaded locally via SERVICE_IMAGES in the screen component
// ============================================
const initialState: UserHomeState = {
  selectedService: 'shopping', // Pre-selected as shown in design
  services: [
    {
      id: 'shopping',
      title: 'Smart Shopping',
      subtitle: 'RETAIL',
      description: 'Explore the latest trends and everyday essentials delivered to doorstep.',
      stats: { label: 'Stores', value: '500+' },
      isAvailable: true,
    },
    {
      id: 'healthcare',
      title: 'Digital Health',
      subtitle: 'MEDICAL',
      description: 'Connect with certified doctors and manage health records seamlessly',
      stats: { label: 'Doctors', value: '120+' },
      isAvailable: true,
    },
    {
      id: 'homeServices',
      title: 'Home Solutions',
      subtitle: 'MAINTENANCE',
      description: 'Verified professionals for cleaning, repairs, and smart home installations',
      stats: { label: 'Experts', value: '280+' },
      isAvailable: true,
    },
  ],
  isLoading: false,
  error: null,
};

// ============================================
// SLICE DEFINITION
// ============================================
const userHomeSlice = createSlice({
  name: 'userHome',
  initialState,
  reducers: {
    // Select a service (toggles if same service clicked)
    selectService: (state, action: PayloadAction<string>) => {
      if (state.selectedService === action.payload) {
        state.selectedService = null;
      } else {
        state.selectedService = action.payload;
      }
    },

    // Clear selection
    clearSelection: (state) => {
      state.selectedService = null;
    },

    // Set specific selection without toggle
    setSelection: (state, action: PayloadAction<string | null>) => {
      state.selectedService = action.payload;
    },

    // Set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    // Set error
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },

    // Update service availability
    updateServiceAvailability: (
      state,
      action: PayloadAction<{ serviceId: string; isAvailable: boolean }>
    ) => {
      const service = state.services.find((s) => s.id === action.payload.serviceId);
      if (service) {
        service.isAvailable = action.payload.isAvailable;
      }
    },

    // Update service stats
    updateServiceStats: (
      state,
      action: PayloadAction<{ serviceId: string; stats: ServiceStats }>
    ) => {
      const service = state.services.find((s) => s.id === action.payload.serviceId);
      if (service) {
        service.stats = action.payload.stats;
      }
    },

    // Update entire service
    updateService: (
      state,
      action: PayloadAction<Partial<Service> & { id: string }>
    ) => {
      const index = state.services.findIndex((s) => s.id === action.payload.id);
      if (index !== -1) {
        state.services[index] = { ...state.services[index], ...action.payload };
      }
    },

    // Add new service
    addService: (state, action: PayloadAction<Service>) => {
      state.services.push(action.payload);
    },

    // Remove service
    removeService: (state, action: PayloadAction<string>) => {
      state.services = state.services.filter((s) => s.id !== action.payload);
      if (state.selectedService === action.payload) {
        state.selectedService = null;
      }
    },

    // Reset state
    resetUserHome: () => initialState,
  },
});

// ============================================
// EXPORT ACTIONS
// ============================================
export const {
  selectService,
  clearSelection,
  setSelection,
  setLoading,
  setError,
  updateServiceAvailability,
  updateServiceStats,
  updateService,
  addService,
  removeService,
  resetUserHome,
} = userHomeSlice.actions;

// ============================================
// SELECTORS
// ============================================
export const selectSelectedService = (state: { userHome: UserHomeState }) =>
  state.userHome.selectedService;

export const selectServices = (state: { userHome: UserHomeState }) =>
  state.userHome.services;

export const selectAvailableServices = (state: { userHome: UserHomeState }) =>
  state.userHome.services.filter((service) => service.isAvailable);

export const selectServiceById = (serviceId: string) => (state: { userHome: UserHomeState }) =>
  state.userHome.services.find((service) => service.id === serviceId);

export const selectIsLoading = (state: { userHome: UserHomeState }) =>
  state.userHome.isLoading;

export const selectError = (state: { userHome: UserHomeState }) =>
  state.userHome.error;

export const selectCurrentServiceDetails = (state: { userHome: UserHomeState }) => {
  const selectedId = state.userHome.selectedService;
  if (!selectedId) return null;
  return state.userHome.services.find((service) => service.id === selectedId);
};

export const selectServiceCount = (state: { userHome: UserHomeState }) =>
  state.userHome.services.length;

// ============================================
// EXPORT REDUCER
// ============================================
export default userHomeSlice.reducer;