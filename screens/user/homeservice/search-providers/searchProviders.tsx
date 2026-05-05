import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
  SafeAreaView,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

const { width, height } = Dimensions.get('window');
const isAndroid = Platform.OS === 'android';

// Service type configurations
const SERVICE_CONFIG: Record<string, { 
  title: string; 
  gradient: string[];
  lightGradient: string[];
  accentColor: string;
}> = {
  electricians: {
    title: 'Electricians',
    gradient: ['#F59E0B', '#D97706'],
    lightGradient: ['#FEF3C7', '#FDE68A'],
    accentColor: '#F59E0B',
  },
  plumbers: {
    title: 'Plumbers',
    gradient: ['#3B82F6', '#2563EB'],
    lightGradient: ['#DBEAFE', '#BFDBFE'],
    accentColor: '#3B82F6',
  },
  'ac-repairers': {
    title: 'AC Repairers',
    gradient: ['#06B6D4', '#0891B2'],
    lightGradient: ['#CFFAFE', '#A5F3FC'],
    accentColor: '#06B6D4',
  },
};

// Dummy providers who might respond
const DUMMY_RESPONDING_PROVIDERS = [
  {
    id: 'resp1',
    name: 'Ahmed Khan',
    specialty: 'Certified Professional',
    rating: 4.9,
    reviews: 178,
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
    distance: '2.3 km',
    responseTime: 15,
  },
  {
    id: 'resp2',
    name: 'Sara Ahmed',
    specialty: 'Experienced Professional',
    rating: 4.8,
    reviews: 95,
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
    distance: '3.1 km',
    responseTime: 25,
  },
  {
    id: 'resp3',
    name: 'Muhammad Irfan',
    specialty: 'Certified Professional',
    rating: 4.9,
    reviews: 215,
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80',
    distance: '4.5 km',
    responseTime: 35,
  },
  {
    id: 'resp4',
    name: 'Bilal Hussain',
    specialty: 'Emergency Services',
    rating: 4.6,
    reviews: 85,
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80',
    distance: '5.8 km',
    responseTime: 45,
  },
];

// Timer component with animated circles
const AnimatedTimer: React.FC<{
  seconds: number;
  totalSeconds: number;
  accentColor: string;
  gradient: string[];
}> = ({ seconds, totalSeconds, accentColor, gradient }) => {
  const pulseAnim1 = useRef(new Animated.Value(1)).current;
  const pulseAnim2 = useRef(new Animated.Value(1)).current;
  const pulseAnim3 = useRef(new Animated.Value(1)).current;
  const opacityAnim1 = useRef(new Animated.Value(0.6)).current;
  const opacityAnim2 = useRef(new Animated.Value(0.4)).current;
  const opacityAnim3 = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    // Pulse animation for radar effect
    const createPulseAnimation = (scaleAnim: Animated.Value, opacityAnim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(scaleAnim, {
              toValue: 1.8,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0,
              duration: 2000,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 0,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0.6,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
    };

    const anim1 = createPulseAnimation(pulseAnim1, opacityAnim1, 0);
    const anim2 = createPulseAnimation(pulseAnim2, opacityAnim2, 600);
    const anim3 = createPulseAnimation(pulseAnim3, opacityAnim3, 1200);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, []);

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const progress = seconds / totalSeconds;

  return (
    <View style={styles.timerContainer}>
      {/* Animated pulse rings */}
      <Animated.View
        style={[
          styles.pulseRing,
          {
            backgroundColor: `${accentColor}30`,
            transform: [{ scale: pulseAnim1 }],
            opacity: opacityAnim1,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.pulseRing,
          {
            backgroundColor: `${accentColor}20`,
            transform: [{ scale: pulseAnim2 }],
            opacity: opacityAnim2,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.pulseRing,
          {
            backgroundColor: `${accentColor}10`,
            transform: [{ scale: pulseAnim3 }],
            opacity: opacityAnim3,
          },
        ]}
      />

      {/* Progress ring */}
      <View style={styles.progressRingContainer}>
        <Svg width={180} height={180} viewBox="0 0 180 180">
          {/* Background circle */}
          <Circle
            cx="90"
            cy="90"
            r="80"
            stroke={`${accentColor}30`}
            strokeWidth="8"
            fill="transparent"
          />
          {/* Progress circle */}
          <Circle
            cx="90"
            cy="90"
            r="80"
            stroke="#FFFFFF"
            strokeWidth="8"
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 80}`}
            strokeDashoffset={2 * Math.PI * 80 * (1 - progress)}
            transform="rotate(-90 90 90)"
          />
        </Svg>
      </View>

      {/* Timer display */}
      <LinearGradient
        colors={gradient as [string, string]}
        style={styles.timerCircle}
      >
        <Text style={styles.timerText}>
          {String(minutes).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </Text>
      </LinearGradient>
    </View>
  );
};

// Provider response card
interface ProviderResponseCardProps {
  provider: typeof DUMMY_RESPONDING_PROVIDERS[0] | null;
  isSearching: boolean;
  onCommunicate: (providerId: string) => void;
  accentColor: string;
  index: number;
}

const ProviderResponseCard: React.FC<ProviderResponseCardProps> = ({
  provider,
  isSearching,
  onCommunicate,
  accentColor,
  index,
}) => {
  const slideAnim = useRef(new Animated.Value(50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();

    if (isSearching) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.5,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isSearching]);

  if (isSearching) {
    return (
      <Animated.View
        style={[
          styles.providerCard,
          styles.searchingCard,
          {
            opacity: opacityAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Animated.View style={[styles.searchingAvatar, { opacity: pulseAnim }]}>
          <Ionicons name="person" size={24} color="#CBD5E1" />
        </Animated.View>
        <View style={styles.searchingInfo}>
          <Animated.Text style={[styles.searchingText, { opacity: pulseAnim }]}>
            Searching...
          </Animated.Text>
          <Text style={styles.searchingSubtext}>Awaiting response</Text>
        </View>
      </Animated.View>
    );
  }

  if (!provider) return null;

  return (
    <Animated.View
      style={[
        styles.providerCard,
        styles.respondedCard,
        {
          opacity: opacityAnim,
          transform: [{ translateY: slideAnim }],
          borderLeftColor: accentColor,
        },
      ]}
    >
      <View style={styles.providerAvatarContainer}>
        <Image source={{ uri: provider.image }} style={styles.providerAvatar} />
        <View style={styles.onlineBadge} />
      </View>

      <View style={styles.providerDetails}>
        <Text style={styles.providerName}>{provider.name}</Text>
        <View style={styles.providerMeta}>
          <Text style={styles.providerSpecialty}>{provider.specialty}</Text>
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={12} color="#F59E0B" />
            <Text style={styles.ratingText}>{provider.rating}</Text>
            <Text style={styles.reviewsText}>({provider.reviews})</Text>
          </View>
        </View>
        <View style={styles.distanceRow}>
          <Ionicons name="location-outline" size={12} color="#94A3B8" />
          <Text style={styles.distanceText}>{provider.distance} away</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.communicateButton, { borderColor: accentColor }]}
        onPress={() => onCommunicate(provider.id)}
        activeOpacity={0.8}
      >
        <Text style={[styles.communicateText, { color: accentColor }]}>Communicate</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

type SearchingProvidersScreenRouteParams = {
  serviceType?: 'electricians' | 'plumbers' | 'ac-repairers';
  jobDescription?: string;
  location?: string;
};

export default function SearchingProvidersScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: SearchingProvidersScreenRouteParams }, 'params'>>();

  const { serviceType = 'ac-repairers', jobDescription, location } = route.params || {};
  const serviceConfig = SERVICE_CONFIG[serviceType] || SERVICE_CONFIG['ac-repairers'];

  const TOTAL_SEARCH_TIME = 120; // 2 minutes
  const [timeRemaining, setTimeRemaining] = useState(TOTAL_SEARCH_TIME);
  const [respondedProviders, setRespondedProviders] = useState<typeof DUMMY_RESPONDING_PROVIDERS>([]);
  const [isSearchActive, setIsSearchActive] = useState(true);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerSlideAnim = useRef(new Animated.Value(-30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(headerSlideAnim, {
        toValue: 0,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Timer countdown
  useEffect(() => {
    if (!isSearchActive) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setIsSearchActive(false);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSearchActive]);

  // Simulate providers responding over time
  useEffect(() => {
    if (!isSearchActive) return;

    const responseTimers = DUMMY_RESPONDING_PROVIDERS.map((provider, index) => {
      return setTimeout(() => {
        setRespondedProviders(prev => [...prev, provider]);
      }, provider.responseTime * 1000);
    });

    return () => {
      responseTimers.forEach(timer => clearTimeout(timer));
    };
  }, [isSearchActive]);

  const handleCancelSearch = useCallback(() => {
    Alert.alert(
      'Cancel Search',
      'Are you sure you want to cancel the search?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: () => {
            setIsSearchActive(false);
            navigation.goBack();
          },
        },
      ]
    );
  }, [navigation]);

  const handleCommunicate = useCallback((providerId: string) => {
    const provider = respondedProviders.find(p => p.id === providerId);
    if (provider) {
      // @ts-ignore
      navigation.navigate('ProviderChatScreen', {
        provider,
        serviceType,
        jobDescription,
        location,
      });
    }
  }, [navigation, respondedProviders, serviceType, jobDescription, location]);

  // Calculate searching slots
  const totalSlots = 4;
  const searchingSlots = totalSlots - respondedProviders.length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={serviceConfig.gradient[0]}
        translucent={!isAndroid}
      />

      {/* Header with gradient */}
      <Animated.View
        style={[
          styles.headerContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: headerSlideAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={serviceConfig.gradient as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <Text style={styles.headerTitle}>Searching Providers</Text>
          <Text style={styles.headerSubtitle}>
            Finding {serviceConfig.title.toLowerCase()} within 10km...
          </Text>

          {/* Timer */}
          <AnimatedTimer
            seconds={timeRemaining}
            totalSeconds={TOTAL_SEARCH_TIME}
            accentColor={serviceConfig.accentColor}
            gradient={serviceConfig.gradient}
          />
        </LinearGradient>
      </Animated.View>

      {/* Response list */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.responseHeader}>
          <Text style={styles.responseTitle}>
            {isSearchActive ? 'Waiting for responses...' : 'Search completed'}
          </Text>
          <View style={styles.responseBadge}>
            <Text style={[styles.responseBadgeText, { color: serviceConfig.accentColor }]}>
              {respondedProviders.length} responded
            </Text>
          </View>
        </View>

        {/* Searching slots */}
        {isSearchActive && Array.from({ length: Math.min(searchingSlots, 3) }).map((_, index) => (
          <ProviderResponseCard
            key={`searching-${index}`}
            provider={null}
            isSearching={true}
            onCommunicate={() => {}}
            accentColor={serviceConfig.accentColor}
            index={respondedProviders.length + index}
          />
        ))}

        {/* Responded providers */}
        {respondedProviders.map((provider, index) => (
          <ProviderResponseCard
            key={provider.id}
            provider={provider}
            isSearching={false}
            onCommunicate={handleCommunicate}
            accentColor={serviceConfig.accentColor}
            index={index}
          />
        ))}

        {/* Empty state when search complete with no responses */}
        {!isSearchActive && respondedProviders.length === 0 && (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: `${serviceConfig.accentColor}15` }]}>
              <Ionicons name="search-outline" size={32} color={serviceConfig.accentColor} />
            </View>
            <Text style={styles.emptyTitle}>No providers responded</Text>
            <Text style={styles.emptyText}>
              Try expanding your search area or adjusting your job description.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Cancel button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancelSearch}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#FEE2E2', '#FECACA']}
            style={styles.cancelGradient}
          >
            <Ionicons name="close-circle-outline" size={20} color="#DC2626" />
            <Text style={styles.cancelText}>Cancel Search</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerContainer: {
    overflow: 'hidden',
  },
  headerGradient: {
    paddingTop: (StatusBar.currentHeight || 0) + 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 24,
  },
  timerContainer: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  progressRingContainer: {
    position: 'absolute',
  },
  timerCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  timerText: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  responseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  responseBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  responseBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  providerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  searchingCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  respondedCard: {
    borderLeftWidth: 4,
  },
  searchingAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  searchingInfo: {
    flex: 1,
  },
  searchingText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 2,
  },
  searchingSubtext: {
    fontSize: 13,
    color: '#CBD5E1',
  },
  providerAvatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  providerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F1F5F9',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  providerDetails: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  providerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  providerSpecialty: {
    fontSize: 13,
    color: '#64748B',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  reviewsText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  communicateButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    marginLeft: 8,
  },
  communicateText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 10,
  },
  cancelButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  cancelGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
});