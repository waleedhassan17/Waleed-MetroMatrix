import { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '../../../../store/createAppSlice';
import {
  updateProviderLocation,
  markArrived,
  fetchNavigationData,
} from '../../../../networks/serviceProviders/trackingNetwork';
import { fetchJobDetail } from '../../../../networks/serviceProviders/jobNetwork';

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

const navigationMapSlice = createAppSlice({
  name: 'navigationMap',
  initialState,
  reducers: (create) => ({
    // Async Thunks
    fetchNavigationDataAsync: create.asyncThunk(
      async (jobId: string, { rejectWithValue }) => {
        try {
          const response = await fetchNavigationData(jobId);
          if (!response.success) {
            return rejectWithValue(response.message || 'Failed to fetch navigation data.');
          }
          return response.data;
        } catch (error) {
          return rejectWithValue('Failed to fetch navigation data.');
        }
      },
      {
        pending: (state) => {
          state.isLoading = true;
          state.error = null;
        },
        fulfilled: (state, action) => {
          state.isLoading = false;
          state.destination = action.payload.destination;
          state.destinationAddress = action.payload.destinationAddress;
          state.destinationCity = action.payload.destinationCity;
          state.customerName = action.payload.customerName;
          state.customerPhone = action.payload.customerPhone;
          state.serviceType = action.payload.serviceType;
          state.hasArrived = false;
          state.isNearDestination = false;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.payload as string;
        },
      }
    ),

    updateLocationAsync: create.asyncThunk(
      async (
        params: { coordinates: Coordinates; jobId?: string },
        { rejectWithValue }
      ) => {
        try {
          const response = await updateProviderLocation({
            latitude: params.coordinates.latitude,
            longitude: params.coordinates.longitude,
            jobId: params.jobId,
          });
          if (!response.success) {
            return rejectWithValue(response.message || 'Failed to update location.');
          }
          return {
            currentLocation: params.coordinates,
            distance: response.data.distance,
            duration: response.data.duration,
          };
        } catch (error) {
          return rejectWithValue('Failed to update location.');
        }
      },
      {
        fulfilled: (state, action) => {
          state.currentLocation = action.payload.currentLocation;
          state.distance = action.payload.distance;
          state.duration = action.payload.duration;
        },
        rejected: (state, action) => {
          state.error = action.payload as string;
        },
      }
    ),

    markArrivedAsync: create.asyncThunk(
      async (jobId: string, { rejectWithValue }) => {
        try {
          const response = await markArrived(jobId);
          if (!response.success) {
            return rejectWithValue(response.message || 'Failed to mark as arrived.');
          }
          return response.data.arrived;
        } catch (error) {
          return rejectWithValue('Failed to mark as arrived.');
        }
      },
      {
        pending: (state) => {
          state.isLoading = true;
        },
        fulfilled: (state) => {
          state.isLoading = false;
          state.hasArrived = true;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.payload as string;
        },
      }
    ),

    // Sync reducers
    setNavigationData: create.reducer(
      (
        state,
        action: PayloadAction<{
          destination: Coordinates;
          destinationAddress: string;
          destinationCity: string;
          customerName: string;
          customerPhone: string;
          serviceType: string;
        }>
      ) => {
        state.destination = action.payload.destination;
        state.destinationAddress = action.payload.destinationAddress;
        state.destinationCity = action.payload.destinationCity;
        state.customerName = action.payload.customerName;
        state.customerPhone = action.payload.customerPhone;
        state.serviceType = action.payload.serviceType;
        state.hasArrived = false;
        state.isNearDestination = false;
      }
    ),

    updateCurrentLocation: create.reducer((state, action: PayloadAction<Coordinates>) => {
      state.currentLocation = action.payload;
    }),

    updateRouteInfo: create.reducer(
      (state, action: PayloadAction<{ distance: string; duration: string }>) => {
        state.distance = action.payload.distance;
        state.duration = action.payload.duration;
      }
    ),

    setNearDestination: create.reducer((state, action: PayloadAction<boolean>) => {
      state.isNearDestination = action.payload;
    }),

    arriveAtLocation: create.reducer((state) => {
      state.hasArrived = true;
    }),

    setLoading: create.reducer((state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    }),

    setError: create.reducer((state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
    }),

    clearError: create.reducer((state) => {
      state.error = null;
    }),

    resetNavigationMap: create.reducer(() => initialState),
  }),
  selectors: {
    selectCurrentLocation: (state) => state.currentLocation,
    selectDestination: (state) => state.destination,
    selectDestinationAddress: (state) => state.destinationAddress,
    selectCustomerName: (state) => state.customerName,
    selectCustomerPhone: (state) => state.customerPhone,
    selectServiceType: (state) => state.serviceType,
    selectDistance: (state) => state.distance,
    selectDuration: (state) => state.duration,
    selectIsNearDestination: (state) => state.isNearDestination,
    selectHasArrived: (state) => state.hasArrived,
    selectIsLoading: (state) => state.isLoading,
    selectError: (state) => state.error,
  },
});

export const {
  fetchNavigationDataAsync,
  updateLocationAsync,
  markArrivedAsync,
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

export const {
  selectCurrentLocation,
  selectDestination,
  selectDestinationAddress,
  selectCustomerName,
  selectCustomerPhone,
  selectServiceType,
  selectDistance,
  selectDuration,
  selectIsNearDestination,
  selectHasArrived,
  selectIsLoading,
  selectError,
} = navigationMapSlice.selectors;

export default navigationMapSlice.reducer;