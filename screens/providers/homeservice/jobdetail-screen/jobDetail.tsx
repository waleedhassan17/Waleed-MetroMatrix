import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootState } from '../../../../store/store';
import { setJobDetail, startNavigation, JobData } from './jobDetailSlice';
import { setNavigationData } from '../map-screen/mapSlice';

const { width } = Dimensions.get('window');

// Define navigation types
type RootStackParamList = {
  JobDetail: { job: JobData };
  NavigationMap: undefined;
};

type JobDetailScreenRouteProp = RouteProp<RootStackParamList, 'JobDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const JobDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
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
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Loading job details...</Text>
      </View>
    );
  }

  const handleStartNavigation = () => {
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

  const handleCallCustomer = () => {
    if (currentJob.customerPhone && currentJob.customerPhone !== 'N/A') {
      Linking.openURL(`tel:${currentJob.customerPhone}`);
    }
  };

  const handleMessageCustomer = () => {
    if (currentJob.customerPhone && currentJob.customerPhone !== 'N/A') {
      Linking.openURL(`sms:${currentJob.customerPhone}`);
    }
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

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      'Plumbing': 'pipe-wrench',
      'HVAC': 'air-conditioner',
      'Electrical': 'lightning-bolt',
      'Cleaning': 'broom',
      'Painting': 'format-paint',
      'Carpentry': 'hammer',
      'Appliance': 'washing-machine',
      'Wiring': 'cable-data',
      'Installation': 'tools',
      'default': 'wrench',
    };
    return icons[category] || icons['default'];
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: { bg: string; text: string; border: string } } = {
      'Plumbing': { bg: '#EFF6FF', text: '#3B82F6', border: '#BFDBFE' },
      'HVAC': { bg: '#ECFDF5', text: '#10B981', border: '#A7F3D0' },
      'Electrical': { bg: '#FEF3C7', text: '#F59E0B', border: '#FDE68A' },
      'Cleaning': { bg: '#F3E8FF', text: '#9333EA', border: '#DDD6FE' },
      'Painting': { bg: '#FCE7F3', text: '#EC4899', border: '#FBCFE8' },
      'default': { bg: '#F3F4F6', text: '#6B7280', border: '#E5E7EB' },
    };
    return colors[category] || colors['default'];
  };

  const categoryColors = getCategoryColor(currentJob.category);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-left" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Details</Text>
        <View style={styles.headerRight} />
      </View>

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
                <Icon name="check-decagram" size={18} color="#10B981" />
              </View>
              <Text style={styles.serviceTypeText}>{currentJob.serviceType}</Text>
              <View style={styles.badgesRow}>
                <View style={[styles.categoryBadge, { backgroundColor: categoryColors.bg, borderColor: categoryColors.border }]}>
                  <Icon name={getCategoryIcon(currentJob.category)} size={14} color={categoryColors.text} />
                  <Text style={[styles.categoryText, { color: categoryColors.text }]}>{currentJob.category}</Text>
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
              <View style={[styles.contactIconBg, { backgroundColor: '#ECFDF5' }]}>
                <Icon name="phone" size={20} color="#10B981" />
              </View>
              <Text style={styles.contactButtonText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.contactButton}
              onPress={handleMessageCustomer}
            >
              <View style={[styles.contactIconBg, { backgroundColor: '#EFF6FF' }]}>
                <Icon name="message-text" size={20} color="#3B82F6" />
              </View>
              <Text style={styles.contactButtonText}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.contactButton}
              onPress={openInMaps}
            >
              <View style={[styles.contactIconBg, { backgroundColor: '#FEF3C7' }]}>
                <Icon name="directions" size={20} color="#F59E0B" />
              </View>
              <Text style={styles.contactButtonText}>Directions</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Service Location Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconBg, { backgroundColor: '#FEF3C7' }]}>
              <Icon name="map-marker" size={20} color="#F59E0B" />
            </View>
            <Text style={styles.sectionTitle}>Service Location</Text>
          </View>
          <TouchableOpacity style={styles.locationCard} onPress={openInMaps} activeOpacity={0.7}>
            <View style={styles.locationIconContainer}>
              <Icon name="navigation-variant" size={20} color="#F59E0B" />
            </View>
            <View style={styles.locationDetails}>
              <Text style={styles.locationLabel}>Selected Address</Text>
              <Text style={styles.locationAddress}>{currentJob.address}</Text>
              <Text style={styles.locationCity}>{currentJob.city}</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#9CA3AF" />
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
                <Icon name="map-marker" size={36} color="#10B981" />
              </View>
            </Marker>
          </MapView>
          <TouchableOpacity style={styles.mapOverlay} onPress={openInMaps}>
            <Icon name="google-maps" size={16} color="#FFFFFF" />
            <Text style={styles.mapOverlayText}>Open in Maps</Text>
          </TouchableOpacity>
        </View>

        {/* Schedule Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconBg, { backgroundColor: '#FCE7F3' }]}>
              <Icon name="calendar-month" size={20} color="#EC4899" />
            </View>
            <Text style={styles.sectionTitle}>Scheduled Date</Text>
          </View>
          <View style={styles.scheduleCard}>
            <View style={styles.scheduleIconContainer}>
              <Icon name="calendar-check" size={22} color="#EC4899" />
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
            <View style={[styles.sectionIconBg, { backgroundColor: '#ECFDF5' }]}>
              <Icon name="clock-outline" size={20} color="#10B981" />
            </View>
            <Text style={styles.sectionTitle}>Scheduled Time</Text>
          </View>
          <View style={styles.timeContainer}>
            <Text style={styles.timeOfDayLabel}>
              <Icon name={getTimeIcon(currentJob.time)} size={16} color="#6B7280" />
              {'  '}{getTimeOfDay(currentJob.time)}
            </Text>
            <View style={styles.selectedTimeCard}>
              <Icon name="clock-check" size={22} color="#10B981" />
              <Text style={styles.selectedTimeText}>{currentJob.time}</Text>
            </View>
          </View>
        </View>

        {/* Special Instructions */}
        {currentJob.specialInstructions && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconBg, { backgroundColor: '#FEF3C7' }]}>
                <Icon name="message-text-outline" size={20} color="#F59E0B" />
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
            <View style={[styles.sectionIconBg, { backgroundColor: '#FEF3C7' }]}>
              <Icon name="file-document-outline" size={20} color="#F59E0B" />
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
              <Icon name="cash-multiple" size={24} color="#10B981" />
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
          <Icon name="navigation" size={22} color="#FFFFFF" />
          <Text style={styles.navigateButtonText}>Start Navigation</Text>
          <Icon name="chevron-right" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#6B7280',
    fontFamily: 'Inter-Medium',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  headerRight: {
    width: 44,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  
  // Customer Card Styles
  customerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderTopWidth: 4,
    shadowColor: '#000',
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
    fontSize: 28,
    fontFamily: 'Inter-Bold',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    borderWidth: 3,
    borderColor: '#FFFFFF',
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
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginRight: 6,
  },
  serviceTypeText: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
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
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#10B981',
    fontFamily: 'Inter-SemiBold',
  },
  contactActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
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
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter-Medium',
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
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },

  // Location Card
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  locationIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationDetails: {
    flex: 1,
    marginLeft: 12,
  },
  locationLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'Inter-Medium',
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  locationCity: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    marginTop: 2,
  },

  // Map Styles
  mapContainer: {
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#E5E7EB',
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
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 6,
  },

  // Schedule Card
  scheduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  scheduleIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FCE7F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleDetails: {
    flex: 1,
    marginLeft: 12,
  },
  scheduleLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'Inter-Medium',
    marginBottom: 2,
  },
  scheduleValue: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },

  // Time Container
  timeContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  timeOfDayLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: 'Inter-Medium',
    marginBottom: 12,
  },
  selectedTimeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  selectedTimeText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
    marginLeft: 10,
  },

  // Instructions Card
  instructionsCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  instructionsText: {
    fontSize: 14,
    color: '#92400E',
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
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
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
  },
  summaryValue: {
    fontSize: 14,
    color: '#1F2937',
    fontFamily: 'Inter-SemiBold',
    maxWidth: '60%',
    textAlign: 'right',
  },
  summaryPriceValue: {
    fontSize: 15,
    color: '#10B981',
    fontFamily: 'Inter-Bold',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },

  // Earnings Card
  earningsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#A7F3D0',
  },
  earningsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  earningsTextContainer: {
    marginLeft: 12,
  },
  earningsLabel: {
    fontSize: 15,
    color: '#065F46',
    fontFamily: 'Inter-SemiBold',
  },
  earningsSubtext: {
    fontSize: 12,
    color: '#10B981',
    fontFamily: 'Inter-Regular',
    marginTop: 2,
  },
  earningsValue: {
    fontSize: 22,
    color: '#10B981',
    fontFamily: 'Inter-Bold',
  },

  // Bottom Container
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  navigateButtonText: {
    fontSize: 17,
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
    marginHorizontal: 10,
  },
});

export default JobDetailScreen;