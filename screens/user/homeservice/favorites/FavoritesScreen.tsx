// ============================================================================
// Saved providers.
//
// The destination for the heart on a provider profile and for the Favorites
// row in the account menus.
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback } from 'react';
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
      const accent = categoryAccent(item.category);
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
                    <Ionicons name="star" size={12} color={C.star} />
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
              <Ionicons name="heart" size={20} color={C.error} />
            </TouchableOpacity>
          </View>
        </Card>
      );
    },
    [dispatch, navigation]
  );

  return (
    <Screen>
      <AppBar
        title="Saved"
        subtitle={favorites.length ? `${favorites.length} provider${favorites.length === 1 ? '' : 's'}` : undefined}
        hideBack={asTab}
        onBack={() => navigation.goBack()}
      />

      {loading && !loaded ? (
        <View style={styles.loading} accessibilityLabel="Loading saved providers">
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.card}>
              <SkeletonCard lines={1} />
            </View>
          ))}
        </View>
      ) : error && !favorites.length ? (
        <ErrorState
          title="We couldn't load your saved providers"
          message={error}
          onRetry={() => dispatch(fetchFavorites())}
        />
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => dispatch(fetchFavorites())}
              colors={[HS.accent]}
              tintColor={HS.accent}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="heart-outline"
              title="Nothing saved yet"
              message="Tap the heart on a provider's profile and they'll wait for you here."
              actionLabel="Browse providers"
              onAction={() => navigation.navigate('ProvidersScreen', {})}
            />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: GUTTER,
    flexGrow: 1,
  },
  loading: {
    padding: GUTTER,
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
    color: C.ink,
  },
  meta: {
    ...T.caption,
    color: C.inkMuted,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  metaText: {
    ...T.caption,
    color: C.inkMuted,
    marginLeft: 3,
  },
});
