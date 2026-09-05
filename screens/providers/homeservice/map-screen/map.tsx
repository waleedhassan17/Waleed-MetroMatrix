import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Linking,
  Alert,
  Animated,
  AppState,
  AppStateStatus,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import * as Location from 'expo-location';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { RootState } from '../../../../store/store';
import {
  updateCurrentLocation,
  updateRouteInfo,
  setNearDestination,
  markArrivedAsync,
} from './mapSlice';
import { setJobInProgressData } from '../job-InProgress/jobInProgressSlice';
import { emitEvent, joinBooking } from '../../../../services/socket/socketClient';
import { updateProviderLocation as updateProviderLocationApi } from '../../../../networks/serviceProviders/trackingNetwork';
import { HS } from '../../../../constants/HomeServiceTheme';
import { C, F, T } from '../../../../constants/theme';
import { ThemeColors, useTheme } from '../../../../theme';
import { makeProviderTheme, type ProviderTheme } from '../providerTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY';
const ARRIVAL_THRESHOLD = 100; // meters

type RootStackParamList = {
  JobInProgress: undefined;
  JobDetail: undefined;
  ProviderCallScreen: { bookingId: string; customerName?: string };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const NavigationMapScreen: React.FC = () => {
  const { colors } = useTheme();
  const theme = useMemo(() => makeProviderTheme(colors), [colors]);
  const styles = useMemo(() => makeStyles(colors, theme), [colors, theme]);

  const navigation = useNavigation<NavigationProp>();
  // These screens rendered a bare View as their root, so on Android their
  // headers sat under the status bar and on notched iPhones under the
  // notch. Real insets, not StatusBar.currentHeight.
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  
  // Use navigationMap slice
  const {
    destination,
    destinationAddress,
    destinationCity,
    customerName,
    customerPhone,
    serviceType,
    distance,
    duration,
    isNearDestination,
  } = useSelector((state: RootState) => state.navigationMap);
  
  // Get job data from jobDetail slice for passing to next screen
  const { job } = useSelector((state: RootState) => state.jobDetail);
  
  const mapRef = useRef<MapView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const destinationCoords = destination || { latitude: 31.5204, longitude: 74.3587 };

  // The destination marker used to pulse forever. On a moving map that is
  // motion competing with motion, so the loop is gone; `pulseAnim` stays at 1
  // and the transform it drives is now the identity.

  // HS7: share position with the customer ONLY while the job is EN_ROUTE or
  // ARRIVED (socket first, REST fallback), and stop entirely when the app is
  // backgrounded for more than 60 s or the job leaves the active phase —
  // supports the battery and NFR-08 privacy claims.
  const watchSubRef = useRef<Location.LocationSubscription | null>(null);
  const backgroundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trackingActiveRef = useRef(true);

  const stopWatching = () => {
    trackingActiveRef.current = false;
    watchSubRef.current?.remove();
    watchSubRef.current = null;
  };

  const startWatching = async () => {
    // Clear rationale: the customer sees the provider approach on the map.
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Location Permission Required',
        'Your live position is shared with the customer only while you are en route, so they can see you approaching on the map.'
      );
      return;
    }

    const location = await Location.getCurrentPositionAsync({});
    const newLocation = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
    setCurrentLocation(newLocation);
    dispatch(updateCurrentLocation(newLocation));

    trackingActiveRef.current = true;
    watchSubRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 3000,
        distanceInterval: 10,
      },
      async (loc) => {
        if (!trackingActiveRef.current) return;
        const updatedLocation = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };
        setCurrentLocation(updatedLocation);
        dispatch(updateCurrentLocation(updatedLocation));

        const dist = calculateDistance(updatedLocation, destinationCoords);
        dispatch(setNearDestination(dist <= ARRIVAL_THRESHOLD));

        // Broadcast to the booking room; backend enforces the EN_ROUTE/
        // ARRIVED-only rule and the 3s throttle server-side.
        if (job?.id) {
          const ack = await emitEvent('provider_location', {
            bookingId: job.id,
            lat: updatedLocation.latitude,
            lng: updatedLocation.longitude,
          });
          // Match on the typed reason, not the message text. This used to test
          // the message against /unavailable/i, which coupled a fallback to
          // human-facing copy — and broke silently the moment that copy changed.
          if (!ack.success && ack.reason === 'offline') {
            // Socket down (serverless host) — REST fallback keeps FR-09 alive.
            updateProviderLocationApi({ ...updatedLocation, jobId: job.id });
          }
        }
      }
    );
  };

  useEffect(() => {
    if (job?.id) joinBooking(job.id);
    startWatching();

    // Stop sharing when backgrounded > 60s; resume on foreground.
    const onAppStateChange = (state: AppStateStatus) => {
      if (state === 'background') {
        backgroundTimerRef.current = setTimeout(stopWatching, 60000);
      } else if (state === 'active') {
        if (backgroundTimerRef.current) clearTimeout(backgroundTimerRef.current);
        if (!watchSubRef.current) startWatching();
      }
    };
    const sub = AppState.addEventListener('change', onAppStateChange);

    return () => {
      sub.remove();
      if (backgroundTimerRef.current) clearTimeout(backgroundTimerRef.current);
      stopWatching();
    };
  }, []);

  const calculateDistance = (
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number }
  ): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (from.latitude * Math.PI) / 180;
    const φ2 = (to.latitude * Math.PI) / 180;
    const Δφ = ((to.latitude - from.latitude) * Math.PI) / 180;
    const Δλ = ((to.longitude - from.longitude) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const handleOpenInMaps = () => {
    const scheme = Platform.select({
      ios: 'maps:0,0?q=',
      android: 'google.navigation:q=',
    });
    const url = Platform.select({
      ios: `${scheme}${destinationCoords.latitude},${destinationCoords.longitude}`,
      android: `${scheme}${destinationCoords.latitude},${destinationCoords.longitude}`,
    });

    if (url) {
      Linking.openURL(url).catch(() =>
        Alert.alert('Error', 'Unable to open maps application')
      );
    }
  };

  const handleArrived = () => {
    Alert.alert(
      'Confirm Arrival',
      'Have you arrived at the customer location?',
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: "Yes, I've Arrived",
          style: 'default',
          onPress: async () => {
            // Was a sync reducer, so the booking never reached ARRIVED on the
            // server and the customer's tracking screen never updated. The real
            // transition also unblocks start-work, which requires ARRIVED.
            if (job) {
              const result = await dispatch(markArrivedAsync(job.id) as any);
              if (result?.meta?.requestStatus === 'rejected') {
                Alert.alert(
                  'Could not confirm arrival',
                  (result.payload as string) || 'Please check your connection and try again.'
                );
                return;
              }
            }

            // Set data for job in progress slice
            if (job) {
              dispatch(setJobInProgressData({
                jobId: job.id,
                serviceType: job.serviceType,
                category: job.category,
                customerName: job.customerName,
                customerPhone: job.customerPhone,
                address: job.address,
                city: job.city,
                specialInstructions: job.specialInstructions,
                estimatedPrice: job.estimatedPrice,
                coordinates: job.coordinates,
              }));
            }
            
            navigation.navigate('JobInProgress');
          },
        },
      ]
    );
  };

  // In-app call rather than the phone's dialer, matching the job-detail and
  // job-in-progress screens. A provider driving to a job is exactly who needs to
  // reach the customer, and the booking room is where that conversation belongs.
  const handleCallCustomer = () => {
    if (!job?.id) return;
    navigation.navigate('ProviderCallScreen', {
      bookingId: job.id,
      customerName,
    });
  };

  const centerOnRoute = () => {
    if (mapRef.current && currentLocation) {
      mapRef.current.fitToCoordinates([currentLocation, destinationCoords], {
        edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
        animated: true,
      });
    }
  };

  const onDirectionsReady = (result: any) => {
    dispatch(updateRouteInfo({
      distance: result.distance.toFixed(1) + ' km',
      duration: Math.ceil(result.duration) + ' min',
    }));
  };

  if (!destination) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading navigation...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: destinationCoords.latitude,
          longitude: destinationCoords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
      >
        {/* Destination Marker */}
        <Marker coordinate={destinationCoords}>
          <View style={styles.destinationMarkerContainer}>
            <Animated.View
              style={[
                styles.destinationPulse,
                { transform: [{ scale: pulseAnim }] },
              ]}
            />
            <View style={styles.destinationMarker}>
              <Icon name="map-marker" size={32} color={colors.accent} />
            </View>
          </View>
        </Marker>

        {/* Directions */}
        {currentLocation && (
          <MapViewDirections
            origin={currentLocation}
            destination={destinationCoords}
            apikey={GOOGLE_MAPS_API_KEY}
            strokeWidth={5}
            strokeColor={colors.accent}
            onReady={onDirectionsReady}
          />
        )}
      </MapView>

      {/* Top Controls */}
      <View style={styles.topControls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-left" size={24} color={colors.ink} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.controlButton} onPress={centerOnRoute}>
          <Icon name="crosshairs-gps" size={22} color={colors.ink} />
        </TouchableOpacity>
      </View>

      {/* ETA Bubble */}
      {distance && duration && (
        <View style={styles.etaBubble}>
          <View style={styles.etaItem}>
            <Icon name="map-marker-distance" size={18} color={colors.accent} />
            <Text style={styles.etaValue}>{distance}</Text>
          </View>
          <View style={styles.etaDivider} />
          <View style={styles.etaItem}>
            <Icon name="clock-outline" size={18} color={colors.accent} />
            <Text style={styles.etaValue}>{duration}</Text>
          </View>
        </View>
      )}

      {/* Bottom Sheet */}
      <View style={styles.bottomSheet}>
        {/* Handle */}
        <View style={styles.sheetHandle} />
        
        {/* Customer Info Row */}
        <View style={styles.customerRow}>
          <View style={styles.customerInfo}>
            <View style={styles.customerAvatarSmall}>
              <Text style={styles.customerInitialSmall}>
                {customerName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.customerDetails}>
              <Text style={styles.customerNameText}>{customerName}</Text>
              <Text style={styles.serviceTypeText}>{serviceType}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.callButton} onPress={handleCallCustomer}>
            <Icon name="phone" size={20} color={colors.surface} />
          </TouchableOpacity>
        </View>

        {/* Location Card */}
        <View style={styles.locationCard}>
          <View style={styles.locationIconBg}>
            <Icon name="map-marker" size={18} color={colors.warning} />
          </View>
          <View style={styles.locationInfo}>
            <Text style={styles.locationAddress} numberOfLines={1}>
              {destinationAddress}
            </Text>
            <Text style={styles.locationCity}>{destinationCity}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.openMapsButton}
            onPress={handleOpenInMaps}
          >
            <Icon name="google-maps" size={20} color={colors.accent} />
            <Text style={styles.openMapsText}>Open in Maps</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.arrivedButton,
              !isNearDestination && styles.arrivedButtonDisabled,
            ]}
            onPress={handleArrived}
            disabled={false} // Allow manual arrival for demo
            activeOpacity={0.85}
          >
            <Icon name="check-circle" size={20} color={colors.surface} />
            <Text style={styles.arrivedButtonText}>I've Arrived</Text>
          </TouchableOpacity>
        </View>

        {/* Helper Text */}
        {!isNearDestination && (
          <Text style={styles.helperText}>
            <Icon name="information-outline" size={14} color={colors.inkFaint} />
            {' '}Tap "I've Arrived" when you reach the location
          </Text>
        )}
      </View>
    </View>
  );
};

const makeStyles = (c: ThemeColors, theme: ProviderTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...T.subhead,
    color: c.inkMuted,
    fontFamily: F.medium,
  },
  map: {
    width: width,
    height: height,
  },
  topControls: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: c.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  etaBubble: {
    position: 'absolute',
    top: 110,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 20,
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  etaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  etaValue: {
    marginLeft: 6,
    ...T.body,
    fontFamily: F.semibold,
    color: c.ink,
  },
  etaDivider: {
    width: 1,
    height: 20,
    backgroundColor: c.line,
    marginHorizontal: 16,
  },
  destinationMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  destinationPulse: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  destinationMarker: {
    backgroundColor: c.surface,
    borderRadius: 20,
    padding: 6,
    shadowColor: c.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: c.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: c.line,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  customerAvatarSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerInitialSmall: {
    ...T.subhead,
    fontFamily: F.bold,
    color: c.accent,
  },
  customerDetails: {
    marginLeft: 12,
    flex: 1,
  },
  customerNameText: {
    ...T.subhead,
    fontFamily: F.semibold,
    color: c.ink,
  },
  serviceTypeText: {
    ...T.label,
    fontFamily: F.regular,
    color: c.inkMuted,
    marginTop: 2,
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: c.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.bg,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  locationIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: c.warningSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  locationAddress: {
    ...T.body,
    fontFamily: F.medium,
    color: c.ink,
  },
  locationCity: {
    ...T.caption,
    fontFamily: F.regular,
    color: c.inkMuted,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  openMapsButton: {
    flex: 0.45,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.accentSoft,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: c.accentLine,
  },
  openMapsText: {
    marginLeft: 8,
    ...T.body,
    fontFamily: F.semibold,
    color: c.accent,
  },
  arrivedButton: {
    flex: 0.55,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.accent,
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: c.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  arrivedButtonDisabled: {
    backgroundColor: c.accentLine,
  },
  arrivedButtonText: {
    marginLeft: 8,
    ...T.body,
    fontFamily: F.semibold,
    color: c.inkInverse,
  },
  helperText: {
    textAlign: 'center',
    marginTop: 14,
    ...T.caption,
    fontFamily: F.regular,
    color: c.inkFaint,
  },
});

export default NavigationMapScreen;