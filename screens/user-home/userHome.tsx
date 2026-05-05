import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Image,
  Dimensions,
  ImageSourcePropType,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectService, Service } from './userhomeSlice';
import { LinearGradient } from 'expo-linear-gradient';
import SlideOutSidebar from '../../components/SlideOutSidebar/SlideOutSidebar';

const { width } = Dimensions.get('window');

// ============================================
// IMAGE CONFIGURATION
// ============================================
// Option 1: Using require() - Recommended for local images
const SERVICE_IMAGES: Record<string, ImageSourcePropType> = {
  shopping: require('../../assets/images/services/Shopping.png'),
  healthcare: require('../../assets/images/services/Health.png'),
  homeServices: require('../../assets/images/services/home-services.png'),
};

// Option 2: If you prefer import statements, comment above and use:
// import ShoppingImage from '../../assets/images/services/shopping.png';
// import HealthImage from '../../assets/images/services/health.png';
// import HomeServicesImage from '../../assets/images/services/home-services.png';
// const SERVICE_IMAGES = { shopping: ShoppingImage, healthcare: HealthImage, homeServices: HomeServicesImage };

const UserHomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { selectedService, services } = useAppSelector((state) => state.userHome);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const handleServicePress = (serviceId: string) => {
    dispatch(selectService(serviceId));
  };

  const handleContinue = () => {
    if (selectedService) {
      // Map service IDs to navigation routes
      if (selectedService === 'homeServices') {
        navigation.navigate('HomeServiceLayout' as never);
      } else if (selectedService === 'healthcare') {
        navigation.navigate('HealthcareStack' as never);
      } else {
        navigation.navigate(selectedService as never);
      }
    }
  };

  const getImageSource = (service: Service): ImageSourcePropType => {
    if (SERVICE_IMAGES[service.id]) {
      return SERVICE_IMAGES[service.id];
    }
    // Fallback to a default image if service id not found in mapping
    return SERVICE_IMAGES['shopping'];
  };

  // Render SELECTED card - Description appears ON the image
  const renderSelectedCard = (service: Service) => {
    return (
      <TouchableOpacity
        key={service.id}
        style={[styles.serviceCard, styles.serviceCardSelected]}
        onPress={() => handleServicePress(service.id)}
        activeOpacity={0.9}
      >
        <View style={styles.selectedCardContainer}>
          <Image
            source={getImageSource(service)}
            style={styles.serviceImage}
            resizeMode="cover"
          />
          
          {/* Gradient Overlay - stronger for text readability */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.65)']}
            style={styles.imageOverlay}
          />

          {/* Category Badge - Top Left */}
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{service.subtitle}</Text>
          </View>

          {/* Stats Badge - Top Right */}
          <View style={styles.statsBadge}>
            <Text style={styles.statsText}>
              {service.stats.value} {service.stats.label}
            </Text>
          </View>

          {/* Bottom Content - Title + Description ON image */}
          <View style={styles.selectedBottomContent}>
            <Text style={styles.selectedCardTitle}>{service.title}</Text>
            <Text style={styles.selectedCardDescription} numberOfLines={2}>
              {service.description}
            </Text>
          </View>

          {/* Checkmark - Bottom Right */}
          <View style={styles.checkmarkContainer}>
            <Text style={styles.checkmark}>✓</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render UNSELECTED card - Description appears BELOW the image
  const renderUnselectedCard = (service: Service) => {
    return (
      <TouchableOpacity
        key={service.id}
        style={styles.serviceCard}
        onPress={() => handleServicePress(service.id)}
        activeOpacity={0.9}
      >
        {/* Image Section */}
        <View style={styles.imageContainer}>
          <Image
            source={getImageSource(service)}
            style={styles.serviceImage}
            resizeMode="cover"
          />
          
          {/* Gradient Overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.5)']}
            style={styles.imageOverlay}
          />

          {/* Category Badge - Top Left */}
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{service.subtitle}</Text>
          </View>

          {/* Stats Badge - Top Right */}
          <View style={styles.statsBadge}>
            <Text style={styles.statsText}>
              {service.stats.value} {service.stats.label}
            </Text>
          </View>

          {/* Title - Bottom Left */}
          <View style={styles.titleContainer}>
            <Text style={styles.cardTitle}>{service.title}</Text>
          </View>
        </View>

        {/* Content Section - BELOW Image */}
        <View style={styles.cardContent}>
          <View style={styles.contentRow}>
            {/* Description */}
            <Text style={styles.cardDescription} numberOfLines={2}>
              {service.description}
            </Text>

            {/* Explore Button */}
            <TouchableOpacity style={styles.exploreButton} activeOpacity={0.7}>
              <Text style={styles.exploreText}>Explore</Text>
              <Text style={styles.exploreArrow}>{'>'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderServiceCard = (service: Service) => {
    const isSelected = selectedService === service.id;
    return isSelected ? renderSelectedCard(service) : renderUnselectedCard(service);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          {/* Hamburger Menu - Opens Sidebar */}
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setSidebarVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={24} color="#1F2937" />
          </TouchableOpacity>

          {/* Center - Brand */}
          <View style={styles.headerCenter}>
            <Text style={styles.brandTitle}>MetroMatrix</Text>
            <Text style={styles.brandSubtitle}>Smart City Services</Text>
          </View>

          {/* Notifications */}
          <TouchableOpacity style={styles.headerButton}>
            <Text style={styles.bellIcon}>🔔</Text>
          </TouchableOpacity>
        </View>

        {/* Sidebar */}
        <SlideOutSidebar
          isVisible={sidebarVisible}
          onClose={() => setSidebarVisible(false)}
        />

        {/* Live Services Badge */}
        <View style={styles.liveBadgeWrapper}>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE SERVICES</Text>
          </View>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Our Services</Text>
            <Text style={styles.sectionSubtitle}>Choose what you need</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{services.length} Available</Text>
          </View>
        </View>

        {/* Service Cards */}
        <View style={styles.cardsContainer}>
          {services.map(renderServiceCard)}
        </View>
      </ScrollView>

      {/* Bottom Container */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !selectedService && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selectedService}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={selectedService ? ['#10B981', '#059669'] : ['#E5E7EB', '#E5E7EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            <Text
              style={[
                styles.continueButtonText,
                !selectedService && styles.continueButtonTextDisabled,
              ]}
            >
              {selectedService ? 'Continue' : 'Select a Service'}
            </Text>
            {selectedService && <Text style={styles.buttonArrow}>→</Text>}
          </LinearGradient>
        </TouchableOpacity>

        {/* Home Indicator */}
        <View style={styles.homeIndicator} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },

  // ============ HEADER ============
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 50,
    paddingBottom: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '400',
    marginTop: 2,
  },
  bellIcon: {
    fontSize: 18,
  },

  // ============ LIVE BADGE ============
  liveBadgeWrapper: {
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 20,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  liveDot: {
    width: 8,
    height: 8,
    backgroundColor: '#EF4444', // Red dot as in design
    borderRadius: 4,
    marginRight: 8,
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    letterSpacing: 0.5,
  },

  // ============ SECTION HEADER ============
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 2,
    fontWeight: '400',
  },
  countBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },

  // ============ CARDS ============
  cardsContainer: {
    paddingHorizontal: 20,
  },
  serviceCard: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  serviceCardSelected: {
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOpacity: 0.15,
  },

  // ============ SELECTED CARD (Description ON image) ============
  selectedCardContainer: {
    height: 200,
    position: 'relative',
    overflow: 'hidden',
  },
  selectedBottomContent: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 60,
  },
  selectedCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginBottom: 4,
  },
  selectedCardDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // ============ UNSELECTED CARD (Description BELOW image) ============
  imageContainer: {
    height: 160,
    position: 'relative',
    overflow: 'hidden',
  },
  serviceImage: {
    width: '100%',
    height: '140%',
    position: 'absolute',
    top: 0,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },

  // Category Badge - Top Left
  categoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#374151',
    letterSpacing: 0.5,
  },

  // Stats Badge - Top Right
  statsBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statsText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // Title - Bottom Left (Unselected only)
  titleContainer: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // Checkmark - Bottom Right
  checkmarkContainer: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    width: 32,
    height: 32,
    backgroundColor: '#10B981',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // ============ CARD CONTENT (Below image for unselected) ============
  cardContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Description (below image for unselected)
  cardDescription: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
    marginRight: 12,
  },

  // Explore Button
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  exploreText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  exploreArrow: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },

  // ============ BOTTOM CONTAINER ============
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
  },
  continueButton: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  continueButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonGradient: {
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
  continueButtonTextDisabled: {
    color: '#9CA3AF',
  },
  buttonArrow: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  homeIndicator: {
    display: 'none',
  },
});

export default UserHomeScreen;