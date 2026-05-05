import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Animated,
  StatusBar,
  SafeAreaView,
  Modal,
  Image,
  Dimensions,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { Colors } from '../../../../constants/Colors';
import { Fonts } from '../../../../constants/Fonts';
import {
  fetchBookingData,
  submitBooking,
  setSelectedDate,
  setSelectedTime,
  setSelectedAddress,
  setInstructions,
  selectIsFormValid,
  selectBookingSummary,
  SavedAddress,
  TimeSlot,
} from './bookingScreenSlice';
import { RootState, AppDispatch } from '../../../../store/store';

const { width, height } = Dimensions.get('window');
const isAndroid = Platform.OS === 'android';

// Service type configurations - matching ProviderProfileScreen
const SERVICE_CONFIG: Record<string, {
  gradient: string[];
  lightGradient: string[];
  accentColor: string;
  icon: string;
}> = {
  electricians: {
    gradient: ['#F59E0B', '#D97706'],
    lightGradient: ['#FEF3C7', '#FDE68A'],
    accentColor: '#F59E0B',
    icon: 'flash',
  },
  plumbers: {
    gradient: ['#3B82F6', '#2563EB'],
    lightGradient: ['#DBEAFE', '#BFDBFE'],
    accentColor: '#3B82F6',
    icon: 'water',
  },
  'ac-repairers': {
    gradient: ['#06B6D4', '#0891B2'],
    lightGradient: ['#CFFAFE', '#A5F3FC'],
    accentColor: '#06B6D4',
    icon: 'snow',
  },
};

type BookingScreenRouteParams = {
  providerId: string;
  category?: 'electricians' | 'plumbers' | 'ac-repairers';
};

export default function BookingScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: BookingScreenRouteParams }, 'params'>>();
  const dispatch = useDispatch<AppDispatch>();

  const { providerId, category = 'ac-repairers' } = route.params || {};

  // Redux state
  const provider = useSelector((state: RootState) => state.booking?.provider);
  const savedAddresses = useSelector((state: RootState) => state.booking?.savedAddresses) || [];
  const timeSlots = useSelector((state: RootState) => state.booking?.timeSlots) || [];
  const selectedDate = useSelector((state: RootState) => state.booking?.selectedDate) || '';
  const selectedTime = useSelector((state: RootState) => state.booking?.selectedTime) || '';
  const selectedAddress = useSelector((state: RootState) => state.booking?.selectedAddress);
  const instructions = useSelector((state: RootState) => state.booking?.instructions) || '';
  const isLoading = useSelector((state: RootState) => state.booking?.isLoading);
  const isSubmitting = useSelector((state: RootState) => state.booking?.isSubmitting);
  const isFormValid = useSelector(selectIsFormValid);
  const bookingSummary = useSelector(selectBookingSummary);

  // Local state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [date, setDate] = useState(new Date());
  const [isReady, setIsReady] = useState(false); // Track if animations are ready

  // Animation references - initialize to HIDDEN state (will animate in)
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const heroAnim = useRef(new Animated.Value(0)).current;
  
  // Separate animation for loading state
  const loadingFadeAnim = useRef(new Animated.Value(1)).current;

  const serviceConfig = SERVICE_CONFIG[category] || SERVICE_CONFIG['ac-repairers'];

  // Callbacks - must be before any conditional returns
  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleContinue = useCallback(() => {
    if (!isFormValid || !bookingSummary) return;
    dispatch(submitBooking(bookingSummary));
    // @ts-ignore
    navigation.navigate('BookConfirmation', { category });
  }, [dispatch, isFormValid, bookingSummary, navigation, category]);

  const handleDateChange = useCallback((event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
      const formattedDate = selectedDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      dispatch(setSelectedDate(formattedDate));
    }
  }, [dispatch]);

  const handleTimeSelect = useCallback((time: string) => {
    dispatch(setSelectedTime(time));
  }, [dispatch]);

  const handleAddressSelect = useCallback((address: SavedAddress) => {
    dispatch(setSelectedAddress(address));
    setShowAddressModal(false);
  }, [dispatch]);

  const handleInstructionsChange = useCallback((text: string) => {
    dispatch(setInstructions(text));
  }, [dispatch]);

  // Function to run entrance animations
  const runEntranceAnimations = useCallback(() => {
    // Reset all animation values first
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    scaleAnim.setValue(0.95);
    heroAnim.setValue(0);

    // Run animations in parallel
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
      Animated.timing(heroAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, scaleAnim, heroAnim]);

  // Handle focus effect - fetch data and prepare for animations
  useFocusEffect(
    useCallback(() => {
      // Reset ready state when screen gains focus
      setIsReady(false);
      
      // Ensure loading animation is visible
      loadingFadeAnim.setValue(1);

      // Fetch data on focus
      const validCategory = ['electricians', 'plumbers', 'ac-repairers'].includes(category) 
        ? category 
        : 'ac-repairers';
      
      dispatch(fetchBookingData({ 
        providerId: providerId || 'default', 
        category: validCategory as 'electricians' | 'plumbers' | 'ac-repairers' 
      }));

      // Cleanup when screen loses focus
      return () => {
        // Reset animations to initial hidden state for next focus
        fadeAnim.setValue(0);
        slideAnim.setValue(30);
        scaleAnim.setValue(0.95);
        heroAnim.setValue(0);
        setIsReady(false);
      };
    }, [providerId, category, dispatch, fadeAnim, slideAnim, scaleAnim, heroAnim, loadingFadeAnim])
  );

  // Run entrance animations when data is loaded
  useEffect(() => {
    if (!isLoading && provider && !isReady) {
      // Small delay to ensure render is complete
      const timer = setTimeout(() => {
        setIsReady(true);
        runEntranceAnimations();
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, provider, isReady, runEntranceAnimations]);

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
            <Text style={styles.loadingText}>Loading...</Text>
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

          <Text style={styles.headerTitle}>Book Service</Text>

          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const renderProviderCard = () => (
    <Animated.View
      style={[
        styles.providerCard,
        {
          opacity: heroAnim,
          transform: [
            {
              scale: heroAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.9, 1],
              }),
            },
          ],
        },
      ]}
    >
      <LinearGradient
        colors={[`${serviceConfig.accentColor}08`, 'transparent']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.cardGradientOverlay}
      />

      <LinearGradient
        colors={serviceConfig.gradient as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.cardTopAccent}
      />

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

          {provider.isOnline && (
            <View style={styles.onlineIndicator}>
              <View style={styles.onlineDot} />
            </View>
          )}
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
              <Text style={styles.reviewsText}>({provider.reviews})</Text>
            </LinearGradient>

            <View style={[styles.experienceBadge, { backgroundColor: `${serviceConfig.accentColor}12` }]}>
              <Feather name="award" size={12} color={serviceConfig.accentColor} />
              <Text style={[styles.experienceText, { color: serviceConfig.accentColor }]}>
                {provider.experience}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.serviceHighlights}>
        <View style={styles.highlightItem}>
          <Ionicons name="location-outline" size={16} color={serviceConfig.accentColor} />
          <Text style={styles.highlightText}>Will visit your location</Text>
        </View>
        <View style={styles.highlightItem}>
          <Ionicons name="time-outline" size={16} color={serviceConfig.accentColor} />
          <Text style={styles.highlightText}>Response time: {provider.responseTime}</Text>
        </View>
      </View>
    </Animated.View>
  );

  const renderAddressSection = () => (
    <Animated.View
      style={[
        styles.section,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.sectionHeader}>
        <LinearGradient
          colors={serviceConfig.lightGradient as [string, string]}
          style={styles.sectionIconBg}
        >
          <Ionicons name="location" size={20} color={serviceConfig.accentColor} />
        </LinearGradient>
        <Text style={styles.sectionTitle}>Service Location</Text>
      </View>

      <TouchableOpacity
        style={styles.addressSelector}
        onPress={() => setShowAddressModal(true)}
        activeOpacity={0.8}
      >
        <View style={styles.addressContent}>
          <View style={[styles.addressIconBg, { backgroundColor: `${serviceConfig.accentColor}12` }]}>
            <Ionicons name="navigate" size={18} color={serviceConfig.accentColor} />
          </View>
          <View style={styles.addressTextContainer}>
            <Text style={styles.addressLabel}>Selected Address</Text>
            <Text
              style={[
                styles.addressText,
                !selectedAddress && styles.placeholderText,
              ]}
              numberOfLines={1}
            >
              {selectedAddress?.address || 'Choose your service location'}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
      </TouchableOpacity>
    </Animated.View>
  );

  const renderDateSection = () => (
    <Animated.View
      style={[
        styles.section,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.sectionHeader}>
        <LinearGradient
          colors={['#FCE7F3', '#FBCFE8']}
          style={styles.sectionIconBg}
        >
          <Ionicons name="calendar" size={20} color="#EC4899" />
        </LinearGradient>
        <Text style={styles.sectionTitle}>Select Date</Text>
      </View>

      <TouchableOpacity
        style={styles.dateSelector}
        onPress={() => setShowDatePicker(true)}
        activeOpacity={0.8}
      >
        <View style={styles.dateSelectorContent}>
          <View style={styles.dateIconBg}>
            <Ionicons name="calendar-outline" size={18} color="#EC4899" />
          </View>
          <Text
            style={[
              styles.dateSelectorText,
              !selectedDate && styles.placeholderText,
            ]}
          >
            {selectedDate || 'Choose a date'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}
    </Animated.View>
  );

  const renderTimeSection = () => {
    const morningSlots = timeSlots.filter((s) => s.period === 'morning');
    const afternoonSlots = timeSlots.filter((s) => s.period === 'afternoon');
    const eveningSlots = timeSlots.filter((s) => s.period === 'evening');

    const renderTimeSlotGroup = (slots: TimeSlot[], label: string, icon: string) => (
      <View style={styles.timeSlotGroup}>
        <View style={styles.timeSlotGroupHeader}>
          <Ionicons name={icon as any} size={14} color="#64748B" />
          <Text style={styles.timeSlotGroupLabel}>{label}</Text>
        </View>
        <View style={styles.timeSlotGrid}>
          {slots.map((slot) => {
            const isSelected = selectedTime === slot.time;
            const isDisabled = !slot.available;

            return (
              <TouchableOpacity
                key={slot.id}
                style={[
                  styles.timeSlot,
                  isSelected && { backgroundColor: serviceConfig.accentColor, borderColor: serviceConfig.accentColor },
                  isDisabled && styles.disabledTimeSlot,
                ]}
                onPress={() => !isDisabled && handleTimeSelect(slot.time)}
                activeOpacity={isDisabled ? 1 : 0.8}
                disabled={isDisabled}
              >
                <Text
                  style={[
                    styles.timeSlotText,
                    isSelected && styles.selectedTimeSlotText,
                    isDisabled && styles.disabledTimeSlotText,
                  ]}
                >
                  {slot.time}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );

    return (
      <Animated.View
        style={[
          styles.section,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.sectionHeader}>
          <LinearGradient
            colors={['#D1FAE5', '#A7F3D0']}
            style={styles.sectionIconBg}
          >
            <Ionicons name="time" size={20} color="#10B981" />
          </LinearGradient>
          <Text style={styles.sectionTitle}>Select Time</Text>
        </View>

        {renderTimeSlotGroup(morningSlots, 'Morning', 'sunny-outline')}
        {renderTimeSlotGroup(afternoonSlots, 'Afternoon', 'partly-sunny-outline')}
        {renderTimeSlotGroup(eveningSlots, 'Evening', 'moon-outline')}
      </Animated.View>
    );
  };

  const renderInstructionsSection = () => (
    <Animated.View
      style={[
        styles.section,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.sectionHeader}>
        <LinearGradient
          colors={['#FEF3C7', '#FDE68A']}
          style={styles.sectionIconBg}
        >
          <Ionicons name="chatbubble-ellipses" size={20} color="#F59E0B" />
        </LinearGradient>
        <Text style={styles.sectionTitle}>Special Instructions</Text>
        <Text style={styles.sectionOptional}>(Optional)</Text>
      </View>

      <View style={styles.instructionsContainer}>
        <TextInput
          style={styles.instructionsInput}
          placeholder="Describe your issue or any specific requirements..."
          placeholderTextColor="#94A3B8"
          value={instructions}
          onChangeText={handleInstructionsChange}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>
    </Animated.View>
  );

  const renderSummarySection = () => (
    <Animated.View
      style={[
        styles.summarySection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.summaryHeader}>
        <LinearGradient
          colors={serviceConfig.lightGradient as [string, string]}
          style={styles.sectionIconBg}
        >
          <Ionicons name="receipt" size={20} color={serviceConfig.accentColor} />
        </LinearGradient>
        <Text style={styles.sectionTitle}>Booking Summary</Text>
      </View>
      {/* Add your summary content here */}
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {renderHeader()}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderProviderCard()}
        {renderAddressSection()}
        {renderDateSection()}
        {renderTimeSection()}
        {renderInstructionsSection()}
        {renderSummarySection()}
      </ScrollView>

      {/* Continue Button */}
      <Animated.View
        style={[
          styles.bottomBar,
          {
            opacity: fadeAnim,
            transform: [{ translateY: Animated.multiply(slideAnim, -1) }],
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.continueButton,
            !isFormValid && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!isFormValid || isSubmitting}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={isFormValid ? serviceConfig.gradient as [string, string] : ['#CBD5E1', '#94A3B8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.continueButtonGradient}
          >
            <Text style={styles.continueButtonText}>
              {isSubmitting ? 'Processing...' : 'Continue'}
            </Text>
            {!isSubmitting && (
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            )}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Address Selection Modal */}
      <Modal
        visible={showAddressModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddressModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Address</Text>
              <TouchableOpacity
                onPress={() => setShowAddressModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.addressList}>
              {savedAddresses.map((address) => (
                <TouchableOpacity
                  key={address.id}
                  style={[
                    styles.addressItem,
                    selectedAddress?.id === address.id && styles.selectedAddressItem,
                  ]}
                  onPress={() => handleAddressSelect(address)}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.addressItemIcon,
                    { backgroundColor: `${serviceConfig.accentColor}12` }
                  ]}>
                    <Ionicons
                      name={address.icon === 'home' ? 'home' : address.icon === 'building' ? 'business' : 'location'}
                      size={20}
                      color={serviceConfig.accentColor}
                    />
                  </View>
                  <View style={styles.addressItemContent}>
                    <Text style={styles.addressItemLabel}>{address.label}</Text>
                    <Text style={styles.addressItemText} numberOfLines={2}>
                      {address.address}
                    </Text>
                  </View>
                  {selectedAddress?.id === address.id && (
                    <Ionicons name="checkmark-circle" size={24} color={serviceConfig.accentColor} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Add your styles here - keeping the same styles from the original file
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
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  header: {
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  providerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginTop: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  cardTopAccent: {
    height: 4,
  },
  providerContent: {
    flexDirection: 'row',
    padding: 16,
  },
  providerImageContainer: {
    position: 'relative',
  },
  providerImageRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    padding: 3,
  },
  providerImageInner: {
    flex: 1,
    borderRadius: 33,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  providerImage: {
    width: '100%',
    height: '100%',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
  },
  providerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  providerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  verifiedBadge: {
    marginLeft: 6,
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
  reviewsText: {
    fontSize: 11,
    color: '#B45309',
  },
  experienceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  experienceText: {
    fontSize: 12,
    fontWeight: '500',
  },
  serviceHighlights: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  highlightText: {
    fontSize: 13,
    color: '#64748B',
  },
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 10,
  },
  sectionOptional: {
    fontSize: 13,
    color: '#94A3B8',
    marginLeft: 6,
  },
  addressSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  addressContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  addressLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 2,
  },
  addressText: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
  placeholderText: {
    color: '#94A3B8',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  dateSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FCE7F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateSelectorText: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
    marginLeft: 12,
  },
  timeSlotGroup: {
    marginBottom: 16,
  },
  timeSlotGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  timeSlotGroupLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  timeSlotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlot: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  disabledTimeSlot: {
    backgroundColor: '#F8FAFC',
    borderColor: '#F1F5F9',
  },
  timeSlotText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  selectedTimeSlotText: {
    color: '#FFFFFF',
  },
  disabledTimeSlotText: {
    color: '#CBD5E1',
  },
  instructionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  instructionsInput: {
    padding: 12,
    fontSize: 14,
    color: '#1E293B',
    minHeight: 100,
  },
  summarySection: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  continueButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  continueButtonDisabled: {
    opacity: 0.7,
  },
  continueButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  modalCloseButton: {
    padding: 4,
  },
  addressList: {
    padding: 16,
  },
  addressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedAddressItem: {
    borderColor: '#06B6D4',
    backgroundColor: '#ECFEFF',
  },
  addressItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  addressItemLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  addressItemText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
});