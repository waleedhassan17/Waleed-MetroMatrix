import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  TextInput,
  FlatList,
  Animated,
  Platform,
  Keyboard,
  Dimensions,
  InteractionManager,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BackButton } from '../../../../components/ui';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import {
  setSearchQuery,
  searchDoctors,
  addRecentSearch,
  clearRecentSearches,
  resetSearch,
  selectSearchResults,
  selectRecentSearches,
  selectPopularSearches,
} from './doctorSearchSlice';
import { fetchSpecialties } from '../specialty-list/specialtyListSlice';
import { HealthcareRouteNames } from '../../../../navigation-maps/Healthcare';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { Typography } from '../../../../constants/Fonts';
import type { Doctor, Specialty } from '../../../../models/healthcare/types';
import DoctorAvatar from '../../../../components/Healthcare/DoctorAvatar';
import {
  getDoctorDisplayName,
  getDoctorSpecialty,
  getConsultationFee,
  getExperienceLabel,
  getRating,
} from '../../../../utils/healthcare/doctorDisplay';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEBOUNCE_MS = 400;

// ── Theme Colors (Consistent with other screens) ─

const THEME = {
  primary: '#2A7FFF',
  primaryDark: '#1E6AE1',
  primaryLight: '#EAF3FF',
  accent: '#5A9FFF',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  gradient: {
    primary: ['#2A7FFF', '#1857C0'],
    header: ['#1857C0', '#1E6AE1'],
    accent: ['#5A9FFF', '#2A7FFF'],
  },
};

// ── Popular Search Categories ───────────────

// Browse entry points.
//
// There were four of these, and all four navigated to SpecialtyList with only a
// `categoryType` param to tell them apart — a param specialtyList.tsx never
// read. So every tile opened the same screen.
//
// Only these two have anything behind them. "By Hospital" would need an
// endpoint that does not exist (clinics are listable only per doctor, via
// GET /doctors/:doctorId/clinics), and "By Condition" would render empty:
// Specialty.commonConditions exists in the schema and is already mapped by the
// client serializer, but the healthcare seed never populates it. Both were
// removed rather than left pointing at the specialty list.
const SEARCH_CATEGORIES = [
  { id: 'specialty', label: 'By Specialty', icon: 'stethoscope', color: '#2A7FFF' },
  { id: 'doctor', label: 'By Name', icon: 'doctor', color: '#5A9FFF' },
] as const;

/**
 * Icons for the specialty chips, keyed by the `icon` the backend stores on each
 * Specialty (see scripts/seed-healthcare.js: 'heart', 'brain', 'bone', …).
 *
 * The chips themselves are NOT hardcoded any more — see renderQuickSuggestions.
 * They used to be a fixed list of practitioner nouns ('Cardiologist',
 * 'Neurologist') fed to the free-text search, while specialties are stored as
 * field nouns ('Cardiology', 'Neurology'), so five of the six matched nothing
 * at all and one matched by accident. This map only decorates; if a specialty
 * arrives with an unknown icon it falls back rather than disappearing.
 */
const SPECIALTY_ICONS: Record<string, { icon: string; color: string }> = {
  heart: { icon: 'heart-pulse', color: '#EF4444' },
  body: { icon: 'face-woman-shimmer', color: '#2A7FFF' },
  brain: { icon: 'brain', color: '#1857C0' },
  stomach: { icon: 'stomach', color: '#10B981' },
  bone: { icon: 'bone', color: '#5A9FFF' },
  child: { icon: 'baby-face-outline', color: '#5A9FFF' },
  female: { icon: 'human-female', color: '#EC4899' },
  stethoscope: { icon: 'stethoscope', color: '#06B6D4' },
};

const SPECIALTY_ICON_FALLBACK = { icon: 'medical-bag', color: '#2A7FFF' };

// ── Skeleton Component ──────────────────────

const SkeletonBox: React.FC<{
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
}> = ({ width, height, borderRadius = 8, style }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: '#E5E7EB', opacity },
        style,
      ]}
    />
  );
};

const DoctorRowSkeleton: React.FC = () => (
  <View style={styles.resultRow}>
    <SkeletonBox width={56} height={56} borderRadius={16} />
    <View style={{ flex: 1, marginLeft: 14 }}>
      <SkeletonBox width="70%" height={16} />
      <SkeletonBox width="50%" height={12} style={{ marginTop: 8 }} />
      <SkeletonBox width="80%" height={10} style={{ marginTop: 8 }} />
    </View>
  </View>
);

// ── Main Component ──────────────────────────

const DoctorSearchScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const isInTab = route.params?.isTab === true;
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const searchBarAnim = useRef(new Animated.Value(0)).current;
  const resultsAnim = useRef(new Animated.Value(0)).current;

  // Built once. Calling .interpolate() inline in the JSX created a fresh
  // animated node on every render — and this component re-renders the moment
  // the input takes focus, because onFocus sets isSearchFocused. That pushed a
  // new transform onto the native view wrapping the TextInput at exactly the
  // wrong moment.
  const searchBarScale = useMemo(
    () =>
      searchBarAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.95, 1],
      }),
    [searchBarAnim]
  );

  const { searchQuery, loading, error } = useAppSelector((s) => s.doctorSearch);
  const results = useAppSelector(selectSearchResults);
  const recentSearches = useAppSelector(selectRecentSearches);
  const popularSearches = useAppSelector(selectPopularSearches);

  // Real specialties, from the same slice the specialty list screen uses — one
  // fetch path, not a second copy. The chips carry a specialtyId, so tapping
  // one navigates straight to that specialty's doctors instead of round-
  // tripping a display label through free-text search.
  const popularSpecialties = useAppSelector(
    (s) => s.specialtyList.specialties
  ).slice(0, 6);

  // Entrance animations. The search bar's scale runs HERE, with the rest, and
  // deliberately not alongside the focus call below: a transform animating on
  // an ancestor of a focused TextInput is a second way Android drops focus, and
  // this spring used to start in the same tick as .focus().
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.spring(searchBarAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // The chips are data now, so they need the specialties. Skipped when another
  // screen has already loaded them — they change about as often as the app is
  // released.
  useEffect(() => {
    if (popularSpecialties.length === 0) dispatch(fetchSpecialties());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  // Auto-focus, once the screen has actually settled.
  //
  // This was a bare setTimeout(..., 200) racing the navigation transition. In a
  // bottom-tab navigator the screen mounts while the tab is still animating, so
  // the timer regularly fired mid-transition; react-native-screens then
  // attaches the screen container and the pending focus is lost.
  // runAfterInteractions waits for the transition to finish instead of guessing
  // at a duration that is wrong on slower devices.
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      inputRef.current?.focus();
    });
    return () => task.cancel();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Animate results when they change
  useEffect(() => {
    if (results.length > 0) {
      Animated.spring(resultsAnim, {
        toValue: 1,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }).start();
    } else {
      resultsAnim.setValue(0);
    }
  }, [results]);

  // ── Handlers ────────────────────────────

  const handleTextChange = useCallback(
    (text: string) => {
      dispatch(setSearchQuery(text));

      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (!text.trim()) return;

      debounceRef.current = setTimeout(() => {
        dispatch(searchDoctors(text));
      }, DEBOUNCE_MS);
    },
    [dispatch]
  );

  const handleSubmit = () => {
    if (!searchQuery.trim()) return;
    Keyboard.dismiss();
    dispatch(addRecentSearch(searchQuery));
    dispatch(searchDoctors(searchQuery));
  };

  const handleRecentPress = (term: string) => {
    dispatch(setSearchQuery(term));
    dispatch(addRecentSearch(term));
    dispatch(searchDoctors(term));
  };

  // Chips know which specialty they are, so go straight to its doctors — the
  // same destination and params specialtyList.tsx uses. No search round-trip,
  // so a label can never drift from the data behind it again.
  const handleSpecialtyPress = (specialty: Specialty) => {
    navigation.navigate(HealthcareRouteNames.DoctorList, {
      specialtyId: specialty.specialtyId,
      specialtyName: specialty.name,
    });
  };

  const handleCategoryPress = (categoryId: (typeof SEARCH_CATEGORIES)[number]['id']) => {
    if (categoryId === 'doctor') {
      // Searching by name IS this screen's search field, which already matches
      // Provider.fullName server-side. Focus it rather than pushing a screen
      // that would duplicate it.
      inputRef.current?.focus();
      return;
    }
    navigation.navigate(HealthcareRouteNames.SpecialtyList);
  };

  const handleDoctorPress = (doctor: Doctor) => {
    if (searchQuery.trim()) dispatch(addRecentSearch(searchQuery));
    navigation.navigate(HealthcareRouteNames.DoctorDetail, {
      doctorId: doctor.doctorId,
    });
  };

  const handleBack = () => {
    dispatch(resetSearch());
    if (!isInTab) navigation.goBack();
  };

  const handleClear = () => {
    dispatch(resetSearch());
    inputRef.current?.focus();
  };

  // ── Doctor Row ──────────────────────────

  const renderDoctorRow = useCallback(
    ({ item }: { item: Doctor; index: number }) => {
      const rating = getRating(item);
      const experience = getExperienceLabel(item);

      return (
        <Animated.View
          style={{
            opacity: resultsAnim,
            transform: [
              {
                translateY: resultsAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          }}
        >
          <TouchableOpacity
            style={styles.resultRow}
            onPress={() => handleDoctorPress(item)}
            activeOpacity={0.7}
          >
            <DoctorAvatar doctor={item} size={48} showOnlineDot />

            {/* Info */}
            <View style={styles.resultInfo}>
              <View style={styles.resultNameRow}>
                <Text style={styles.resultName} numberOfLines={1}>
                  {getDoctorDisplayName(item)}
                </Text>
                {item.isVerified && (
                  <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color={THEME.primary}
                  />
                )}
              </View>

              <Text style={styles.resultSpecialty} numberOfLines={1}>
                {getDoctorSpecialty(item)}
              </Text>

              <View style={styles.resultMetaRow}>
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={10} color="#FBBF24" />
                  <Text style={styles.ratingText}>{rating.value}</Text>
                </View>
                {experience && (
                  <>
                    <View style={styles.metaDot} />
                    <Text style={styles.metaText}>{experience}</Text>
                  </>
                )}
                <View style={styles.metaDot} />
                <Text style={styles.feeText}>{getConsultationFee(item)}</Text>
              </View>
            </View>

            {/* Arrow */}
            <View style={styles.resultArrow}>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={Colors.text.tertiary}
              />
            </View>
          </TouchableOpacity>
        </Animated.View>
      );
    },
    [resultsAnim]
  );

  // ── Recent Searches Section ─────────────

  const renderRecentSearches = () => {
    if (searchQuery.trim() || recentSearches.length === 0) return null;

    return (
      <View style={styles.recentSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="time-outline" size={18} color={THEME.primary} />
            <Text style={styles.sectionTitle}>Recent Searches</Text>
          </View>
          <TouchableOpacity
            onPress={() => dispatch(clearRecentSearches())}
            style={styles.clearButton}
          >
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        </View>

        {recentSearches.map((term: string, index: number) => (
          <TouchableOpacity
            key={`${term}-${index}`}
            style={styles.recentRow}
            onPress={() => handleRecentPress(term)}
            activeOpacity={0.7}
          >
            <View style={styles.recentIconBg}>
              <Ionicons name="search" size={14} color={Colors.text.tertiary} />
            </View>
            <Text style={styles.recentText} numberOfLines={1}>
              {term}
            </Text>
            <TouchableOpacity
              style={styles.recentArrow}
              onPress={() => handleRecentPress(term)}
            >
              <Ionicons
                name="arrow-up-outline"
                size={16}
                color={Colors.text.tertiary}
                style={{ transform: [{ rotate: '45deg' }] }}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // ── Quick Suggestions ───────────────────

  const renderQuickSuggestions = () => {
    // Nothing to show until the specialties arrive. Previously this section was
    // a hardcoded list, so it always rendered — with labels that returned no
    // doctors.
    if (searchQuery.trim() || popularSpecialties.length === 0) return null;

    return (
      <View style={styles.suggestionsSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <MaterialCommunityIcons
              name="lightning-bolt"
              size={18}
              color={THEME.warning}
            />
            <Text style={styles.sectionTitle}>Popular Specialties</Text>
          </View>
        </View>

        <View style={styles.suggestionsGrid}>
          {popularSpecialties.map((specialty) => {
            const theme = SPECIALTY_ICONS[specialty.icon] || SPECIALTY_ICON_FALLBACK;
            return (
              <TouchableOpacity
                key={specialty.specialtyId}
                style={styles.suggestionChip}
                onPress={() => handleSpecialtyPress(specialty)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${specialty.name} doctors`}
              >
                <View
                  style={[styles.suggestionIcon, { backgroundColor: theme.color + '15' }]}
                >
                  <MaterialCommunityIcons
                    name={theme.icon as any}
                    size={16}
                    color={theme.color}
                  />
                </View>
                <Text style={styles.suggestionText}>{specialty.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // ── Search Categories ───────────────────

  const renderSearchCategories = () => {
    if (searchQuery.trim() || recentSearches.length > 0) return null;

    return (
      <View style={styles.categoriesSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="grid-outline" size={18} color={THEME.accent} />
            <Text style={styles.sectionTitle}>Browse by Category</Text>
          </View>
        </View>

        <View style={styles.categoriesGrid}>
          {SEARCH_CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryCard}
              activeOpacity={0.8}
              onPress={() => handleCategoryPress(category.id)}
              accessibilityRole="button"
              accessibilityLabel={category.label}
            >
              <LinearGradient
                colors={[category.color + '15', category.color + '08']}
                style={styles.categoryCardGradient}
              >
                <View
                  style={[
                    styles.categoryIconBg,
                    { backgroundColor: category.color + '20' },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={category.icon as any}
                    size={22}
                    color={category.color}
                  />
                </View>
                <Text style={styles.categoryLabel}>{category.label}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // ── Hints Section ───────────────────────

  const renderHints = () => {
    if (searchQuery.trim() || recentSearches.length > 0) return null;

    return (
      <View style={styles.hintSection}>
        <View style={styles.hintIconContainer}>
          <LinearGradient
            colors={THEME.gradient.primary as any}
            style={styles.hintIconGradient}
          >
            <Ionicons name="search" size={32} color="#FFFFFF" />
          </LinearGradient>
        </View>
        <Text style={styles.hintTitle}>Find the Right Doctor</Text>
        <Text style={styles.hintSubtitle}>
          Search by doctor name, specialty, condition, or hospital
        </Text>
      </View>
    );
  };

  // ── Empty Results ───────────────────────

  const renderEmpty = () => {
    if (loading || !searchQuery.trim()) return null;

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <MaterialCommunityIcons
            name="stethoscope"
            size={48}
            color="#94A3B8"
          />
        </View>
        <Text style={styles.emptyTitle}>No Results Found</Text>
        <Text style={styles.emptySubtitle}>
          No doctors found for "{searchQuery}"
        </Text>
        <Text style={styles.emptyHint}>
          Try searching with a different name, specialty, or condition
        </Text>

        <View style={styles.emptySuggestions}>
          <Text style={styles.emptySuggestionsTitle}>Try searching for:</Text>
          <View style={styles.emptyChips}>
            {['Cardiologist', 'General Physician', 'Dermatologist'].map(
              (term) => (
                <TouchableOpacity
                  key={term}
                  style={styles.emptyChip}
                  onPress={() => handleRecentPress(term)}
                >
                  <Text style={styles.emptyChipText}>{term}</Text>
                </TouchableOpacity>
              )
            )}
          </View>
        </View>
      </View>
    );
  };

  // ── Results Header ──────────────────────

  const renderResultsHeader = () => {
    if (!searchQuery.trim() || results.length === 0) return null;

    return (
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {results.length} {results.length === 1 ? 'doctor' : 'doctors'} found
        </Text>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="filter" size={16} color={THEME.primary} />
          <Text style={styles.filterButtonText}>Filter</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ── Main Render ─────────────────────────

  const showResults = searchQuery.trim().length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E6AE1" />

      {/* ── Gradient Search Header ───────────────── */}
      <LinearGradient
        colors={THEME.gradient.header as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >

        <View style={styles.headerContent}>
          {isInTab ? (
            <View style={styles.backButton}>
              <Ionicons name="search" size={20} color="#FFFFFF" />
            </View>
          ) : (
          <BackButton tone="onAccent" onPress={handleBack} />)}

          <Animated.View
            style={[styles.searchBarWrapper, { transform: [{ scale: searchBarScale }] }]}
          >
            <View
              style={[
                styles.searchBar,
                isSearchFocused && styles.searchBarFocused,
              ]}
            >
              <Ionicons
                name="search-outline"
                size={18}
                color={isSearchFocused ? THEME.primary : Colors.text.tertiary}
              />
              <TextInput
                ref={inputRef}
                style={styles.searchInput}
                placeholder="Search doctors, specialties..."
                placeholderTextColor={Colors.text.tertiary}
                value={searchQuery}
                onChangeText={handleTextChange}
                onSubmitEditing={handleSubmit}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={handleClear}
                  style={styles.clearSearchButton}
                >
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={Colors.text.tertiary}
                  />
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        </View>
      </LinearGradient>

      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* ── Loading indicator ─────────────── */}
        {loading && (
          <View style={styles.loadingBar}>
            <View style={styles.loadingDot} />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        )}

        {/* ── Results / Recent / Hints ──────── */}
        {showResults ? (
          <FlatList
            data={results}
            renderItem={renderDoctorRow}
            keyExtractor={(item) => item.doctorId}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={renderResultsHeader}
            ListEmptyComponent={loading ? (
              <>
                <DoctorRowSkeleton />
                <DoctorRowSkeleton />
                <DoctorRowSkeleton />
              </>
            ) : renderEmpty()}
            keyboardShouldPersistTaps="handled"
          />
        ) : (
          <FlatList
            data={[{ key: 'content' }]}
            renderItem={() => (
              <>
                {renderRecentSearches()}
                {renderQuickSuggestions()}
                {renderSearchCategories()}
                {renderHints()}
              </>
            )}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {/* ── Error Banner ─────────────────── */}
        {error && (
          <Animated.View style={styles.errorBanner}>
            <View style={styles.errorIconBg}>
              <Ionicons name="alert-circle" size={16} color={THEME.error} />
            </View>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              onPress={() => dispatch(searchDoctors(searchQuery))}
            >
              <Text style={styles.errorRetry}>Retry</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
};

// ── Styles ──────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FBFF',
  },

  // Header
  header: {
    paddingTop:
      Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 8 : 8,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBarWrapper: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 2,
    borderColor: 'transparent',
    // Elevation is declared HERE, unconditionally, and must stay that way.
    // It used to be added only in searchBarFocused, i.e. applied to the view
    // that directly wraps the TextInput at the moment that input took focus.
    // On Android, changing elevation reconfigures the native view (it switches
    // the shadow/z-ordering path), and reconfiguring the parent of a focused
    // EditText drops its focus — which dismissed the keyboard a few frames
    // after it opened, fired onBlur, removed the elevation again, and left the
    // field unusable. Only paint-only properties may vary with focus.
    ...Platform.select({
      ios: {
        shadowColor: THEME.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  searchBarFocused: {
    // Border colour and iOS shadow opacity only: both repaint in place without
    // recreating or reconfiguring the native view, so focus survives.
    borderColor: THEME.primary,
    ...Platform.select({
      ios: { shadowOpacity: 0.2 },
      android: {},
    }),
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  clearSearchButton: {
    padding: 4,
  },

  // Content
  content: {
    flex: 1,
  },

  // Loading
  loadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    backgroundColor: THEME.primaryLight,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.primary,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.primary,
  },

  // Body
  bodyContent: {
    paddingBottom: 40,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.error,
  },

  // Recent Searches
  recentSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  recentIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recentText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  recentArrow: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F8FBFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Quick Suggestions
  suggestionsSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  suggestionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
  },

  // Categories
  categoriesSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  categoryCardGradient: {
    padding: 16,
    alignItems: 'center',
  },
  categoryIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
  },

  // Hints
  hintSection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 40,
  },
  hintIconContainer: {
    marginBottom: 20,
  },
  hintIconGradient: {
    width: 72,
    height: 72,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hintTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  hintSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Results List
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: THEME.primaryLight,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.primary,
  },

  // Result Row
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  resultAvatarWrapper: {
    position: 'relative',
  },
  resultAvatar: {
    width: 56,
    height: 56,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: THEME.success,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  resultInfo: {
    flex: 1,
    marginLeft: 14,
  },
  resultNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  resultSpecialty: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text.secondary,
    marginBottom: 6,
  },
  resultMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 8,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  feeText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.primary,
  },
  resultArrow: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F8FBFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 30,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  emptyHint: {
    fontSize: 13,
    fontWeight: '400',
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptySuggestions: {
    marginTop: 28,
    alignItems: 'center',
  },
  emptySuggestionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 12,
  },
  emptyChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  emptyChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: THEME.primaryLight,
  },
  emptyChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.primary,
  },

  // Error Banner
  errorBanner: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  errorIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  errorRetry: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.primary,
  },
});

export default DoctorSearchScreen;