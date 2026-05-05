import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  StatusBar,
  SafeAreaView,
  Alert,
  Dimensions,
  Linking,
  Image,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import MapView, { Marker, Polyline, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import {
  initializeTracking,
  fetchRouteInfo,
  setUserLocation,
  setLocationPermission,
  setLocationError,
  setIsTracking,
  updateStatusToNearby,
  updateStatusToArrived,
  clearTrackingState,
  selectTrackingInfo,
  selectIsProviderNearby,
  Coordinates,
} from './liveTrackingSlice';
import { RootState, AppDispatch } from '../../../../store/store';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.015;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;
const PROXIMITY_RADIUS = 100; // 100 meters

// Service type configurations - matching BookingScreen
const SERVICE_CONFIG: Record<string, {
  gradient: string[];
  lightGradient: string[];
  accentColor: string;
  icon: string;
  mapMarkerColor: string;
}> = {
  electricians: {
    gradient: ['#F59E0B', '#D97706'],
    lightGradient: ['#FEF3C7', '#FDE68A'],
    accentColor: '#F59E0B',
    icon: 'flash',
    mapMarkerColor: '#F59E0B',
  },
  plumbers: {
    gradient: ['#3B82F6', '#2563EB'],
    lightGradient: ['#DBEAFE', '#BFDBFE'],
    accentColor: '#3B82F6',
    icon: 'water',
    mapMarkerColor: '#3B82F6',
  },
  'ac-repairers': {
    gradient: ['#06B6D4', '#0891B2'],
    lightGradient: ['#CFFAFE', '#A5F3FC'],
    accentColor: '#06B6D4',
    icon: 'snow',
    mapMarkerColor: '#06B6D4',
  },
};

type LiveTrackingRouteParams = {
  bookingId: string;
  category?: 'electricians' | 'plumbers' | 'ac-repairers';
};

export default function LiveTrackingScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: LiveTrackingRouteParams }, 'params'>>();
  const dispatch = useDispatch<AppDispatch>();

  const { bookingId, category = 'ac-repairers' } = route.params || {};

  // Redux state
  const provider = useSelector((state: RootState) => state.liveTracking?.provider);
  const providerLocation = useSelector((state: RootState) => state.liveTracking?.providerLocation);
  const userLocation = useSelector((state: RootState) => state.liveTracking?.userLocation);
  const routeInfo = useSelector((state: RootState) => state.liveTracking?.route);
  const trackingStatus = useSelector((state: RootState) => state.liveTracking?.trackingStatus);
  const isLoading = useSelector((state: RootState) => state.liveTracking?.isLoading);
  const isTracking = useSelector((state: RootState) => state.liveTracking?.isTracking);
  const hasLocationPermission = useSelector((state: RootState) => state.liveTracking?.hasLocationPermission);
  const locationError = useSelector((state: RootState) => state.liveTracking?.locationError);
  const trackingInfo = useSelector(selectTrackingInfo);
  const isProviderNearby = useSelector(selectIsProviderNearby);

  // Local state
  const [isReady, setIsReady] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [initialRegion, setInitialRegion] = useState({
    latitude: 31.4504,
    longitude: 73.1350,
    latitudeDelta: LATITUDE_DELTA,
    longitudeDelta: LONGITUDE_DELTA,
  });

  // Refs
  const mapRef = useRef<MapView>(null);
  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);
  const providerSimulationRef = useRef<NodeJS.Timeout | null>(null);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const loadingFadeAnim = useRef(new Animated.Value(1)).current;

  const serviceConfig = SERVICE_CONFIG[category] || SERVICE_CONFIG['ac-repairers'];

  // Callbacks
  const handleBackPress = useCallback(() => {
    Alert.alert(
      'Stop Tracking?',
      'Are you sure you want to stop tracking your service provider?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop Tracking',
          style: 'destructive',
          onPress: () => {
            cleanup();
            dispatch(clearTrackingState());
            navigation.goBack();
          },
        },
      ]
    );
  }, [dispatch, navigation]);

  const handleCallProvider = useCallback(() => {
    if (!provider?.phone) return;
    const phoneUrl = `tel:${provider.phone}`;
    Linking.canOpenURL(phoneUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(phoneUrl);
        } else {
          Alert.alert('Error', 'Unable to make phone call');
        }
      })
      .catch((error) => console.error('Call error:', error));
  }, [provider]);

  const handleMessageProvider = useCallback(() => {
    if (!provider?.phone) return;
    const smsUrl = `sms:${provider.phone}`;
    Linking.canOpenURL(smsUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(smsUrl);
        } else {
          Alert.alert('Error', 'Unable to send message');
        }
      })
      .catch((error) => console.error('SMS error:', error));
  }, [provider]);

  const handleCenterMap = useCallback(() => {
    if (mapRef.current && providerLocation && userLocation) {
      mapRef.current.fitToCoordinates(
        [userLocation, providerLocation],
        {
          edgePadding: { top: 100, right: 50, bottom: 200, left: 50 },
          animated: true,
        }
      );
    }
  }, [providerLocation, userLocation]);

  const handleProviderArrived = useCallback(() => {
    cleanup();
    dispatch(clearTrackingState());
    // @ts-ignore
    navigation.navigate('serviceStatus', { category, bookingId });
  }, [dispatch, navigation, category, bookingId]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (locationWatchRef.current) {
      locationWatchRef.current.remove();
      locationWatchRef.current = null;
    }
    if (providerSimulationRef.current) {
      clearInterval(providerSimulationRef.current);
      providerSimulationRef.current = null;
    }
    dispatch(setIsTracking(false));
  }, [dispatch]);

  // Initialize location tracking
  const initializeLocationTracking = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        dispatch(setLocationPermission(false));
        dispatch(setLocationError('Location permission denied'));
        Alert.alert(
          'Location Permission Required',
          'Please enable location services to track your service provider.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      dispatch(setLocationPermission(true));

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });

      const currentLocation: Coordinates = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      dispatch(setUserLocation(currentLocation));
      setInitialRegion({
        ...currentLocation,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      });

      // Start watching location
      locationWatchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 3000,
          distanceInterval: 5,
        },
        (newLocation: Location.LocationObject) => {
          dispatch(setUserLocation({
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
          }));
        }
      );

    } catch (error) {
      console.error('Location error:', error);
      dispatch(setLocationError('Unable to get current location'));
      
      // Fallback location
      const fallbackLocation: Coordinates = {
        latitude: 31.4504,
        longitude: 73.1350,
      };
      dispatch(setUserLocation(fallbackLocation));
      setInitialRegion({
        ...fallbackLocation,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      });
    }
  }, [dispatch]);

  // Run entrance animations
  const runEntranceAnimations = useCallback(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    scaleAnim.setValue(0.95);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation
    const pulseAnimation = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => pulseAnimation());
    };
    pulseAnimation();
  }, [fadeAnim, slideAnim, scaleAnim, pulseAnim]);

  // Focus effect
  useFocusEffect(
    useCallback(() => {
      setIsReady(false);
      loadingFadeAnim.setValue(1);

      const validCategory = ['electricians', 'plumbers', 'ac-repairers'].includes(category)
        ? category
        : 'ac-repairers';

      // Initialize tracking
      dispatch(initializeTracking({
        bookingId: bookingId || 'default',
        category: validCategory as 'electricians' | 'plumbers' | 'ac-repairers',
      }));

      initializeLocationTracking();

      return () => {
        cleanup();
        fadeAnim.setValue(0);
        slideAnim.setValue(30);
        scaleAnim.setValue(0.95);
        setIsReady(false);
      };
    }, [bookingId, category, dispatch, initializeLocationTracking, cleanup])
  );

  // Run animations when data is loaded
  useEffect(() => {
    if (!isLoading && provider && !isReady) {
      const timer = setTimeout(() => {
        setIsReady(true);
        runEntranceAnimations();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isLoading, provider, isReady, runEntranceAnimations]);

  // Update route when locations change
  useEffect(() => {
    if (providerLocation && userLocation) {
      dispatch(fetchRouteInfo({ origin: providerLocation, destination: userLocation }));
      
      // Check proximity
      const distance = calculateDistance(providerLocation, userLocation);
      if (distance * 1000 <= PROXIMITY_RADIUS) {
        dispatch(updateStatusToNearby());
      }
    }
  }, [providerLocation, userLocation, dispatch]);

  // Helper function
  const calculateDistance = (point1: Coordinates, point2: Coordinates): number => {
    const R = 6371;
    const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
    const dLon = (point2.longitude - point1.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Loading state
  if (isLoading || !provider) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Animated.View style={{ opacity: loadingFadeAnim }}>
            <LinearGradient
              colors={serviceConfig.gradient as [string, string]}
              style={styles.loadingIcon}
            >
              <Ionicons name={serviceConfig.icon as any} size={32} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.loadingText}>Initializing tracking...</Text>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  const renderHeader = () => (
    <Animated.View
      style={[
        styles.header,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <LinearGradient colors={['#FFFFFF', '#F8FAFC']} style={styles.headerGradient}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={22} color="#1E293B" />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Live Tracking</Text>
            <View style={styles.liveIndicator}>
              <Animated.View
                style={[
                  styles.liveDot,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.centerButton, { backgroundColor: `${serviceConfig.accentColor}15` }]}
            onPress={handleCenterMap}
            activeOpacity={0.8}
          >
            <Ionicons name="locate" size={20} color={serviceConfig.accentColor} />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const renderMap = () => (
    <View style={styles.mapContainer}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        showsTraffic={true}
        onMapReady={() => setMapReady(true)}
      >
        {/* User Location Marker */}
        {userLocation && (
          <Marker coordinate={userLocation} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.userMarker}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.userMarkerInner}
              >
                <Ionicons name="home" size={16} color="#FFFFFF" />
              </LinearGradient>
            </View>
          </Marker>
        )}

        {/* Provider Location Marker */}
        {providerLocation && (
          <Marker coordinate={providerLocation} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.providerMarker}>
              <LinearGradient
                colors={serviceConfig.gradient as [string, string]}
                style={styles.providerMarkerInner}
              >
                <Ionicons name={serviceConfig.icon as any} size={18} color="#FFFFFF" />
              </LinearGradient>
            </View>
          </Marker>
        )}

        {/* Route Polyline */}
        {routeInfo?.coordinates && routeInfo.coordinates.length >= 2 && (
          <Polyline
            coordinates={routeInfo.coordinates}
            strokeColor={serviceConfig.accentColor}
            strokeWidth={4}
            lineDashPattern={[1]}
          />
        )}

        {/* Proximity Circle */}
        {userLocation && (
          <Circle
            center={userLocation}
            radius={PROXIMITY_RADIUS}
            fillColor={`${serviceConfig.accentColor}15`}
            strokeColor={`${serviceConfig.accentColor}40`}
            strokeWidth={2}
          />
        )}
      </MapView>

      {/* ETA Overlay */}
      <Animated.View
        style={[
          styles.etaOverlay,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={serviceConfig.gradient as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.etaGradient}
        >
          <View style={styles.etaContent}>
            <Ionicons name="time-outline" size={18} color="#FFFFFF" />
            <Text style={styles.etaText}>{trackingInfo.eta}</Text>
          </View>
          <View style={styles.etaDivider} />
          <View style={styles.etaContent}>
            <Ionicons name="navigate-outline" size={18} color="#FFFFFF" />
            <Text style={styles.etaText}>{trackingInfo.distance}</Text>
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );

  const renderProviderCard = () => (
    <Animated.View
      style={[
        styles.providerCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={serviceConfig.gradient as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.cardTopAccent}
      />

      {/* Status Banner */}
      <View style={[styles.statusBanner, { backgroundColor: `${serviceConfig.accentColor}10` }]}>
        <Animated.View
          style={[
            styles.statusDot,
            {
              backgroundColor: serviceConfig.accentColor,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
        <Text style={[styles.statusText, { color: serviceConfig.accentColor }]}>
          {trackingStatus?.message || 'Provider is on the way'}
        </Text>
      </View>

      <View style={styles.providerContent}>
        <View style={styles.providerImageContainer}>
          <LinearGradient
            colors={serviceConfig.gradient as [string, string]}
            style={styles.providerImageRing}
          >
            <View style={styles.providerImageInner}>
              <Image source={{ uri: provider.image }} style={styles.providerImage} />
            </View>
          </LinearGradient>
        </View>

        <View style={styles.providerInfo}>
          <View style={styles.providerNameRow}>
            <Text style={styles.providerName}>{provider.name}</Text>
            {provider.verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={14} color={serviceConfig.accentColor} />
              </View>
            )}
          </View>

          <Text style={styles.providerSpecialty}>{provider.specialty}</Text>

          <View style={styles.providerBadges}>
            <LinearGradient colors={['#FEF3C7', '#FDE68A']} style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={styles.ratingText}>{provider.rating}</Text>
            </LinearGradient>

            <View style={[styles.serviceBadge, { backgroundColor: `${serviceConfig.accentColor}12` }]}>
              <Ionicons name={serviceConfig.icon as any} size={12} color={serviceConfig.accentColor} />
              <Text style={[styles.serviceText, { color: serviceConfig.accentColor }]}>
                {provider.service}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#10B98115' }]}
          onPress={handleCallProvider}
          activeOpacity={0.8}
        >
          <Ionicons name="call" size={20} color="#10B981" />
          <Text style={[styles.actionButtonText, { color: '#10B981' }]}>Call</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: `${serviceConfig.accentColor}15` }]}
          onPress={handleMessageProvider}
          activeOpacity={0.8}
        >
          <Ionicons name="chatbubble" size={20} color={serviceConfig.accentColor} />
          <Text style={[styles.actionButtonText, { color: serviceConfig.accentColor }]}>Message</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#6366F115' }]}
          onPress={handleCenterMap}
          activeOpacity={0.8}
        >
          <Ionicons name="navigate" size={20} color="#6366F1" />
          <Text style={[styles.actionButtonText, { color: '#6366F1' }]}>Track</Text>
        </TouchableOpacity>
      </View>

      {/* Arrived Button */}
      {isProviderNearby && (
        <TouchableOpacity
          style={styles.arrivedButton}
          onPress={handleProviderArrived}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={serviceConfig.gradient as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.arrivedButtonGradient}
          >
            <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
            <Text style={styles.arrivedButtonText}>Provider Arrived</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {renderHeader()}
      {renderMap()}
      {renderProviderCard()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    alignSelf: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerGradient: {
    paddingTop: (StatusBar.currentHeight || 0) + 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EF4444',
  },
  centerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  userMarker: {
    padding: 4,
  },
  userMarkerInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  providerMarker: {
    padding: 4,
  },
  providerMarkerInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  etaOverlay: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 80 : 120,
    alignSelf: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  etaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  etaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  etaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  etaDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 12,
  },
  providerCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  cardTopAccent: {
    height: 4,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  providerContent: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  providerImageContainer: {
    position: 'relative',
  },
  providerImageRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    padding: 3,
  },
  providerImageInner: {
    flex: 1,
    borderRadius: 29,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  providerImage: {
    width: '100%',
    height: '100%',
  },
  providerInfo: {
    flex: 1,
  },
  providerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  providerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  verifiedBadge: {
    marginLeft: 4,
  },
  providerSpecialty: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  providerBadges: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  serviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  serviceText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  arrivedButton: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
  },
  arrivedButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  arrivedButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});