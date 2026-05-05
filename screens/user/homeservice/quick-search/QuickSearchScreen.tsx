import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
  SafeAreaView,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');
const isAndroid = Platform.OS === 'android';

// Service type configurations
const SERVICE_CONFIG: Record<string, { 
  title: string; 
  gradient: string[];
  lightGradient: string[];
  accentColor: string;
  icon: string;
  placeholder: string;
}> = {
  electricians: {
    title: 'Electricians',
    gradient: ['#F59E0B', '#D97706'],
    lightGradient: ['#FEF3C7', '#FDE68A'],
    accentColor: '#F59E0B',
    icon: 'flash',
    placeholder: 'E.g., Need to fix electrical wiring in bedroom, replace switches...',
  },
  plumbers: {
    title: 'Plumbers',
    gradient: ['#3B82F6', '#2563EB'],
    lightGradient: ['#DBEAFE', '#BFDBFE'],
    accentColor: '#3B82F6',
    icon: 'water',
    placeholder: 'E.g., Leaking pipe under sink, need to install new faucet...',
  },
  'ac-repairers': {
    title: 'AC Repairers',
    gradient: ['#06B6D4', '#0891B2'],
    lightGradient: ['#CFFAFE', '#A5F3FC'],
    accentColor: '#06B6D4',
    icon: 'snow',
    placeholder: 'E.g., AC not cooling properly, need gas refill, unusual noise...',
  },
};

type QuickSearchScreenRouteParams = {
  serviceType?: 'electricians' | 'plumbers' | 'ac-repairers';
};

type RouteParams = {
  params: QuickSearchScreenRouteParams;
};

const QuickSearchScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'params'>>();

  const serviceType = route.params?.serviceType ?? 'ac-repairers';
  const serviceConfig = SERVICE_CONFIG[serviceType] || SERVICE_CONFIG['ac-repairers'];

  const [jobDescription, setJobDescription] = useState('');
  const [location, setLocation] = useState('');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationFocused, setLocationFocused] = useState(false);
  const [descriptionFocused, setDescriptionFocused] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const headerSlideAnim = useRef(new Animated.Value(-30)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  const locationFocusAnim = useRef(new Animated.Value(0)).current;
  const descriptionFocusAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
      }),
      Animated.spring(headerSlideAnim, {
        toValue: 0,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, headerSlideAnim]);

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleGetCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Please enable location permissions to use this feature.',
          [{ text: 'OK' }]
        );
        setIsLoadingLocation(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      const [address] = await Location.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      if (address) {
        const formattedAddress = [
          address.name,
          address.street,
          address.city,
          address.region,
        ].filter(Boolean).join(', ');
        setLocation(formattedAddress);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to get current location. Please enter manually.');
    }
    setIsLoadingLocation(false);
  };

  const handleSearchProviders = () => {
    if (!jobDescription.trim()) {
      Alert.alert('Required', 'Please describe the job you need help with.');
      return;
    }
    if (!location.trim()) {
      Alert.alert('Required', 'Please enter your location.');
      return;
    }

    // @ts-ignore
    navigation.navigate('SearchingProvidersScreen', {
      serviceType,
      jobDescription: jobDescription.trim(),
      location: location.trim(),
    });
  };

  const handleDescriptionFocus = () => {
    setDescriptionFocused(true);
    Animated.spring(descriptionFocusAnim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: false,
    }).start();
  };

  const handleDescriptionBlur = () => {
    setDescriptionFocused(false);
    Animated.spring(descriptionFocusAnim, {
      toValue: 0,
      tension: 100,
      friction: 8,
      useNativeDriver: false,
    }).start();
  };

  const handleLocationFocus = () => {
    setLocationFocused(true);
    Animated.spring(locationFocusAnim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: false,
    }).start();
  };

  const handleLocationBlur = () => {
    setLocationFocused(false);
    Animated.spring(locationFocusAnim, {
      toValue: 0,
      tension: 100,
      friction: 8,
      useNativeDriver: false,
    }).start();
  };

  const handleButtonPressIn = () => {
    Animated.spring(buttonScaleAnim, {
      toValue: 0.96,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handleButtonPressOut = () => {
    Animated.spring(buttonScaleAnim, {
      toValue: 1,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const isFormValid = jobDescription.trim().length > 0 && location.trim().length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={isAndroid ? '#FFFFFF' : 'transparent'}
        translucent={!isAndroid}
      />

      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY: headerSlideAnim }],
          },
        ]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={22} color="#1E293B" />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <LinearGradient
              colors={serviceConfig.gradient as [string, string]}
              style={styles.headerIconBg}
            >
              <Ionicons name="search" size={18} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.headerTitle}>Quick Search</Text>
          </View>

          <View style={styles.headerSpacer} />
        </View>
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Service Badge */}
          <Animated.View
            style={[
              styles.serviceBadgeContainer,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <LinearGradient
              colors={[`${serviceConfig.accentColor}15`, `${serviceConfig.accentColor}05`]}
              style={styles.serviceBadge}
            >
              <View style={[styles.serviceBadgeIcon, { backgroundColor: `${serviceConfig.accentColor}20` }]}>
                <Ionicons name={serviceConfig.icon as any} size={20} color={serviceConfig.accentColor} />
              </View>
              <Text style={[styles.serviceBadgeText, { color: serviceConfig.accentColor }]}>
                Finding {serviceConfig.title}
              </Text>
            </LinearGradient>
          </Animated.View>

          {/* Job Details Section */}
          <Animated.View
            style={[
              styles.section,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconBg}>
                <Ionicons name="document-text-outline" size={18} color="#64748B" />
              </View>
              <Text style={styles.sectionTitle}>Job Details</Text>
            </View>

            <Text style={styles.inputLabel}>Add Job Description</Text>
            <Text style={styles.inputHint}>
              Describe the job you need help with in detail
            </Text>

            <Animated.View
              style={[
                styles.textAreaContainer,
                {
                  borderColor: descriptionFocusAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['#E2E8F0', serviceConfig.accentColor],
                  }),
                  shadowOpacity: descriptionFocusAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.05, 0.15],
                  }),
                },
              ]}
            >
              <TextInput
                style={styles.textArea}
                placeholder={serviceConfig.placeholder}
                placeholderTextColor="#94A3B8"
                value={jobDescription}
                onChangeText={setJobDescription}
                onFocus={handleDescriptionFocus}
                onBlur={handleDescriptionBlur}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
              {jobDescription.length > 0 && (
                <View style={styles.charCount}>
                  <Text style={styles.charCountText}>{jobDescription.length} characters</Text>
                </View>
              )}
            </Animated.View>
          </Animated.View>

          {/* Location Section */}
          <Animated.View
            style={[
              styles.section,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconBg}>
                <Ionicons name="location-outline" size={18} color="#64748B" />
              </View>
              <Text style={styles.sectionTitle}>Set Location</Text>
            </View>

            <Text style={styles.inputHint}>
              We'll find providers within 10km of your location
            </Text>

            <Animated.View
              style={[
                styles.locationInputContainer,
                {
                  borderColor: locationFocusAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['#E2E8F0', serviceConfig.accentColor],
                  }),
                },
              ]}
            >
              <View style={[styles.locationIcon, { backgroundColor: `${serviceConfig.accentColor}15` }]}>
                <Ionicons name="location" size={18} color={serviceConfig.accentColor} />
              </View>

              <TextInput
                style={styles.locationInput}
                placeholder="Enter your location"
                placeholderTextColor="#94A3B8"
                value={location}
                onChangeText={setLocation}
                onFocus={handleLocationFocus}
                onBlur={handleLocationBlur}
              />

              {location.length > 0 && (
                <TouchableOpacity
                  style={styles.clearLocationButton}
                  onPress={() => setLocation('')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle" size={20} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </Animated.View>

            <TouchableOpacity
              style={styles.currentLocationButton}
              onPress={handleGetCurrentLocation}
              activeOpacity={0.8}
              disabled={isLoadingLocation}
            >
              <LinearGradient
                colors={['#F8FAFC', '#F1F5F9']}
                style={styles.currentLocationGradient}
              >
                {isLoadingLocation ? (
                  <View style={styles.loadingIndicator}>
                    <MaterialCommunityIcons name="loading" size={18} color={serviceConfig.accentColor} />
                  </View>
                ) : (
                  <Feather name="crosshair" size={18} color={serviceConfig.accentColor} />
                )}
                <Text style={[styles.currentLocationText, { color: serviceConfig.accentColor }]}>
                  {isLoadingLocation ? 'Getting location...' : 'Use current location'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Info Card */}
          <Animated.View
            style={[
              styles.infoCard,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <LinearGradient
              colors={[`${serviceConfig.accentColor}08`, `${serviceConfig.accentColor}03`]}
              style={styles.infoCardGradient}
            >
              <View style={[styles.infoIconBg, { backgroundColor: `${serviceConfig.accentColor}15` }]}>
                <Ionicons name="information-circle" size={20} color={serviceConfig.accentColor} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoTitle}>How Quick Search Works</Text>
                <Text style={styles.infoText}>
                  Your request will be sent to all available {serviceConfig.title.toLowerCase()} within 10km. 
                  Those who accept will appear on the next screen where you can choose and communicate.
                </Text>
              </View>
            </LinearGradient>
          </Animated.View>
        </ScrollView>

        {/* Bottom Button */}
        <Animated.View
          style={[
            styles.bottomButtonContainer,
            { opacity: fadeAnim },
          ]}
        >
          <Animated.View style={{ transform: [{ scale: buttonScaleAnim }] }}>
            <TouchableOpacity
              style={[styles.searchButton, !isFormValid && styles.searchButtonDisabled]}
              onPress={handleSearchProviders}
              onPressIn={handleButtonPressIn}
              onPressOut={handleButtonPressOut}
              activeOpacity={0.9}
              disabled={!isFormValid}
            >
              <LinearGradient
                colors={isFormValid ? (serviceConfig.gradient as [string, string]) : ['#CBD5E1', '#94A3B8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.searchButtonGradient}
              >
                <Ionicons name="search" size={20} color="#FFFFFF" />
                <Text style={styles.searchButtonText}>Search Providers</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  headerSpacer: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 120,
  },
  serviceBadgeContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  serviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 50,
    gap: 10,
  },
  serviceBadgeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceBadgeText: {
    fontSize: 15,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  sectionIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  inputHint: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 18,
  },
  textAreaContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  textArea: {
    padding: 16,
    fontSize: 15,
    color: '#1E293B',
    minHeight: 150,
    lineHeight: 22,
  },
  charCount: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  charCountText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  locationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 4,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  locationIcon: {
    width: 44,
    height: 44,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationInput: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  clearLocationButton: {
    padding: 8,
    marginRight: 4,
  },
  currentLocationButton: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  currentLocationGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  loadingIndicator: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentLocationText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
  },
  infoCardGradient: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  infoIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
  },
  bottomButtonContainer: {
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 10,
  },
  searchButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  searchButtonDisabled: {
    shadowOpacity: 0.1,
    shadowColor: '#94A3B8',
  },
  searchButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  searchButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});

export default QuickSearchScreen;