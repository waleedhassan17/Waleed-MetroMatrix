// ============================================================================
// Live tracking — the provider on their way
//
// The map is the content here, so the chrome around it gets out of the way:
// a solid app bar, a flat ETA strip, and a provider card that stops competing
// with the route. The "LIVE" pulse chip, the avatar ring gradient, the gradient
// ETA pill and the gradient arrival button are gone, and the three action
// buttons no longer use three unrelated hues.
//
// Map markers keep a solid accent fill — on satellite and traffic imagery a
// flat marker on a busy background is the one place a strong colour earns its
// keep.
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Circle, Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useDispatch, useSelector } from 'react-redux';

import {
  ActionSheet,
  AppBar,
  Avatar,
  Button,
  EmptyState,
  Screen,
  Skeleton,
} from '../../../../components/ui';
import { categoryAccent, HS } from '../../../../constants/HomeServiceTheme';
import { C, E, GUTTER, R, S, T } from '../../../../constants/theme';
import { useBottomBarPadding } from '../../../../hooks/useBottomBarPadding';
import { useRoomSocket } from '../../../../hooks/useRoomSocket';
import { AppDispatch, RootState } from '../../../../store/store';
import { formatRating } from '../../../../utils/homeservice/format';
import {
  clearTrackingState,
  Coordinates,
  fetchRouteInfo,
  initializeTracking,
  selectIsProviderNearby,
  selectTrackingInfo,
  setIsTracking,
  setLocationError,
  setLocationPermission,
  setProviderLocation,
  setUserLocation,
  updateStatusToArrived,
  updateStatusToNearby,
} from './liveTrackingSlice';

const LATITUDE_DELTA = 0.015;
const LONGITUDE_DELTA = 0.015;
const PROXIMITY_RADIUS = 100; // metres

type RouteParams = {
  bookingId: string;
  category?: 'electricians' | 'plumbers' | 'ac-repairers';
};

export default function LiveTrackingScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const dispatch = useDispatch<AppDispatch>();
  const bottomPad = useBottomBarPadding(GUTTER);

  const { bookingId, category = 'ac-repairers' } = route.params || {};
  const accent = categoryAccent(category);

  const provider = useSelector((state: RootState) => state.liveTracking?.provider);
  const providerLocation = useSelector((state: RootState) => state.liveTracking?.providerLocation);
  const userLocation = useSelector((state: RootState) => state.liveTracking?.userLocation);
  const routeInfo = useSelector((state: RootState) => state.liveTracking?.route);
  const trackingStatus = useSelector((state: RootState) => state.liveTracking?.trackingStatus);
  const isLoading = useSelector((state: RootState) => state.liveTracking?.isLoading);
  const trackingInfo = useSelector(selectTrackingInfo);
  const isProviderNearby = useSelector(selectIsProviderNearby);

  // Live provider_location_update events replace polling; the marker position
  // flows through the existing Redux state so the map animates between updates
  // instead of snapping.
  const { providerLocation: liveLocation, bookingStatus: liveStatus } = useRoomSocket(
    bookingId,
    'homeservice'
  );

  const [mapReady, setMapReady] = useState(false);
  const [showStopSheet, setShowStopSheet] = useState(false);
  const [showPermissionSheet, setShowPermissionSheet] = useState(false);
  const [initialRegion, setInitialRegion] = useState({
    latitude: 31.4504,
    longitude: 73.135,
    latitudeDelta: LATITUDE_DELTA,
    longitudeDelta: LONGITUDE_DELTA,
  });

  const mapRef = useRef<MapView>(null);
  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (liveLocation) {
      dispatch(
        setProviderLocation({
          latitude: liveLocation.latitude,
          longitude: liveLocation.longitude,
        })
      );
    }
  }, [liveLocation, dispatch]);

  useEffect(() => {
    if (liveStatus === 'ARRIVED') dispatch(updateStatusToArrived());
  }, [liveStatus, dispatch]);

  const cleanup = useCallback(() => {
    if (locationWatchRef.current) {
      locationWatchRef.current.remove();
      locationWatchRef.current = null;
    }
    dispatch(setIsTracking(false));
  }, [dispatch]);

  const initializeLocationTracking = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        dispatch(setLocationPermission(false));
        dispatch(setLocationError('Location permission denied'));
        setShowPermissionSheet(true);
        return;
      }

      dispatch(setLocationPermission(true));

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

      locationWatchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 3000,
          distanceInterval: 5,
        },
        (newLocation: Location.LocationObject) => {
          dispatch(
            setUserLocation({
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
            })
          );
        }
      );
    } catch (error) {
      console.error('Location error:', error);
      dispatch(setLocationError('Unable to get current location'));

      const fallbackLocation: Coordinates = { latitude: 31.4504, longitude: 73.135 };
      dispatch(setUserLocation(fallbackLocation));
      setInitialRegion({
        ...fallbackLocation,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      });
    }
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      const validCategory = ['electricians', 'plumbers', 'ac-repairers'].includes(category)
        ? category
        : 'ac-repairers';

      // No id, no fetch. This used to pass the literal string 'default', which
      // the API answered with 404 — a missing id is a caller bug, not something
      // to paper over.
      if (!bookingId) {
        if (__DEV__) {
          console.warn('[liveTracking] no bookingId in route params — skipping fetch.');
        }
        return;
      }

      dispatch(
        initializeTracking({
          bookingId,
          category: validCategory as 'electricians' | 'plumbers' | 'ac-repairers',
        })
      );
      initializeLocationTracking();

      return cleanup;
    }, [bookingId, category, dispatch, initializeLocationTracking, cleanup])
  );

  const calculateDistance = (point1: Coordinates, point2: Coordinates): number => {
    const earthRadiusKm = 6371;
    const dLat = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const dLon = ((point2.longitude - point1.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((point1.latitude * Math.PI) / 180) *
        Math.cos((point2.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  };

  useEffect(() => {
    if (providerLocation && userLocation) {
      dispatch(fetchRouteInfo({ origin: providerLocation, destination: userLocation }));

      const distance = calculateDistance(providerLocation, userLocation);
      if (distance * 1000 <= PROXIMITY_RADIUS) {
        dispatch(updateStatusToNearby());
      }
    }
  }, [providerLocation, userLocation, dispatch]);

  const handleCenterMap = useCallback(() => {
    if (mapRef.current && providerLocation && userLocation) {
      mapRef.current.fitToCoordinates([userLocation, providerLocation], {
        edgePadding: { top: 100, right: 50, bottom: 240, left: 50 },
        animated: true,
      });
    }
  }, [providerLocation, userLocation]);

  const stopTracking = useCallback(() => {
    cleanup();
    dispatch(clearTrackingState());
    navigation.goBack();
  }, [cleanup, dispatch, navigation]);

  // Without a booking there is nothing to track — say so rather than spinning
  // on "Initializing tracking..." forever.
  if (!bookingId) {
    return (
      <Screen>
        <AppBar title="Tracking" onBack={() => navigation.goBack()} />
        <EmptyState
          icon="navigate-outline"
          title="Nothing to track"
          message="Open a confirmed booking to follow your provider on the map."
          actionLabel="Go back"
          onAction={() => navigation.goBack()}
        />
      </Screen>
    );
  }

  if (isLoading || !provider) {
    return (
      <Screen>
        <AppBar title="Tracking" onBack={() => navigation.goBack()} />
        <View style={styles.loading} accessibilityLabel="Starting tracking">
          <Skeleton width="100%" height={280} radius={R.card} />
          <Skeleton width="100%" height={120} radius={R.card} style={styles.loadingGap} />
        </View>
      </Screen>
    );
  }

  const rating = formatRating(provider.rating);

  return (
    <Screen>
      <AppBar
        title="Tracking"
        subtitle={trackingStatus?.message || 'On the way'}
        onBack={() => setShowStopSheet(true)}
        rightIcon="locate-outline"
        onRightPress={handleCenterMap}
      />

      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={PROVIDER_GOOGLE}
          initialRegion={initialRegion}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          showsTraffic
          onMapReady={() => setMapReady(true)}
        >
          {userLocation && (
            <Marker coordinate={userLocation} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.markerOuter}>
                <View style={[styles.marker, { backgroundColor: HS.accent }]}>
                  <Ionicons name="home" size={14} color={C.inkInverse} />
                </View>
              </View>
            </Marker>
          )}

          {providerLocation && (
            <Marker coordinate={providerLocation} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.markerOuter}>
                <View style={[styles.marker, { backgroundColor: accent.tint }]}>
                  <Ionicons name={accent.icon as any} size={16} color={C.inkInverse} />
                </View>
              </View>
            </Marker>
          )}

          {routeInfo?.coordinates && routeInfo.coordinates.length >= 2 && (
            <Polyline coordinates={routeInfo.coordinates} strokeColor={accent.tint} strokeWidth={4} />
          )}

          {userLocation && (
            <Circle
              center={userLocation}
              radius={PROXIMITY_RADIUS}
              fillColor={`${HS.accent}14`}
              strokeColor={`${HS.accent}44`}
              strokeWidth={2}
            />
          )}
        </MapView>

        {mapReady && (
          <View style={styles.eta}>
            <View style={styles.etaItem}>
              <Ionicons name="time-outline" size={16} color={C.inkMuted} />
              <Text style={styles.etaText}>{trackingInfo.eta}</Text>
            </View>
            <View style={styles.etaDivider} />
            <View style={styles.etaItem}>
              <Ionicons name="navigate-outline" size={16} color={C.inkMuted} />
              <Text style={styles.etaText}>{trackingInfo.distance}</Text>
            </View>
          </View>
        )}
      </View>

      <View style={[styles.sheet, { paddingBottom: bottomPad }]}>
        <View style={styles.providerRow}>
          <Avatar
            uri={provider.image}
            name={provider.name}
            size={44}
            tint={accent.tintSoft}
            color={accent.tint}
          />
          <View style={styles.providerInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.providerName} numberOfLines={1}>
                {provider.name}
              </Text>
              {provider.verified && (
                <Ionicons name="shield-checkmark" size={14} color={accent.tint} />
              )}
            </View>
            <Text style={styles.meta} numberOfLines={1}>
              {[provider.service || provider.specialty, rating ? `${rating} rating` : null]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>

          {/* In-app call and chat, keyed on the booking — not the phone's
              dialer and SMS. Handing that off to the carrier put the
              conversation outside the booking: nothing logged, the provider's
              app never knew, and both parties' numbers were exposed. */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() =>
              navigation.navigate('CallScreen', {
                bookingId,
                counterpartName: provider?.name,
                counterpartImage: provider?.image,
              })
            }
            accessibilityLabel={`Call ${provider.name}`}
          >
            <Ionicons name="call-outline" size={18} color={C.ink} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() =>
              navigation.navigate('ProviderChatScreen', {
                bookingId,
                counterpartName: provider?.name,
              })
            }
            accessibilityLabel={`Message ${provider.name}`}
          >
            <Ionicons name="chatbubble-outline" size={18} color={C.ink} />
          </TouchableOpacity>
        </View>

        {isProviderNearby && (
          <Button
            label="They've arrived"
            onPress={() => {
              cleanup();
              dispatch(clearTrackingState());
              navigation.navigate('serviceStatus', { category, bookingId });
            }}
            style={styles.arrived}
          />
        )}
      </View>

      <ActionSheet
        visible={showStopSheet}
        title="Stop tracking?"
        message="You can pick it back up from the booking at any time."
        cancelLabel="Keep tracking"
        onClose={() => setShowStopSheet(false)}
        options={[
          {
            label: 'Stop tracking',
            icon: 'close-circle-outline',
            tone: 'destructive',
            onPress: stopTracking,
          },
        ]}
      />

      <ActionSheet
        visible={showPermissionSheet}
        title="Location is switched off"
        message="We need your location to show how far away your provider is."
        cancelLabel="Not now"
        onClose={() => setShowPermissionSheet(false)}
        options={[
          {
            label: 'Open settings',
            icon: 'settings-outline',
            onPress: () => Linking.openSettings(),
          },
        ]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    padding: GUTTER,
  },
  loadingGap: {
    marginTop: S.lg,
  },

  mapWrap: {
    flex: 1,
    backgroundColor: C.surfaceSunken,
  },
  markerOuter: {
    padding: 3,
    borderRadius: R.pill,
    backgroundColor: C.surface,
    ...E.raised,
  },
  marker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  eta: {
    position: 'absolute',
    top: S.lg,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: S.lg,
    paddingVertical: S.sm,
    borderRadius: R.pill,
    backgroundColor: C.surface,
    ...E.overlay,
  },
  etaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  etaText: {
    ...T.bodyStrong,
    color: C.ink,
    marginLeft: 6,
  },
  etaDivider: {
    width: StyleSheet.hairlineWidth,
    height: 16,
    backgroundColor: C.line,
    marginHorizontal: S.md,
  },

  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: R.sheet,
    borderTopRightRadius: R.sheet,
    paddingHorizontal: GUTTER,
    paddingTop: S.lg,
    ...E.overlay,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerInfo: {
    flex: 1,
    marginHorizontal: S.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerName: {
    ...T.subhead,
    color: C.ink,
    marginRight: S.xs,
    flexShrink: 1,
  },
  meta: {
    ...T.caption,
    color: C.inkMuted,
    marginTop: 2,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: R.chip,
    backgroundColor: C.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: S.sm,
  },
  arrived: {
    marginTop: S.lg,
  },
});
