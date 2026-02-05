import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
  SafeAreaView,
  Platform,
  FlatList,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors } from '../../../../constants/Colors';
import { Fonts } from '../../../../constants/Fonts';
import {
  fetchProviderById,
  setSelectedTab,
  Provider,
  Review,
  Service,
  GalleryItem,
} from './providerProfileSlice';
import { RootState } from '../../../../store/store';

const { width, height } = Dimensions.get('window');
const isAndroid = Platform.OS === 'android';

// Service type configurations
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

type ProviderProfileScreenRouteParams = {
  id: string;
  category?: 'electricians' | 'plumbers' | 'ac-repairers';
};

export default function ProviderProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: ProviderProfileScreenRouteParams }, 'params'>>();
  const dispatch = useDispatch();

  const { id, category = 'plumbers' } = route.params;

  const provider = useSelector((state: RootState) => state.providerProfile?.provider) as Provider | null;
  const isLoading = useSelector((state: RootState) => state.providerProfile?.isLoading) as boolean;
  const selectedTab = useSelector((state: RootState) => state.providerProfile?.selectedTab) as string;

  // Animation references - initialize to visible state for loading view
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const heroImageAnim = useRef(new Animated.Value(1)).current;

  const [expandedReview, setExpandedReview] = useState<string | null>(null);

  // All useCallback hooks MUST be before any conditional returns
  const handleBookNow = useCallback(() => {
    // @ts-ignore
    navigation.navigate('BookingScreen', { providerId: provider?.id, category });
  }, [navigation, provider?.id, category]);

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleCallPress = useCallback(() => {
    console.log('Call:', provider?.phoneNumber);
  }, [provider?.phoneNumber]);

  const handleChatPress = useCallback(() => {
    console.log('Chat with:', provider?.name);
  }, [provider?.name]);

  const handleTabChange = useCallback((tab: 'overview' | 'reviews' | 'gallery' | 'availability') => {
    dispatch(setSelectedTab(tab));
  }, [dispatch]);

  // Track animations ref for cleanup
  const animationsRef = useRef<Animated.CompositeAnimation | null>(null);

  // Run animations and fetch data when screen gains focus
  useFocusEffect(
    useCallback(() => {
      // Set initial animation values when screen gains focus
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      scaleAnim.setValue(0.98);
      heroImageAnim.setValue(0);

      // Fetch data on focus
      dispatch(fetchProviderById({ providerId: id, category }) as any);

      // Start animations
      animationsRef.current = Animated.parallel([
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
        Animated.timing(heroImageAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]);
      animationsRef.current.start();

      // Cleanup: only stop animations, don't reset values
      return () => {
        if (animationsRef.current) {
          animationsRef.current.stop();
        }
      };
    }, [id, category, dispatch])
  );

  // Early return AFTER all hooks
  if (!provider) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const serviceConfig = SERVICE_CONFIG[provider.category] || SERVICE_CONFIG['plumbers'];

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

          <Text style={styles.headerTitle}>Provider Profile</Text>

          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerIconButton} activeOpacity={0.8}>
              <Ionicons name="share-outline" size={20} color="#64748B" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIconButton} activeOpacity={0.8}>
              <Ionicons name="heart-outline" size={20} color={serviceConfig.accentColor} />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const renderHeroSection = () => (
    <Animated.View
      style={[
        styles.heroSection,
        {
          opacity: heroImageAnim,
          transform: [
            {
              scale: heroImageAnim.interpolate({
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
        style={styles.heroGradient}
      />

      <LinearGradient
        colors={serviceConfig.gradient as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.heroTopAccent}
      />

      <View style={styles.heroContent}>
        <View style={styles.profileImageContainer}>
          <LinearGradient
            colors={serviceConfig.gradient as [string, string]}
            style={styles.profileImageRing}
          >
            <View style={styles.profileImageInner}>
              <Image source={{ uri: provider.image }} style={styles.heroProfileImage} />
            </View>
          </LinearGradient>

          {provider.verified && (
            <View style={[styles.verifiedBadge, { backgroundColor: serviceConfig.accentColor }]}>
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            </View>
          )}

          {provider.isOnline && (
            <View style={styles.onlineIndicator}>
              <View style={styles.onlineDot} />
            </View>
          )}
        </View>

        <View style={styles.heroInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.providerName}>{provider.name}</Text>
            {provider.verified && (
              <View style={styles.verifiedTextBadge}>
                <Ionicons name="shield-checkmark" size={14} color={serviceConfig.accentColor} />
              </View>
            )}
          </View>

          <View style={[styles.experienceBadge, { backgroundColor: `${serviceConfig.accentColor}12` }]}>
            <Feather name="award" size={14} color={serviceConfig.accentColor} />
            <Text style={[styles.experienceText, { color: serviceConfig.accentColor }]}>
              {provider.experience} Experience
            </Text>
          </View>

          <View style={styles.ratingContainer}>
            <LinearGradient colors={['#FEF3C7', '#FDE68A']} style={styles.ratingGradient}>
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text style={styles.ratingText}>{provider.rating}</Text>
            </LinearGradient>
            <Text style={styles.reviewsText}>({provider.reviews} reviews)</Text>
          </View>

          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={14} color="#94A3B8" />
            <Text style={styles.locationText}>{provider.address}</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );

  const renderQuickActions = () => (
    <Animated.View
      style={[
        styles.quickActions,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.quickActionButton}
        onPress={handleCallPress}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#F0FDF4', '#DCFCE7']}
          style={styles.quickActionIcon}
        >
          <Ionicons name="call" size={22} color="#10B981" />
        </LinearGradient>
        <Text style={styles.quickActionText}>Call</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.quickActionButton}
        onPress={handleChatPress}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={serviceConfig.lightGradient as [string, string]}
          style={styles.quickActionIcon}
        >
          <Ionicons name="chatbubble-outline" size={22} color={serviceConfig.accentColor} />
        </LinearGradient>
        <Text style={styles.quickActionText}>Chat</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.quickActionButton} activeOpacity={0.8}>
        <LinearGradient
          colors={['#FEF3C7', '#FDE68A']}
          style={styles.quickActionIcon}
        >
          <Ionicons name="location" size={22} color="#D97706" />
        </LinearGradient>
        <Text style={styles.quickActionText}>Location</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.quickActionButton} activeOpacity={0.8}>
        <LinearGradient
          colors={['#FCE7F3', '#FBCFE8']}
          style={styles.quickActionIcon}
        >
          <Ionicons name="calendar-outline" size={22} color="#EC4899" />
        </LinearGradient>
        <Text style={styles.quickActionText}>Schedule</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderStatsSection = () => (
    <Animated.View
      style={[
        styles.statsSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <LinearGradient colors={['#FFFFFF', '#FAFAFA']} style={styles.statsGradient}>
        <View style={styles.statItem}>
          <LinearGradient
            colors={['#D1FAE5', '#A7F3D0']}
            style={styles.statIconBg}
          >
            <Ionicons name="checkmark-done" size={20} color="#10B981" />
          </LinearGradient>
          <Text style={styles.statNumber}>{provider.jobSuccessRate}%</Text>
          <Text style={styles.statLabel}>Success Rate</Text>
        </View>

        <View style={styles.statDivider}>
          <View style={styles.statDividerLine} />
        </View>

        <View style={styles.statItem}>
          <LinearGradient
            colors={serviceConfig.lightGradient as [string, string]}
            style={styles.statIconBg}
          >
            <Ionicons name="time-outline" size={20} color={serviceConfig.accentColor} />
          </LinearGradient>
          <Text style={styles.statNumber}>{provider.responseTime}</Text>
          <Text style={styles.statLabel}>Response Time</Text>
        </View>

        <View style={styles.statDivider}>
          <View style={styles.statDividerLine} />
        </View>

        <View style={styles.statItem}>
          <LinearGradient
            colors={['#FEF3C7', '#FDE68A']}
            style={styles.statIconBg}
          >
            <Ionicons name="briefcase-outline" size={20} color="#F59E0B" />
          </LinearGradient>
          <Text style={styles.statNumber}>{provider.completedJobs}+</Text>
          <Text style={styles.statLabel}>Jobs Done</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const renderTabs = () => {
    const tabs: Array<{ id: 'overview' | 'reviews' | 'gallery' | 'availability'; label: string; icon: string }> = [
      { id: 'overview', label: 'Overview', icon: 'list' },
      { id: 'reviews', label: 'Reviews', icon: 'star' },
      { id: 'gallery', label: 'Gallery', icon: 'images' },
      { id: 'availability', label: 'Schedule', icon: 'calendar' },
    ];

    return (
      <Animated.View
        style={[
          styles.tabsContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScrollContent}
        >
          {tabs.map((tab) => {
            const isSelected = selectedTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tab,
                  isSelected && { backgroundColor: `${serviceConfig.accentColor}12` },
                ]}
                onPress={() => handleTabChange(tab.id)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={16}
                  color={isSelected ? serviceConfig.accentColor : '#64748B'}
                />
                <Text
                  style={[
                    styles.tabText,
                    isSelected && { color: serviceConfig.accentColor, fontFamily: Fonts.bold },
                  ]}
                >
                  {tab.label}
                </Text>
                {isSelected && (
                  <View style={[styles.tabIndicator, { backgroundColor: serviceConfig.accentColor }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>
    );
  };

  const renderAboutSection = () => (
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
          <Ionicons name="person-outline" size={20} color={serviceConfig.accentColor} />
        </LinearGradient>
        <Text style={styles.sectionTitle}>About Me</Text>
      </View>

      <Text style={styles.bioText}>{provider.bio}</Text>

      <View style={styles.languagesContainer}>
        <Text style={styles.languagesLabel}>Languages:</Text>
        <View style={styles.languagesList}>
          {provider.languages.map((language, index) => (
            <View key={index} style={styles.languageTag}>
              <Ionicons name="language" size={12} color={serviceConfig.accentColor} />
              <Text style={[styles.languageText, { color: serviceConfig.accentColor }]}>{language}</Text>
            </View>
          ))}
        </View>
      </View>
    </Animated.View>
  );

  const renderCertificationsSection = () => (
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
          <Ionicons name="ribbon-outline" size={20} color="#10B981" />
        </LinearGradient>
        <Text style={styles.sectionTitle}>Certifications</Text>
      </View>

      <View style={styles.badgesContainer}>
        {provider.certifications.map((cert, index) => {
          const icons = ['shield-checkmark', 'medal-outline', 'checkmark-circle', 'star'];
          const colors = ['#10B981', '#F59E0B', serviceConfig.accentColor, '#EC4899'];
          return (
            <View key={index} style={styles.certificationBadge}>
              <Ionicons name={icons[index % icons.length] as any} size={16} color={colors[index % colors.length]} />
              <Text style={styles.badgeText}>{cert}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <View style={[styles.dividerDot, { backgroundColor: serviceConfig.accentColor }]} />
        <View style={styles.dividerLine} />
      </View>

      <Text style={styles.subSectionTitle}>Skills & Expertise</Text>
      <View style={styles.skillsContainer}>
        {provider.skills.map((skill, index) => (
          <View key={index} style={[styles.skillTag, { backgroundColor: `${serviceConfig.accentColor}12`, borderColor: `${serviceConfig.accentColor}30` }]}>
            <Text style={[styles.skillText, { color: serviceConfig.accentColor }]}>{skill}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );

  const renderServicesSection = () => (
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
          <Ionicons name="construct-outline" size={20} color="#F59E0B" />
        </LinearGradient>
        <Text style={styles.sectionTitle}>Services Offered</Text>
      </View>

      {provider.servicesOffered.map((service: Service, index: number) => (
        <View key={service.id} style={styles.serviceCard}>
          <View style={styles.serviceHeader}>
            <View style={[styles.serviceIconBg, { backgroundColor: `${serviceConfig.accentColor}15` }]}>
              <Ionicons name={service.icon as any} size={20} color={serviceConfig.accentColor} />
            </View>
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>{service.name}</Text>
              <Text style={styles.serviceDescription}>{service.description}</Text>
            </View>
          </View>

          <View style={styles.serviceFooter}>
            <View style={styles.serviceMeta}>
              <Ionicons name="time-outline" size={14} color="#94A3B8" />
              <Text style={styles.serviceMetaText}>{service.duration}</Text>
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.servicePrice}>₨{service.price.toLocaleString()}</Text>
            </View>
          </View>
        </View>
      ))}
    </Animated.View>
  );

  const renderReviewsSection = () => (
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
          <Ionicons name="star" size={20} color="#F59E0B" />
        </LinearGradient>
        <Text style={styles.sectionTitle}>Reviews ({provider.reviews})</Text>
      </View>

      {provider.reviewsList.map((review: Review, index: number) => {
        const isExpanded = expandedReview === review.id;
        const shouldTruncate = review.comment.length > 120;

        return (
          <View key={review.id} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <View style={styles.reviewerInfo}>
                <LinearGradient
                  colors={[review.avatarColor, `${review.avatarColor}CC`]}
                  style={styles.reviewerAvatar}
                >
                  <Text style={styles.reviewerInitial}>{review.reviewerInitial}</Text>
                </LinearGradient>
                <View>
                  <Text style={styles.reviewerName}>{review.reviewerName}</Text>
                  <Text style={styles.reviewDate}>{review.date}</Text>
                </View>
              </View>
              <View style={styles.reviewRating}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= review.rating ? 'star' : 'star-outline'}
                    size={12}
                    color={star <= review.rating ? '#F59E0B' : '#CBD5E1'}
                  />
                ))}
              </View>
            </View>

            <Text
              style={styles.reviewText}
              numberOfLines={isExpanded || !shouldTruncate ? undefined : 3}
            >
              {review.comment}
            </Text>

            {shouldTruncate && (
              <TouchableOpacity
                onPress={() => setExpandedReview(isExpanded ? null : review.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.readMoreText, { color: serviceConfig.accentColor }]}>
                  {isExpanded ? 'Show less' : 'Read more'}
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.reviewFooter}>
              <TouchableOpacity style={styles.helpfulButton}>
                <Ionicons name="thumbs-up-outline" size={14} color="#64748B" />
                <Text style={styles.helpfulText}>Helpful ({review.helpfulCount})</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </Animated.View>
  );

  const renderGallerySection = () => (
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
          <Ionicons name="images-outline" size={20} color={serviceConfig.accentColor} />
        </LinearGradient>
        <Text style={styles.sectionTitle}>Work Portfolio</Text>
      </View>

      <View style={styles.galleryGrid}>
        {provider.gallery.map((item: GalleryItem, index: number) => (
          <TouchableOpacity
            key={item.id}
            style={styles.galleryItem}
            activeOpacity={0.9}
          >
            <Image source={{ uri: item.image }} style={styles.galleryImage} />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.galleryOverlay}
            >
              <View style={styles.galleryCategoryBadge}>
                <Text style={styles.galleryCategoryText}>{item.category}</Text>
              </View>
              <Text style={styles.galleryTitle}>{item.title}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );

  const renderAvailabilitySection = () => (
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
          <Ionicons name="calendar-outline" size={20} color="#EC4899" />
        </LinearGradient>
        <Text style={styles.sectionTitle}>Weekly Schedule</Text>
      </View>

      {provider.availability.map((slot, index) => (
        <View key={slot.id} style={styles.availabilityCard}>
          <View style={styles.availabilityHeader}>
            <Text style={styles.dayText}>{slot.day}</Text>
            {slot.available ? (
              <View style={styles.availableBadge}>
                <View style={styles.availableDot} />
                <Text style={styles.availableText}>Available</Text>
              </View>
            ) : (
              <View style={styles.unavailableBadge}>
                <Text style={styles.unavailableText}>Closed</Text>
              </View>
            )}
          </View>

          {slot.available && slot.timeSlots.length > 0 && (
            <View style={styles.timeSlotsContainer}>
              {slot.timeSlots.map((time, idx) => (
                <View key={idx} style={[styles.timeSlot, { backgroundColor: `${serviceConfig.accentColor}12` }]}>
                  <Ionicons name="time-outline" size={12} color={serviceConfig.accentColor} />
                  <Text style={[styles.timeSlotText, { color: serviceConfig.accentColor }]}>{time}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}
    </Animated.View>
  );

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'overview':
        return (
          <>
            {renderAboutSection()}
            {renderCertificationsSection()}
            {renderServicesSection()}
          </>
        );
      case 'reviews':
        return renderReviewsSection();
      case 'gallery':
        return renderGallerySection();
      case 'availability':
        return renderAvailabilitySection();
      default:
        return renderAboutSection();
    }
  };

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
      >
        {renderHeroSection()}
        {renderQuickActions()}
        {renderStatsSection()}
        {renderTabs()}
        {renderTabContent()}
      </ScrollView>

      {/* Floating Book Button */}
      <Animated.View
        style={[
          styles.floatingButton,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.bookNowButton}
          onPress={handleBookNow}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={serviceConfig.gradient as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.bookNowGradient}
          >
            <Text style={styles.bookNowText}>Book Now - ₨{provider.price.toLocaleString()}</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerIconButton: {
    width: 42,
    height: 42,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  // Content
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },

  // Hero Section
  heroSection: {
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
  heroGradient: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 200,
    height: 200,
    borderBottomLeftRadius: 100,
  },
  heroTopAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    zIndex: 2,
  },
  profileImageContainer: {
    marginRight: 16,
    position: 'relative',
  },
  profileImageRing: {
    width: 90,
    height: 90,
    borderRadius: 26,
    padding: 3,
  },
  profileImageInner: {
    flex: 1,
    borderRadius: 23,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
  },
  heroProfileImage: {
    width: '100%',
    height: '100%',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  onlineIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
  },
  heroInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  providerName: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: '#0F172A',
    letterSpacing: -0.4,
    marginRight: 8,
  },
  verifiedTextBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  experienceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
    marginBottom: 10,
  },
  experienceText: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  ratingGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: '#92400E',
  },
  reviewsText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: '#64748B',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: '#94A3B8',
    flex: 1,
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 20,
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
  quickActionButton: {
    alignItems: 'center',
    gap: 8,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  quickActionText: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    color: '#64748B',
  },

  // Stats Section
  statsSection: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 20,
    overflow: 'hidden',
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
  statsGradient: {
    flexDirection: 'row',
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  statDivider: {
    height: 60,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  statDividerLine: {
    width: 1,
    height: '100%',
    backgroundColor: '#E2E8F0',
  },

  // Tabs
  tabsContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  tabsScrollContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  tabText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    color: '#64748B',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
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
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: '#0F172A',
    letterSpacing: -0.3,
    flex: 1,
  },

  // About Section
  bioText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 16,
  },
  languagesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  languagesLabel: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    color: '#64748B',
  },
  languagesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
  },
  languageTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  languageText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },

  // Certifications
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  certificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  badgeText: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    color: '#475569',
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  dividerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 12,
  },

  // Skills
  subSectionTitle: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: '#0F172A',
    marginBottom: 12,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  skillText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },

  // Services
  serviceCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  serviceIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: '#0F172A',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: '#64748B',
    lineHeight: 18,
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  serviceMetaText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: '#94A3B8',
  },
  priceContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  servicePrice: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: '#0F172A',
  },

  // Reviews
  reviewCard: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 16,
    marginBottom: 16,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewerInitial: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
  },
  reviewerName: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: '#0F172A',
  },
  reviewDate: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: '#64748B',
  },
  reviewRating: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 8,
  },
  readMoreText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    marginBottom: 12,
  },
  reviewFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  helpfulText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: '#64748B',
  },

  // Gallery
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  galleryItem: {
    width: (width - 64) / 2,
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  galleryOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  galleryCategoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
  },
  galleryCategoryText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
  },
  galleryTitle: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
  },

  // Availability
  availabilityCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  availabilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dayText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: '#0F172A',
  },
  availableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  availableDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  availableText: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
    color: '#059669',
  },
  unavailableBadge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  unavailableText: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
    color: '#DC2626',
  },
  timeSlotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  timeSlotText: {
    fontSize: 11,
    fontFamily: Fonts.medium,
  },

  // Floating Button
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  bookNowButton: {
    borderRadius: 18,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  bookNowGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 10,
  },
  bookNowText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
});