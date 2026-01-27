// FILE: screens/admin/providers/service-providers/tabs/dashboard/dashboard.tsx
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
  refreshDashboard,
  setLoading,
  updateStats,
  updateCategories,
  updateCities,
} from './dashboardSlice';

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

export default function DashboardScreen() {
  const dispatch = useAppDispatch();
  const { stats, categories, cities, isLoading } = useAppSelector(
    (state) => state.adminSPDashboard
  );

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
    dispatch(refreshDashboard());
  };

  const renderHeader = () => (
    <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.headerContent}>
        <View style={styles.titleContainer}>
          <Text style={styles.greeting}>Good Morning 👋</Text>
          <Text style={styles.title}>Dashboard Overview</Text>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={22} color={colors.text.primary} />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.profileButton} activeOpacity={0.7}>
            <Ionicons name="person" size={20} color={colors.primary} />
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
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ]
        }
      ]}
    >
      <View style={styles.statHeader}>
        <View style={[styles.statIcon, { backgroundColor: stat.bgColor }]}>
          <Ionicons name={stat.icon as any} size={24} color={stat.color} />
        </View>
        <View style={styles.changeChip}>
          <Ionicons name="trending-up" size={12} color={colors.success} />
          <Text style={styles.changeText}>{stat.change}</Text>
        </View>
      </View>
      
      <Text style={styles.statValue}>{stat.value}</Text>
      <Text style={styles.statTitle}>{stat.title}</Text>
      
      <View style={styles.progressContainer}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              backgroundColor: stat.color,
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '75%']
              })
            }
          ]}
        />
      </View>
    </Animated.View>
  );

  const renderCategoryCard = (category: typeof categories[0], index: number) => (
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
      <View style={styles.categoryLeft}>
        <View style={[styles.categoryIcon, { backgroundColor: category.color + '15' }]}>
          <Ionicons name={category.icon as any} size={24} color={category.color} />
        </View>
        <View>
          <Text style={styles.categoryName}>{category.label}</Text>
          <Text style={styles.categorySubtext}>Service requests</Text>
        </View>
      </View>
      
      <View style={styles.categoryRight}>
        <Text style={styles.categoryValue}>{category.value}</Text>
        <View style={styles.percentageBadge}>
          <Text style={styles.percentageText}>
            {Math.round((category.value / 245) * 100)}%
          </Text>
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
                outputRange: ['0%', `${(category.value / 245) * 100}%`]
              })
            }
          ]}
        />
      </View>
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
        {/* Stats Grid */}
        <View style={styles.statsSection}>
          <View style={styles.statsGrid}>
            {stats.map((stat, index) => renderStatCard(stat, index))}
          </View>
        </View>

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
              <Text style={styles.sectionTitle}>Top Services</Text>
              <Text style={styles.sectionSubtitle}>Most popular this month</Text>
            </View>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.categoryList}>
            {categories.map((category, index) => renderCategoryCard(category, index))}
          </View>
        </Animated.View>

        {/* City Distribution */}
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
              <Text style={styles.sectionTitle}>City Coverage</Text>
              <Text style={styles.sectionSubtitle}>Service distribution</Text>
            </View>
            <TouchableOpacity style={styles.mapButton} activeOpacity={0.7}>
              <Ionicons name="map-outline" size={16} color={colors.primary} />
              <Text style={styles.mapButtonText}>Map</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.cityGrid}>
            {cities.map((city, index) => (
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
                <View style={styles.cityHeader}>
                  <View style={[styles.cityIconContainer, { backgroundColor: city.color + '15' }]}>
                    <Ionicons name="location" size={18} color={city.color} />
                  </View>
                  <View style={styles.cityGrowth}>
                    <Ionicons name="trending-up" size={10} color={colors.success} />
                    <Text style={styles.growthText}>{city.growth}</Text>
                  </View>
                </View>
                
                <Text style={styles.cityName}>{city.name}</Text>
                <Text style={styles.cityCount}>{city.count} bookings</Text>
                
                <View style={styles.cityProgressContainer}>
                  <Animated.View
                    style={[
                      styles.cityProgress,
                      {
                        backgroundColor: city.color,
                        width: progressAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', `${city.percentage}%`]
                        })
                      }
                    ]}
                  />
                </View>
              </Animated.View>
            ))}
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
  greeting: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.5,
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
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    backgroundColor: '#EF4444',
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  profileButton: {
    width: 44,
    height: 44,
    backgroundColor: '#ECFDF5',
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
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  changeText: {
    fontSize: 11,
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
    fontWeight: '500',
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  progressContainer: {
    height: 4,
    backgroundColor: colors.background,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
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
    position: 'relative',
  },
  categoryLeft: {
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
  categoryName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 2,
  },
  categorySubtext: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  categoryRight: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    alignItems: 'flex-end',
  },
  categoryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  percentageBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  percentageText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.success,
  },
  categoryProgressContainer: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  categoryProgress: {
    height: '100%',
    borderRadius: 3,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    gap: 6,
  },
  mapButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
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
  cityIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cityGrowth: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
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
    marginBottom: 4,
  },
  cityCount: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: '500',
    marginBottom: spacing.md,
  },
  cityProgressContainer: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  cityProgress: {
    height: '100%',
    borderRadius: 2,
  },
});

