// ============================================================================
// Saved providers.
//
// The destination for the heart on a provider profile and for the Favorites
// row in the account menus.
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import {
  AppBar,
  Avatar,
  Card,
  EmptyState,
  ErrorState,
  Screen,
  SkeletonCard,
} from '../../../../components/ui';
import { categoryAccent, HS } from '../../../../constants/HomeServiceTheme';
import { C, GUTTER, S, T } from '../../../../constants/theme';
import { ThemeColors, useTheme } from '../../../../theme';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import type { FavoriteProvider } from '../../../../networks/serviceProviders/favoritesNetwork';
import { formatRating } from '../../../../utils/homeservice/format';
import {
  fetchFavorites,
  removeFavorite,
  selectFavorites,
  selectFavoritesError,
  selectFavoritesLoaded,
  selectFavoritesLoading,
} from './favoritesSlice';

export interface FavoritesScreenProps {
  /**
   * True when this is the Saved tab rather than a pushed screen. A tab root has
   * nothing to go back to, and a chevron that does nothing is worse than no
   * chevron.
   */
  asTab?: boolean;
}

export default function FavoritesScreen({ asTab }: FavoritesScreenProps) {
  const { colors, mode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const favorites = useAppSelector(selectFavorites);
  const loading = useAppSelector(selectFavoritesLoading);
  const error = useAppSelector(selectFavoritesError);
  const loaded = useAppSelector(selectFavoritesLoaded);

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchFavorites());
    }, [dispatch])
  );

  const renderItem = useCallback(
    ({ item }: { item: FavoriteProvider }) => {
      const accent = categoryAccent(item.category, mode);
      // A provider with no reviews is new, not badly rated.
      const rating = formatRating(item.rating);

      return (
        <Card
          accentRule={accent.tint}
          onPress={() =>
            navigation.navigate('ProviderProfile', { id: item.id, category: item.category })
          }
          accessibilityLabel={item.name}
          style={styles.card}
        >
          <View style={styles.row}>
            <Avatar
              uri={item.image}
              name={item.name}
              size={46}
              tint={accent.tintSoft}
              color={accent.tint}
            />
            <View style={styles.body}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {item.specialty || accent.label}
              </Text>
              <View style={styles.metaRow}>
                {rating ? (
                  <>
                    <Ionicons name="star" size={12} color={colors.star} />
                    <Text style={styles.metaText}>
                      {rating}
                      {item.reviews ? ` (${item.reviews})` : ''}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.metaText}>New provider</Text>
                )}
                {!!item.city && <Text style={styles.metaText}>· {item.city}</Text>}
              </View>
            </View>

            <TouchableOpacity
              onPress={() => dispatch(removeFavorite(item.id))}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel={`Remove ${item.name} from saved`}
            >
              <Ionicons name="heart" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        </Card>
      );
    },
    [dispatch, navigation]
  );

  // The Home tab, which is the category picker — Electrician, Plumber, AC
  // technician. Naming the shell and the tab together is what makes this work
  // from both places this screen renders: as the Saved tab the call bubbles up
  // to the stack, and as a screen pushed from the account menu it pops back to
  // the shell. Pushing `ProvidersScreen` instead (what this used to do) opened
  // an unfiltered provider list, one level past the choice being offered.
  const goToServices = useCallback(
    () => navigation.navigate('HomeServiceLayout', { screen: 'index' }),
    [navigation]
  );

  // Same three states, in the same order, as the Bookings tab: skeletons on a
  // cold fetch only, the failure said out loud rather than dressed up as "you
  // have nothing", and the empty state last. Keeping all three inside the list
  // is what leaves pull-to-refresh working during an error — the old layout
  // swapped the whole FlatList out for a bare ErrorState, so the one gesture
  // that could recover from a failed fetch was gone exactly when it was needed.
  const coldLoad = loading && !loaded;
  const listEmpty = coldLoad ? (
    <View accessibilityLabel="Loading saved providers">
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.card}>
          <SkeletonCard lines={1} />
        </View>
      ))}
    </View>
  ) : error ? (
    <ErrorState
      title="We couldn't load your saved providers"
      message={error}
      onRetry={() => dispatch(fetchFavorites())}
    />
  ) : (
    <EmptyState
      icon="heart-outline"
      title="Nothing saved yet"
      message="Tap the heart on a provider's profile and they'll wait for you here."
      actionLabel="Browse providers"
      onAction={goToServices}
    />
  );

  return (
    <Screen>
      <AppBar
        title="Saved"
        subtitle={favorites.length ? `${favorites.length} provider${favorites.length === 1 ? '' : 's'}` : undefined}
        hideBack={asTab}
        onBack={() => navigation.goBack()}
      />

      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        // Centred only for a real empty or error state. The cold-load skeletons
        // stand in for rows, so they stay pinned to the top where the rows will
        // be — centring them makes the list jump when the data lands.
        contentContainerStyle={[
          styles.list,
          favorites.length === 0 && !coldLoad && styles.listCentered,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading && loaded}
            onRefresh={() => dispatch(fetchFavorites())}
            colors={[colors.accent]}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={listEmpty}
      />
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  // Kept in step with the Bookings tab — the two are siblings in the same tab
  // bar, so an empty Saved that hugs the top while an empty Bookings sits
  // centred reads as one of them being broken.
  list: {
    padding: GUTTER,
    paddingBottom: S.xxxl,
  },
  listCentered: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    marginBottom: S.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  body: {
    flex: 1,
    marginHorizontal: S.md,
  },
  name: {
    ...T.subhead,
    color: c.ink,
  },
  meta: {
    ...T.caption,
    color: c.inkMuted,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  metaText: {
    ...T.caption,
    color: c.inkMuted,
    marginLeft: 3,
  },
});
