// ============================================================================
// Home services — category picker
//
// The first screen of the module, so it sets the register: a solid header, a
// short list of real choices, and photography that carries the identity instead
// of five decorative gradients doing it.
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import {
  AppBar,
  Card,
  EmptyState,
  ErrorState,
  Screen,
  SectionHeader,
  Skeleton,
} from '../../../../../components/ui';
import { categoryAccent, HS } from '../../../../../constants/HomeServiceTheme';
import { C, GUTTER, S, T } from '../../../../../constants/theme';
import { RootState } from '../../../../../store/store';
import {
  fetchHomeData,
  refreshHomeData,
  setSingleCategory,
  ServiceCategory,
} from './homeSlice';

// Mirrors the real card's dimensions so nothing jumps when data lands.
const ServiceCardSkeleton: React.FC = () => (
  <Card padded={false} style={styles.card}>
    <Skeleton height={140} radius={0} />
    <View style={styles.cardBody}>
      <Skeleton width="55%" height={16} />
      <Skeleton width="80%" height={11} style={styles.skeletonGap} />
    </View>
  </Card>
);

interface ServiceCardProps {
  service: {
    id: string;
    name: string;
    badge: string;
    badgeColor: string;
    description: string;
    image: string;
    providerCount: string;
    providers: string[];
    icon: string;
  };
  onPress: () => void;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ service, onPress }) => {
  const category = categoryAccent(service.id);

  // The server's image wins when it sends one, so this screen does not have to
  // change for the backend to take the content back. `/user/home` returns
  // nothing today, which is why every card was a tinted glyph panel rather than
  // a photograph — the category's own photo fills that in.
  const imageUri = service.image || category.photo;

  const [imageFailed, setImageFailed] = useState(!imageUri);

  // A refresh can hand us a different (or newly working) url — retry it rather
  // than leaving the card stuck on the fallback from a previous failure.
  useEffect(() => {
    setImageFailed(!imageUri);
  }, [imageUri]);

  return (
    <Card padded={false} onPress={onPress} accessibilityLabel={service.name} style={styles.card}>
      <View style={styles.media}>
        {imageFailed ? (
          // Flat tinted ground with the category glyph. `/user/home` does not
          // always return a usable image, and a bare <Image> with a broken uri
          // renders as a grey block.
          <View style={[styles.fallback, { backgroundColor: category.tintSoft }]}>
            <Ionicons name={category.icon as any} size={40} color={category.tint} />
          </View>
        ) : (
          <>
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              resizeMode="cover"
              onError={() => setImageFailed(true)}
            />
            {/* The one scrim that earns its keep: white text on a photograph
                is unreadable without it. */}
            <LinearGradient
              colors={['transparent', 'rgba(28,25,23,0.65)']}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.mediaTitle}>{service.name}</Text>
          </>
        )}
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardBodyText}>
          {imageFailed && <Text style={styles.cardTitle}>{service.name}</Text>}
          <Text style={styles.cardDescription} numberOfLines={2}>
            {service.description || category.summary}
          </Text>
          {!!service.providerCount && (
            <Text style={styles.cardCount}>{service.providerCount}</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={18} color={C.inkFaint} />
      </View>
    </Card>
  );
};

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();

  const categories = useSelector((state: RootState) => state.home.categories) as ServiceCategory[];
  const isRefreshing = useSelector((state: RootState) => state.home.isRefreshing) as boolean;
  // Both of these were already in the slice but the screen never read them, so
  // a slow or failed /user/home just looked like an empty screen forever.
  const isLoading = useSelector((state: RootState) => state.home.isLoading) as boolean;
  const error = useSelector((state: RootState) => state.home.error) as string | null;

  useEffect(() => {
    dispatch(fetchHomeData() as any);
  }, [dispatch]);

  const handleCardPress = useCallback(
    (id: string) => {
      dispatch(setSingleCategory(id));
      navigation.navigate('ProvidersScreen', {
        serviceType: id as 'electricians' | 'plumbers' | 'ac-repairers',
      });
    },
    [dispatch, navigation]
  );

  const onRefresh = useCallback(() => {
    dispatch(refreshHomeData() as any);
  }, [dispatch]);

  // Keep showing cached cards during a pull-to-refresh instead of collapsing.
  const showSkeletons = isLoading && categories.length === 0;
  const showError = !!error && categories.length === 0;

  return (
    <Screen>
      <AppBar title="Home services" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[HS.accent]}
            tintColor={HS.accent}
          />
        }
      >
        {/* The wallet card used to open this screen. It is gone from here on
            purpose: this is the category picker, and a balance is not what
            someone opening Home services came to decide. The wallet is still
            reached from Profile -> Payment Methods and from the account menu,
            and the card still leads the shopping and healthcare homes. */}
        <SectionHeader
          title="Services"
          subtitle={showSkeletons ? 'Loading' : `${categories.length} available`}
          style={styles.sectionHeader}
        />

        {showSkeletons ? (
          <>
            {[0, 1, 2].map((i) => (
              <ServiceCardSkeleton key={i} />
            ))}
          </>
        ) : showError ? (
          <ErrorState
            title="We couldn't load services"
            message={error}
            onRetry={() => dispatch(fetchHomeData() as any)}
          />
        ) : categories.length === 0 ? (
          <EmptyState
            icon="construct-outline"
            title="No services in your area yet"
            message="Pull down to refresh — we're adding tradespeople all the time."
          />
        ) : (
          categories.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onPress={() => handleCardPress(service.id)}
            />
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: GUTTER,
    paddingTop: S.lg,
    paddingBottom: S.xxxl,
  },
  sectionHeader: {
    marginBottom: S.md,
  },

  card: {
    marginBottom: S.md,
  },
  media: {
    height: 140,
    backgroundColor: C.surfaceSunken,
    justifyContent: 'flex-end',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaTitle: {
    ...T.heading,
    color: C.inkInverse,
    paddingHorizontal: S.lg,
    paddingBottom: S.md,
  },

  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: S.lg,
  },
  cardBodyText: {
    flex: 1,
    marginRight: S.md,
  },
  cardTitle: {
    ...T.subhead,
    color: C.ink,
    marginBottom: 2,
  },
  cardDescription: {
    ...T.body,
    color: C.inkMuted,
  },
  cardCount: {
    ...T.caption,
    color: C.inkFaint,
    marginTop: S.xs,
  },

  skeletonGap: {
    marginTop: S.sm,
  },
});
