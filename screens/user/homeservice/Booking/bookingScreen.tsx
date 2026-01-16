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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
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

  // Animation references
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const heroAnim = useRef(new Animated.Value(0)).current;

  const serviceConfig = SERVICE_CONFIG[category] || SERVICE_CONFIG['ac-repairers'];

  // Callbacks - must be before any conditional returns
  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleContinue = useCallback(() => {
    if (!isFormValid || !bookingSummary) return;
    dispatch(submitBooking(bookingSummary));
    // @ts-ignore
    navigation.navigate('bookConfirmation');
  }, [dispatch, isFormValid, bookingSummary, navigation]);

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

  // Effects
  useEffect(() => {
    // Ensure category is valid, fallback to 'ac-repairers' if not
    const validCategory = ['electricians', 'plumbers', 'ac-repairers'].includes(category) 
      ? category 
      : 'ac-repairers';
    
    dispatch(fetchBookingData({ 
      providerId: providerId || 'default', 
      category: validCategory as 'electricians' | 'plumbers' | 'ac-repairers' 
    }));

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
  }, [providerId, category]);

  // Loading state
  if (isLoading || !provider) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Animated.View style={{ opacity: fadeAnim }}>
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

      <View style={styles.summaryContent}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Service</Text>
          <Text style={styles.summaryValue}>{provider.service}</Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Provider</Text>
          <Text style={styles.summaryValue}>{provider.name}</Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Location</Text>
          <Text
            style={[
              styles.summaryValue,
              !selectedAddress && styles.summaryPlaceholder,
            ]}
            numberOfLines={1}
          >
            {selectedAddress
              ? selectedAddress.address.length > 25
                ? selectedAddress.address.substring(0, 25) + '...'
                : selectedAddress.address
              : 'Not selected'}
          </Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Date</Text>
          <Text
            style={[
              styles.summaryValue,
              !selectedDate && styles.summaryPlaceholder,
            ]}
          >
            {selectedDate || 'Not selected'}
          </Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Time</Text>
          <Text
            style={[
              styles.summaryValue,
              !selectedTime && styles.summaryPlaceholder,
            ]}
          >
            {selectedTime || 'Not selected'}
          </Text>
        </View>
      </View>

      <LinearGradient
        colors={['#F0FDF4', '#DCFCE7']}
        style={styles.summaryHighlight}
      >
        <Ionicons name="sparkles" size={16} color="#10B981" />
        <Text style={styles.summaryHighlightText}>Free consultation and quote</Text>
      </LinearGradient>
    </Animated.View>
  );

  const renderAddressModal = () => (
    <Modal
      visible={showAddressModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowAddressModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            onPress={() => setShowAddressModal(false)}
            style={styles.modalCloseButton}
          >
            <Text style={[styles.modalCloseText, { color: serviceConfig.accentColor }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Select Location</Text>
          <View style={styles.modalSpacer} />
        </View>

        <ScrollView style={styles.modalContent}>
          <TouchableOpacity style={styles.mapOption} activeOpacity={0.8}>
            <LinearGradient
              colors={serviceConfig.lightGradient as [string, string]}
              style={styles.mapOptionIcon}
            >
              <Ionicons name="map" size={24} color={serviceConfig.accentColor} />
            </LinearGradient>
            <View style={styles.mapOptionContent}>
              <Text style={styles.mapOptionTitle}>Choose on Map</Text>
              <Text style={styles.mapOptionSubtitle}>Select your exact location</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.addressDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or choose from saved</Text>
            <View style={styles.dividerLine} />
          </View>

          {savedAddresses.map((address) => {
            const isSelected = selectedAddress?.id === address.id;
            const iconName =
              address.icon === 'home'
                ? 'home'
                : address.icon === 'building'
                ? 'business'
                : 'location';

            return (
              <TouchableOpacity
                key={address.id}
                style={[
                  styles.addressOption,
                  isSelected && { backgroundColor: `${serviceConfig.accentColor}08`, borderColor: `${serviceConfig.accentColor}40` },
                ]}
                onPress={() => handleAddressSelect(address)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.addressOptionIcon,
                    isSelected && { backgroundColor: `${serviceConfig.accentColor}15` },
                  ]}
                >
                  <Ionicons
                    name={iconName as any}
                    size={20}
                    color={isSelected ? serviceConfig.accentColor : '#94A3B8'}
                  />
                </View>
                <View style={styles.addressOptionContent}>
                  <View style={styles.addressOptionHeader}>
                    <Text style={styles.addressOptionLabel}>{address.label}</Text>
                    {address.isDefault && (
                      <LinearGradient
                        colors={serviceConfig.gradient as [string, string]}
                        style={styles.defaultBadge}
                      >
                        <Text style={styles.defaultBadgeText}>Default</Text>
                      </LinearGradient>
                    )}
                  </View>
                  <Text style={styles.addressOptionText}>{address.address}</Text>
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={22} color={serviceConfig.accentColor} />
                )}
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity style={styles.addAddressButton} activeOpacity={0.8}>
            <Ionicons name="add" size={20} color={serviceConfig.accentColor} />
            <Text style={[styles.addAddressText, { color: serviceConfig.accentColor }]}>
              Add New Address
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderFooter = () => (
    <Animated.View
      style={[
        styles.footer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.footerPriceContainer}>
        <Text style={styles.footerPriceLabel}>Estimated</Text>
        <Text style={styles.footerPrice}>₨{provider.basePrice.toLocaleString()}</Text>
      </View>

      <TouchableOpacity
        style={[styles.bookButton, !isFormValid && styles.disabledBookButton]}
        onPress={handleContinue}
        disabled={!isFormValid || isSubmitting}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={
            isFormValid
              ? (serviceConfig.gradient as [string, string])
              : ['#E2E8F0', '#CBD5E1']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.bookButtonGradient}
        >
          <Text
            style={[
              styles.bookButtonText,
              !isFormValid && styles.disabledBookButtonText,
            ]}
          >
            {isSubmitting ? 'Processing...' : 'Confirm Booking'}
          </Text>
          <Ionicons
            name="arrow-forward"
            size={18}
            color={isFormValid ? '#FFFFFF' : '#94A3B8'}
          />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={isAndroid ? '#FFFFFF' : 'transparent'}
        translucent={!isAndroid}
      />

      {renderHeader()}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={true}
      >
        {renderProviderCard()}
        {renderAddressSection()}
        {renderDateSection()}
        {renderTimeSection()}
        {renderInstructionsSection()}
        {renderSummarySection()}
      </ScrollView>

      {renderFooter()}
      {renderAddressModal()}
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
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: Fonts.medium,
    color: '#64748B',
    textAlign: 'center',
  },

  // Header
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    ...Platform.select({
      ios: {
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  headerGradient: {
    paddingTop: isAndroid ? 16 : 8,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  backButton: {
    width: 42,
    height: 42,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  headerSpacer: {
    width: 42,
  },

  // Content
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 140,
  },

  // Provider Card
  providerCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 24,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  cardGradientOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 200,
    height: 200,
    borderBottomLeftRadius: 100,
  },
  cardTopAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  providerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    zIndex: 2,
    marginBottom: 16,
  },
  providerImageContainer: {
    marginRight: 16,
    position: 'relative',
  },
  providerImageRing: {
    width: 76,
    height: 76,
    borderRadius: 22,
    padding: 3,
  },
  providerImageInner: {
    flex: 1,
    borderRadius: 19,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
  },
  providerImage: {
    width: '100%',
    height: '100%',
  },
  onlineIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  onlineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
  },
  providerInfo: {
    flex: 1,
  },
  providerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  providerName: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: '#0F172A',
    letterSpacing: -0.3,
    marginRight: 8,
  },
  verifiedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerSpecialty: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: '#64748B',
    marginBottom: 10,
  },
  providerBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: '#92400E',
  },
  reviewsText: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: '#92400E',
  },
  experienceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
  },
  experienceText: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
  },
  serviceHighlights: {
    gap: 10,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  highlightText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: '#64748B',
  },

  // Section
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  sectionIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: '#0F172A',
    letterSpacing: -0.2,
    flex: 1,
  },
  sectionOptional: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: '#94A3B8',
  },

  // Address Selector
  addressSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    marginRight: 12,
  },
  addressTextContainer: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  addressText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: '#0F172A',
  },
  placeholderText: {
    color: '#94A3B8',
  },

  // Date Selector
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dateIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FCE7F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dateSelectorText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: '#0F172A',
  },

  // Time Slots
  timeSlotGroup: {
    marginBottom: 16,
  },
  timeSlotGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  timeSlotGroupLabel: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeSlotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeSlot: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: (width - 80) / 3 - 7,
    alignItems: 'center',
  },
  disabledTimeSlot: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  timeSlotText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    color: '#475569',
  },
  selectedTimeSlotText: {
    color: '#FFFFFF',
  },
  disabledTimeSlotText: {
    color: '#CBD5E1',
  },

  // Instructions
  instructionsContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  instructionsInput: {
    padding: 16,
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: '#0F172A',
    minHeight: 100,
    lineHeight: 20,
  },

  // Summary Section
  summarySection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  summaryContent: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  summaryLabel: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: '#64748B',
  },
  summaryValue: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    color: '#0F172A',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  summaryPlaceholder: {
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  summaryHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 16,
    gap: 8,
  },
  summaryHighlightText: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: '#166534',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  footerPriceContainer: {
    alignItems: 'flex-start',
  },
  footerPriceLabel: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footerPrice: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  bookButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  disabledBookButton: {
    ...Platform.select({
      ios: {
        shadowOpacity: 0,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  bookButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  bookButtonText: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  disabledBookButtonText: {
    color: '#94A3B8',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalCloseButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  modalCloseText: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  modalSpacer: {
    width: 60,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  mapOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  mapOptionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  mapOptionContent: {
    flex: 1,
  },
  mapOptionTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: '#0F172A',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  mapOptionSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: '#64748B',
  },
  addressDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
  },
  addressOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  addressOptionIcon: {
    width: 44,
    height: 44,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  addressOptionContent: {
    flex: 1,
  },
  addressOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  addressOptionLabel: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: '#0F172A',
    letterSpacing: -0.2,
    flex: 1,
  },
  defaultBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addressOptionText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: '#64748B',
    lineHeight: 18,
  },
  addAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginTop: 8,
    marginBottom: 40,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    gap: 8,
  },
  addAddressText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    letterSpacing: -0.2,
  },
});