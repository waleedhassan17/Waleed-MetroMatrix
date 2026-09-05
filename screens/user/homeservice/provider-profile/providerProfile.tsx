// ============================================================================
// Provider profile
//
// This screen had 27 LinearGradients — a gradient header, a gradient hero
// wash, a gradient hero top-rule, a gradient avatar ring, a gradient rating
// badge, four differently-coloured gradient quick-action chips, a gradient
// stats bar with three gradient icon tiles, five gradient section-icon chips, a
// gradient reviewer avatar and a gradient Book bar. It is the single clearest
// example of gradient having become the base surface.
//
// It is now flat. The category shows up as one hairline on the hero card and
// the tint on the avatar fallback; the only gradient left is the scrim over
// portfolio photographs, which exists so the caption is readable.
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useState, useMemo } from 'react';
import {
  Image,
  Linking,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
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
  SectionHeader,
  Skeleton,
} from '../../../../components/ui';
import { categoryAccent, HS } from '../../../../constants/HomeServiceTheme';
import { C, GUTTER, PROSE_WIDTH, R, S, SECTION, T } from '../../../../constants/theme';
import { ThemeColors, useTheme } from '../../../../theme';
import { useBottomBarPadding } from '../../../../hooks/useBottomBarPadding';
import { RootState } from '../../../../store/store';
import {
  formatInstant,
  formatPrice,
  formatRating,
  formatReviewCount,
} from '../../../../utils/homeservice/format';
import {
  addFavorite,
  fetchFavorites,
  removeFavorite,
  selectIsFavorite,
} from '../favorites/favoritesSlice';
import {
  fetchProviderById,
  GalleryItem,
  Provider,
  Review,
  Service,
  setSelectedTab,
} from './providerProfileSlice';

type TabId = 'overview' | 'reviews' | 'gallery' | 'availability';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'gallery', label: 'Work' },
  { id: 'availability', label: 'Schedule' },
];

type RouteParams = {
  id: string;
  category?: 'electricians' | 'plumbers' | 'ac-repairers';
};

export default function ProviderProfileScreen() {
  const { colors, mode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const dispatch = useDispatch();
  const bottomPad = useBottomBarPadding(GUTTER);

  const { id, category } = route.params;

  const provider = useSelector(
    (state: RootState) => state.providerProfile?.provider
  ) as Provider | null;
  const isLoading = useSelector((state: RootState) => state.providerProfile?.isLoading) as boolean;
  const selectedTab = useSelector((state: RootState) => state.providerProfile?.selectedTab) as TabId;
  const isFavorite = useSelector(selectIsFavorite(provider?.id));

  const [expandedReview, setExpandedReview] = useState<string | null>(null);
  const [showLocationSheet, setShowLocationSheet] = useState(false);

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchProviderById({ providerId: id, category }) as any);
      // So the heart shows the saved state the user left it in.
      dispatch(fetchFavorites() as any);
    }, [id, category, dispatch])
  );

  const handleTabChange = useCallback(
    (tab: TabId) => {
      dispatch(setSelectedTab(tab));
    },
    [dispatch]
  );

  // Open the provider's location in whatever map app the device has. Prefer
  // real coordinates; fall back to a text search on the address so the button
  // still does something useful for a provider without a geocoded location.
  const handleLocationPress = useCallback(async () => {
    if (!provider) return;

    const { latitude, longitude } = provider.coordinates || {};
    const label = encodeURIComponent(provider.name || 'Provider');

    let url: string;
    if (typeof latitude === 'number' && typeof longitude === 'number') {
      url = Platform.select({
        ios: `maps://?ll=${latitude},${longitude}&q=${label}`,
        default: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`,
      }) as string;
    } else if (provider.address) {
      const query = encodeURIComponent(
        [provider.address, provider.city].filter(Boolean).join(', ')
      );
      url = Platform.select({
        ios: `maps://?q=${query}`,
        default: `geo:0,0?q=${query}`,
      }) as string;
    } else {
      setShowLocationSheet(true);
      return;
    }

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return;
      }
      // No native maps handler (common on emulators) — the web fallback works
      // everywhere.
      const fallbackQuery =
        typeof latitude === 'number' && typeof longitude === 'number'
          ? `${latitude},${longitude}`
          : encodeURIComponent([provider.address, provider.city].filter(Boolean).join(', '));
      await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${fallbackQuery}`);
    } catch {
      setShowLocationSheet(true);
    }
  }, [provider]);

  // Optimistic heart: the icon flips immediately and the slice rolls back if
  // the request fails.
  const handleToggleWishlist = useCallback(() => {
    if (!provider?.id) return;
    dispatch((isFavorite ? removeFavorite(provider.id) : addFavorite(provider.id)) as any);
  }, [dispatch, provider?.id, isFavorite]);

  const handleSharePress = useCallback(async () => {
    if (!provider) return;
    const rating = formatRating(provider.rating);
    try {
      await Share.share({
        message: `Check out ${provider.name} on MetroMatrix — ${
          provider.specialty || 'home services'
        }${rating ? `, rated ${rating}/5` : ''}.`,
      });
    } catch {
      /* the user dismissed the sheet */
    }
  }, [provider]);

  const appBar = (
    <AppBar
      title="Provider"
      onBack={() => navigation.goBack()}
      right={
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleSharePress}
            style={styles.headerIcon}
            accessibilityLabel="Share this provider"
          >
            <Ionicons name="share-outline" size={20} color={colors.ink} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleToggleWishlist}
            style={styles.headerIcon}
            accessibilityLabel={isFavorite ? 'Remove from saved' : 'Save this provider'}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={20}
              color={isFavorite ? colors.error : colors.ink}
            />
          </TouchableOpacity>
        </View>
      }
    />
  );

  if (!provider) {
    return (
      <Screen>
        {appBar}
        {isLoading ? (
          <View style={styles.loading} accessibilityLabel="Loading profile">
            <Skeleton width={72} height={72} radius={36} />
            <Skeleton width="55%" height={18} style={styles.loadingGap} />
            <Skeleton width="35%" height={12} style={styles.loadingGap} />
            <Skeleton width="100%" height={96} radius={R.card} style={styles.loadingBlock} />
            <Skeleton width="100%" height={140} radius={R.card} style={styles.loadingGap} />
          </View>
        ) : (
          <EmptyState
            icon="person-outline"
            tone="error"
            title="We couldn't load this provider"
            message="They may no longer be listed. Try going back and picking another."
            actionLabel="Go back"
            onAction={() => navigation.goBack()}
          />
        )}
      </Screen>
    );
  }

  const accent = categoryAccent(provider.category ?? category, mode);
  const rating = formatRating(provider.rating);
  const reviews = formatReviewCount(provider.reviews);

  const quickActions: { label: string; icon: string; onPress: () => void }[] = [
    {
      label: 'Call',
      icon: 'call-outline',
      onPress: () =>
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
          serviceType: category,
        }),
    },
    {
      label: 'Message',
      icon: 'chatbubble-outline',
      onPress: () =>
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
          serviceType: category,
        }),
    },
    { label: 'Directions', icon: 'navigate-outline', onPress: handleLocationPress },
    { label: 'Schedule', icon: 'calendar-outline', onPress: () => handleTabChange('availability') },
  ];

  const renderOverview = () => (
    <>
      <View style={styles.section}>
        <SectionHeader title="About" />
        {!!provider.bio && <Text style={styles.body}>{provider.bio}</Text>}
        {provider.languages?.length > 0 && (
          <Text style={styles.meta}>Speaks {provider.languages.join(', ')}</Text>
        )}
      </View>

      {provider.certifications?.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Certifications" />
          {provider.certifications.map((cert, index) => (
            <View key={index} style={styles.bulletRow}>
              <Ionicons name="shield-checkmark-outline" size={16} color={colors.success} />
              <Text style={styles.bulletText}>{cert}</Text>
            </View>
          ))}
        </View>
      )}

      {provider.skills?.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Skills" />
          <View style={styles.tagRow}>
            {provider.skills.map((skill, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{skill}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {provider.servicesOffered?.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Services and prices" />
          {provider.servicesOffered.map((service: Service) => (
            <Card key={service.id} style={styles.rowCard}>
              <View style={styles.serviceRow}>
                <View style={styles.serviceText}>
                  <Text style={styles.rowTitle}>{service.name}</Text>
                  {!!service.description && (
                    <Text style={styles.meta} numberOfLines={2}>
                      {service.description}
                    </Text>
                  )}
                  {!!service.duration && (
                    <Text style={styles.metaFaint}>{service.duration}</Text>
                  )}
                </View>
                <Text style={styles.servicePrice}>{formatPrice(service.price, 'On request')}</Text>
              </View>
            </Card>
          ))}
        </View>
      )}
    </>
  );

  const renderReviews = () => (
    <View style={styles.section}>
      <SectionHeader title="Reviews" subtitle={reviews ?? 'No reviews yet'} />

      {provider.reviewsList?.length ? (
        provider.reviewsList.map((review: Review) => {
          const isExpanded = expandedReview === review.id;
          const shouldTruncate = review.comment.length > 120;
          const when = formatInstant(review.date);

          return (
            <Card key={review.id} style={styles.rowCard}>
              <View style={styles.reviewHeader}>
                <Avatar
                  name={review.reviewerName}
                  size={36}
                  tint={accent.tintSoft}
                  color={accent.tint}
                />
                <View style={styles.reviewWho}>
                  <Text style={styles.rowTitle}>{review.reviewerName}</Text>
                  {/* The serializer falls through to createdAt, which arrives
                      as a raw ISO string — this used to print in full. */}
                  {!!when && <Text style={styles.metaFaint}>{when}</Text>}
                </View>
                <View style={styles.stars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                      key={star}
                      name={star <= review.rating ? 'star' : 'star-outline'}
                      size={12}
                      color={star <= review.rating ? colors.star : colors.disabled}
                    />
                  ))}
                </View>
              </View>

              <Text
                style={styles.reviewBody}
                numberOfLines={isExpanded || !shouldTruncate ? undefined : 3}
              >
                {review.comment}
              </Text>

              {shouldTruncate && (
                <TouchableOpacity
                  onPress={() => setExpandedReview(isExpanded ? null : review.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.link}>{isExpanded ? 'Show less' : 'Read more'}</Text>
                </TouchableOpacity>
              )}

              {/* Marking a review helpful has no endpoint; shown as a read-only
                  count rather than a button that does nothing. */}
              {review.helpfulCount > 0 && (
                <Text style={styles.metaFaint}>
                  {review.helpfulCount} found this helpful
                </Text>
              )}
            </Card>
          );
        })
      ) : (
        <EmptyState
          icon="chatbubble-ellipses-outline"
          title="No reviews yet"
          message="Be the first to review this provider after your booking."
        />
      )}
    </View>
  );

  const renderGallery = () => (
    <View style={styles.section}>
      <SectionHeader title="Recent work" />
      {provider.gallery?.length ? (
        <View style={styles.galleryGrid}>
          {/* Plain tiles: there is no lightbox to open, so these are not
              rendered as tappable. */}
          {provider.gallery.map((item: GalleryItem) => (
            <View key={item.id} style={styles.galleryItem}>
              <Image source={{ uri: item.image }} style={styles.galleryImage} />
              <LinearGradient
                colors={['transparent', 'rgba(28,25,23,0.7)']}
                style={styles.galleryScrim}
              >
                <Text style={styles.galleryTitle} numberOfLines={1}>
                  {item.title}
                </Text>
              </LinearGradient>
            </View>
          ))}
        </View>
      ) : (
        <EmptyState
          icon="images-outline"
          title="No photos yet"
          message="This provider hasn't added pictures of past jobs."
        />
      )}
    </View>
  );

  const renderAvailability = () => (
    <View style={styles.section}>
      <SectionHeader title="Weekly schedule" />
      {provider.availability?.map((slot) => (
        <View key={slot.id} style={styles.dayRow}>
          <Text style={styles.dayName}>{slot.day}</Text>
          {slot.available && slot.timeSlots.length > 0 ? (
            <Text style={styles.dayHours}>{slot.timeSlots.join(', ')}</Text>
          ) : (
            <Text style={styles.dayClosed}>Closed</Text>
          )}
        </View>
      ))}
    </View>
  );

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'reviews':
        return renderReviews();
      case 'gallery':
        return renderGallery();
      case 'availability':
        return renderAvailability();
      case 'overview':
      default:
        return renderOverview();
    }
  };

  return (
    <Screen>
      {appBar}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card elevation="raised" accentRule={accent.tint} style={styles.hero}>
          <View style={styles.heroTop}>
            <View>
              <Avatar
                uri={provider.image}
                name={provider.name}
                size={64}
                tint={accent.tintSoft}
                color={accent.tint}
              />
              {provider.verified && (
                <View style={[styles.verified, { backgroundColor: accent.tint }]}>
                  <Ionicons name="checkmark" size={11} color={colors.inkInverse} />
                </View>
              )}
            </View>

            <View style={styles.heroInfo}>
              <Text style={styles.heroName} numberOfLines={2}>
                {provider.name}
              </Text>
              <Text style={styles.meta}>
                {[accent.label, provider.experience ? `${provider.experience} experience` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>

              {/* No rating and no reviews means a new provider, not a bad one —
                  the old hero printed "★ 0 (0 reviews)". */}
              <View style={styles.heroRating}>
                {rating ? (
                  <>
                    <Ionicons name="star" size={14} color={colors.star} />
                    <Text style={styles.ratingValue}>{rating}</Text>
                    {!!reviews && <Text style={styles.meta}>· {reviews}</Text>}
                  </>
                ) : (
                  <Text style={styles.meta}>New provider</Text>
                )}
                {provider.isOnline && (
                  <>
                    <View style={styles.onlineDot} />
                    <Text style={styles.online}>Online</Text>
                  </>
                )}
              </View>
            </View>
          </View>

          {!!provider.address && (
            <View style={styles.heroAddress}>
              <Ionicons name="location-outline" size={14} color={colors.inkFaint} />
              <Text style={styles.meta} numberOfLines={1}>
                {provider.address}
              </Text>
            </View>
          )}
        </Card>

        <View style={styles.quickActions}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.quickAction}
              onPress={action.onPress}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name={action.icon as any} size={20} color={colors.ink} />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Card style={styles.stats}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{provider.jobSuccessRate}%</Text>
              <Text style={styles.statLabel}>Success rate</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{provider.responseTime}</Text>
              <Text style={styles.statLabel}>Replies in</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{provider.completedJobs}</Text>
              <Text style={styles.statLabel}>Jobs done</Text>
            </View>
          </View>
        </Card>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {TABS.map((tab) => (
            <Chip
              key={tab.id}
              label={tab.label}
              selected={selectedTab === tab.id}
              onPress={() => handleTabChange(tab.id)}
              style={styles.tabChip}
            />
          ))}
        </ScrollView>

        {renderTabContent()}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: bottomPad }]}>
        <Button
          label={`Book · ${formatPrice(provider.price, 'request a quote')}`}
          onPress={() => navigation.navigate('BookingScreen', { providerId: provider.id, category })}
          accessibilityLabel={`Book ${provider.name}`}
        />
      </View>

      <ActionSheet
        visible={showLocationSheet}
        title="No map available"
        message="This provider hasn't shared a location we can open on this device."
        cancelLabel="Close"
        onClose={() => setShowLocationSheet(false)}
        options={[
          {
            label: 'Ask them where they are',
            icon: 'chatbubble-outline',
            onPress: () =>
              navigation.navigate('ProviderChatScreen', {
                provider: { id: provider.id, name: provider.name, image: provider.image },
                serviceType: category,
              }),
          },
        ]}
      />
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  content: {
    padding: GUTTER,
    paddingBottom: 120,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loading: {
    padding: GUTTER,
  },
  loadingGap: { marginTop: S.md },
  loadingBlock: { marginTop: S.xxl },

  hero: {
    marginBottom: S.lg,
  },
  heroTop: {
    flexDirection: 'row',
  },
  verified: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: c.surface,
  },
  heroInfo: {
    flex: 1,
    marginLeft: S.lg,
  },
  heroName: {
    ...T.heading,
    color: c.ink,
  },
  heroRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: S.sm,
  },
  ratingValue: {
    ...T.bodyStrong,
    color: c.ink,
    marginLeft: 4,
    marginRight: 4,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: c.success,
    marginLeft: S.md,
  },
  online: {
    ...T.caption,
    color: c.success,
    marginLeft: 5,
  },
  heroAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: S.lg,
    paddingTop: S.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.lineSoft,
  },

  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 46,
    height: 46,
    borderRadius: R.control,
    backgroundColor: c.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    ...T.caption,
    color: c.inkMuted,
    marginTop: 6,
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
    ...T.subhead,
    color: c.ink,
  },
  statLabel: {
    ...T.caption,
    color: c.inkMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: c.line,
  },

  tabs: {
    paddingVertical: SECTION,
  },
  tabChip: {
    marginRight: S.sm,
  },

  section: {
    marginBottom: SECTION,
  },
  body: {
    ...T.body,
    color: c.inkMuted,
    marginTop: S.md,
    maxWidth: PROSE_WIDTH,
  },
  meta: {
    ...T.caption,
    color: c.inkMuted,
    marginTop: 2,
  },
  metaFaint: {
    ...T.caption,
    color: c.inkFaint,
    marginTop: 2,
  },
  link: {
    ...T.label,
    color: c.accentDeep,
    marginTop: S.sm,
  },

  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: S.md,
  },
  bulletText: {
    ...T.body,
    color: c.ink,
    marginLeft: S.sm,
  },

  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: S.md,
  },
  tag: {
    paddingHorizontal: S.md,
    paddingVertical: 5,
    borderRadius: R.chip,
    backgroundColor: c.surfaceSunken,
    marginRight: S.sm,
    marginBottom: S.sm,
  },
  tagText: {
    ...T.label,
    color: c.inkMuted,
  },

  rowCard: {
    marginTop: S.md,
  },
  rowTitle: {
    ...T.subhead,
    color: c.ink,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  serviceText: {
    flex: 1,
    marginRight: S.md,
  },
  servicePrice: {
    ...T.bodyStrong,
    color: c.ink,
  },

  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewWho: {
    flex: 1,
    marginLeft: S.md,
  },
  stars: {
    flexDirection: 'row',
  },
  reviewBody: {
    ...T.body,
    color: c.inkMuted,
    marginTop: S.md,
    maxWidth: PROSE_WIDTH,
  },

  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: S.md,
    marginHorizontal: -S.xs,
  },
  galleryItem: {
    width: '50%',
    aspectRatio: 1,
    padding: S.xs,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
    borderRadius: R.card,
    backgroundColor: c.surfaceSunken,
  },
  galleryScrim: {
    position: 'absolute',
    left: S.xs,
    right: S.xs,
    bottom: S.xs,
    height: '50%',
    borderBottomLeftRadius: R.card,
    borderBottomRightRadius: R.card,
    justifyContent: 'flex-end',
    padding: S.sm,
  },
  galleryTitle: {
    ...T.label,
    color: c.inkInverse,
  },

  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: S.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.lineSoft,
  },
  dayName: {
    ...T.body,
    color: c.ink,
  },
  dayHours: {
    ...T.caption,
    color: c.inkMuted,
  },
  dayClosed: {
    ...T.caption,
    color: c.inkFaint,
  },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: GUTTER,
    paddingTop: S.md,
    backgroundColor: c.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.line,
  },
});
