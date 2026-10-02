// ============================================================================
// Providers for a category
//
// The old version spent its whole design budget before the customer reached a
// single provider: a gradient header, a gradient search chip, a gradient
// "Quick Search" button, a gradient stats bar with three gradient icon tiles,
// and then cards with a background gradient, a top-accent gradient, an avatar
// ring gradient, a rating-badge gradient and a gradient Book button — nineteen
// in all. Everything shouted, so nothing led.
//
// Now: one accent (the Book button), a category hairline per card, and the
// provider's name, rating and price doing the work.
//
// Ranking is the SERVER's (distance, rating, available-now and reliability —
// see the backend's services/discoveryPipeline.js). This screen sends the
// customer's sort, filters, search and page and renders the answer in the
// order it arrives; it never re-sorts on the phone.
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import {
  ActionSheet,
  AppBar,
  Avatar,
  Button,
  Card,
  Chip,
  EmptyState,
  FormSheet,
  Screen,
  SegmentedControl,
  SkeletonCard,
  ToneBadge,
} from '../../../../components/ui';
import ProviderDiscoveryMap from '../../../../components/homeservice/ProviderDiscoveryMap';
import { requestDeviceOrigin } from '../../../../networks/serviceProviders/providerNetwork';
import { track } from '../../../../services/analytics/track';
import { categoryAccent } from '../../../../constants/HomeServiceTheme';
import { GUTTER, R, S, T } from '../../../../constants/theme';
import { ThemeColors, useTheme } from '../../../../theme';
import { Provider } from '../../../../models/serviceProviders';
import { RootState } from '../../../../store/store';
import {
  addFavorite,
  fetchFavorites,
  removeFavorite,
  selectFavorites,
  selectPendingFavoriteIds,
} from '../favorites/favoritesSlice';
import {
  fetchActiveBookings,
  selectActiveBookings,
} from '../Booking/bookingScreenSlice';
import { formatPrice, formatRating, formatReviewCount } from '../../../../utils/homeservice/format';
import {
  fetchProvidersByCategory,
  FilterOptions,
  loadMoreProviders,
  ProviderCategory,
  refreshProviders,
  selectFilteredProviders,
  selectFilters,
  selectIsLoading,
  selectIsLoadingMore,
  selectIsRefreshing,
  selectPagination,
  selectSearchArea,
  selectSearchOrigin,
  selectSearchQuery,
  selectSelectedSort,
  setFilters,
  setSearchQuery,
  setSelectedSort,
  SortOption,
} from './providersSlice';

const SORT_OPTIONS: { label: string; value: SortOption; icon: string; needsLocation?: boolean }[] = [
  { label: 'Best match', value: 'best', icon: 'sparkles-outline' },
  { label: 'Nearest', value: 'nearest', icon: 'navigate-outline', needsLocation: true },
  { label: 'Top rated', value: 'rating', icon: 'star-outline' },
  { label: 'Most reviews', value: 'reviews', icon: 'chatbubbles-outline' },
  { label: 'Lowest price', value: 'price_low', icon: 'pricetag-outline' },
  { label: 'Highest price', value: 'price_high', icon: 'trending-up-outline' },
];

const RATING_CHOICES = [0, 3, 4, 4.5];
const DISTANCE_CHOICES = [0, 2, 5, 10, 20];
const PRICE_CHOICES = [0, 1000, 2000, 5000];
const SEARCH_DEBOUNCE_MS = 400;

type ViewMode = 'list' | 'map';

/**
 * Why this provider ranks where it does — at most three reasons, read from
 * the server's score breakdown. Only claims the data supports: "Close by"
 * needs a known distance, "Top rated" a strong Bayesian rating (one 5★ review
 * does not qualify).
 */
function reasonsFor(p: Provider): string[] {
  const b = p.scoreBreakdown;
  if (!b) return [];
  const out: string[] = [];
  if (typeof p.distanceKm === 'number' && !p.distanceApprox && b.distance >= 0.7) out.push('Close by');
  if (b.rating >= 0.9) out.push('Top rated');
  if (p.availableNow) out.push('Available now');
  if (b.quality >= 0.85 && p.completedJobs >= 5) out.push('Reliable');
  return out.slice(0, 3);
}

function distanceLabel(p: Provider): string | null {
  if (typeof p.distanceKm !== 'number') return null;
  return p.distanceApprox ? `~${p.distanceKm} km` : `${p.distanceKm} km away`;
}

// ── Provider card ───────────────────────────────────────────────────────────

interface ProviderCardProps {
  item: Provider;
  tint: string;
  tintSoft: string;
  onPress: (id: string) => void;
  onBookNow: (id: string) => void;
  onChat: (provider: Provider) => void;
  onCall: (provider: Provider) => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  /** True when the customer already has a live request with this provider. */
  hasActiveRequest: boolean;
  /** Shown on the top result when ranking by best match. */
  bestMatch?: boolean;
}

const ProviderCard: React.FC<ProviderCardProps> = ({
  item,
  tint,
  tintSoft,
  onPress,
  onBookNow,
  onChat,
  onCall,
  isFavorite,
  onToggleFavorite,
  hasActiveRequest,
  bestMatch,
}) => {
  const { colors, mode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const rating = formatRating(item.rating);
  const reviews = formatReviewCount(item.reviews);
  const reasons = reasonsFor(item);
  const distance = distanceLabel(item);

  return (
    <Card accentRule={tint} style={styles.providerCard}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onPress(item.id)}
        style={styles.providerTop}
        accessibilityRole="button"
        accessibilityLabel={`View ${item.name}'s profile`}
      >
        <View>
          <Avatar uri={item.image} name={item.name} size={52} tint={tintSoft} color={tint} />
          {item.verified && (
            <View style={[styles.verified, { backgroundColor: tint }]}>
              <Ionicons name="checkmark" size={10} color={colors.inkInverse} />
            </View>
          )}
        </View>

        <View style={styles.providerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.providerName} numberOfLines={1}>
              {item.name}
            </Text>
            {bestMatch && <ToneBadge label="Best match" tone="accent" icon="sparkles" style={styles.bestMatch} />}
          </View>

          {/* A rating of 0 is no rating. The old card printed "★ 0" beside
              "(0 reviews)" for every new provider, which read as a bad one. */}
          <View style={styles.metaRow}>
            {rating ? (
              <>
                <Ionicons name="star" size={13} color={colors.star} />
                <Text style={styles.ratingText}>{rating}</Text>
                {!!reviews && <Text style={styles.metaText}>· {reviews}</Text>}
              </>
            ) : (
              <Text style={styles.metaText}>New provider</Text>
            )}
          </View>

          {!!item.experience && (
            <Text style={styles.metaText} numberOfLines={1}>
              {item.experience} experience
            </Text>
          )}
        </View>

        <TouchableOpacity
          onPress={() => onToggleFavorite(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={isFavorite ? `Remove ${item.name} from favourites` : `Save ${item.name}`}
        >
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={20}
            color={isFavorite ? colors.error : colors.inkFaint}
          />
        </TouchableOpacity>
      </TouchableOpacity>

      <View style={styles.availabilityRow}>
        {/* "Available now" is the server's judgement: online, seen in the last
            few minutes AND inside today's working hours. A bare online toggle
            used to keep people "online" long after they had closed the app. */}
        <View
          style={[
            styles.dot,
            { backgroundColor: item.availableNow ? colors.success : colors.inkFaint },
          ]}
        />
        <Text style={styles.metaText}>
          {item.availableNow ? 'Available now' : item.isOnline ? 'Online' : 'Offline'}
          {item.availableNow && item.responseTime ? ` · Replies in ${item.responseTime}` : ''}
          {distance ? ` · ${distance}` : ''}
          {typeof item.etaMinutes === 'number' ? ` · ~${item.etaMinutes} min` : ''}
        </Text>
      </View>

      {reasons.length > 0 && (
        <View style={styles.reasonRow} accessibilityLabel={`Why this provider: ${reasons.join(', ')}`}>
          {reasons.map((r) => (
            <ToneBadge key={r} label={r} tone="neutral" style={styles.reason} />
          ))}
        </View>
      )}

      <View style={styles.providerFooter}>
        <View>
          <Text style={styles.priceLabel}>From</Text>
          <Text style={styles.price}>{formatPrice(item.price, 'On request')}</Text>
        </View>

        <View style={styles.providerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => onChat(item)}
            accessibilityLabel={`Message ${item.name}`}
          >
            <Ionicons name="chatbubble-outline" size={17} color={colors.inkMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => onCall(item)}
            accessibilityLabel={`Call ${item.name}`}
          >
            <Ionicons name="call-outline" size={17} color={colors.inkMuted} />
          </TouchableOpacity>
          {/* One live request per provider. Sending the customer back into
              the booking form here would only end at the server's duplicate
              guard, so the button says what it can actually do. */}
          <Button
            label={hasActiveRequest ? 'View request' : 'Book'}
            variant={hasActiveRequest ? 'secondary' : 'primary'}
            size="sm"
            fullWidth={false}
            onPress={() => onBookNow(item.id)}
            style={styles.bookButton}
            accessibilityLabel={
              hasActiveRequest ? `View your request with ${item.name}` : `Book ${item.name}`
            }
          />
        </View>
      </View>
    </Card>
  );
};

// ── Screen ──────────────────────────────────────────────────────────────────

type ProvidersScreenRouteParams = {
  serviceType?: 'electricians' | 'plumbers' | 'ac-repairers';
};

export default function ProvidersScreen() {
  const { colors, mode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: ProvidersScreenRouteParams }, 'params'>>();
  const dispatch = useDispatch();

  const { serviceType = 'ac-repairers' } = route.params || {};
  const category = categoryAccent(serviceType, mode);

  const providers = useSelector((state: RootState) => selectFilteredProviders(state)) as Provider[];
  const isLoading = useSelector((state: RootState) => selectIsLoading(state)) as boolean;
  const isRefreshing = useSelector((state: RootState) => selectIsRefreshing(state)) as boolean;
  const isLoadingMore = useSelector((state: RootState) => selectIsLoadingMore(state)) as boolean;
  const searchQuery = useSelector((state: RootState) => selectSearchQuery(state)) as string;
  const selectedSort = useSelector((state: RootState) => selectSelectedSort(state)) as SortOption;
  const filters = useSelector((state: RootState) => selectFilters(state)) as FilterOptions;
  const pagination = useSelector((state: RootState) => selectPagination(state));
  const searchArea = useSelector((state: RootState) => selectSearchArea(state));
  const origin = useSelector((state: RootState) => selectSearchOrigin(state));

  const [searchText, setSearchText] = useState(searchQuery);
  const [searchFocused, setSearchFocused] = useState(false);
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showLocationSheet, setShowLocationSheet] = useState(false);
  const [draftFilters, setDraftFilters] = useState<FilterOptions>(filters);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [locating, setLocating] = useState(false);

  // ── Saved providers ────────────────────────────────────────────────────────
  //
  // These come from the favourites slice, NOT from local state. They used to be
  // a `useState<string[]>` that the heart pushed ids into, which meant a tap
  // here never reached `/user/favorites` at all: the Saved tab reads the server
  // and correctly showed nothing, and the heart itself reset the moment you
  // left the screen. The provider profile always did this properly; this list
  // simply was not wired up.
  //
  // `pendingIds` is folded in so a heart stays filled while its request is in
  // flight, matching `selectIsFavorite` — otherwise it flickers back to an
  // outline for the width of the round trip.
  // Which providers already have this customer's request. Read straight from
  // the booking slice so this list and the provider profile cannot disagree
  // about who has been booked.
  const activeBookings = useSelector(selectActiveBookings);

  const favoriteItems = useSelector(selectFavorites);
  const pendingFavoriteIds = useSelector(selectPendingFavoriteIds);
  const favorites = useMemo(
    () => [...new Set([...favoriteItems.map((p: Provider) => p.id), ...pendingFavoriteIds])],
    [favoriteItems, pendingFavoriteIds]
  );

  const categoryKey = serviceType as ProviderCategory;
  const refetch = useCallback(
    (overrides: { search?: string; sort?: SortOption; filters?: FilterOptions } = {}) =>
      dispatch(fetchProvidersByCategory({ category: categoryKey, ...overrides }) as any),
    [dispatch, categoryKey]
  );

  useFocusEffect(
    useCallback(() => {
      refetch();
      // Without this the list opens with every heart hollow, however many
      // providers the user has already saved — the slice is only populated by
      // whichever screen last fetched it, and arriving here directly from Home
      // means nothing has.
      dispatch(fetchFavorites() as any);
      // Refetched on every focus, not just the first: the customer arrives
      // back here after cancelling a request or having one accepted, and a
      // stale map would leave "View request" on a provider they could book.
      dispatch(fetchActiveBookings() as any);
    }, [refetch, dispatch])
  );

  // Search is the server's (it matches name, trade and bio across every page,
  // not just the fifteen on screen). Debounced so a word is one request.
  const firstSearchRun = useRef(true);
  useEffect(() => {
    if (firstSearchRun.current) {
      firstSearchRun.current = false;
      return;
    }
    const t = setTimeout(() => {
      dispatch(setSearchQuery(searchText));
      refetch({ search: searchText });
      if (searchText.trim().length >= 2) {
        track({ module: 'homeservice', type: 'search', query: searchText.trim(), meta: { category: serviceType } });
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  // Impressions feed the ranking model: which providers were shown, where,
  // and how the heuristic scored them. Logged once per provider per result set.
  const loggedImpressions = useRef<Set<string>>(new Set());
  useEffect(() => {
    loggedImpressions.current = new Set();
  }, [selectedSort, filters, searchQuery, serviceType]);
  useEffect(() => {
    providers.forEach((p, position) => {
      if (loggedImpressions.current.has(p.id)) return;
      loggedImpressions.current.add(p.id);
      const b = p.scoreBreakdown;
      track({
        module: 'homeservice',
        type: 'impression',
        refId: p.id,
        meta: { position, category: serviceType, score: p.matchingScore, context: selectedSort },
        features: b
          ? {
              distance_term: b.distance,
              rating_term: b.rating,
              available_now: b.availability,
              quality_term: b.quality,
              ...(typeof p.distanceKm === 'number' ? { distance_km: p.distanceKm } : {}),
              distance_known: typeof p.distanceKm === 'number' && !p.distanceApprox ? 1 : 0,
              price: p.price || 0,
            }
          : undefined,
      });
    });
  }, [providers, serviceType, selectedSort]);

  const handleProviderPress = useCallback(
    (providerId: string) => {
      const position = providers.findIndex((p) => p.id === providerId);
      track({ module: 'homeservice', type: 'click', refId: providerId, meta: { position, category: serviceType } });
      navigation.navigate('ProviderProfile', { id: providerId, category: serviceType });
    },
    [navigation, serviceType, providers]
  );

  const handleBookNow = useCallback(
    (providerId: string) => {
      // Already requested → straight to the booking status, skipping the date,
      // address and summary steps the customer completed the first time.
      const active = activeBookings[providerId];
      if (active) {
        navigation.navigate('BookConfirmation', {
          category: serviceType,
          bookingId: active.bookingId,
        });
        return;
      }
      navigation.navigate('BookingScreen', { providerId, category: serviceType });
    },
    [navigation, serviceType, activeBookings]
  );

  const handleChatPress = useCallback(
    (provider: Provider) => {
      navigation.navigate('ProviderChatScreen', {
        provider: {
          id: provider.id,
          name: provider.name,
          specialty: provider.specialty,
          rating: provider.rating,
          reviews: provider.reviews,
          image: provider.image,
          distance: distanceLabel(provider) || 'N/A',
        },
        serviceType,
      });
    },
    [navigation, serviceType]
  );

  const handleCallPress = useCallback(
    (provider: Provider) => {
      navigation.navigate('CallScreen', {
        provider: {
          id: provider.id,
          name: provider.name,
          specialty: provider.specialty,
          rating: provider.rating,
          reviews: provider.reviews,
          image: provider.image,
          phoneNumber: provider.phoneNumber,
        },
        serviceType,
      });
    },
    [navigation, serviceType]
  );

  const handleToggleFavorite = useCallback(
    (providerId: string) => {
      // The slice is optimistic and rolls itself back if the request fails, so
      // the heart still feels instant — it is just no longer *only* instant.
      dispatch(
        (favorites.includes(providerId)
          ? removeFavorite(providerId)
          : addFavorite(providerId)) as any
      );
    },
    [dispatch, favorites]
  );

  const applySort = useCallback(
    (sort: SortOption) => {
      dispatch(setSelectedSort(sort));
      refetch({ sort });
    },
    [dispatch, refetch]
  );

  const applyFilters = useCallback(() => {
    const next: FilterOptions = {
      ...(draftFilters.minRating ? { minRating: draftFilters.minRating } : {}),
      ...(draftFilters.maxPrice ? { maxPrice: draftFilters.maxPrice } : {}),
      ...(draftFilters.available ? { available: true } : {}),
      ...(draftFilters.maxDistanceKm && origin ? { maxDistanceKm: draftFilters.maxDistanceKm } : {}),
    };
    dispatch(setFilters(next));
    setShowFilterSheet(false);
    refetch({ filters: next });
  }, [dispatch, draftFilters, origin, refetch]);

  const clearFilters = useCallback(() => {
    dispatch(setFilters({}));
    setDraftFilters({});
    refetch({ filters: {} });
  }, [dispatch, refetch]);

  const useMyLocation = useCallback(async () => {
    setShowLocationSheet(false);
    setLocating(true);
    const found = await requestDeviceOrigin();
    setLocating(false);
    if (found) refetch();
  }, [refetch]);

  const displayedProviders = useMemo(
    () => (showFavoritesOnly ? providers.filter((p) => favorites.includes(p.id)) : providers),
    [providers, favorites, showFavoritesOnly]
  );

  const activeFilterCount =
    (filters.minRating ? 1 : 0) + (filters.maxPrice ? 1 : 0) + (filters.available ? 1 : 0) + (filters.maxDistanceKm ? 1 : 0);

  const coldLoad = isLoading && providers.length === 0;
  const title = category.labelPlural.charAt(0).toUpperCase() + category.labelPlural.slice(1);
  const originLabel = origin ? `Near ${origin.label || (origin.source === 'device' ? 'current location' : 'your address')}` : 'Set your location';
  const originLatLng = origin ? { latitude: origin.lat, longitude: origin.lng } : null;
  const sortLabel = SORT_OPTIONS.find((o) => o.value === selectedSort)?.label ?? 'Sort';

  const header = (
    <View>
      <View style={[styles.search, searchFocused && styles.searchFocused]}>
        <Ionicons name="search" size={18} color={colors.inkFaint} />
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${category.labelPlural}`}
          placeholderTextColor={colors.inkFaint}
          value={searchText}
          onChangeText={setSearchText}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          returnKeyType="search"
        />
        {searchText.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchText('')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Clear search"
          >
            <Ionicons name="close-circle" size={18} color={colors.inkFaint} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterRow}>
        <Chip
          label={locating ? 'Locating…' : originLabel}
          icon={origin ? 'location' : 'location-outline'}
          selected={!!origin}
          onPress={() => setShowLocationSheet(true)}
          style={styles.filterChip}
        />
        <Chip
          label="Filters"
          icon="options-outline"
          count={activeFilterCount || undefined}
          selected={activeFilterCount > 0}
          onPress={() => {
            setDraftFilters(filters);
            setShowFilterSheet(true);
          }}
          style={styles.filterChip}
        />
        <Chip label={sortLabel} icon="swap-vertical-outline" onPress={() => setShowSortSheet(true)} style={styles.filterChip} />
      </View>

      <View style={styles.filterRow}>
        <Chip
          label="Saved"
          icon={showFavoritesOnly ? 'heart' : 'heart-outline'}
          count={favorites.length}
          selected={showFavoritesOnly}
          onPress={() => setShowFavoritesOnly((v) => !v)}
          style={styles.filterChip}
        />
        <Chip
          label="Available now"
          icon={filters.available ? 'flash' : 'flash-outline'}
          selected={!!filters.available}
          onPress={() => {
            const next = { ...filters, available: !filters.available || undefined };
            dispatch(setFilters(next));
            refetch({ filters: next });
          }}
          style={styles.filterChip}
        />
      </View>

      {/* The "Describe the job instead" row used to live here, routing to
          QuickSearchScreen → SearchingProvidersScreen. That flow showed a
          list of providers "responding live" that were hardcoded in the
          screen — names, ratings and prices of people who do not exist,
          arriving on staged timers. There is no broadcast-request endpoint
          behind it, so there was nothing real to show. Removed rather than
          left reachable; the entry point comes back when the backend does. */}

      {searchArea?.widened && searchArea.radiusKm ? (
        <View style={styles.notice} accessibilityRole="text">
          <Ionicons name="information-circle-outline" size={16} color={colors.inkMuted} />
          <Text style={styles.noticeText}>
            Nobody close by right now — showing providers up to {searchArea.radiusKm} km away.
          </Text>
        </View>
      ) : null}
      {!origin && !coldLoad ? (
        <TouchableOpacity style={styles.notice} onPress={() => setShowLocationSheet(true)} accessibilityRole="button">
          <Ionicons name="navigate-outline" size={16} color={colors.accentDeep} />
          <Text style={[styles.noticeText, { color: colors.accentDeep }]}>
            Add your location to see who is nearest.
          </Text>
        </TouchableOpacity>
      ) : null}

      <SegmentedControl
        options={[
          { value: 'list' as ViewMode, label: 'List' },
          { value: 'map' as ViewMode, label: 'Map' },
        ]}
        value={viewMode}
        onChange={setViewMode}
        style={styles.segment}
      />

      {viewMode === 'list' && (
        <Text style={styles.listCount}>
          {showFavoritesOnly
            ? `Saved · ${displayedProviders.length}`
            : `${pagination.totalItems} provider${pagination.totalItems === 1 ? '' : 's'} · ${sortLabel.toLowerCase()}`}
        </Text>
      )}
    </View>
  );

  const empty = coldLoad ? (
    <>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.providerCard}>
          <SkeletonCard lines={2} />
        </View>
      ))}
    </>
  ) : (
    <EmptyState
      icon={showFavoritesOnly ? 'heart-outline' : 'search-outline'}
      title={
        showFavoritesOnly
          ? 'Nothing saved yet'
          : activeFilterCount
            ? 'No providers match these filters'
            : 'No providers match that search'
      }
      message={
        showFavoritesOnly
          ? 'Tap the heart on a provider to keep them here for later.'
          : activeFilterCount
            ? 'Loosen a filter — distance and "available now" narrow the list the most.'
            : 'Try a shorter search term, or clear it to see everyone.'
      }
      actionLabel={activeFilterCount ? 'Clear filters' : searchText ? 'Clear search' : undefined}
      onAction={activeFilterCount ? clearFilters : searchText ? () => setSearchText('') : undefined}
    />
  );

  return (
    <Screen>
      <AppBar
        title={title}
        subtitle={category.summary}
        onBack={() => navigation.goBack()}
        rightIcon="swap-vertical-outline"
        onRightPress={() => setShowSortSheet(true)}
      />

      {viewMode === 'map' ? (
        <View style={[styles.content, styles.mapContent]}>
          {header}
          <ProviderDiscoveryMap
            providers={displayedProviders}
            origin={originLatLng}
            radiusKm={searchArea?.radiusKm ?? null}
            tint={category.tint}
            tintSoft={category.tintSoft}
            onOpenProvider={handleProviderPress}
            onBook={handleBookNow}
          />
        </View>
      ) : (
        <FlatList
          data={displayedProviders}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          renderItem={({ item, index }) => (
            <ProviderCard
              item={item}
              tint={category.tint}
              tintSoft={category.tintSoft}
              onPress={handleProviderPress}
              onBookNow={handleBookNow}
              hasActiveRequest={!!activeBookings[item.id]}
              onChat={handleChatPress}
              onCall={handleCallPress}
              isFavorite={favorites.includes(item.id)}
              onToggleFavorite={handleToggleFavorite}
              bestMatch={index === 0 && selectedSort === 'best' && !showFavoritesOnly && (item.matchingScore ?? 0) >= 0.6}
            />
          )}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (!showFavoritesOnly && pagination.hasNext && !isLoadingMore && !isLoading) {
              dispatch(loadMoreProviders() as any);
            }
          }}
          ListFooterComponent={
            isLoadingMore ? <ActivityIndicator style={styles.footer} color={colors.accent} /> : null
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => dispatch(refreshProviders() as any)}
              tintColor={colors.accent}
            />
          }
        />
      )}

      <ActionSheet
        visible={showSortSheet}
        title="Sort providers"
        onClose={() => setShowSortSheet(false)}
        options={SORT_OPTIONS.filter((o) => !o.needsLocation || origin).map((option) => ({
          label: option.label,
          icon: option.icon,
          description: option.value === selectedSort ? 'Currently applied' : undefined,
          onPress: () => applySort(option.value),
        }))}
      />

      <ActionSheet
        visible={showLocationSheet}
        title="Search near"
        onClose={() => setShowLocationSheet(false)}
        options={[
          { label: 'Use my current location', icon: 'navigate-outline', onPress: useMyLocation },
          {
            label: 'Pin or choose a saved address',
            icon: 'home-outline',
            description: 'Your default address is used when it has a pinned location',
            onPress: () => {
              setShowLocationSheet(false);
              navigation.navigate('AddressManagement');
            },
          },
        ]}
      />

      <FormSheet
        visible={showFilterSheet}
        title="Filter providers"
        onClose={() => setShowFilterSheet(false)}
        footer={
          <View style={styles.sheetFooter}>
            <Button
              label="Reset"
              variant="secondary"
              fullWidth={false}
              onPress={() => setDraftFilters({})}
              style={styles.sheetButton}
            />
            <Button label="Show providers" fullWidth={false} onPress={applyFilters} style={styles.sheetButtonWide} />
          </View>
        }
      >
        <Text style={styles.sheetLabel}>Minimum rating</Text>
        <View style={styles.chipWrap}>
          {RATING_CHOICES.map((r) => (
            <Chip
              key={`r${r}`}
              label={r ? `${r}★ & up` : 'Any'}
              selected={(draftFilters.minRating || 0) === r}
              onPress={() => setDraftFilters((d) => ({ ...d, minRating: r || undefined }))}
              style={styles.sheetChip}
            />
          ))}
        </View>

        <Text style={styles.sheetLabel}>Availability</Text>
        <View style={styles.chipWrap}>
          <Chip
            label="Available now"
            icon="flash-outline"
            selected={!!draftFilters.available}
            onPress={() => setDraftFilters((d) => ({ ...d, available: !d.available || undefined }))}
            style={styles.sheetChip}
          />
        </View>

        <Text style={styles.sheetLabel}>Distance</Text>
        {origin ? (
          <View style={styles.chipWrap}>
            {DISTANCE_CHOICES.map((km) => (
              <Chip
                key={`d${km}`}
                label={km ? `Within ${km} km` : 'Any'}
                selected={(draftFilters.maxDistanceKm || 0) === km}
                onPress={() => setDraftFilters((d) => ({ ...d, maxDistanceKm: km || undefined }))}
                style={styles.sheetChip}
              />
            ))}
          </View>
        ) : (
          <Text style={styles.sheetHint}>Add your location to filter by distance.</Text>
        )}

        <Text style={styles.sheetLabel}>Visit charge</Text>
        <View style={styles.chipWrap}>
          {PRICE_CHOICES.map((p) => (
            <Chip
              key={`p${p}`}
              label={p ? `Up to ${formatPrice(p, '')}` : 'Any'}
              selected={(draftFilters.maxPrice || 0) === p}
              onPress={() => setDraftFilters((d) => ({ ...d, maxPrice: p || undefined }))}
              style={styles.sheetChip}
            />
          ))}
        </View>
      </FormSheet>
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  content: {
    padding: GUTTER,
    paddingBottom: S.huge,
  },
  mapContent: {
    flex: 1,
    paddingBottom: GUTTER,
  },
  segment: {
    marginTop: S.lg,
    marginBottom: S.md,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: S.md,
    padding: S.md,
    borderRadius: R.control,
    backgroundColor: c.surfaceSunken,
  },
  noticeText: {
    ...T.caption,
    color: c.inkMuted,
    flex: 1,
    marginLeft: S.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bestMatch: {
    marginLeft: S.sm,
  },
  reasonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: S.sm,
  },
  reason: {
    marginRight: S.xs,
    marginTop: S.xs,
  },
  footer: {
    marginVertical: S.lg,
  },
  sheetLabel: {
    ...T.label,
    color: c.ink,
    marginTop: S.lg,
    marginBottom: S.sm,
  },
  sheetHint: {
    ...T.caption,
    color: c.inkMuted,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sheetChip: {
    marginRight: S.sm,
    marginBottom: S.sm,
  },
  sheetFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  sheetButton: {
    marginRight: S.sm,
    paddingHorizontal: S.lg,
  },
  sheetButtonWide: {
    paddingHorizontal: S.xl,
  },

  search: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    paddingHorizontal: S.md,
    borderRadius: R.control,
    backgroundColor: c.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.line,
  },
  searchFocused: {
    borderColor: c.accent,
  },
  searchInput: {
    flex: 1,
    marginLeft: S.sm,
    ...T.body,
    color: c.ink,
    padding: 0,
  },

  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: S.md,
  },
  filterChip: {
    marginRight: S.sm,
  },

  quickSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: S.md,
    padding: S.md,
    borderRadius: R.control,
    backgroundColor: c.accentSoft,
  },
  quickSearchText: {
    ...T.label,
    color: c.accentDeep,
    flex: 1,
    marginHorizontal: S.sm,
  },

  stats: {
    marginTop: S.lg,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...T.heading,
    color: c.ink,
  },
  statLabel: {
    ...T.caption,
    color: c.inkMuted,
    marginTop: 2,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: c.line,
  },

  listCount: {
    ...T.label,
    color: c.inkMuted,
    marginTop: S.xxl,
    marginBottom: S.md,
  },

  providerCard: {
    marginBottom: S.md,
  },
  providerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  verified: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: c.surface,
  },
  providerInfo: {
    flex: 1,
    marginHorizontal: S.md,
  },
  providerName: {
    ...T.subhead,
    color: c.ink,
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  ratingText: {
    ...T.label,
    color: c.ink,
    marginLeft: 3,
  },
  metaText: {
    ...T.caption,
    color: c.inkMuted,
    marginLeft: 4,
  },

  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: S.md,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  providerFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: S.md,
    paddingTop: S.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.lineSoft,
  },
  priceLabel: {
    ...T.caption,
    color: c.inkMuted,
  },
  price: {
    ...T.subhead,
    color: c.ink,
  },
  providerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: R.chip,
    backgroundColor: c.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: S.sm,
  },
  bookButton: {
    paddingHorizontal: S.xl,
  },
});
