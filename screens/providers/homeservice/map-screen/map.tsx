import React, { useState, useEffect, useRef } from 'react';
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
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootState } from '../../../../store/store';
import {
  updateCurrentLocation,
  updateRouteInfo,
  setNearDestination,
  arriveAtLocation,
} from './mapSlice';
import { setJobInProgressData } from '../job-InProgress/jobInProgressSlice';
import { emitEvent, joinBooking } from '../../../../services/socket/socketClient';
import { updateProviderLocation as updateProviderLocationApi } from '../../../../networks/serviceProviders/trackingNetwork';

const { width, height } = Dimensions.get('window');
const GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY';
const ARRIVAL_THRESHOLD = 100; // meters

type RootStackParamList = {
  JobInProgress: undefined;
  JobDetail: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const NavigationMapScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
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

  useEffect(() => {
    // Pulse animation for destination marker
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, []);

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
          if (!ack.success && /unavailable/i.test(ack.message || '')) {
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
          onPress: () => {
            dispatch(arriveAtLocation());
            
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

  const handleCallCustomer = () => {
    if (customerPhone && customerPhone !== 'N/A') {
      Linking.openURL(`tel:${customerPhone}`);
    }
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
    <View style={styles.container}>
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
              <Icon name="map-marker" size={32} color="#10B981" />
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
            strokeColor="#10B981"
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
          <Icon name="chevron-left" size={24} color="#1F2937" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.controlButton} onPress={centerOnRoute}>
          <Icon name="crosshairs-gps" size={22} color="#1F2937" />
        </TouchableOpacity>
      </View>

      {/* ETA Bubble */}
      {distance && duration && (
        <View style={styles.etaBubble}>
          <View style={styles.etaItem}>
            <Icon name="map-marker-distance" size={18} color="#10B981" />
            <Text style={styles.etaValue}>{distance}</Text>
          </View>
          <View style={styles.etaDivider} />
          <View style={styles.etaItem}>
            <Icon name="clock-outline" size={18} color="#10B981" />
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
            <Icon name="phone" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Location Card */}
        <View style={styles.locationCard}>
          <View style={styles.locationIconBg}>
            <Icon name="map-marker" size={18} color="#F59E0B" />
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
            <Icon name="google-maps" size={20} color="#10B981" />
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
            <Icon name="check-circle" size={20} color="#FFFFFF" />
            <Text style={styles.arrivedButtonText}>I've Arrived</Text>
          </TouchableOpacity>
        </View>

        {/* Helper Text */}
        {!isNearDestination && (
          <Text style={styles.helperText}>
            <Icon name="information-outline" size={14} color="#9CA3AF" />
            {' '}Tap "I've Arrived" when you reach the location
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'Inter-Medium',
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
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 20,
    shadowColor: '#000',
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
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  etaDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E5E7EB',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 6,
    shadowColor: '#10B981',
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
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
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
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerInitialSmall: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
  },
  customerDetails: {
    marginLeft: 12,
    flex: 1,
  },
  customerNameText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  serviceTypeText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  locationIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  locationAddress: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#1F2937',
  },
  locationCity: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
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
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  openMapsText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
  },
  arrivedButton: {
    flex: 0.55,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  arrivedButtonDisabled: {
    backgroundColor: '#6EE7B7',
  },
  arrivedButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  helperText: {
    textAlign: 'center',
    marginTop: 14,
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
});

export default NavigationMapScreen;