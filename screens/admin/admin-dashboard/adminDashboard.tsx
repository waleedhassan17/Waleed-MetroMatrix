import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  StatusBar,
  Animated,
  Dimensions,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  getDashboardStatsAsync,
  restoreAuthAsync,
  selectDashboardStats,
  selectRecentRegistrations,
  selectQuickStats,
  selectIsLoading,
  selectAdmin,
  selectAccessToken,
} from './adminSlice';
import type { 
  ProviderType, 
  RecentRegistration, 
  VerificationStatus,
  ProviderTypeCount,
} from '../../../models/admin';
import { 
  PROVIDER_TYPE_CONFIG, 
  VERIFICATION_STATUS_CONFIG,
} from '../../../models/admin';
import Svg, { Circle, G, Text as SvgText } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_GAP = 12;
const HORIZONTAL_PADDING = 16;
const CARD_WIDTH = (SCREEN_WIDTH - (HORIZONTAL_PADDING * 2) - CARD_GAP) / 2;

// Get safe area insets
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 44;

// ============================================
// ENHANCED THEME COLORS
// ============================================

const COLORS = {
  // Primary palette
  primary: '#6366f1',
  primaryLight: '#818cf8',
  primaryDark: '#4f46e5',
  
  // Background colors
  background: '#f1f5f9',
  surface: '#ffffff',
  surfaceElevated: '#ffffff',
  
  // Text colors
  text: {
    primary: '#1e293b',
    secondary: '#64748b',
    tertiary: '#94a3b8',
    inverse: '#ffffff',
    muted: '#cbd5e1',
  },
  
  // UI colors
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  divider: '#f1f5f9',
  
  // Status colors
  success: '#10b981',
  successLight: '#d1fae5',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  error: '#ef4444',
  errorLight: '#fee2e2',
  info: '#3b82f6',
  infoLight: '#dbeafe',
  
  // Chart colors
  purple: '#8b5cf6',
  purpleLight: '#a78bfa',
  orange: '#f59e0b',
  orangeLight: '#fbbf24',
  green: '#10b981',
  greenLight: '#34d399',
  red: '#ef4444',
  redLight: '#f87171',
  blue: '#6366f1',
  blueLight: '#818cf8',
  
  // Shadows
  shadow: 'rgba(15, 23, 42, 0.08)',
  shadowDark: 'rgba(15, 23, 42, 0.12)',
};

// Gradient configurations
const GRADIENTS = {
  purple: ['#8b5cf6', '#a855f7'] as const,
  orange: ['#f59e0b', '#fbbf24'] as const,
  green: ['#10b981', '#34d399'] as const,
  red: ['#ef4444', '#f87171'] as const,
  blue: ['#6366f1', '#818cf8'] as const,
  teal: ['#14b8a6', '#2dd4bf'] as const,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return `${Math.floor(diffInSeconds / 604800)}w ago`;
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toLocaleString();
};

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const formatDate = (date?: Date): string => {
  const targetDate = date || new Date();
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'long', 
    month: 'short', 
    day: 'numeric',
    year: 'numeric',
  };
  return targetDate.toLocaleDateString('en-US', options);
};

// ============================================
// ANIMATED COUNTER HOOK
// ============================================

const useAnimatedCounter = (targetValue: number, duration: number = 1000, delay: number = 0) => {
  const [displayValue, setDisplayValue] = useState(0);
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animatedValue.setValue(0);
    
    Animated.timing(animatedValue, {
      toValue: targetValue,
      duration,
      delay,
      useNativeDriver: false,
    }).start();

    const listener = animatedValue.addListener(({ value }) => {
      setDisplayValue(Math.floor(value));
    });

    return () => animatedValue.removeListener(listener);
  }, [targetValue, duration, delay]);

  return displayValue;
};

// ============================================
// ENHANCED STAT CARD COMPONENT
// ============================================

interface StatCardProps {
  value: number;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: readonly [string, string];
  trend?: number;
  subtitle?: string;
  delay?: number;
  onPress?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
  value,
  label,
  icon,
  gradient,
  trend,
  subtitle,
  delay = 0,
  onPress,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const displayValue = useAnimatedCounter(value, 800, delay + 200);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 65,
        friction: 8,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 350,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay]);

  const handlePressIn = () => {
    if (onPress) {
      Animated.spring(scaleAnim, {
        toValue: 0.96,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 65,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
  };

  return (
    <Animated.View
      style={[
        styles.statCardWrapper,
        { 
          opacity: opacityAnim, 
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.statCardTouchable}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        disabled={!onPress}
      >
        <LinearGradient
          colors={[gradient[0], gradient[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statGradient}
        >
          {/* Icon Container */}
          <View style={styles.statIconContainer}>
            <View style={styles.statIconWrapper}>
              <Ionicons name={icon} size={22} color="rgba(255,255,255,0.95)" />
            </View>
          </View>
          
          {/* Value */}
          <Text style={styles.statValue}>{formatNumber(displayValue)}</Text>
          
          {/* Label */}
          <Text style={styles.statLabel}>{label}</Text>
          
          {/* Trend or Subtitle */}
          {trend !== undefined ? (
            <View style={styles.trendContainer}>
              <Ionicons
                name={trend >= 0 ? 'trending-up' : 'trending-down'}
                size={14}
                color={trend >= 0 ? 'rgba(255,255,255,0.9)' : '#fecaca'}
              />
              <Text style={[
                styles.trendText,
                { color: trend >= 0 ? 'rgba(255,255,255,0.9)' : '#fecaca' }
              ]}>
                {trend >= 0 ? '+' : ''}{trend.toFixed(1)}% vs last month
              </Text>
            </View>
          ) : subtitle ? (
            <View style={styles.subtitleContainer}>
              <Text style={styles.subtitleText}>{subtitle}</Text>
            </View>
          ) : null}

          {/* Decorative Elements */}
          <View style={styles.decorativeCircle1} />
          <View style={styles.decorativeCircle2} />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ============================================
// SVG DONUT CHART COMPONENT
// ============================================

interface DonutChartProps {
  data: { value: number; color: string; label: string }[];
  size?: number;
  strokeWidth?: number;
  total: number;
}

const DonutChart: React.FC<DonutChartProps> = ({ 
  data, 
  size = 140, 
  strokeWidth = 18,
  total 
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  
  const animatedRotation = useRef(new Animated.Value(0)).current;
  const animatedOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(animatedRotation, {
        toValue: 1,
        duration: 1000,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.timing(animatedOpacity, {
        toValue: 1,
        duration: 500,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Calculate segments
  let cumulativeOffset = 0;
  const segments = data.map((item, index) => {
    const percentage = total > 0 ? (item.value / total) * 100 : 0;
    const segmentLength = (percentage / 100) * circumference;
    const dashOffset = circumference - cumulativeOffset;
    cumulativeOffset += segmentLength;
    
    return {
      ...item,
      percentage,
      segmentLength,
      dashOffset,
    };
  });

  const rotation = animatedRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['-90deg', '270deg'],
  });

  if (total === 0) {
    // Empty state - show gray ring
    return (
      <Animated.View style={{ opacity: animatedOpacity }}>
        <Svg width={size} height={size}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={COLORS.border}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <Circle
            cx={center}
            cy={center}
            r={radius - strokeWidth / 2 - 12}
            fill={COLORS.surface}
          />
        </Svg>
        <View style={[styles.donutCenter, { width: size, height: size }]}>
          <Text style={styles.donutTotalValue}>{total}</Text>
          <Text style={styles.donutTotalLabel}>Total</Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{ opacity: animatedOpacity, transform: [{ rotate: rotation }] }}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${center}, ${center}`}>
          {/* Background circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={COLORS.borderLight}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          
          {/* Segments */}
          {segments.map((segment, index) => {
            let offset = 0;
            for (let i = 0; i < index; i++) {
              offset += segments[i].segmentLength;
            }
            
            return (
              <Circle
                key={segment.label}
                cx={center}
                cy={center}
                r={radius}
                stroke={segment.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${segment.segmentLength} ${circumference}`}
                strokeDashoffset={-offset}
                fill="transparent"
                strokeLinecap="round"
              />
            );
          })}
        </G>
      </Svg>
      
      {/* Center content */}
      <Animated.View 
        style={[
          styles.donutCenter, 
          { 
            width: size, 
            height: size,
            transform: [{ rotate: animatedRotation.interpolate({
              inputRange: [0, 1],
              outputRange: ['90deg', '-270deg'],
            })}]
          }
        ]}
      >
        <Text style={styles.donutTotalValue}>{total}</Text>
        <Text style={styles.donutTotalLabel}>Total</Text>
      </Animated.View>
    </Animated.View>
  );
};

// ============================================
// PROVIDER DISTRIBUTION COMPONENT
// ============================================

interface ProviderDistributionProps {
  data: ProviderTypeCount[];
  total: number;
}

const ProviderDistribution: React.FC<ProviderDistributionProps> = ({ data, total }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        tension: 50,
        friction: 8,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getColor = (type: ProviderType) => PROVIDER_TYPE_CONFIG[type]?.color || COLORS.primary;

  // Prepare chart data
  const chartData = data.map((item) => ({
    value: item.count,
    color: getColor(item._id),
    label: item._id,
  }));

  return (
    <Animated.View 
      style={[
        styles.distributionContainer,
        { opacity: fadeAnim, transform: [{ translateY }] }
      ]}
    >
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Provider Distribution</Text>
        <TouchableOpacity style={styles.analyticsButton} activeOpacity={0.7}>
          <Ionicons name="analytics-outline" size={18} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.chartContent}>
        {/* Donut Chart */}
        <View style={styles.donutContainer}>
          <DonutChart 
            data={chartData} 
            total={total}
            size={140}
            strokeWidth={20}
          />
        </View>
        
        {/* Legend */}
        <View style={styles.legendContainer}>
          {data.map((item) => {
            const config = PROVIDER_TYPE_CONFIG[item._id];
            const percentage = total > 0 ? ((item.count / total) * 100).toFixed(0) : 0;
            return (
              <View key={item._id} style={styles.legendItem}>
                <View style={styles.legendLeft}>
                  <View style={[styles.legendDot, { backgroundColor: getColor(item._id) }]} />
                  <View style={[styles.legendIconBg, { backgroundColor: getColor(item._id) + '15' }]}>
                    <Ionicons
                      name={config?.icon as any || 'person'}
                      size={14}
                      color={getColor(item._id)}
                    />
                  </View>
                  <Text style={styles.legendLabel}>
                    {config?.label === 'Home Service' ? 'Home Services' : 
                     config?.label === 'Doctor' ? 'Doctors' : 
                     config?.label === 'Vendor' ? 'Vendors' : 
                     config?.label || item._id}
                  </Text>
                </View>
                <View style={styles.legendRight}>
                  <Text style={[styles.legendValue, { color: getColor(item._id) }]}>
                    {item.count}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
};

// ============================================
// REGISTRATION ITEM COMPONENT
// ============================================

interface RegistrationItemProps {
  registration: RecentRegistration;
  index: number;
  isLast: boolean;
}

const RegistrationItem: React.FC<RegistrationItemProps> = ({ registration, index, isLast }) => {
  const translateX = useRef(new Animated.Value(50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        tension: 50,
        friction: 8,
        delay: 400 + index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        delay: 400 + index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index]);

  const config = PROVIDER_TYPE_CONFIG[registration.providerType];
  const statusConfig = VERIFICATION_STATUS_CONFIG[registration.verificationStatus];

  return (
    <Animated.View
      style={[
        styles.registrationItem,
        !isLast && styles.registrationItemBorder,
        { opacity: opacityAnim, transform: [{ translateX }] },
      ]}
    >
      <View style={[styles.registrationAvatar, { backgroundColor: config?.color + '15' }]}>
        <Text style={[styles.registrationInitials, { color: config?.color }]}>
          {getInitials(registration.fullName)}
        </Text>
      </View>
      
      <View style={styles.registrationInfo}>
        <Text style={styles.registrationName} numberOfLines={1}>
          {registration.fullName}
        </Text>
        <View style={styles.registrationTypeRow}>
          <Ionicons
            name={config?.icon as any || 'person'}
            size={12}
            color={COLORS.text.tertiary}
          />
          <Text style={styles.registrationType}>
            {config?.label || registration.providerType}
          </Text>
        </View>
      </View>
      
      <View style={styles.registrationRight}>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig?.bgColor }]}>
          <Text style={[styles.statusText, { color: statusConfig?.color }]}>
            {statusConfig?.label || registration.verificationStatus}
          </Text>
        </View>
        <Text style={styles.registrationTime}>
          {formatTimeAgo(registration.createdAt)}
        </Text>
      </View>
    </Animated.View>
  );
};

// ============================================
// RECENT REGISTRATIONS COMPONENT
// ============================================

interface RecentRegistrationsProps {
  registrations: RecentRegistration[];
  onViewAll: () => void;
}

const RecentRegistrations: React.FC<RecentRegistrationsProps> = ({ registrations, onViewAll }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: 500,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        tension: 50,
        friction: 8,
        delay: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View 
      style={[
        styles.recentContainer,
        { opacity: fadeAnim, transform: [{ translateY }] }
      ]}
    >
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Registrations</Text>
        <TouchableOpacity onPress={onViewAll} style={styles.viewAllButton} activeOpacity={0.7}>
          <Text style={styles.viewAllText}>View All</Text>
          <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
      
      {registrations.length > 0 ? (
        <View style={styles.registrationsList}>
          {registrations.slice(0, 4).map((registration, index) => (
            <RegistrationItem
              key={registration.id || registration._id}
              registration={registration}
              index={index}
              isLast={index === Math.min(registrations.length - 1, 3)}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="people-outline" size={40} color={COLORS.text.tertiary} />
          </View>
          <Text style={styles.emptyTitle}>No Recent Registrations</Text>
          <Text style={styles.emptySubtitle}>New provider registrations will appear here</Text>
        </View>
      )}
    </Animated.View>
  );
};

// ============================================
// QUICK STATS BAR COMPONENT
// ============================================

interface QuickStatsBarProps {
  online: number;
  pending: number;
}

const QuickStatsBar: React.FC<QuickStatsBarProps> = ({ online, pending }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: 700,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        tension: 50,
        friction: 8,
        delay: 700,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View 
      style={[
        styles.quickStatsBar, 
        { opacity: fadeAnim, transform: [{ translateY }] }
      ]}
    >
      <Text style={styles.quickStatsTitle}>QUICK STATS</Text>
      
      <View style={styles.quickStatsRow}>
        <View style={styles.quickStatItem}>
          <View style={[styles.quickStatIndicator, { backgroundColor: COLORS.success }]}>
            <View style={styles.quickStatPulse} />
          </View>
          <View style={styles.quickStatContent}>
            <Text style={styles.quickStatLabel}>Online</Text>
            <Text style={styles.quickStatValue}>{online}</Text>
          </View>
        </View>
        
        <View style={styles.quickStatDivider} />
        
        <View style={styles.quickStatItem}>
          <View style={[styles.quickStatIndicator, { backgroundColor: COLORS.warning }]} />
          <View style={styles.quickStatContent}>
            <Text style={styles.quickStatLabel}>Pending</Text>
            <Text style={styles.quickStatValue}>{pending}</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

// ============================================
// LOADING SKELETON
// ============================================

const LoadingSkeleton: React.FC = () => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      
      {/* Header Skeleton */}
      <View style={styles.header}>
        <View>
          <Animated.View style={[styles.skeletonLine, { width: 200, height: 26, opacity: pulseAnim }]} />
          <Animated.View style={[styles.skeletonLine, { width: 160, height: 14, marginTop: 8, opacity: pulseAnim }]} />
        </View>
        <View style={styles.headerRight}>
          <Animated.View style={[styles.skeletonCircle, { opacity: pulseAnim }]} />
          <Animated.View style={[styles.skeletonCircle, { opacity: pulseAnim }]} />
        </View>
      </View>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Stats Skeleton */}
        <View style={styles.statsRow}>
          <Animated.View style={[styles.skeletonCard, { opacity: pulseAnim }]} />
          <Animated.View style={[styles.skeletonCard, { opacity: pulseAnim }]} />
        </View>
        <View style={styles.statsRow}>
          <Animated.View style={[styles.skeletonCard, { opacity: pulseAnim }]} />
          <Animated.View style={[styles.skeletonCard, { opacity: pulseAnim }]} />
        </View>
        
        {/* Distribution Skeleton */}
        <Animated.View style={[styles.skeletonSection, { height: 220, opacity: pulseAnim }]} />
        
        {/* Registrations Skeleton */}
        <Animated.View style={[styles.skeletonSection, { height: 320, opacity: pulseAnim }]} />
      </ScrollView>
    </View>
  );
};

// ============================================
// MAIN DASHBOARD SCREEN
// ============================================

const AdminDashboardScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  
  const admin = useAppSelector(selectAdmin);
  const accessToken = useAppSelector(selectAccessToken);
  const dashboardStats = useAppSelector(selectDashboardStats);
  const recentRegistrations = useAppSelector(selectRecentRegistrations);
  const quickStats = useAppSelector(selectQuickStats);
  const isLoading = useAppSelector(selectIsLoading);
  
  const [refreshing, setRefreshing] = useState(false);
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    const initializeDashboard = async () => {
      // First restore admin auth from storage
      await dispatch(restoreAuthAsync());
      // Then load dashboard data
      await dispatch(getDashboardStatsAsync({ forceRefresh: true }));
    };
    
    initializeDashboard();
    
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(headerTranslateY, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadDashboardData = useCallback(async () => {
    await dispatch(getDashboardStatsAsync({}));
  }, [dispatch]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, [loadDashboardData]);

  const navigateToUsers = useCallback(() => {
    (navigation as any).navigate('UserManagement');
  }, [navigation]);

  const navigateToPendingReview = useCallback(() => {
    (navigation as any).navigate('PendingReview');
  }, [navigation]);

  const navigateToProviders = useCallback((type?: ProviderType) => {
    (navigation as any).navigate('ProviderManagement', { providerType: type });
  }, [navigation]);

  const navigateToNotifications = useCallback(() => {
    (navigation as any).navigate('Notifications');
  }, [navigation]);

  const navigateToSettings = useCallback(() => {
    (navigation as any).navigate('Settings');
  }, [navigation]);

  const pendingCount = useMemo(() => 
    dashboardStats?.providers?.pending || 0, 
    [dashboardStats]
  );

  // Default provider distribution data when no data is available
  const defaultProviderData: ProviderTypeCount[] = [
    { _id: 'doctor', count: 0 },
    { _id: 'home_service', count: 0 },
    { _id: 'vendor', count: 0 },
  ];

  const providerByTypeData = dashboardStats?.providers?.byType && dashboardStats.providers.byType.length > 0
    ? dashboardStats.providers.byType
    : defaultProviderData;

  if (isLoading && !dashboardStats) {
    return <LoadingSkeleton />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.dashboardTitle}>Admin Dashboard</Text>
          <Text style={styles.greeting}>
            {getGreeting()}, {admin?.fullName || 'Admin'}
          </Text>
          <Text style={styles.date}>{formatDate()}</Text>
        </View>
        
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={navigateToNotifications}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={24} color={COLORS.text.primary} />
            {pendingCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {pendingCount > 9 ? '9+' : pendingCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => (navigation as any).navigate('AdminProfile')}
            activeOpacity={0.7}
          >
            {admin?.avatar ? (
              <Image
                source={{ uri: admin.avatar }}
                style={styles.profileImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.profilePlaceholder}>
                <Text style={styles.profileInitials}>
                  {getInitials(admin?.fullName || 'Admin')}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Stat Cards Row 1 */}
        <View style={styles.statsRow}>
          <StatCard
            value={dashboardStats?.providers?.total || 0}
            label="Total Providers"
            icon="people"
            gradient={GRADIENTS.purple}
            trend={dashboardStats?.providers?.growthPercentage}
            delay={0}
            onPress={() => navigateToProviders()}
          />
          
          <StatCard
            value={dashboardStats?.providers?.pending || 0}
            label="Pending Review"
            icon="time"
            gradient={GRADIENTS.orange}
            subtitle="Action Required"
            delay={100}
            onPress={navigateToPendingReview}
          />
        </View>
        
        {/* Stat Cards Row 2 */}
        <View style={styles.statsRow}>
          <StatCard
            value={dashboardStats?.providers?.approved || 0}
            label="Approved"
            icon="checkmark-circle"
            gradient={GRADIENTS.green}
            trend={5.2}
            delay={200}
          />
          
          <StatCard
            value={dashboardStats?.users?.total || 0}
            label="Total Users"
            icon="person"
            gradient={GRADIENTS.red}
            trend={dashboardStats?.users?.growthPercentage || 12}
            delay={300}
            onPress={navigateToUsers}
          />
        </View>

        {/* Provider Distribution */}
        <ProviderDistribution
          data={providerByTypeData}
          total={dashboardStats?.providers?.total || 0}
        />
        
        {/* Recent Registrations */}
        <RecentRegistrations
          registrations={recentRegistrations}
          onViewAll={navigateToPendingReview}
        />

        {/* Quick Stats Bar */}
        <QuickStatsBar
          online={quickStats?.online || dashboardStats?.quickStats?.online || 45}
          pending={quickStats?.pendingReviews || dashboardStats?.providers?.pending || 0}
        />

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: STATUS_BAR_HEIGHT + 16,
    paddingBottom: 20,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerLeft: {
    flex: 1,
  },
  dashboardTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#6366F1',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  greeting: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.secondary,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  date: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  profileButton: {
    width: 46,
    height: 46,
    borderRadius: 15,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  profileImage: {
    width: 46,
    height: 46,
    borderRadius: 15,
  },
  profilePlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#818CF8',
  },
  profileInitials: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  headerIconBtn: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  notificationBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.text.inverse,
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 24,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: HORIZONTAL_PADDING,
    marginBottom: CARD_GAP,
    gap: CARD_GAP,
  },
  statCardWrapper: {
    flex: 1,
  },
  statCardTouchable: {
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  statGradient: {
    padding: 18,
    height: 160,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  statIconContainer: {
    marginBottom: 16,
  },
  statIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.text.inverse,
    letterSpacing: -1,
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    marginTop: 4,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: 'rgba(0,0,0,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  subtitleContainer: {
    marginTop: 12,
  },
  subtitleText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    letterSpacing: -0.3,
  },
  analyticsButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '12',
  },
  viewAllText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Provider Distribution
  distributionContainer: {
    marginHorizontal: HORIZONTAL_PADDING,
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  chartContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  donutContainer: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  donutCenter: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutTotalValue: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text.primary,
    letterSpacing: -1,
  },
  donutTotalLabel: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    fontWeight: '500',
    marginTop: 2,
  },
  legendContainer: {
    flex: 1,
    marginLeft: 24,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  legendIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  legendLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  legendRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendValue: {
    fontSize: 18,
    fontWeight: '700',
  },

  // Recent Registrations
  recentContainer: {
    marginHorizontal: HORIZONTAL_PADDING,
    marginBottom: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  registrationsList: {},
  registrationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  registrationItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  registrationAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  registrationInitials: {
    fontSize: 16,
    fontWeight: '700',
  },
  registrationInfo: {
    flex: 1,
  },
  registrationName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  registrationTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  registrationType: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    fontWeight: '500',
  },
  registrationRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  registrationTime: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },

  // Quick Stats Bar
  quickStatsBar: {
    marginHorizontal: HORIZONTAL_PADDING,
    marginBottom: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  quickStatsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text.tertiary,
    marginBottom: 16,
    letterSpacing: 1,
  },
  quickStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  quickStatIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  quickStatPulse: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.4)',
    position: 'absolute',
  },
  quickStatContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickStatLabel: {
    fontSize: 15,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  quickStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.border,
    marginHorizontal: 24,
  },

  // Bottom Spacer
  bottomSpacer: {
    height: 100,
  },

  // Skeleton Loading
  skeletonLine: {
    backgroundColor: COLORS.border,
    borderRadius: 8,
  },
  skeletonCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.border,
  },
  skeletonCard: {
    flex: 1,
    height: 155,
    borderRadius: 20,
    backgroundColor: COLORS.border,
  },
  skeletonSection: {
    marginHorizontal: HORIZONTAL_PADDING,
    marginTop: 16,
    borderRadius: 24,
    backgroundColor: COLORS.border,
  },
});

export default AdminDashboardScreen;