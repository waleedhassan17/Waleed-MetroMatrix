// ============================================================================
// Saved providers.
//
// The destination for the heart on a provider profile and for the Favorites
// row in the account menus. Neither had anywhere to go before — there was no
// favourites backend, slice or screen.
// ============================================================================

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Heart, Star, MapPin } from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import {
  fetchFavorites,
  removeFavorite,
  selectFavorites,
  selectFavoritesLoading,
  selectFavoritesError,
  selectFavoritesLoaded,
} from './favoritesSlice';
import type { FavoriteProvider } from '../../../../networks/serviceProviders/favoritesNetwork';

const theme = {
  primary: '#10B981',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  error: '#EF4444',
};

export default function FavoritesScreen() {
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

  const openProvider = useCallback(
    (provider: FavoriteProvider) => {
      navigation.navigate('ProviderProfile', {
        id: provider.id,
        category: provider.category,
      });
    },
    [navigation]
  );

  const renderItem = useCallback(
    ({ item }: { item: FavoriteProvider }) => (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => openProvider(item)}
      >
        <Image
          source={{ uri: item.image }}
          style={styles.avatar}
          // A provider without a photo should not render a broken box.
          defaultSource={undefined}
        />
        <View style={styles.cardBody}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.specialty} numberOfLines={1}>
            {item.specialty || item.category}
          </Text>
          <View style={styles.metaRow}>
            <Star size={13} color="#F59E0B" fill="#F59E0B" />
            <Text style={styles.metaText}>
              {item.rating ? item.rating.toFixed(1) : 'New'}
              {item.reviews ? ` (${item.reviews})` : ''}
            </Text>
            {!!item.city && (
              <>
                <MapPin size={13} color={theme.textTertiary} />
                <Text style={styles.metaText} numberOfLines={1}>
                  {item.city}
                </Text>
              </>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.heartBtn}
          onPress={() => dispatch(removeFavorite(item.id))}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={`Remove ${item.name} from favorites`}
        >
          <Heart size={22} color={theme.error} fill={theme.error} />
        </TouchableOpacity>
      </TouchableOpacity>
    ),
    [dispatch, openProvider]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.surface} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <ArrowLeft size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Favorites</Text>
        <View style={styles.headerBtn} />
      </View>

      {!!error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText} numberOfLines={2}>
            {error}
          </Text>
          <TouchableOpacity onPress={() => dispatch(fetchFavorites())}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading && !loaded ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={
            favorites.length ? styles.listContent : styles.listContentEmpty
          }
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => dispatch(fetchFavorites())}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Heart size={52} color={theme.textTertiary} />
              <Text style={styles.emptyTitle}>No favorites yet</Text>
              <Text style={styles.emptyText}>
                Tap the heart on a provider's profile to save them here.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: theme.text },
  listContent: { padding: 16, gap: 12 },
  listContentEmpty: { flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: theme.text, marginTop: 8 },
  emptyText: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', lineHeight: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 12,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.border },
  cardBody: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: theme.text },
  specialty: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  metaText: { fontSize: 12, color: theme.textSecondary, marginRight: 6 },
  heartBtn: { padding: 8 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    margin: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: { flex: 1, fontSize: 13, color: theme.error },
  retryText: { fontSize: 13, fontWeight: '600', color: theme.error },
});
