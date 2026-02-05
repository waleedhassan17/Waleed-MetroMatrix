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
  Modal,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
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

// Sort options for filter modal
const SORT_OPTIONS: { label: string; value: SortOption; icon: string }[] = [
  { label: 'Top Rated', value: 'rating', icon: 'star' },
  { label: 'Most Reviews', value: 'reviews', icon: 'chatbubbles' },
  { label: 'Experience', value: 'experience', icon: 'ribbon' },
  { label: 'Lowest Price', value: 'price', icon: 'pricetag' },
];

// Enhanced Provider Card Component
interface ProviderCardProps {
  item: Provider;
  index: number;
  serviceConfig: typeof SERVICE_CONFIG[string];
  onPress: (id: string) => void;
  onBookNow: (id: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

const ProviderCard: React.FC<ProviderCardProps> = ({
  item,
  index,
  serviceConfig,
  onPress,
  onBookNow,
  isFavorite = false,
  onToggleFavorite,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(60)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    slideAnim.setValue(60);
    opacityAnim.setValue(0);

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
  }, [item.id]);

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
        <LinearGradient
          colors={[`${serviceConfig.accentColor}08`, 'transparent']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.cardBackgroundGradient}
        />

        <LinearGradient
          colors={serviceConfig.gradient as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.cardTopAccent}
        />

        <View style={styles.cardInner}>
          {/* Favorite Button */}
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={() => onToggleFavorite?.(item.id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={20}
              color={isFavorite ? serviceConfig.accentColor : '#94A3B8'}
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.profileSection}
            onPress={() => onPress(item.id)}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.9}
          >
            <View style={styles.profileImageWrapper}>
              <LinearGradient
                colors={serviceConfig.gradient as [string, string]}
                style={styles.profileImageRing}
              >
                <View style={styles.profileImageInner}>
                  <Image source={{ uri: item.image }} style={styles.profileImage} />
                </View>
              </LinearGradient>
              
              {item.verified && (
                <View style={[styles.verifiedBadge, { backgroundColor: serviceConfig.accentColor }]}>
                  <Ionicons name="checkmark" size={10} color="#ffffff" />
                </View>
              )}
              
              <View style={styles.onlineStatus}>
                <View style={[styles.onlineDot, { backgroundColor: item.available ? '#10B981' : '#94A3B8' }]} />
              </View>
            </View>

            <View style={styles.providerInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.providerName}>{item.name}</Text>
                {item.verified && (
                  <View style={styles.verifiedTextBadge}>
                    <Ionicons name="shield-checkmark" size={12} color={serviceConfig.accentColor} />
                  </View>
                )}
              </View>

              <View style={[styles.experienceBadge, { backgroundColor: `${serviceConfig.accentColor}12` }]}>
                <Feather name="award" size={12} color={serviceConfig.accentColor} />
                <Text style={[styles.experienceText, { color: serviceConfig.accentColor }]}>
                  {item.experience} Experience
                </Text>
              </View>

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

              <Text style={styles.specialtyText}>{serviceConfig.specialty}</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <View style={[styles.dividerDot, { backgroundColor: serviceConfig.accentColor }]} />
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.bottomSection}>
            <View style={styles.priceSection}>
              <Text style={styles.priceLabel}>Starting from</Text>
              <View style={styles.priceRow}>
                <Text style={styles.priceCurrency}>₨</Text>
                <Text style={styles.priceValue}>{item.price.toLocaleString()}</Text>
              </View>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.iconButton, styles.chatButton]}
                activeOpacity={0.8}
              >
                <Ionicons name="chatbubble-outline" size={18} color={serviceConfig.accentColor} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.iconButton, styles.callButton]}
                activeOpacity={0.8}
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

          <TouchableOpacity 
            style={styles.statusFooter}
            onPress={() => onPress(item.id)}
            activeOpacity={0.9}
          >
            <View style={styles.statusLeft}>
              <View style={styles.availableBadge}>
                <View style={styles.pulsingDot}>
                  <View style={[styles.pulsingDotInner, { backgroundColor: item.available ? '#10B981' : '#94A3B8' }]} />
                </View>
                <Text style={[styles.availableText, { color: item.available ? '#10B981' : '#94A3B8' }]}>
                  {item.available ? 'Available Now' : 'Busy'}
                </Text>
              </View>
            </View>
            <View style={styles.responseContainer}>
              <Feather name="zap" size={12} color="#94A3B8" />
              <Text style={styles.responseText}>{item.responseTime} response</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

// Filter Modal Component
interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  selectedSort: SortOption;
  onSelectSort: (sort: SortOption) => void;
  accentColor: string;
}

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  selectedSort,
  onSelectSort,
  accentColor,
}) => {
  const slideAnim = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <Animated.View 
          style={[
            styles.filterModalContainer,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <TouchableOpacity activeOpacity={1}>
            <View style={styles.filterModalHandle} />
            <Text style={styles.filterModalTitle}>Sort By</Text>
            
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.filterOption,
                  selectedSort === option.value && { backgroundColor: `${accentColor}12` },
                ]}
                onPress={() => {
                  onSelectSort(option.value);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.filterOptionIcon,
                  { backgroundColor: selectedSort === option.value ? `${accentColor}20` : '#F1F5F9' },
                ]}>
                  <Ionicons 
                    name={option.icon as any} 
                    size={18} 
                    color={selectedSort === option.value ? accentColor : '#64748B'} 
                  />
                </View>
                <Text style={[
                  styles.filterOptionText,
                  selectedSort === option.value && { color: accentColor, fontWeight: '600' },
                ]}>
                  {option.label}
                </Text>
                {selectedSort === option.value && (
                  <Ionicons name="checkmark-circle" size={22} color={accentColor} />
                )}
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
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
  const selectedSort = useSelector((state: RootState) => selectSelectedSort(state)) as SortOption;

  const [searchFocused, setSearchFocused] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const headerSlideAnim = useRef(new Animated.Value(0)).current;
  const searchFocusAnim = useRef(new Animated.Value(0)).current;

  const serviceConfig = useMemo(() => 
    SERVICE_CONFIG[serviceType] || SERVICE_CONFIG['ac-repairers'], 
    [serviceType]
  );

  const animationsRef = useRef<Animated.CompositeAnimation | null>(null);

  useFocusEffect(
    useCallback(() => {
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      headerSlideAnim.setValue(-50);

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

      animationsRef.current = Animated.parallel([
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
      ]);
      animationsRef.current.start();

      return () => {
        if (animationsRef.current) {
          animationsRef.current.stop();
        }
      };
    }, [serviceType, dispatch])
  );

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleProviderPress = useCallback((providerId: string) => {
    // @ts-ignore
    navigation.navigate('ProviderProfile', { 
      id: providerId, 
      category: serviceType as 'electricians' | 'plumbers' | 'ac-repairers'
    });
  }, [navigation, serviceType]);

  const handleBookNow = useCallback((providerId: string) => {
    // @ts-ignore
    navigation.navigate('BookingScreen', { 
      providerId: providerId, 
      category: serviceType as 'electricians' | 'plumbers' | 'ac-repairers'
    });
  }, [navigation, serviceType]);

  const handleQuickSearch = useCallback(() => {
    // @ts-ignore
    navigation.navigate('QuickSearchScreen', {
      serviceType: serviceType,
    });
  }, [navigation, serviceType]);

  const handleToggleFavorite = useCallback((providerId: string) => {
    setFavorites(prev => 
      prev.includes(providerId) 
        ? prev.filter(id => id !== providerId)
        : [...prev, providerId]
    );
  }, []);

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

  const handleSortChange = useCallback((sort: SortOption) => {
    dispatch(setSelectedSort(sort));
  }, [dispatch]);

  // Filter providers based on favorites view
  const displayedProviders = useMemo(() => {
    if (showFavoritesOnly) {
      return providers.filter(p => favorites.includes(p.id));
    }
    return providers;
  }, [providers, favorites, showFavoritesOnly]);

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
              <Text style={styles.headerTitle}>All {serviceConfig.title}</Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.headerIconButton} 
              activeOpacity={0.8}
              onPress={() => setShowFilterModal(true)}
            >
              <Ionicons name="filter" size={20} color="#64748B" />
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
          placeholder={`Search ${serviceConfig.title.toLowerCase()}...`}
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

  // Quick Search and Favorites Buttons
  const renderActionButtons = () => (
    <Animated.View
      style={[
        styles.actionButtonsContainer,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <TouchableOpacity
        style={styles.quickSearchButton}
        onPress={handleQuickSearch}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={serviceConfig.gradient as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.quickSearchGradient}
        >
          <Ionicons name="flash" size={20} color="#FFFFFF" />
          <Text style={styles.quickSearchText}>Quick Search</Text>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.favoritesButton,
          showFavoritesOnly && styles.favoritesButtonActive,
          { shadowColor: serviceConfig.accentColor },
        ]}
        onPress={() => setShowFavoritesOnly(!showFavoritesOnly)}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={showFavoritesOnly ? serviceConfig.gradient as [string, string] : (serviceConfig.lightGradient as [string, string])}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.favoritesGradient}
        >
          <Ionicons 
            name={showFavoritesOnly ? 'heart' : 'heart-outline'} 
            size={22} 
            color={showFavoritesOnly ? '#FFFFFF' : serviceConfig.accentColor} 
          />
          {favorites.length > 0 && (
            <View style={styles.favoritesBadge}>
              <Text style={[styles.favoritesBadgeText, { color: serviceConfig.accentColor }]}>{favorites.length}</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
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
        {renderActionButtons()}
        {renderStatsBar()}

        <View style={styles.listContainer}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>
              {showFavoritesOnly ? 'Favorites' : 'Available Providers'}
            </Text>
            <Text style={styles.listCount}>{displayedProviders.length} found</Text>
          </View>

          {displayedProviders.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons 
                name={showFavoritesOnly ? 'heart-outline' : 'search-outline'} 
                size={48} 
                color="#CBD5E1" 
              />
              <Text style={styles.emptyStateText}>
                {showFavoritesOnly 
                  ? 'No favorites yet. Tap the heart icon to add providers to your favorites.'
                  : 'No providers found. Try a different search term.'}
              </Text>
            </View>
          ) : (
            displayedProviders.map((provider, index) => (
              <ProviderCard
                key={provider.id}
                item={provider}
                index={index}
                serviceConfig={serviceConfig}
                onPress={handleProviderPress}
                onBookNow={handleBookNow}
                isFavorite={favorites.includes(provider.id)}
                onToggleFavorite={handleToggleFavorite}
              />
            ))
          )}
        </View>
      </ScrollView>

      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        selectedSort={selectedSort}
        onSelectSort={handleSortChange}
        accentColor={serviceConfig.accentColor}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerGradient: {
    paddingTop: isAndroid ? StatusBar.currentHeight : 0,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: -0.3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 4,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  searchIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    paddingHorizontal: 12,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  quickSearchButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  quickSearchGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  quickSearchText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  favoritesButton: {
    width: 56,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  favoritesButtonActive: {
    shadowColor: '#EF4444',
  },
  favoritesGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    position: 'relative',
  },
  favoritesBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  favoritesBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EF4444',
  },
  statsBar: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  statDivider: {
    height: 40,
    justifyContent: 'center',
  },
  statDividerLine: {
    width: 1,
    height: '100%',
    backgroundColor: '#E2E8F0',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  listCount: {
    fontSize: 14,
    color: '#64748B',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyStateText: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
  },
  providerCard: {
    marginBottom: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
  },
  cardTouchable: {
    position: 'relative',
  },
  cardBackgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardTopAccent: {
    height: 4,
    width: '100%',
  },
  cardInner: {
    padding: 16,
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  profileImageWrapper: {
    position: 'relative',
    marginRight: 14,
  },
  profileImageRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    padding: 3,
  },
  profileImageInner: {
    flex: 1,
    borderRadius: 33,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  onlineStatus: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  providerInfo: {
    flex: 1,
    paddingRight: 32,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  providerName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
  },
  verifiedTextBadge: {
    marginLeft: 4,
  },
  experienceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    marginBottom: 8,
  },
  experienceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  ratingSection: {
    marginBottom: 6,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  reviewsText: {
    fontSize: 13,
    color: '#64748B',
    marginLeft: 6,
  },
  specialtyText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
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
  bottomSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceSection: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceCurrency: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginRight: 2,
  },
  priceValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatButton: {
    backgroundColor: '#F1F5F9',
  },
  callButton: {
    backgroundColor: '#ECFDF5',
  },
  bookButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  bookButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  bookButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulsingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulsingDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  availableText: {
    fontSize: 13,
    fontWeight: '600',
  },
  responseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  responseText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  // Filter Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 34,
  },
  filterModalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  filterModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  filterOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  filterOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#334155',
  },
});