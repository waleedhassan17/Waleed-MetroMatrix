import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
  SafeAreaView,
  Platform,
  Image,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

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
    title: 'Electrician',
    gradient: ['#F59E0B', '#D97706'],
    lightGradient: ['#FEF3C7', '#FDE68A'],
    accentColor: '#F59E0B',
  },
  plumbers: {
    title: 'Plumber',
    gradient: ['#3B82F6', '#2563EB'],
    lightGradient: ['#DBEAFE', '#BFDBFE'],
    accentColor: '#3B82F6',
  },
  'ac-repairers': {
    title: 'AC Repairer',
    gradient: ['#06B6D4', '#0891B2'],
    lightGradient: ['#CFFAFE', '#A5F3FC'],
    accentColor: '#06B6D4',
  },
};

interface ProviderInfo {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  reviews: number;
  image: string;
  phoneNumber?: string;
}

type CallScreenRouteParams = {
  provider?: ProviderInfo;
  serviceType?: 'electricians' | 'plumbers' | 'ac-repairers';
};

export default function CallScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: CallScreenRouteParams }, 'params'>>();

  const {
    provider,
    serviceType = 'electricians',
  } = route.params || {};

  const serviceConfig = SERVICE_CONFIG[serviceType] || SERVICE_CONFIG['electricians'];

  const [callState, setCallState] = useState<'ringing' | 'connected' | 'ended'>('ringing');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const ringAnim = useRef(new Animated.Value(0.3)).current;

  // Entry animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Pulse animation for ringing state
  useEffect(() => {
    if (callState === 'ringing') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      const ring = Animated.loop(
        Animated.sequence([
          Animated.timing(ringAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(ringAnim, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      ring.start();

      // Auto-connect after 3 seconds for demo
      const timer = setTimeout(() => {
        setCallState('connected');
        pulse.stop();
        ring.stop();
        pulseAnim.setValue(1);
        ringAnim.setValue(1);
      }, 3000);

      return () => {
        clearTimeout(timer);
        pulse.stop();
        ring.stop();
      };
    }
  }, [callState]);

  // Call duration timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (callState === 'connected') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callState]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = useCallback(() => {
    setCallState('ended');
    setTimeout(() => {
      navigation.goBack();
    }, 800);
  }, [navigation]);

  const handleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const handleSpeaker = useCallback(() => {
    setIsSpeaker(prev => !prev);
  }, []);

  const handleChat = useCallback(() => {
    // @ts-ignore
    navigation.replace('ProviderChatScreen', {
      provider: provider ? {
        id: provider.id,
        name: provider.name,
        specialty: provider.specialty,
        rating: provider.rating,
        reviews: provider.reviews,
        image: provider.image,
        distance: 'N/A',
      } : undefined,
      serviceType,
    });
  }, [navigation, provider, serviceType]);

  const getStatusText = () => {
    switch (callState) {
      case 'ringing': return 'Ringing...';
      case 'connected': return formatDuration(callDuration);
      case 'ended': return 'Call Ended';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.background}
      >
        {/* Top Section */}
        <SafeAreaView style={styles.safeArea}>
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.headerCenter}>
                <View style={[styles.serviceBadge, { backgroundColor: `${serviceConfig.accentColor}30` }]}>
                  <Text style={[styles.serviceBadgeText, { color: serviceConfig.accentColor }]}>
                    {serviceConfig.title}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.chatSwitchButton}
                onPress={handleChat}
              >
                <Ionicons name="chatbubble-outline" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Provider Avatar */}
            <View style={styles.avatarSection}>
              {/* Pulsing rings */}
              {callState === 'ringing' && (
                <>
                  <Animated.View
                    style={[
                      styles.pulseRing,
                      styles.pulseRingOuter,
                      {
                        opacity: ringAnim.interpolate({
                          inputRange: [0.3, 1],
                          outputRange: [0.1, 0.3],
                        }),
                        transform: [{ scale: pulseAnim }],
                      },
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.pulseRing,
                      styles.pulseRingInner,
                      {
                        opacity: ringAnim,
                        transform: [{
                          scale: pulseAnim.interpolate({
                            inputRange: [1, 1.15],
                            outputRange: [1, 1.08],
                          }),
                        }],
                      },
                    ]}
                  />
                </>
              )}

              <Animated.View style={[styles.avatarContainer, { transform: [{ scale: pulseAnim }] }]}>
                <LinearGradient
                  colors={serviceConfig.gradient as [string, string]}
                  style={styles.avatarRing}
                >
                  <View style={styles.avatarInner}>
                    {provider?.image ? (
                      <Image source={{ uri: provider.image }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatarPlaceholder, { backgroundColor: serviceConfig.accentColor }]}>
                        <Text style={styles.avatarInitial}>
                          {provider?.name?.charAt(0)?.toUpperCase() || 'P'}
                        </Text>
                      </View>
                    )}
                  </View>
                </LinearGradient>
              </Animated.View>

              {/* Verified badge */}
              <View style={[styles.verifiedBadge, { backgroundColor: serviceConfig.accentColor }]}>
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
              </View>
            </View>

            {/* Provider Info */}
            <View style={styles.providerInfoSection}>
              <Text style={styles.providerName}>{provider?.name || 'Service Provider'}</Text>
              <Text style={styles.providerSpecialty}>{provider?.specialty || serviceConfig.title}</Text>

              {/* Call Status */}
              <View style={styles.callStatusContainer}>
                <View style={[
                  styles.callStatusDot,
                  { backgroundColor: callState === 'connected' ? '#10B981' : callState === 'ringing' ? serviceConfig.accentColor : '#EF4444' },
                ]} />
                <Text style={styles.callStatusText}>{getStatusText()}</Text>
              </View>

              {/* Rating info */}
              {provider && (
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color="#F59E0B" />
                  <Text style={styles.ratingText}>{provider.rating}</Text>
                  <Text style={styles.reviewsText}>({provider.reviews} reviews)</Text>
                </View>
              )}
            </View>

            {/* Call Actions */}
            <View style={styles.callActions}>
              {/* Mute */}
              <TouchableOpacity
                style={[styles.actionButton, isMuted && styles.actionButtonActive]}
                onPress={handleMute}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isMuted ? 'mic-off' : 'mic'}
                  size={24}
                  color={isMuted ? '#FFFFFF' : '#FFFFFF'}
                />
                <Text style={styles.actionLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
              </TouchableOpacity>

              {/* Speaker */}
              <TouchableOpacity
                style={[styles.actionButton, isSpeaker && styles.actionButtonActive]}
                onPress={handleSpeaker}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isSpeaker ? 'volume-high' : 'volume-medium'}
                  size={24}
                  color="#FFFFFF"
                />
                <Text style={styles.actionLabel}>{isSpeaker ? 'Speaker On' : 'Speaker'}</Text>
              </TouchableOpacity>

              {/* Chat */}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleChat}
                activeOpacity={0.7}
              >
                <Ionicons name="chatbubble-outline" size={24} color="#FFFFFF" />
                <Text style={styles.actionLabel}>Message</Text>
              </TouchableOpacity>
            </View>

            {/* End Call Button */}
            <View style={styles.endCallSection}>
              <TouchableOpacity
                style={styles.endCallButton}
                onPress={handleEndCall}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#EF4444', '#DC2626']}
                  style={styles.endCallGradient}
                >
                  <Ionicons name="call" size={30} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
                </LinearGradient>
              </TouchableOpacity>
              <Text style={styles.endCallLabel}>End Call</Text>
            </View>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Platform.OS === 'ios' ? 40 : 30,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: (StatusBar.currentHeight || 0) + 12,
    paddingBottom: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  serviceBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  serviceBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  chatSwitchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Avatar
  avatarSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  pulseRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  pulseRingOuter: {
    width: 180,
    height: 180,
  },
  pulseRingInner: {
    width: 150,
    height: 150,
  },
  avatarContainer: {
    width: 120,
    height: 120,
  },
  avatarRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    padding: 4,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 56,
    overflow: 'hidden',
    backgroundColor: '#1a1a2e',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#1a1a2e',
  },

  // Provider Info
  providerInfoSection: {
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 20,
  },
  providerName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  providerSpecialty: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 16,
  },
  callStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
  },
  callStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  callStatusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
  },
  reviewsText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },

  // Actions
  callActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    marginTop: 40,
    paddingHorizontal: 20,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  actionButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  actionLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
    position: 'absolute',
    bottom: -22,
  },

  // End Call
  endCallSection: {
    alignItems: 'center',
    marginTop: 50,
  },
  endCallButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
  },
  endCallGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endCallLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 10,
  },
});
