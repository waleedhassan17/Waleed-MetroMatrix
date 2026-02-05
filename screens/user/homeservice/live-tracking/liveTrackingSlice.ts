import { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '../../../../store/createAppSlice';
import { fetchTrackingData } from '../../../../networks/serviceProviders/trackingNetwork';
import { trackingDataSerializer } from '../../../../serializers/serviceProviders/trackingSerializer';

// Types
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface ProviderTrackingInfo {
  id: string;
  name: string;
  phone: string;
  image: string;
  service: string;
  specialty: string;
  rating: number;
  reviews: number;
  experience: string;
  verified: boolean;
  category: 'electricians' | 'plumbers' | 'ac-repairers';
}

export interface TrackingStatus {
  status: 'en_route' | 'nearby' | 'arrived' | 'in_progress' | 'completed';
  message: string;
  timestamp: string;
}

export interface RouteInfo {
  coordinates: Coordinates[];
  distance: string;
  distanceValue: number; // in meters
  duration: string;
  durationValue: number; // in seconds
}

export interface LiveTrackingState {
  provider: ProviderTrackingInfo | null;
  providerLocation: Coordinates | null;
  userLocation: Coordinates | null;
  route: RouteInfo | null;
  trackingStatus: TrackingStatus;
  isLoading: boolean;
  isTracking: boolean;
  hasLocationPermission: boolean;
  locationError: string | null;
  error: string | null;
  bookingId: string | null;
}

// Initial State
const initialState: LiveTrackingState = {
  provider: null,
  providerLocation: null,
  userLocation: null,
  route: null,
  trackingStatus: {
    status: 'en_route',
    message: 'Provider is on the way',
    timestamp: new Date().toISOString(),
  },
  isLoading: false,
  isTracking: false,
  hasLocationPermission: false,
  locationError: null,
  error: null,
  bookingId: null,
};

// Helper function to calculate distance
const calculateDistance = (point1: Coordinates, point2: Coordinates): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = deg2rad(point2.latitude - point1.latitude);
  const dLon = deg2rad(point2.longitude - point1.longitude);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(point1.latitude)) * Math.cos(deg2rad(point2.latitude)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const deg2rad = (deg: number): number => deg * (Math.PI/180);

// Helper to map API tracking data to local format
const mapApiTrackingToLocal = (apiData: ReturnType<typeof trackingDataSerializer>) => {
  const provider: ProviderTrackingInfo = {
    id: apiData.provider.id,
    name: apiData.provider.name,
    phone: apiData.provider.phone,
    image: apiData.provider.image,
    service: apiData.provider.service,
    specialty: apiData.provider.specialty || '',
    rating: apiData.provider.rating,
    reviews: apiData.provider.reviews,
    experience: apiData.provider.experience,
    verified: apiData.provider.verified,
    category: apiData.provider.category as ProviderTrackingInfo['category'],
  };

  const providerLocation: Coordinates = {
    latitude: apiData.providerLocation.latitude,
    longitude: apiData.providerLocation.longitude,
  };

  const route: RouteInfo = apiData.route ? {
    coordinates: apiData.route.coordinates,
    distance: apiData.route.distance,
    distanceValue: apiData.route.distanceValue,
    duration: apiData.route.duration,
    durationValue: apiData.route.durationValue,
  } : {
    coordinates: [],
    distance: '0 km',
    distanceValue: 0,
    duration: '0 min',
    durationValue: 0,
  };

  const trackingStatus: TrackingStatus = {
    status: apiData.trackingStatus.status as TrackingStatus['status'],
    message: apiData.trackingStatus.message,
    timestamp: apiData.trackingStatus.timestamp,
  };

  return { provider, providerLocation, route, trackingStatus };
};

// Slice
const liveTrackingSlice = createAppSlice({
  name: 'liveTracking',
  initialState,
  reducers: (create) => ({
    // Async Thunks
    initializeTracking: create.asyncThunk(
      async (
        params: { bookingId: string; category: 'electricians' | 'plumbers' | 'ac-repairers' },
        { rejectWithValue }
      ) => {
        const response = await fetchTrackingData(params.bookingId);
        if (!response.success || !response.data) {
          return rejectWithValue(response.message || 'Failed to initialize tracking');
        }
        const serialized = trackingDataSerializer(response.data);
        return { ...mapApiTrackingToLocal(serialized), bookingId: params.bookingId };
      },
      {
        pending: (state) => {
          state.isLoading = true;
          state.error = null;
        },
        fulfilled: (state, action) => {
          state.isLoading = false;
          state.provider = action.payload.provider;
          state.providerLocation = action.payload.providerLocation;
          state.route = action.payload.route;
          state.trackingStatus = action.payload.trackingStatus;
          state.bookingId = action.payload.bookingId;
          state.isTracking = true;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.payload as string;
        },
      }
    ),

    updateProviderLocation: create.asyncThunk(
      async (params: { bookingId: string }, { rejectWithValue }) => {
        const response = await fetchTrackingData(params.bookingId);
        if (!response.success || !response.data) {
          return rejectWithValue(response.message || 'Failed to update location');
        }
        const serialized = trackingDataSerializer(response.data);
        return {
          latitude: serialized.providerLocation.latitude,
          longitude: serialized.providerLocation.longitude,
        } as Coordinates;
      },
      {
        fulfilled: (state, action) => {
          state.providerLocation = action.payload;
        },
        rejected: (state, action) => {
          state.error = action.payload as string;
        },
      }
    ),

    fetchRouteInfo: create.asyncThunk(
      async (
        params: { origin: Coordinates; destination: Coordinates },
        { rejectWithValue }
      ) => {
        try {
          const distance = calculateDistance(params.origin, params.destination);
          const durationMinutes = Math.max(1, Math.round((distance / 25) * 60));
          
          return {
            coordinates: [params.origin, params.destination],
            distance: `${distance.toFixed(1)} km`,
            distanceValue: distance * 1000,
            duration: `${durationMinutes} min${durationMinutes > 1 ? 's' : ''}`,
            durationValue: durationMinutes * 60,
          } as RouteInfo;
        } catch (error) {
          return rejectWithValue('Failed to fetch route');
        }
      },
      {
        fulfilled: (state, action) => {
          state.route = action.payload;
        },
        rejected: (state, action) => {
          state.error = action.payload as string;
        },
      }
    ),

    // Sync reducers
    setUserLocation: create.reducer((state, action: PayloadAction<Coordinates>) => {
      state.userLocation = action.payload;
    }),

    setProviderLocation: create.reducer((state, action: PayloadAction<Coordinates>) => {
      state.providerLocation = action.payload;
    }),

    setTrackingStatus: create.reducer((state, action: PayloadAction<TrackingStatus>) => {
      state.trackingStatus = action.payload;
    }),

    setLocationPermission: create.reducer((state, action: PayloadAction<boolean>) => {
      state.hasLocationPermission = action.payload;
    }),

    setLocationError: create.reducer((state, action: PayloadAction<string | null>) => {
      state.locationError = action.payload;
    }),

    setIsTracking: create.reducer((state, action: PayloadAction<boolean>) => {
      state.isTracking = action.payload;
    }),

    updateStatusToNearby: create.reducer((state) => {
      state.trackingStatus = {
        status: 'nearby',
        message: 'Provider is nearby',
        timestamp: new Date().toISOString(),
      };
    }),

    updateStatusToArrived: create.reducer((state) => {
      state.trackingStatus = {
        status: 'arrived',
        message: 'Provider has arrived',
        timestamp: new Date().toISOString(),
      };
    }),

    clearTrackingState: create.reducer((state) => {
      state.provider = null;
      state.providerLocation = null;
      state.userLocation = null;
      state.route = null;
      state.trackingStatus = initialState.trackingStatus;
      state.isTracking = false;
      state.locationError = null;
      state.error = null;
      state.bookingId = null;
    }),
  }),
  selectors: {
    selectProvider: (state) => state.provider,
    selectProviderLocation: (state) => state.providerLocation,
    selectUserLocation: (state) => state.userLocation,
    selectRoute: (state) => state.route,
    selectTrackingStatus: (state) => state.trackingStatus,
    selectIsLoading: (state) => state.isLoading,
    selectIsTracking: (state) => state.isTracking,
    selectHasLocationPermission: (state) => state.hasLocationPermission,
    selectLocationError: (state) => state.locationError,
    selectError: (state) => state.error,
    selectBookingId: (state) => state.bookingId,
  },
});

// Actions
export const {
  initializeTracking,
  updateProviderLocation,
  fetchRouteInfo,
  setUserLocation,
  setProviderLocation,
  setTrackingStatus,
  setLocationPermission,
  setLocationError,
  setIsTracking,
  updateStatusToNearby,
  updateStatusToArrived,
  clearTrackingState,
} = liveTrackingSlice.actions;

// Selectors
export const {
  selectProvider,
  selectProviderLocation,
  selectUserLocation,
  selectRoute,
  selectTrackingStatus,
  selectIsLoading,
  selectIsTracking,
  selectHasLocationPermission,
  selectLocationError,
  selectError,
  selectBookingId,
} = liveTrackingSlice.selectors;

// Computed Selectors
export const selectIsProviderNearby = (state: { liveTracking?: LiveTrackingState }) => {
  const trackingState = state.liveTracking;
  if (!trackingState) return false;
  return trackingState.trackingStatus.status === 'nearby' || 
         trackingState.trackingStatus.status === 'arrived';
};

export const selectTrackingInfo = (state: { liveTracking?: LiveTrackingState }) => {
  const trackingState = state.liveTracking;
  if (!trackingState) {
    return {
      providerName: '',
      providerPhone: '',
      providerImage: '',
      distance: 'Calculating...',
      eta: 'Calculating...',
      status: 'en_route' as const,
      statusMessage: '',
    };
  }
  const { provider, route, trackingStatus } = trackingState;
  return {
    providerName: provider?.name || '',
    providerPhone: provider?.phone || '',
    providerImage: provider?.image || '',
    distance: route?.distance || 'Calculating...',
    eta: route?.duration || 'Calculating...',
    status: trackingStatus.status,
    statusMessage: trackingStatus.message,
  };
};

export default liveTrackingSlice.reducer;