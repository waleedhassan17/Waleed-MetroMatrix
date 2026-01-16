import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
  Image,
  FlatList,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors } from '../../../../constants/Colors';
import { Fonts } from '../../../../constants/Fonts';
import {
  selectFilteredProviders,
  selectIsLoading,
  selectSearchQuery,
  selectSelectedSort,
  setSearchQuery,
  setSelectedSort,
  fetchElectricians,
  fetchPlumbers,
  fetchACRepairers,
  Provider,
  SortOption,
} from './providersSlice';
import { RootState } from '../../../../store/store';

const { width, height } = Dimensions.get('window');
const isAndroid = Platform.OS === 'android';

// Service type configurations with gradient colors
const SERVICE_CONFIG: Record<string, { 
  title: string; 
  subtitle: string; 
  specialty: string;
  gradient: string[];
  lightGradient: string[];
  accentColor: string;
  icon: string;
}> = {
  electricians: {
    title: 'Electricians',
    subtitle: 'expert electricians available',
    specialty: '⚡ Wiring • Installation • Repairs',
    gradient: ['#F59E0B', '#D97706'],
    lightGradient: ['#FEF3C7', '#FDE68A'],
    accentColor: '#F59E0B',
    icon: 'flash',
  },
  plumbers: {
    title: 'Plumbers',
    subtitle: 'expert plumbers available',
    specialty: '🔧 Pipe Fitting • Leak Repairs • Installation',
    gradient: ['#3B82F6', '#2563EB'],
    lightGradient: ['#DBEAFE', '#BFDBFE'],
    accentColor: '#3B82F6',
    icon: 'water',
  },
  'ac-repairers': {
    title: 'AC Repairers',
    subtitle: 'expert AC repairers available',
    specialty: '❄️ AC Installation • Cooling Issues • Gas Refilling',
    gradient: ['#06B6D4', '#0891B2'],
    lightGradient: ['#CFFAFE', '#A5F3FC'],
    accentColor: '#06B6D4',
    icon: 'snow',
  },
};

// Enhanced Provider Card Component
interface ProviderCardProps {
  item: Provider;
  index: number;
  serviceConfig: typeof SERVICE_CONFIG[string];
  onPress: (id: string) => void;
  onBookNow: (id: string) => void;
}

const ProviderCard: React.FC<ProviderCardProps> = ({
  item,
  index,
  serviceConfig,
  onPress,
  onBookNow,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(60)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 500,
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
        styles.providerCard,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.cardTouchable}>
        {/* Card Background Gradient Accent */}
        <LinearGradient
          colors={[`${serviceConfig.accentColor}08`, 'transparent']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.cardBackgroundGradient}
        />

        {/* Top Accent Line */}
        <LinearGradient
          colors={serviceConfig.gradient as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.cardTopAccent}
        />

        <View style={styles.cardInner}>
          {/* Profile Section - Touchable to navigate to profile */}
          <TouchableOpacity 
            style={styles.profileSection}
            onPress={() => onPress(item.id)}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.9}
          >
            {/* Profile Image with Ring */}
            <View style={styles.profileImageWrapper}>
              <LinearGradient
                colors={serviceConfig.gradient as [string, string]}
                style={styles.profileImageRing}
              >
                <View style={styles.profileImageInner}>
                  <Image source={{ uri: item.image }} style={styles.profileImage} />
                </View>
              </LinearGradient>
              
              {/* Verified Badge */}
              {item.verified && (
                <View style={[styles.verifiedBadge, { backgroundColor: serviceConfig.accentColor }]}>
                  <Ionicons name="checkmark" size={10} color="#ffffff" />
                </View>
              )}
              
              {/* Online Status */}
              <View style={styles.onlineStatus}>
                <View style={styles.onlineDot} />
              </View>
            </View>

            {/* Provider Info */}
            <View style={styles.providerInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.providerName}>{item.name}</Text>
                {item.verified && (
                  <View style={styles.verifiedTextBadge}>
                    <Ionicons name="shield-checkmark" size={12} color={serviceConfig.accentColor} />
                  </View>
                )}
              </View>

              {/* Experience Badge */}
              <View style={[styles.experienceBadge, { backgroundColor: `${serviceConfig.accentColor}12` }]}>
                <Feather name="award" size={12} color={serviceConfig.accentColor} />
                <Text style={[styles.experienceText, { color: serviceConfig.accentColor }]}>
                  {item.experience} Experience
                </Text>
              </View>

              {/* Rating Section */}
              <View style={styles.ratingSection}>
                <View style={styles.ratingContainer}>
                  <LinearGradient
                    colors={['#FEF3C7', '#FDE68A']}
                    style={styles.ratingGradient}
                  >
                    <Ionicons name="star" size={12} color="#F59E0B" />
                    <Text style={styles.ratingText}>{item.rating}</Text>
                  </LinearGradient>
                  <Text style={styles.reviewsText}>({item.reviews} reviews)</Text>
                </View>
              </View>

              {/* Specialty Tags */}
              <Text style={styles.specialtyText}>{serviceConfig.specialty}</Text>
            </View>
          </TouchableOpacity>

          {/* Elegant Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <View style={[styles.dividerDot, { backgroundColor: serviceConfig.accentColor }]} />
            <View style={styles.dividerLine} />
          </View>

          {/* Bottom Section */}
          <View style={styles.bottomSection}>
            {/* Price */}
            <View style={styles.priceSection}>
              <Text style={styles.priceLabel}>Starting from</Text>
              <View style={styles.priceRow}>
                <Text style={styles.priceCurrency}>₨</Text>
                <Text style={styles.priceValue}>{item.price.toLocaleString()}</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.iconButton, styles.chatButton]}
                activeOpacity={0.8}
                onPress={() => {}}
              >
                <Ionicons name="chatbubble-outline" size={18} color={serviceConfig.accentColor} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.iconButton, styles.callButton]}
                activeOpacity={0.8}
                onPress={() => {}}
              >
                <Ionicons name="call-outline" size={18} color="#10B981" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.bookButton}
                activeOpacity={0.9}
                onPress={() => onBookNow(item.id)}
              >
                <LinearGradient
                  colors={serviceConfig.gradient as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.bookButtonGradient}
                >
                  <Text style={styles.bookButtonText}>Book Now</Text>
                  <Ionicons name="arrow-forward" size={14} color="#ffffff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* Status Footer - Also touchable to navigate to profile */}
          <TouchableOpacity 
            style={styles.statusFooter}
            onPress={() => onPress(item.id)}
            activeOpacity={0.9}
          >
            <View style={styles.statusLeft}>
              <View style={styles.availableBadge}>
                <View style={styles.pulsingDot}>
                  <View style={styles.pulsingDotInner} />
                </View>
                <Text style={styles.availableText}>Available Now</Text>
              </View>
            </View>
            <View style={styles.responseContainer}>
              <Feather name="zap" size={12} color="#94A3B8" />
              <Text style={styles.responseText}>~10 min response</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

type ProvidersScreenRouteParams = {
  serviceType?: 'electricians' | 'plumbers' | 'ac-repairers';
};

export default function ProvidersScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: ProvidersScreenRouteParams }, 'params'>>();
  const dispatch = useDispatch();

  const { serviceType = 'ac-repairers' } = route.params || {};

  const providers = useSelector((state: RootState) => selectFilteredProviders(state)) as Provider[];
  const isLoading = useSelector((state: RootState) => selectIsLoading(state)) as boolean;
  const searchQuery = useSelector((state: RootState) => selectSearchQuery(state)) as string;

  const [searchFocused, setSearchFocused] = useState(false);

  // Animation references
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const headerSlideAnim = useRef(new Animated.Value(-50)).current;
  const searchFocusAnim = useRef(new Animated.Value(0)).current;

  const serviceConfig = useMemo(() => 
    SERVICE_CONFIG[serviceType] || SERVICE_CONFIG['ac-repairers'], 
    [serviceType]
  );

  useEffect(() => {
    switch (serviceType) {
      case 'electricians':
        dispatch(fetchElectricians() as any);
        break;
      case 'plumbers':
        dispatch(fetchPlumbers() as any);
        break;
      case 'ac-repairers':
      default:
        dispatch(fetchACRepairers() as any);
        break;
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
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
  }, [serviceType]);

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleProviderPress = useCallback((providerId: string) => {
    // @ts-ignore - Route may not be defined yet
    navigation.navigate('ProviderProfile', { 
      id: providerId, 
      category: serviceType as 'electricians' | 'plumbers' | 'ac-repairers'
    });
  }, [navigation, serviceType]);

  const handleBookNow = useCallback((providerId: string) => {
    // @ts-ignore - Route may not be defined yet
    navigation.navigate('BookingScreen', { 
      providerId: providerId, 
      category: serviceType as 'electricians' | 'plumbers' | 'ac-repairers'
    });
  }, [navigation, serviceType]);

  const handleSearchFocus = () => {
    setSearchFocused(true);
    Animated.spring(searchFocusAnim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: false,
    }).start();
  };

  const handleSearchBlur = () => {
    setSearchFocused(false);
    Animated.spring(searchFocusAnim, {
      toValue: 0,
      tension: 100,
      friction: 8,
      useNativeDriver: false,
    }).start();
  };

  const handleSearchChange = useCallback((text: string) => {
    dispatch(setSearchQuery(text));
  }, [dispatch]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = providers.length;
    const avgRating = providers.length > 0 
      ? (providers.reduce((sum: number, p: Provider) => sum + p.rating, 0) / providers.length).toFixed(1)
      : '0';
    const verifiedPercent = providers.length > 0
      ? Math.round((providers.filter((p: Provider) => p.verified).length / providers.length) * 100)
      : 0;
    return { total, avgRating, verifiedPercent };
  }, [providers]);

  const renderHeader = () => (
    <Animated.View
      style={[
        styles.header,
        {
          opacity: fadeAnim,
          transform: [{ translateY: headerSlideAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={['#FFFFFF', '#F8FAFC']}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackPress}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={22} color="#1E293B" />
            </TouchableOpacity>

            <View style={styles.titleContainer}>
              <View style={styles.titleRow}>
                <View style={[styles.titleIconBg, { backgroundColor: `${serviceConfig.accentColor}15` }]}>
                  <Ionicons name={serviceConfig.icon as any} size={16} color={serviceConfig.accentColor} />
                </View>
                <Text style={styles.headerTitle}>All {serviceConfig.title}</Text>
              </View>
              <Text style={styles.headerSubtitle}>
                {providers.length} {serviceConfig.subtitle}
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerIconButton} activeOpacity={0.8}>
              <Ionicons name="options-outline" size={20} color="#64748B" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIconButton} activeOpacity={0.8}>
              <Ionicons name="heart-outline" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const renderSearchSection = () => (
    <Animated.View
      style={[
        styles.searchSection,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <Animated.View
        style={[
          styles.searchContainer,
          {
            borderColor: searchFocusAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['#E2E8F0', serviceConfig.accentColor],
            }),
            transform: [{
              scale: searchFocusAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.01],
              }),
            }],
          },
        ]}
      >
        <LinearGradient
          colors={searchFocused ? serviceConfig.lightGradient as [string, string] : ['#F8FAFC', '#F1F5F9']}
          style={styles.searchIconBg}
        >
          <Ionicons name="search" size={18} color={searchFocused ? serviceConfig.accentColor : '#94A3B8'} />
        </LinearGradient>

        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${serviceConfig.title.toLowerCase()} by name...`}
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={handleSearchChange}
          onFocus={handleSearchFocus}
          onBlur={handleSearchBlur}
        />

        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => handleSearchChange('')}
            activeOpacity={0.8}
          >
            <View style={styles.clearButtonInner}>
              <Ionicons name="close" size={14} color="#64748B" />
            </View>
          </TouchableOpacity>
        )}
      </Animated.View>
    </Animated.View>
  );

  const renderStatsBar = () => (
    <Animated.View
      style={[
        styles.statsBar,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <LinearGradient
        colors={['#FFFFFF', '#FAFAFA']}
        style={styles.statsGradient}
      >
        <View style={styles.statItem}>
          <LinearGradient
            colors={serviceConfig.lightGradient as [string, string]}
            style={styles.statIconBg}
          >
            <Ionicons name="people" size={18} color={serviceConfig.accentColor} />
          </LinearGradient>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total Experts</Text>
        </View>

        <View style={styles.statDivider}>
          <View style={styles.statDividerLine} />
        </View>

        <View style={styles.statItem}>
          <LinearGradient
            colors={['#FEF3C7', '#FDE68A']}
            style={styles.statIconBg}
          >
            <Ionicons name="star" size={18} color="#F59E0B" />
          </LinearGradient>
          <Text style={styles.statNumber}>{stats.avgRating}</Text>
          <Text style={styles.statLabel}>Avg Rating</Text>
        </View>

        <View style={styles.statDivider}>
          <View style={styles.statDividerLine} />
        </View>

        <View style={styles.statItem}>
          <LinearGradient
            colors={['#D1FAE5', '#A7F3D0']}
            style={styles.statIconBg}
          >
            <Ionicons name="shield-checkmark" size={18} color="#10B981" />
          </LinearGradient>
          <Text style={styles.statNumber}>{stats.verifiedPercent}%</Text>
          <Text style={styles.statLabel}>Verified</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const renderProviderCard = ({ item, index }: { item: Provider; index: number }) => (
    <ProviderCard
      item={item}
      index={index}
      serviceConfig={serviceConfig}
      onPress={handleProviderPress}
      onBookNow={handleBookNow}
    />
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
      >
        {renderSearchSection()}
        {renderStatsBar()}

        <View style={styles.listContainer}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Available Experts</Text>
            <View style={styles.sortButton}>
              <Text style={styles.sortText}>Top Rated</Text>
              <Ionicons name="chevron-down" size={14} color="#64748B" />
            </View>
          </View>

          <FlatList
            data={providers}
            renderItem={renderProviderCard}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // Header Styles
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    width: 42,
    height: 42,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  titleContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  titleIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: '#64748B',
    marginLeft: 38,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
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
    paddingBottom: 100,
  },

  // Search Section
  searchSection: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  searchIconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.medium,
    color: '#0F172A',
    paddingVertical: 8,
  },
  clearButton: {
    padding: 8,
  },
  clearButtonInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Stats Bar
  statsBar: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
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
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: '#64748B',
    marginTop: 2,
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

  // List
  listContainer: {
    paddingHorizontal: 20,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: '#0F172A',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  sortText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: '#64748B',
  },
  listContent: {
    gap: 16,
  },

  // Provider Card
  providerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
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
  cardTouchable: {
    overflow: 'hidden',
  },
  cardBackgroundGradient: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 200,
    height: 200,
    borderBottomLeftRadius: 100,
  },
  cardTopAccent: {
    height: 4,
    width: '100%',
  },
  cardInner: {
    padding: 20,
  },

  // Profile Section
  profileSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  profileImageWrapper: {
    marginRight: 16,
  },
  profileImageRing: {
    width: 72,
    height: 72,
    borderRadius: 24,
    padding: 3,
  },
  profileImageInner: {
    flex: 1,
    borderRadius: 21,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  onlineStatus: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  providerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  providerName: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: '#0F172A',
    letterSpacing: -0.3,
    marginRight: 8,
  },
  verifiedTextBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
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
  ratingSection: {
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  specialtyText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: '#64748B',
    lineHeight: 18,
  },

  // Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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

  // Bottom Section
  bottomSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  priceSection: {
    alignItems: 'flex-start',
  },
  priceLabel: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: '#94A3B8',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceCurrency: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: '#64748B',
    marginRight: 2,
  },
  priceValue: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  chatButton: {
    backgroundColor: '#F0F9FF',
    borderColor: '#E0F2FE',
  },
  callButton: {
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
  },
  bookButton: {
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  bookButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 6,
  },
  bookButtonText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
  },

  // Status Footer
  statusFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  pulsingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#BBF7D0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulsingDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  availableText: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    color: '#059669',
  },
  responseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  responseText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: '#94A3B8',
  },
});