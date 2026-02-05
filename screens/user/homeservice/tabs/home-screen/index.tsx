import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  StatusBar,
  RefreshControl,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../../../../../constants/Colors';
import { Fonts } from '../../../../../constants/Fonts';
import {
  setSingleCategory,
  setActivePromoIndex,
  refreshHomeData,
  fetchHomeData,
  ServiceCategory,
  Promotion,
} from './homeSlice';
import { RootState } from '../../../../../store/store';

const { width } = Dimensions.get('window');
const isAndroid = Platform.OS === 'android';

// Promotion Card Component
interface PromotionCardProps {
  promo: {
    id: string;
    title: string;
    subtitle: string;
    discount: string;
    badge: string;
    gradient: string[];
    cta: string;
    icon?: string;
  };
  isActive: boolean;
}

const PromotionCard: React.FC<PromotionCardProps> = ({ promo, isActive }) => {
  const scaleAnim = useRef(new Animated.Value(isActive ? 1 : 0.95)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isActive ? 1 : 0.95,
      tension: 150,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [isActive]);

  return (
    <Animated.View style={[styles.promoCard, { transform: [{ scale: scaleAnim }] }]}>
      <LinearGradient
        colors={promo.gradient as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.promoGradient}
      >
        <View style={styles.promoDecorCircle1} />
        <View style={styles.promoDecorCircle2} />

        <View style={styles.promoContent}>
          <View style={styles.promoBadgeContainer}>
            <Text style={styles.promoBadgeText}>{promo.badge}</Text>
          </View>

          <View style={styles.promoMainContent}>
            <View style={styles.promoTextContent}>
              <Text style={styles.promoDiscount}>{promo.discount}</Text>
              <Text style={styles.promoTitle}>{promo.title}</Text>
              <Text style={styles.promoSubtitle}>{promo.subtitle}</Text>
            </View>
            {promo.icon && <Text style={styles.promoIcon}>{promo.icon}</Text>}
          </View>

          <TouchableOpacity style={styles.promoCta} activeOpacity={0.8}>
            <Text style={styles.promoCtaText}>{promo.cta}</Text>
            <Ionicons name="chevron-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

// Service Card Component
interface ServiceCardProps {
  service: {
    id: string;
    name: string;
    badge: string;
    badgeColor: string;
    description: string;
    image: string;
    providerCount: string;
    providers: string[];
    icon: string;
  };
  isSelected: boolean;
  onSelect: (id: string) => void;
  index: number;
}

const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  isSelected,
  onSelect,
  index,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.serviceCardContainer,
        {
          transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => onSelect(service.id)}
        style={[styles.serviceCard, isSelected && styles.serviceCardSelected]}
      >
        {/* Image Section */}
        <View style={styles.serviceImageContainer}>
          <Image
            source={{ uri: service.image }}
            style={styles.serviceImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)']}
            style={styles.serviceImageOverlay}
          />

          {/* Badge */}
          <View style={[styles.serviceBadge, { backgroundColor: service.badgeColor }]}>
            <Text style={styles.serviceBadgeText}>{service.badge}</Text>
          </View>

          {/* Provider Count */}
          <View style={styles.providerCountBadge}>
            <Text style={styles.providerCountText}>{service.providerCount}</Text>
          </View>

          {/* Service Title on Image */}
          <View style={styles.serviceTitleOverlay}>
            <View style={[styles.serviceIconContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Ionicons name={service.icon as any} size={20} color="#ffffff" />
            </View>
            <Text style={styles.serviceNameOverlay}>{service.name}</Text>
          </View>

          {/* Selection Indicator */}
          {isSelected && (
            <View style={styles.selectedIndicator}>
              <Ionicons name="checkmark" size={18} color="#fff" />
            </View>
          )}
        </View>

        {/* Content Section */}
        <View style={styles.serviceContent}>
          <View style={styles.serviceProviderRow}>
            {/* Provider Avatars */}
            <View style={styles.providerAvatars}>
              {service.providers.slice(0, 6).map((avatar, idx) => (
                <Image
                  key={idx}
                  source={{ uri: avatar }}
                  style={[
                    styles.providerAvatar,
                    { marginLeft: idx === 0 ? 0 : -10, zIndex: 6 - idx },
                  ]}
                />
              ))}
            </View>

            {/* Description */}
            <Text style={styles.serviceDescription} numberOfLines={2}>
              {service.description}
            </Text>
          </View>

          {/* Selection Indicator Button */}
          <View
            style={[styles.exploreButton, isSelected && styles.exploreButtonSelected]}
          >
            <Text style={[styles.exploreButtonText, isSelected && styles.exploreButtonTextSelected]}>
              {isSelected ? 'Selected ✓' : 'Tap to Select'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Main Home Screen Component
export default function HomeScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const categories = useSelector((state: RootState) => state.home.categories) as ServiceCategory[];
  const selectedCategories = useSelector((state: RootState) => state.home.selectedCategories) as string[];
  const promotions = useSelector((state: RootState) => state.home.promotions) as Promotion[];
  const activePromoIndex = useSelector((state: RootState) => state.home.activePromoIndex) as number;
  const isRefreshing = useSelector((state: RootState) => state.home.isRefreshing) as boolean;

  const headerAnim = useRef(new Animated.Value(0)).current;
  const continueButtonAnim = useRef(new Animated.Value(0)).current;
  const promoScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  // Fetch home data on mount
  useEffect(() => {
    dispatch(fetchHomeData() as any);
  }, [dispatch]);

  useEffect(() => {
    Animated.spring(continueButtonAnim, {
      toValue: selectedCategories.length > 0 ? 1 : 0,
      tension: 100,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [selectedCategories]);

  const handleServiceSelect = useCallback((id: string) => {
    dispatch(setSingleCategory(id));
  }, [dispatch]);


  const handleContinue = useCallback(() => {
    if (selectedCategories.length > 0) {
      // @ts-ignore - Route may not be defined yet
      navigation.navigate('ProvidersScreen', { 
        serviceType: selectedCategories[0] as 'electricians' | 'plumbers' | 'ac-repairers',
      });
    }
  }, [navigation, selectedCategories]);

  const handlePromoScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (width - 64));
    dispatch(setActivePromoIndex(index));
  };

  const onRefresh = useCallback(() => {
    dispatch(refreshHomeData() as any);
  }, [dispatch]);

  const handleBackPress = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: headerAnim,
              transform: [
                {
                  translateY: headerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Ionicons name="chevron-back" size={24} color="#0f172a" />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>MetroMatrix</Text>
            <Text style={styles.headerSubtitle}>Home Solutions</Text>
          </View>

          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={22} color="#0f172a" />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
        </Animated.View>

        {/* Live Services Badge */}
        <View style={styles.liveBadgeContainer}>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveBadgeText}>LIVE SERVICES</Text>
          </View>
        </View>

        {/* Special Offers Section */}
        <View style={styles.promoSection}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Special Offers</Text>
              <Text style={styles.sectionSubtitle}>Exclusive deals for you</Text>
            </View>
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={promoScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.promoScrollContent}
            onScroll={handlePromoScroll}
            scrollEventThrottle={16}
            decelerationRate="fast"
            snapToInterval={width - 64}
            snapToAlignment="start"
          >
            {promotions.map((promo, index) => (
              <PromotionCard
                key={promo.id}
                promo={promo}
                isActive={index === activePromoIndex}
              />
            ))}
          </ScrollView>

          {/* Promo Indicators */}
          <View style={styles.promoIndicators}>
            {promotions.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.promoIndicator,
                  index === activePromoIndex && styles.promoIndicatorActive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Our Services Section */}
        <View style={styles.servicesSection}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Our Services</Text>
              <Text style={styles.sectionSubtitle}>Choose what you need</Text>
            </View>
            <View style={styles.serviceCountBadge}>
              <Text style={styles.serviceCountText}>{categories.length} Available</Text>
            </View>
          </View>

          {/* Service Cards */}
          <View style={styles.servicesContainer}>
            {categories.map((service, index) => (
              <ServiceCard
                key={service.id}
                service={service}
                isSelected={selectedCategories.includes(service.id)}
                onSelect={handleServiceSelect}
                index={index}
              />
            ))}
          </View>
        </View>

        {/* Continue Button */}
        {selectedCategories.length > 0 && (
          <Animated.View
            style={[
              styles.continueContainerInline,
              {
                opacity: continueButtonAnim,
                transform: [
                  {
                    translateY: continueButtonAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0],
                    }),
                  },
                  {
                    scale: continueButtonAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.9, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity 
              style={styles.continueButton} 
              activeOpacity={0.9}
              onPress={handleContinue}
            >
              <LinearGradient
                colors={[Colors.primary, '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.continueGradient}
              >
                <Text style={styles.continueText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: Fonts.bold,
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: '#64748b',
    marginTop: 2,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#f8fafc',
  },
  liveBadgeContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginRight: 8,
  },
  liveBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.primary,
    letterSpacing: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: '#94a3b8',
    marginTop: 2,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Colors.primary,
  },
  serviceCountBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  serviceCountText: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    color: '#475569',
  },
  promoSection: {
    marginBottom: 24,
  },
  promoScrollContent: {
    paddingLeft: 20,
    paddingRight: 20,
  },
  promoCard: {
    width: width - 64,
    marginRight: 16,
  },
  promoGradient: {
    borderRadius: 24,
    padding: 20,
    minHeight: 170,
    overflow: 'hidden',
    position: 'relative',
  },
  promoDecorCircle1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  promoDecorCircle2: {
    position: 'absolute',
    bottom: -50,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  promoContent: {
    flex: 1,
  },
  promoBadgeContainer: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  promoBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: '#fff',
    letterSpacing: 0.5,
  },
  promoMainContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  promoTextContent: {
    flex: 1,
  },
  promoDiscount: {
    fontSize: 32,
    fontFamily: Fonts.bold,
    color: '#fff',
    marginBottom: 4,
  },
  promoTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: '#fff',
  },
  promoSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    lineHeight: 18,
  },
  promoIcon: {
    fontSize: 40,
    marginLeft: 12,
  },
  promoCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 16,
  },
  promoCtaText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: '#fff',
    marginRight: 4,
  },
  promoIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  promoIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 4,
  },
  promoIndicatorActive: {
    width: 24,
    backgroundColor: Colors.primary,
  },
  servicesSection: {
    marginBottom: 24,
  },
  servicesContainer: {
    paddingHorizontal: 20,
  },
  serviceCardContainer: {
    marginBottom: 16,
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  serviceCardSelected: {
    borderColor: Colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOpacity: 0.15,
      },
    }),
  },
  serviceImageContainer: {
    height: 160,
    position: 'relative',
  },
  serviceImage: {
    width: '100%',
    height: '100%',
  },
  serviceImageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  serviceBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  serviceBadgeText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  providerCountBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  providerCountText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
  },
  serviceTitleOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  serviceNameOverlay: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  selectedIndicator: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  serviceContent: {
    padding: 16,
  },
  serviceProviderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  providerAvatars: {
    flexDirection: 'row',
    marginRight: 12,
  },
  providerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#f1f5f9',
  },
  serviceDescription: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: '#64748b',
    lineHeight: 18,
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  exploreButtonSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  exploreButtonText: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: '#64748b',
    marginRight: 4,
  },
  exploreButtonTextSelected: {
    color: '#FFFFFF',
  },
  continueContainerInline: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
  },
  continueButton: {
    borderRadius: 28,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  continueGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  continueText: {
    fontSize: 17,
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    marginRight: 8,
  },
});