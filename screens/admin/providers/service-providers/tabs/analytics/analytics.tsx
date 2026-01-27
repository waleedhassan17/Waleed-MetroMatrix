// FILE: screens/admin/providers/service-providers/tabs/analytics/analytics.tsx
import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Animated,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../../../../../hooks/useReduxHooks';
import {
  setLoading,
  calculateRevenueGrowth,
  setSelectedCity,
} from './analyticsSlice';

const { width } = Dimensions.get('window');
const isAndroid = Platform.OS === 'android';

const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

const colors = {
  primary: '#20C997',
  background: '#F8FAFB',
  surface: '#FFFFFF',
  text: {
    primary: '#1A1D29',
    secondary: '#6B7280',
    tertiary: '#9CA3AF',
  },
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  purple: '#8B5CF6',
  border: '#E5E7EB',
};

const formatCurrency = (amount: number) => {
  if (amount >= 100000) {
    return `Rs ${(amount / 100000).toFixed(1)}L`;
  } else if (amount >= 1000) {
    return `Rs ${(amount / 1000).toFixed(0)}k`;
  }
  return `Rs ${amount.toLocaleString()}`;
};

export default function AnalyticsScreen() {
  const dispatch = useAppDispatch();
  const {
    revenueData,
    categoryData,
    cityPerformance,
    stats,
    isLoading,
    selectedCity
  } = useAppSelector((state) => state.adminSPAnalytics);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 1200,
        delay: 300,
        useNativeDriver: false,
      })
    ]).start();
  }, []);

  const handleRefresh = () => {
    dispatch(setLoading(true));
    dispatch(calculateRevenueGrowth());
    setTimeout(() => {
      dispatch(setLoading(false));
    }, 1000);
  };

  const renderHeader = () => (
    <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      
      <View style={styles.headerContent}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Analytics</Text>
          <Text style={styles.subtitle}>Performance insights & metrics</Text>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
            <Ionicons name="calendar-outline" size={20} color={colors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
            <Ionicons name="download-outline" size={20} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );

  const renderStatCard = (stat: typeof stats[0], index: number) => (
    <Animated.View
      key={stat.title}
      style={[
        styles.statCard,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
        }
      ]}
    >
      <View style={styles.statHeader}>
        <View style={[styles.statIcon, { backgroundColor: stat.bgColor }]}>
          <Ionicons name={stat.icon as any} size={22} color={stat.color} />
        </View>
        <View style={styles.trendBadge}>
          <Ionicons name="trending-up" size={10} color={colors.success} />
          <Text style={styles.trendText}>{stat.trend}</Text>
        </View>
      </View>
      
      <Text style={styles.statValue}>{stat.value}</Text>
      <Text style={styles.statTitle}>{stat.title}</Text>
      <Text style={styles.statSubtitle}>{stat.subtitle}</Text>
    </Animated.View>
  );

  const renderRevenueChart = () => {
    const maxRevenue = Math.max(...revenueData.map(d => Math.max(d.lahore, d.faisalabad)));
    
    return (
      <Animated.View
        style={[
          styles.chartCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.chartHeader}>
          <View>
            <Text style={styles.chartTitle}>Revenue by City</Text>
            <Text style={styles.chartSubtitle}>Monthly comparison</Text>
          </View>
          <TouchableOpacity activeOpacity={0.7}>
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.legendText}>Lahore</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
            <Text style={styles.legendText}>Faisalabad</Text>
          </View>
        </View>

        <View style={styles.chart}>
          {revenueData.map((item, index) => (
            <View key={index} style={styles.barGroup}>
              <Text style={styles.barAmount}>
                {formatCurrency(Math.max(item.lahore, item.faisalabad))}
              </Text>
              
              <View style={styles.barWrapper}>
                <View style={styles.dualBars}>
                  <Animated.View
                    style={[
                      styles.bar,
                      {
                        height: progressAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, (item.lahore / maxRevenue) * 100]
                        }),
                        backgroundColor: '#3B82F6',
                        marginRight: 4
                      }
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.bar,
                      {
                        height: progressAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, (item.faisalabad / maxRevenue) * 100]
                        }),
                        backgroundColor: colors.success
                      }
                    ]}
                  />
                </View>
              </View>
              
              <Text style={styles.barLabel}>{item.month}</Text>
            </View>
          ))}
        </View>
      </Animated.View>
    );
  };

  const renderCategoryCard = (category: typeof categoryData[0], index: number) => (
    <Animated.View
      key={category.label}
      style={[
        styles.categoryCard,
        {
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }]
        }
      ]}
    >
      <View style={styles.categoryHeader}>
        <View style={[styles.categoryIcon, { backgroundColor: category.color + '15' }]}>
          <Ionicons name={category.icon as any} size={24} color={category.color} />
        </View>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryName}>{category.label}</Text>
          <Text style={styles.categoryValue}>{formatCurrency(category.value)}</Text>
        </View>
      </View>
      
      <View style={styles.categoryProgressContainer}>
        <Animated.View
          style={[
            styles.categoryProgress,
            {
              backgroundColor: category.color,
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', `${(category.value / 245000) * 100}%`]
              })
            }
          ]}
        />
      </View>
    </Animated.View>
  );

  const renderCityCard = (city: typeof cityPerformance[0], index: number) => (
    <Animated.View
      key={city.name}
      style={[
        styles.cityCard,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
        }
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => dispatch(setSelectedCity(city.name))}
      >
        <View style={styles.cityHeader}>
          <Text style={styles.cityEmoji}>{city.icon}</Text>
          <View style={styles.cityGrowth}>
            <Ionicons name="trending-up" size={10} color={colors.success} />
            <Text style={styles.growthText}>{city.growth}</Text>
          </View>
        </View>
        
        <Text style={styles.cityName}>{city.name}</Text>
        
        <View style={styles.cityStats}>
          <View style={styles.cityStat}>
            <Text style={styles.cityStatValue}>{city.bookings.toLocaleString()}</Text>
            <Text style={styles.cityStatLabel}>Bookings</Text>
          </View>
          <View style={styles.cityStatDivider} />
          <View style={styles.cityStat}>
            <Text style={styles.cityStatValue}>{formatCurrency(city.revenue)}</Text>
            <Text style={styles.cityStatLabel}>Revenue</Text>
          </View>
        </View>
        
        <View style={styles.cityMetrics}>
          <View style={styles.cityMetric}>
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            <Text style={styles.metricText}>{city.completion}</Text>
          </View>
          <View style={styles.cityMetric}>
            <Ionicons name="star" size={14} color={colors.warning} />
            <Text style={styles.metricText}>{city.rating}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
        }
      >
        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statsGrid}>
            {stats.map((stat, index) => renderStatCard(stat, index))}
          </View>
        </View>

        {/* Revenue Chart */}
        {renderRevenueChart()}

        {/* Category Performance */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Category Performance</Text>
              <Text style={styles.sectionSubtitle}>Top services revenue</Text>
            </View>
          </View>
          
          <View style={styles.categoryList}>
            {categoryData.map((category, index) => renderCategoryCard(category, index))}
          </View>
        </Animated.View>

        {/* City Performance */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>City Performance</Text>
              <Text style={styles.sectionSubtitle}>Regional insights</Text>
            </View>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.viewAllText}>View Map</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.cityGrid}>
            {cityPerformance.map((city, index) => renderCityCard(city, index))}
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    paddingTop: isAndroid ? spacing.lg : spacing.sm,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  actionButton: {
    width: 44,
    height: 44,
    backgroundColor: colors.background,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  statsSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCard: {
    width: (width - spacing.lg * 2 - spacing.md) / 2,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.success,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  statSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 180,
  },
  barGroup: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barAmount: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  barWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    width: '100%',
    paddingHorizontal: 4,
  },
  dualBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  bar: {
    width: 12,
    borderRadius: 6,
    minHeight: 8,
  },
  barLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.tertiary,
    marginTop: spacing.sm,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  categoryList: {
    gap: spacing.md,
  },
  categoryCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.lg,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  categoryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  categoryProgressContainer: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  categoryProgress: {
    height: '100%',
    borderRadius: 3,
  },
  cityGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cityCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.lg,
  },
  cityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cityEmoji: {
    fontSize: 32,
  },
  cityGrowth: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  growthText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.success,
  },
  cityName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  cityStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cityStat: {
    flex: 1,
  },
  cityStatValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 2,
  },
  cityStatLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  cityStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  cityMetrics: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cityMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
  },
});

