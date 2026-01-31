import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface NavigationMapState {
  currentLocation: Coordinates | null;
  destination: Coordinates | null;
  destinationAddress: string;
  destinationCity: string;
  customerName: string;
  customerPhone: string;
  serviceType: string;
  distance: string;
  duration: string;
  isNearDestination: boolean;
  hasArrived: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: NavigationMapState = {
  currentLocation: null,
  destination: null,
  destinationAddress: '',
  destinationCity: '',
  customerName: '',
  customerPhone: '',
  serviceType: '',
  distance: '',
  duration: '',
  isNearDestination: false,
  hasArrived: false,
  isLoading: false,
  error: null,
};

const navigationMapSlice = createSlice({
  name: 'navigationMap',
  initialState,
  reducers: {
    // Set navigation data from job
    setNavigationData: (state, action: PayloadAction<{
      destination: Coordinates;
      destinationAddress: string;
      destinationCity: string;
      customerName: string;
      customerPhone: string;
      serviceType: string;
    }>) => {
      state.destination = action.payload.destination;
      state.destinationAddress = action.payload.destinationAddress;
      state.destinationCity = action.payload.destinationCity;
      state.customerName = action.payload.customerName;
      state.customerPhone = action.payload.customerPhone;
      state.serviceType = action.payload.serviceType;
      state.hasArrived = false;
      state.isNearDestination = false;
    },

    // Update current location
    updateCurrentLocation: (state, action: PayloadAction<Coordinates>) => {
      state.currentLocation = action.payload;
    },

    // Update distance and duration
    updateRouteInfo: (state, action: PayloadAction<{ distance: string; duration: string }>) => {
      state.distance = action.payload.distance;
      state.duration = action.payload.duration;
    },

    // Set near destination flag
    setNearDestination: (state, action: PayloadAction<boolean>) => {
      state.isNearDestination = action.payload;
    },

    // Mark as arrived at location
    arriveAtLocation: (state) => {
      state.hasArrived = true;
    },

    // Set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    // Set error
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
    },

    // Clear error
    clearError: (state) => {
      state.error = null;
    },

    // Reset navigation state
    resetNavigationMap: () => initialState,
  },
});

export const {
  setNavigationData,
  updateCurrentLocation,
  updateRouteInfo,
  setNearDestination,
  arriveAtLocation,
  setLoading,
  setError,
  clearError,
  resetNavigationMap,
} = navigationMapSlice.actions;

export default navigationMapSlice.reducer;