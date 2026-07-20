import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  StatusBar,
  RefreshControl,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronRight,
  ChevronLeft,
} from 'lucide-react-native';

import { Colors } from '../../../../../constants/Colors';
import MiniWalletCard from '../../../../../components/MiniWalletCard/MiniWalletCard';
import {
  setSingleCategory,
  refreshHomeData,
  fetchHomeData,
  ServiceCategory,
} from './homeSlice';
import { RootState } from '../../../../../store/store';

const { width } = Dimensions.get('window');


// Service Card Component — clean clickable card
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
  index: number;
}

const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  onPress,
  index,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 350,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.timing(translateAnim, {
        toValue: 0,
        duration: 350,
        delay: index * 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      tension: 400,
      friction: 12,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 400,
      friction: 12,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.serviceCardContainer,
        {
          transform: [{ scale: scaleAnim }, { translateY: translateAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={styles.serviceCard}
      >
        {/* Image Section */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: service.image }}
            style={styles.serviceImage}
            resizeMode="cover"
          />

          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.5)']}
            style={styles.imageOverlay}
          />

          {/* Badge — Top Left */}
          {service.badge ? (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{service.badge}</Text>
            </View>
          ) : null}

          {/* Provider Count — Top Right */}
          <View style={styles.statsBadge}>
            <Text style={styles.statsText}>{service.providerCount}</Text>
          </View>

          {/* Title — Bottom Left */}
          <View style={styles.titleContainer}>
            <Text style={styles.cardTitle}>{service.name}</Text>
          </View>
        </View>

        {/* Content Section — Below Image */}
        <View style={styles.cardContent}>
          <View style={styles.contentRow}>
            <Text style={styles.cardDescription} numberOfLines={2}>
              {service.description}
            </Text>
            <View style={styles.arrowHint}>
              <ChevronRight size={16} color="#9CA3AF" strokeWidth={2} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Main Home Screen Component
export default function HomeScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const categories = useSelector((state: RootState) => state.home.categories) as ServiceCategory[];
  const isRefreshing = useSelector((state: RootState) => state.home.isRefreshing) as boolean;

  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    dispatch(fetchHomeData() as any);
  }, [dispatch]);

  const handleCardPress = useCallback((id: string) => {
    dispatch(setSingleCategory(id));
    // @ts-ignore
    navigation.navigate('ProvidersScreen', {
      serviceType: id as 'electricians' | 'plumbers' | 'ac-repairers',
    });
  }, [dispatch, navigation]);

  const onRefresh = useCallback(() => {
    dispatch(refreshHomeData() as any);
  }, [dispatch]);

  const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: STATUS_BAR_HEIGHT + 16 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: headerAnim,
              transform: [
                {
                  translateY: headerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-12, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.headerActionBtn}
            activeOpacity={0.7}
            onPress={() => navigation.goBack()}
          >
            <ChevronLeft size={24} color="#1F2937" strokeWidth={2} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.brandTitle}>MetroMatrix</Text>
            <Text style={styles.brandSubtitle}>HomeServices</Text>
          </View>

          <View style={styles.headerActionBtn} />
        </Animated.View>

        {/* Wallet — one component, one data source, everywhere (W2 Part 4) */}
        <MiniWalletCard onPress={() => (navigation as any).navigate('WalletScreen')} />

        {/* Section Divider */}
        <View style={styles.sectionDivider} />

        {/* Services Section */}
        <View style={styles.servicesSection}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWrap}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionTitle}>All Services</Text>
            </View>
            <Text style={styles.sectionSubtitle}>{categories.length} available</Text>
          </View>

          <View style={styles.servicesGrid}>
            {categories.map((service, index) => (
              <ServiceCard
                key={service.id}
                service={service}
                onPress={() => handleCardPress(service.id)}
                index={index}
              />
            ))}
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Layout
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 50,
    paddingBottom: 8,
  },
  headerActionBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '400',
    marginTop: 2,
  },

  // Divider
  sectionDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 20,
    marginVertical: 16,
  },

  // Section Header
  servicesSection: {
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionAccent: {
    width: 4,
    height: 20,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: -0.4,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9CA3AF',
  },

  // Services List
  servicesGrid: {
    paddingHorizontal: 20,
  },

  // Service Card — matches userHome style
  serviceCardContainer: {
    marginBottom: 16,
  },
  serviceCard: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  // Image
  imageContainer: {
    height: 160,
    position: 'relative',
    overflow: 'hidden',
  },
  serviceImage: {
    width: '100%',
    height: '140%',
    position: 'absolute',
    top: 0,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },

  // Badge — Top Left (white pill)
  categoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#374151',
    letterSpacing: 0.5,
  },

  // Stats Badge — Top Right (green pill)
  statsBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statsText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // Title — Bottom Left on image
  titleContainer: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // Content — Below Image
  cardContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardDescription: {
    flex: 1,
    fontSize: 12,
    fontWeight: '400',
    color: '#6B7280',
    lineHeight: 18,
    marginRight: 12,
  },
  arrowHint: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
});