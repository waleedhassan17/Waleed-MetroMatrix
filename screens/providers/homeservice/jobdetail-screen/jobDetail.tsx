import React, { useEffect, useState, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  Platform,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { RootState } from '../../../../store/store';
import { setJobDetail, startNavigation, startJobAsync, JobData } from './jobDetailSlice';
import { setNavigationData } from '../map-screen/mapSlice';
import { categoryAccent, HS } from '../../../../constants/HomeServiceTheme';
import { C, F, T } from '../../../../constants/theme';
import { ThemeColors, useTheme } from '../../../../theme';
import { makeProviderTheme, type ProviderTheme } from '../providerTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBar, Screen } from '../../../../components/ui';

const { width } = Dimensions.get('window');

// Define navigation types
type RootStackParamList = {
  JobDetail: { job: JobData };
  NavigationMap: undefined;
  ProviderJobChat: { bookingId: string; customerName?: string };
  ProviderCallScreen: {
    bookingId: string;
    customerName?: string;
    customerPhone?: string;
    customerImage?: string;
  };
};

type JobDetailScreenRouteProp = RouteProp<RootStackParamList, 'JobDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const JobDetailScreen: React.FC = () => {
  const { colors, mode } = useTheme();
  const theme = useMemo(() => makeProviderTheme(colors), [colors]);
  const styles = useMemo(() => makeStyles(colors, theme), [colors, theme]);

  const navigation = useNavigation<NavigationProp>();
  // These screens rendered a bare View as their root, so on Android their
  // headers sat under the status bar and on notched iPhones under the
  // notch. Real insets, not StatusBar.currentHeight.
  const insets = useSafeAreaInsets();
  const route = useRoute<JobDetailScreenRouteProp>();
  const dispatch = useDispatch();
  
  const { job, isLoading } = useSelector((state: RootState) => state.jobDetail);
  
  const [mapReady, setMapReady] = useState(false);
  const currentJob = route.params?.job || job;

  useEffect(() => {
    if (route.params?.job) {
      dispatch(setJobDetail(route.params.job));
    }
  }, [route.params?.job, dispatch]);

  if (!currentJob || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading job details...</Text>
      </View>
    );
  }

  // Setting off must move the booking to EN_ROUTE, or the customer's tracking
  // screen sits on "accepted" while the provider is already driving over. This
  // dispatched only a local reducer, so the transition never happened.
  const handleStartNavigation = async () => {
    const result = await dispatch(startJobAsync(currentJob.id) as any);
    if (result?.meta?.requestStatus === 'rejected') {
      Alert.alert(
        'Could not start this job',
        (result.payload as string) || 'Please check your connection and try again.'
      );
      return;
    }

    dispatch(startNavigation());
    dispatch(setNavigationData({
      destination: currentJob.coordinates,
      destinationAddress: currentJob.address,
      destinationCity: currentJob.city,
      customerName: currentJob.customerName,
      customerPhone: currentJob.customerPhone,
      serviceType: currentJob.serviceType,
    }));
    navigation.navigate('NavigationMap');
  };

  // The chat/call room IS the booking. `bookingId` is set when the job came
  // from a real booking; `id` is the fallback for locally-shaped job objects.
  const roomId = currentJob?.bookingId || currentJob?.id;

  const handleCallCustomer = () => {
    if (!roomId) return;
    // Routed through the realtime service rather than dialling straight out, so
    // the customer's app knows a call is incoming, the attempt is logged, and
    // the busy signal applies. The audio itself flows peer-to-peer over WebRTC —
    // no native dialer is involved on either side.
    navigation.navigate('ProviderCallScreen', {
      bookingId: roomId,
      customerName: currentJob.customerName,
      customerPhone: currentJob.customerPhone,
      customerImage: currentJob.customerImage,
    });
  };

  const handleMessageCustomer = () => {
    if (!roomId) return;
    // In-app chat instead of handing off to SMS — the conversation stays
    // attached to the booking and both sides can see it.
    navigation.navigate('ProviderJobChat', {
      bookingId: roomId,
      customerName: currentJob.customerName,
    });
  };

  const openInMaps = () => {
    const { latitude, longitude } = currentJob.coordinates;
    const scheme = Platform.select({
      ios: 'maps:0,0?q=',
      android: 'geo:0,0?q=',
    });
    const latLng = `${latitude},${longitude}`;
    const label = currentJob.address;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
    });
    if (url) {
      Linking.openURL(url);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    };
    return date.toLocaleDateString('en-US', options);
  };

  const getTimeOfDay = (time: string) => {
    const hour = parseInt(time.split(':')[0]);
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  };

  const getTimeIcon = (time: string) => {
    const period = getTimeOfDay(time);
    switch (period) {
      case 'Morning': return 'weather-sunny';
      case 'Afternoon': return 'weather-partly-cloudy';
      case 'Evening': return 'weather-night';
      default: return 'clock-outline';
    }
  };

  // Both of these used to be local maps keyed on 'Plumbing' / 'HVAC' /
  // 'Cleaning' — names that are not what a category IS. A category arrives as a
  // slug ('electricians', 'plumbers', 'ac-repairers'), so neither map ever
  // matched and every job silently rendered the 'default' wrench in grey.
  //
  // categoryAccent(, mode) is the single source of truth for a category's tint and
  // glyph, and it degrades an unknown one to a readable neutral by design.
  const accent = categoryAccent(currentJob.category, mode);
  const categoryColors = { bg: accent.tintSoft, text: accent.tint, border: accent.tint };


  return (
    <Screen>
      <AppBar
        title="Job Details"
        subtitle={accent.label}
        onBack={() => navigation.goBack()}
      />

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Customer Card - Similar to Provider Card in Book Service */}
        <View style={[styles.customerCard, { borderTopColor: categoryColors.text }]}>
          <View style={styles.customerHeader}>
            <View style={styles.customerAvatarContainer}>
              {currentJob.customerImage ? (
                <Image source={{ uri: currentJob.customerImage }} style={styles.customerAvatar} />
              ) : (
                <View style={[styles.customerAvatarPlaceholder, { backgroundColor: categoryColors.bg }]}>
                  <Text style={[styles.customerInitial, { color: categoryColors.text }]}>
                    {currentJob.customerName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.onlineIndicator} />
            </View>
            <View style={styles.customerInfo}>
              <View style={styles.customerNameRow}>
                <Text style={styles.customerName}>{currentJob.customerName}</Text>
                <Icon name="check-decagram" size={18} color={colors.accent} />
              </View>
              <Text style={styles.serviceTypeText}>{currentJob.serviceType}</Text>
              <View style={styles.badgesRow}>
                <View style={[styles.categoryBadge, { backgroundColor: categoryColors.bg, borderColor: categoryColors.border }]}>
                  <Ionicons name={accent.icon as any} size={14} color={categoryColors.text} />
                  <Text style={[styles.categoryText, { color: categoryColors.text }]}>{accent.label}</Text>
                </View>
                <View style={styles.statusBadge}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>Ready to Start</Text>
                </View>
              </View>
            </View>
          </View>
          
          {/* Contact Actions */}
          <View style={styles.contactActions}>
            <TouchableOpacity 
              style={styles.contactButton}
              onPress={handleCallCustomer}
            >
              <View style={[styles.contactIconBg, { backgroundColor: colors.accentSoft }]}>
                <Icon name="phone" size={20} color={colors.accent} />
              </View>
              <Text style={styles.contactButtonText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.contactButton}
              onPress={handleMessageCustomer}
            >
              <View style={[styles.contactIconBg, { backgroundColor: colors.infoSoft }]}>
                <Icon name="message-text" size={20} color={colors.info} />
              </View>
              <Text style={styles.contactButtonText}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.contactButton}
              onPress={openInMaps}
            >
              <View style={[styles.contactIconBg, { backgroundColor: colors.warningSoft }]}>
                <Icon name="directions" size={20} color={colors.warning} />
              </View>
              <Text style={styles.contactButtonText}>Directions</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Service Location Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconBg, { backgroundColor: colors.warningSoft }]}>
              <Icon name="map-marker" size={20} color={colors.warning} />
            </View>
            <Text style={styles.sectionTitle}>Service Location</Text>
          </View>
          <TouchableOpacity style={styles.locationCard} onPress={openInMaps} activeOpacity={0.7}>
            <View style={styles.locationIconContainer}>
              <Icon name="navigation-variant" size={20} color={colors.warning} />
            </View>
            <View style={styles.locationDetails}>
              <Text style={styles.locationLabel}>Selected Address</Text>
              <Text style={styles.locationAddress}>{currentJob.address}</Text>
              <Text style={styles.locationCity}>{currentJob.city}</Text>
            </View>
            <Icon name="chevron-right" size={24} color={colors.inkFaint} />
          </TouchableOpacity>
        </View>

        {/* Map Preview */}
        <View style={styles.mapContainer}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={{
              latitude: currentJob.coordinates.latitude,
              longitude: currentJob.coordinates.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            onMapReady={() => setMapReady(true)}
          >
            <Marker
              coordinate={{
                latitude: currentJob.coordinates.latitude,
                longitude: currentJob.coordinates.longitude,
              }}
            >
              <View style={styles.mapMarker}>
                <Icon name="map-marker" size={36} color={colors.accent} />
              </View>
            </Marker>
          </MapView>
          <TouchableOpacity style={styles.mapOverlay} onPress={openInMaps}>
            <Icon name="google-maps" size={16} color={colors.surface} />
            <Text style={styles.mapOverlayText}>Open in Maps</Text>
          </TouchableOpacity>
        </View>

        {/* Schedule Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconBg, { backgroundColor: colors.infoSoft }]}>
              <Icon name="calendar-month" size={20} color={colors.info} />
            </View>
            <Text style={styles.sectionTitle}>Scheduled Date</Text>
          </View>
          <View style={styles.scheduleCard}>
            <View style={styles.scheduleIconContainer}>
              <Icon name="calendar-check" size={22} color={colors.info} />
            </View>
            <View style={styles.scheduleDetails}>
              <Text style={styles.scheduleLabel}>Appointment Date</Text>
              <Text style={styles.scheduleValue}>{formatDate(currentJob.date)}</Text>
            </View>
          </View>
        </View>

        {/* Time Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconBg, { backgroundColor: colors.accentSoft }]}>
              <Icon name="clock-outline" size={20} color={colors.accent} />
            </View>
            <Text style={styles.sectionTitle}>Scheduled Time</Text>
          </View>
          <View style={styles.timeContainer}>
            <Text style={styles.timeOfDayLabel}>
              <Icon name={getTimeIcon(currentJob.time)} size={16} color={colors.inkMuted} />
              {'  '}{getTimeOfDay(currentJob.time)}
            </Text>
            <View style={styles.selectedTimeCard}>
              <Icon name="clock-check" size={22} color={colors.accent} />
              <Text style={styles.selectedTimeText}>{currentJob.time}</Text>
            </View>
          </View>
        </View>

        {/* Special Instructions */}
        {currentJob.specialInstructions && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconBg, { backgroundColor: colors.warningSoft }]}>
                <Icon name="message-text-outline" size={20} color={colors.warning} />
              </View>
              <Text style={styles.sectionTitle}>Special Instructions</Text>
            </View>
            <View style={styles.instructionsCard}>
              <Text style={styles.instructionsText}>{currentJob.specialInstructions}</Text>
            </View>
          </View>
        )}

        {/* Booking Summary */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconBg, { backgroundColor: colors.warningSoft }]}>
              <Icon name="file-document-outline" size={20} color={colors.warning} />
            </View>
            <Text style={styles.sectionTitle}>Booking Summary</Text>
          </View>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Service Type</Text>
              <Text style={styles.summaryValue}>{currentJob.serviceType}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Category</Text>
              <Text style={styles.summaryValue}>{currentJob.category}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Customer</Text>
              <Text style={styles.summaryValue}>{currentJob.customerName}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Phone</Text>
              <Text style={styles.summaryValue}>{currentJob.customerPhone}</Text>
            </View>
            {currentJob.estimatedPrice && (
              <>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Estimated Price</Text>
                  <Text style={styles.summaryPriceValue}>Rs {currentJob.estimatedPrice.toLocaleString()}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Estimated Earnings Card */}
        {currentJob.estimatedPrice && (
          <View style={styles.earningsCard}>
            <View style={styles.earningsInfo}>
              <Icon name="cash-multiple" size={24} color={colors.accent} />
              <View style={styles.earningsTextContainer}>
                <Text style={styles.earningsLabel}>Estimated Earnings</Text>
                <Text style={styles.earningsSubtext}>After platform fee (10%)</Text>
              </View>
            </View>
            <Text style={styles.earningsValue}>
              Rs {Math.round(currentJob.estimatedPrice * 0.9).toLocaleString()}
            </Text>
          </View>
        )}

        {/* Bottom Padding */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Action */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={styles.navigateButton}
          onPress={handleStartNavigation}
          activeOpacity={0.85}
        >
          <Icon name="navigation" size={22} color={colors.surface} />
          <Text style={styles.navigateButtonText}>Start Navigation</Text>
          <Icon name="chevron-right" size={22} color={colors.surface} />
        </TouchableOpacity>
      </View>
    </Screen>
  );
};

const makeStyles = (c: ThemeColors, theme: ProviderTheme) => StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: c.lineSoft,
  },
  loadingText: {
    marginTop: 12,
    ...T.body,

    color: c.inkMuted,
    fontFamily: F.medium,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  
  // Customer Card Styles
  customerCard: {
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderTopWidth: 4,
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  customerHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  customerAvatarContainer: {
    position: 'relative',
  },
  customerAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  customerAvatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerInitial: {
    ...T.title,
    fontFamily: F.bold,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: c.accent,
    borderWidth: 3,
    borderColor: c.surface,
  },
  customerInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  customerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  customerName: {
    ...T.subhead,
    fontFamily: F.bold,
    color: c.ink,
    marginRight: 6,
  },
  serviceTypeText: {
    ...T.body,

    color: c.inkMuted,
    fontFamily: F.regular,
    marginBottom: 8,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryText: {
    ...T.caption,
    fontFamily: F.semibold,
    marginLeft: 5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.accent,
    marginRight: 6,
  },
  statusText: {
    ...T.caption,

    color: c.accent,
    fontFamily: F.semibold,
  },
  contactActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: c.lineSoft,
  },
  contactButton: {
    alignItems: 'center',
  },
  contactIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  contactButtonText: {
    ...T.caption,

    color: c.inkMuted,
    fontFamily: F.medium,
  },

  // Section Styles
  sectionContainer: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    ...T.subhead,
    fontFamily: F.semibold,
    color: c.ink,
  },

  // Location Card
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  locationIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: c.warningSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationDetails: {
    flex: 1,
    marginLeft: 12,
  },
  locationLabel: {
    ...T.caption,

    color: c.inkFaint,
    fontFamily: F.medium,
    marginBottom: 2,
  },
  locationAddress: {
    ...T.body,
    fontFamily: F.semibold,
    color: c.ink,
  },
  locationCity: {
    ...T.label,
    color: c.inkMuted,
    fontFamily: F.regular,
    marginTop: 2,
  },

  // Map Styles
  mapContainer: {
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: c.line,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  mapOverlayText: {
    color: c.inkInverse,
    ...T.caption,
    fontFamily: F.semibold,
    marginLeft: 6,
  },

  // Schedule Card
  scheduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  scheduleIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: c.infoSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleDetails: {
    flex: 1,
    marginLeft: 12,
  },
  scheduleLabel: {
    ...T.caption,

    color: c.inkFaint,
    fontFamily: F.medium,
    marginBottom: 2,
  },
  scheduleValue: {
    ...T.body,
    fontFamily: F.semibold,
    color: c.ink,
  },

  // Time Container
  timeContainer: {
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  timeOfDayLabel: {
    ...T.label,
    color: c.inkMuted,
    fontFamily: F.medium,
    marginBottom: 12,
  },
  selectedTimeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.accentSoft,
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: c.accent,
  },
  selectedTimeText: {
    ...T.subhead,
    fontFamily: F.bold,
    color: c.accent,
    marginLeft: 10,
  },

  // Instructions Card
  instructionsCard: {
    backgroundColor: c.warningSoft,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: c.warningSoft,
  },
  instructionsText: {
    ...T.body,

    color: c.warning,
    fontFamily: F.regular,
    lineHeight: 22,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  summaryLabel: {
    ...T.body,

    color: c.inkMuted,
    fontFamily: F.regular,
  },
  summaryValue: {
    ...T.body,

    color: c.ink,
    fontFamily: F.semibold,
    maxWidth: '60%',
    textAlign: 'right',
  },
  summaryPriceValue: {
    ...T.body,

    color: c.accent,
    fontFamily: F.bold,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: c.lineSoft,
  },

  // Earnings Card
  earningsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.accentSoft,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: c.accentLine,
  },
  earningsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  earningsTextContainer: {
    marginLeft: 12,
  },
  earningsLabel: {
    ...T.body,

    color: c.accentDeep,
    fontFamily: F.semibold,
  },
  earningsSubtext: {
    ...T.caption,

    color: c.accent,
    fontFamily: F.regular,
    marginTop: 2,
  },
  earningsValue: {
    ...T.heading,
    color: c.accent,
    fontFamily: F.bold,
  },

  // Bottom Container
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: c.surface,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: c.line,
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.accent,
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: c.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  navigateButtonText: {
    ...T.subhead,
    color: c.inkInverse,
    fontFamily: F.semibold,
    marginHorizontal: 10,
  },
});

export default JobDetailScreen;