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
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ScrollView,
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
  Screen,
  SkeletonCard,
} from '../../../../components/ui';
import { categoryAccent, HS } from '../../../../constants/HomeServiceTheme';
import { C, GUTTER, R, S, T } from '../../../../constants/theme';
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
import { formatPrice, formatRating, formatReviewCount } from '../../../../utils/homeservice/format';
import {
  fetchACRepairers,
  fetchElectricians,
  fetchPlumbers,
  selectFilteredProviders,
  selectIsLoading,
  selectSearchQuery,
  selectSelectedSort,
  setSearchQuery,
  setSelectedSort,
  SortOption,
} from './providersSlice';

const SORT_OPTIONS: { label: string; value: SortOption; icon: string }[] = [
  { label: 'Top rated', value: 'rating', icon: 'star-outline' },
  { label: 'Most reviews', value: 'reviews', icon: 'chatbubbles-outline' },
  { label: 'Most experienced', value: 'experience', icon: 'ribbon-outline' },
  { label: 'Lowest price', value: 'price', icon: 'pricetag-outline' },
];

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
}) => {
  const { colors, mode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const rating = formatRating(item.rating);
  const reviews = formatReviewCount(item.reviews);

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
          <Text style={styles.providerName} numberOfLines={1}>
            {item.name}
          </Text>

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
        <View
          style={[
            styles.dot,
            { backgroundColor: item.available ? colors.success : colors.inkFaint },
          ]}
        />
        <Text style={styles.metaText}>
          {item.available ? 'Available now' : 'Busy'}
          {item.responseTime ? ` · Replies in ${item.responseTime}` : ''}
        </Text>
      </View>

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
          <Button
            label="Book"
            size="sm"
            fullWidth={false}
            onPress={() => onBookNow(item.id)}
            style={styles.bookButton}
            accessibilityLabel={`Book ${item.name}`}
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
  const searchQuery = useSelector((state: RootState) => selectSearchQuery(state)) as string;
  const selectedSort = useSelector((state: RootState) => selectSelectedSort(state)) as SortOption;

  const [searchFocused, setSearchFocused] = useState(false);
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

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
  const favoriteItems = useSelector(selectFavorites);
  const pendingFavoriteIds = useSelector(selectPendingFavoriteIds);
  const favorites = useMemo(
    () => [...new Set([...favoriteItems.map((p: Provider) => p.id), ...pendingFavoriteIds])],
    [favoriteItems, pendingFavoriteIds]
  );

  useFocusEffect(
    useCallback(() => {
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
      // Without this the list opens with every heart hollow, however many
      // providers the user has already saved — the slice is only populated by
      // whichever screen last fetched it, and arriving here directly from Home
      // means nothing has.
      dispatch(fetchFavorites() as any);
    }, [serviceType, dispatch])
  );

  const handleProviderPress = useCallback(
    (providerId: string) => {
      navigation.navigate('ProviderProfile', { id: providerId, category: serviceType });
    },
    [navigation, serviceType]
  );

  const handleBookNow = useCallback(
    (providerId: string) => {
      navigation.navigate('BookingScreen', { providerId, category: serviceType });
    },
    [navigation, serviceType]
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
          distance: 'N/A',
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

  const displayedProviders = useMemo(
    () => (showFavoritesOnly ? providers.filter((p) => favorites.includes(p.id)) : providers),
    [providers, favorites, showFavoritesOnly]
  );

  const stats = useMemo(() => {
    const rated = providers.filter((p) => p.rating > 0);
    return {
      total: providers.length,
      // Averaging in the unrated providers dragged the headline number toward
      // zero and made a healthy category look poor.
      avgRating: rated.length
        ? (rated.reduce((sum, p) => sum + p.rating, 0) / rated.length).toFixed(1)
        : null,
      verifiedPercent: providers.length
        ? Math.round((providers.filter((p) => p.verified).length / providers.length) * 100)
        : 0,
    };
  }, [providers]);

  const coldLoad = isLoading && providers.length === 0;
  const title = category.labelPlural.charAt(0).toUpperCase() + category.labelPlural.slice(1);

  return (
    <Screen>
      <AppBar
        title={title}
        subtitle={category.summary}
        onBack={() => navigation.goBack()}
        rightIcon="swap-vertical-outline"
        onRightPress={() => setShowSortSheet(true)}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.search, searchFocused && styles.searchFocused]}>
          <Ionicons name="search" size={18} color={colors.inkFaint} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${category.labelPlural}`}
            placeholderTextColor={colors.inkFaint}
            value={searchQuery}
            onChangeText={(text) => dispatch(setSearchQuery(text))}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => dispatch(setSearchQuery(''))}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={18} color={colors.inkFaint} />
            </TouchableOpacity>
          )}
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
            label={SORT_OPTIONS.find((o) => o.value === selectedSort)?.label ?? 'Sort'}
            icon="swap-vertical-outline"
            onPress={() => setShowSortSheet(true)}
          />
        </View>

        {/* The "Describe the job instead" row used to live here, routing to
            QuickSearchScreen → SearchingProvidersScreen. That flow showed a
            list of providers "responding live" that were hardcoded in the
            screen — names, ratings and prices of people who do not exist,
            arriving on staged timers. There is no broadcast-request endpoint
            behind it, so there was nothing real to show. Removed rather than
            left reachable; the entry point comes back when the backend does. */}

        {providers.length > 0 && (
          <Card style={styles.stats}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.total}</Text>
                <Text style={styles.statLabel}>Available</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.avgRating ?? '—'}</Text>
                <Text style={styles.statLabel}>Avg rating</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.verifiedPercent}%</Text>
                <Text style={styles.statLabel}>Verified</Text>
              </View>
            </View>
          </Card>
        )}

        <Text style={styles.listCount}>
          {showFavoritesOnly ? 'Saved' : 'All providers'} · {displayedProviders.length}
        </Text>

        {coldLoad ? (
          <>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.providerCard}>
                <SkeletonCard lines={2} />
              </View>
            ))}
          </>
        ) : displayedProviders.length === 0 ? (
          <EmptyState
            icon={showFavoritesOnly ? 'heart-outline' : 'search-outline'}
            title={showFavoritesOnly ? 'Nothing saved yet' : 'No providers match that search'}
            message={
              showFavoritesOnly
                ? 'Tap the heart on a provider to keep them here for later.'
                : 'Try a shorter search term, or clear it to see everyone.'
            }
            actionLabel={searchQuery ? 'Clear search' : undefined}
            onAction={searchQuery ? () => dispatch(setSearchQuery('')) : undefined}
          />
        ) : (
          displayedProviders.map((provider) => (
            <ProviderCard
              key={provider.id}
              item={provider}
              tint={category.tint}
              tintSoft={category.tintSoft}
              onPress={handleProviderPress}
              onBookNow={handleBookNow}
              onChat={handleChatPress}
              onCall={handleCallPress}
              isFavorite={favorites.includes(provider.id)}
              onToggleFavorite={handleToggleFavorite}
            />
          ))
        )}
      </ScrollView>

      <ActionSheet
        visible={showSortSheet}
        title="Sort providers"
        onClose={() => setShowSortSheet(false)}
        options={SORT_OPTIONS.map((option) => ({
          label: option.label,
          icon: option.icon,
          description: option.value === selectedSort ? 'Currently applied' : undefined,
          onPress: () => dispatch(setSelectedSort(option.value)),
        }))}
      />
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  content: {
    padding: GUTTER,
    paddingBottom: S.huge,
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
