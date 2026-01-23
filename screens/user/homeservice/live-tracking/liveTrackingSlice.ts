import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

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

// Mock provider data by category
const MOCK_PROVIDERS: Record<string, ProviderTrackingInfo> = {
  electricians: {
    id: 'elec-001',
    name: 'Usman Ali',
    phone: '+923001234567',
    image: 'https://randomuser.me/api/portraits/men/32.jpg',
    service: 'Electrical Services',
    specialty: 'Wiring & Installation Specialist',
    rating: 4.8,
    reviews: 189,
    experience: '10+ years',
    verified: true,
    category: 'electricians',
  },
  plumbers: {
    id: 'plumb-001',
    name: 'Ahmad Raza',
    phone: '+923009876543',
    image: 'https://randomuser.me/api/portraits/men/1.jpg',
    service: 'Plumbing Services',
    specialty: 'Pipe Fitting & Leak Repairs',
    rating: 4.9,
    reviews: 245,
    experience: '8+ years',
    verified: true,
    category: 'plumbers',
  },
  'ac-repairers': {
    id: 'ac-001',
    name: 'Bilal Ahmed',
    phone: '+923005551234',
    image: 'https://randomuser.me/api/portraits/men/45.jpg',
    service: 'AC Repair Services',
    specialty: 'AC Installation & Cooling Expert',
    rating: 4.7,
    reviews: 167,
    experience: '6+ years',
    verified: true,
    category: 'ac-repairers',
  },
};

// Async Thunks
export const initializeTracking = createAsyncThunk(
  'liveTracking/initialize',
  async ({ 
    bookingId, 
    category 
  }: { 
    bookingId: string; 
    category: 'electricians' | 'plumbers' | 'ac-repairers';
  }) => {
    // Simulate API call to get tracking data
    return new Promise<{
      provider: ProviderTrackingInfo;
      providerLocation: Coordinates;
      bookingId: string;
    }>((resolve) => {
      setTimeout(() => {
        const provider = MOCK_PROVIDERS[category] || MOCK_PROVIDERS['ac-repairers'];
        resolve({
          provider,
          providerLocation: {
            latitude: 31.4554, // Slightly offset from user
            longitude: 73.1400,
          },
          bookingId,
        });
      }, 800);
    });
  }
);

export const updateProviderLocation = createAsyncThunk(
  'liveTracking/updateProviderLocation',
  async ({ bookingId }: { bookingId: string }) => {
    // Simulate API call to get updated provider location
    return new Promise<Coordinates>((resolve) => {
      setTimeout(() => {
        // Simulate movement towards user
        resolve({
          latitude: 31.4520 + Math.random() * 0.002,
          longitude: 73.1370 + Math.random() * 0.002,
        });
      }, 500);
    });
  }
);

export const fetchRouteInfo = createAsyncThunk(
  'liveTracking/fetchRoute',
  async ({ 
    origin, 
    destination 
  }: { 
    origin: Coordinates; 
    destination: Coordinates;
  }) => {
    // Simulate route calculation
    return new Promise<RouteInfo>((resolve) => {
      setTimeout(() => {
        const distance = calculateDistance(origin, destination);
        const durationMinutes = Math.max(1, Math.round((distance / 25) * 60));
        
        resolve({
          coordinates: [origin, destination],
          distance: `${distance.toFixed(1)} km`,
          distanceValue: distance * 1000,
          duration: `${durationMinutes} min${durationMinutes > 1 ? 's' : ''}`,
          durationValue: durationMinutes * 60,
        });
      }, 300);
    });
  }
);

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

// Slice
const liveTrackingSlice = createSlice({
  name: 'liveTracking',
  initialState,
  reducers: {
    setUserLocation: (state, action: PayloadAction<Coordinates>) => {
      state.userLocation = action.payload;
    },
    setProviderLocation: (state, action: PayloadAction<Coordinates>) => {
      state.providerLocation = action.payload;
    },
    setTrackingStatus: (state, action: PayloadAction<TrackingStatus>) => {
      state.trackingStatus = action.payload;
    },
    setLocationPermission: (state, action: PayloadAction<boolean>) => {
      state.hasLocationPermission = action.payload;
    },
    setLocationError: (state, action: PayloadAction<string | null>) => {
      state.locationError = action.payload;
    },
    setIsTracking: (state, action: PayloadAction<boolean>) => {
      state.isTracking = action.payload;
    },
    updateStatusToNearby: (state) => {
      state.trackingStatus = {
        status: 'nearby',
        message: 'Provider is nearby',
        timestamp: new Date().toISOString(),
      };
    },
    updateStatusToArrived: (state) => {
      state.trackingStatus = {
        status: 'arrived',
        message: 'Provider has arrived',
        timestamp: new Date().toISOString(),
      };
    },
    clearTrackingState: (state) => {
      state.provider = null;
      state.providerLocation = null;
      state.userLocation = null;
      state.route = null;
      state.trackingStatus = initialState.trackingStatus;
      state.isTracking = false;
      state.locationError = null;
      state.error = null;
      state.bookingId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Initialize tracking
      .addCase(initializeTracking.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(initializeTracking.fulfilled, (state, action) => {
        state.isLoading = false;
        state.provider = action.payload.provider;
        state.providerLocation = action.payload.providerLocation;
        state.bookingId = action.payload.bookingId;
        state.isTracking = true;
      })
      .addCase(initializeTracking.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to initialize tracking';
      })
      // Update provider location
      .addCase(updateProviderLocation.fulfilled, (state, action) => {
        state.providerLocation = action.payload;
      })
      // Fetch route info
      .addCase(fetchRouteInfo.fulfilled, (state, action) => {
        state.route = action.payload;
      });
  },
});

// Actions
export const {
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

// Selectors - use optional chaining for RootState compatibility
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