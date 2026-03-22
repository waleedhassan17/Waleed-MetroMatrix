import React, { useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import {
  fetchSpecialties,
  setSearchQuery,
  clearSearch,
  selectFilteredSpecialties,
} from './specialtyListSlice';
import { HealthcareRouteNames } from '../../../../navigation-maps/Healthcare';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { Typography } from '../../../../constants/Fonts';
import type { Specialty } from '../../../../models/healthcare/types';

const { width } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const HORIZONTAL_PAD = 20;
const CARD_GAP = 12;
const CARD_WIDTH = (width - HORIZONTAL_PAD * 2 - CARD_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

// ── Theme ─────────────────────────────────────

const THEME = {
  primary: '#2A7FFF',
  gradient: {
    primary: ['#2A7FFF', '#1857C0'] as [string, string],
  },
};

// ── Specialty icon + gradient palette ─────────

const SPECIALTY_CONFIGS: {
  icon: string;
  gradient: [string, string];
  bg: string;
}[] = [
  { icon: 'stethoscope',          gradient: ['#2A7FFF', '#1E6AE1'], bg: '#F0F7FF' },
  { icon: 'heart-pulse',          gradient: ['#EF4444', '#DC2626'], bg: '#FEF2F2' },
  { icon: 'hand-heart',           gradient: ['#2A7FFF', '#1E6AE1'], bg: '#EAF3FF' },
  { icon: 'bone',                 gradient: ['#5A9FFF', '#1E6AE1'], bg: '#EAF3FF' },
  { icon: 'baby-face-outline',    gradient: ['#5A9FFF', '#2A7FFF'], bg: '#EAF3FF' },
  { icon: 'emoticon-happy-outline', gradient: ['#10B981', '#059669'], bg: '#F0FDF4' },
  { icon: 'ear-hearing',          gradient: ['#06B6D4', '#0891B2'], bg: '#ECFEFF' },
  { icon: 'brain',                gradient: ['#1857C0', '#0D4299'], bg: '#EAF3FF' },
];

const ICON_MAP: Record<string, string> = {
  'stethoscope': 'stethoscope',
  'heart-pulse': 'heart-pulse',
  'hand': 'hand-heart',
  'bone': 'bone',
  'baby': 'baby-face-outline',
  'smile': 'emoticon-happy-outline',
  'ear': 'ear-hearing',
  'brain': 'brain',
};

const getSpecialtyConfig = (icon: string, index: number) => {
  const mappedIcon = ICON_MAP[icon] || 'stethoscope';
  const config = SPECIALTY_CONFIGS[index % SPECIALTY_CONFIGS.length];
  return { ...config, icon: mappedIcon };
};

// ── Skeleton ──────────────────────────────────

const SkeletonCard: React.FC<{ anim: Animated.Value }> = ({ anim }) => {
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });
  return (
    <Animated.View style={[styles.card, { opacity }]}>
      <View style={[styles.cardIconContainer, { backgroundColor: '#E2E8F0' }]} />
      <View style={{ width: CARD_WIDTH - 24, height: 12, backgroundColor: '#E2E8F0', borderRadius: 6, marginTop: 10 }} />
      <View style={{ width: (CARD_WIDTH - 24) * 0.6, height: 10, backgroundColor: '#E2E8F0', borderRadius: 5, marginTop: 6 }} />
    </Animated.View>
  );
};

// ── Component ─────────────────────────────────

const SpecialtyListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { searchQuery, loading, error } = useAppSelector((state) => state.specialtyList);
  const filteredSpecialties = useAppSelector(selectFilteredSpecialties);
  const [refreshing, setRefreshing] = React.useState(false);
  const [searchFocused, setSearchFocused] = React.useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const skeletonAnim = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    dispatch(fetchSpecialties());

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(headerSlide, { toValue: 0, tension: 80, friction: 9, useNativeDriver: true }),
    ]).start();

    const skeletonLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(skeletonAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    skeletonLoop.start();
    return () => skeletonLoop.stop();
  }, [dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchSpecialties());
    setRefreshing(false);
  }, [dispatch]);

  const handleSpecialtyPress = (specialty: Specialty) => {
    navigation.navigate(HealthcareRouteNames.DoctorList, {
      specialtyId: specialty.specialtyId,
      specialtyName: specialty.name,
    });
  };

  // ── Specialty Card ───────────────────────────

  const renderSpecialtyCard = ({ item, index }: { item: Specialty; index: number }) => {
    const config = getSpecialtyConfig(item.icon, index);
    const delay = (index % 9) * 50;

    const itemAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
      Animated.spring(itemAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        delay,
        useNativeDriver: true,
      }).start();
    }, []);

    return (
      <Animated.View
        style={{
          opacity: itemAnim,
          transform: [{ scale: itemAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
        }}
      >
        <TouchableOpacity
          style={styles.card}
          onPress={() => handleSpecialtyPress(item)}
          activeOpacity={0.75}
        >
          <LinearGradient
            colors={config.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardIconContainer}
          >
            <MaterialCommunityIcons name={config.icon as any} size={26} color="#FFFFFF" />
          </LinearGradient>

          <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>

          <View style={[styles.cardCountBadge, { backgroundColor: config.bg }]}>
            <Text style={[styles.cardCountText, { color: config.gradient[0] }]}>
              {item.doctorCount} docs
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // ── Empty ────────────────────────────────────

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <LinearGradient colors={['#F0F7FF', '#D6E8FF']} style={styles.emptyIconWrap}>
          <Ionicons name="search-outline" size={36} color={THEME.primary} />
        </LinearGradient>
        <Text style={styles.emptyTitle}>
          {searchQuery ? 'No results found' : 'No specialties available'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {searchQuery
            ? `No specialties match "${searchQuery}"`
            : 'Pull down to refresh.'}
        </Text>
      </View>
    );
  };

  // ── Error ────────────────────────────────────

  if (error && !loading && filteredSpecialties.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />
        <LinearGradient colors={THEME.gradient.primary} style={styles.gradientHeader}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Specialties</Text>
            </View>
            <View style={styles.backButton} />
          </View>
        </LinearGradient>
        <View style={styles.errorContainer}>
          <LinearGradient colors={['#FEE2E2', '#FECACA']} style={styles.errorIconWrap}>
            <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
          </LinearGradient>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => dispatch(fetchSpecialties())}
            activeOpacity={0.85}
          >
            <LinearGradient colors={THEME.gradient.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.retryGradient}>
              <Ionicons name="refresh" size={16} color="#FFFFFF" />
              <Text style={styles.retryText}>Try Again</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render ────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />

      {/* ── Gradient Header ── */}
      <Animated.View style={{ transform: [{ translateY: headerSlide }], opacity: fadeAnim }}>
        <LinearGradient
          colors={THEME.gradient.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientHeader}
        >
          {/* Title row */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Medical Specialties</Text>
              <Text style={styles.headerSubtitle}>
                {filteredSpecialties.length > 0
                  ? `${filteredSpecialties.length} specialties available`
                  : 'Browse all departments'}
              </Text>
            </View>
            <View style={styles.backButton} />
          </View>

          {/* Search bar */}
          <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
            <Ionicons
              name="search-outline"
              size={18}
              color={searchFocused ? THEME.primary : '#94A3B8'}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search specialties or conditions…"
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={(t) => dispatch(setSearchQuery(t))}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => dispatch(clearSearch())} style={styles.searchClear}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </Animated.View>

      {/* ── Grid ── */}
      {loading && filteredSpecialties.length === 0 ? (
        <FlatList
          data={Array.from({ length: 9 }, (_, i) => i)}
          renderItem={() => <SkeletonCard anim={skeletonAnim} />}
          keyExtractor={(i) => `sk-${i}`}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          scrollEnabled={false}
        />
      ) : (
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <FlatList
            data={filteredSpecialties}
            renderItem={renderSpecialtyCard}
            keyExtractor={(item) => item.specialtyId}
            numColumns={NUM_COLUMNS}
            contentContainerStyle={styles.gridContent}
            columnWrapperStyle={styles.gridRow}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmpty}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[THEME.primary]}
                tintColor={THEME.primary}
              />
            }
          />
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

// ── Styles ─────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FBFF',
  },

  // Header
  gradientHeader: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
    marginTop: 1,
  },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 14,
    gap: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: { elevation: 3 },
    }),
  },
  searchBarFocused: {
    borderColor: THEME.primary,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#0F172A',
  },
  searchClear: {
    padding: 2,
  },

  // Grid
  gridContent: {
    paddingHorizontal: HORIZONTAL_PAD,
    paddingTop: 20,
    paddingBottom: 60,
  },
  gridRow: {
    justifyContent: 'flex-start',
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },

  // Card
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  cardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  cardName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 6,
    minHeight: 30,
    lineHeight: 15,
  },
  cardCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  cardCountText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
    textAlign: 'center',
  },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 10,
  },
  errorIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  errorMessage: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 6,
  },
  retryButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 4,
  },
  retryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default SpecialtyListScreen;