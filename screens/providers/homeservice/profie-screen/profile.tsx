import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  Animated,
  StatusBar,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import {
  User,
  ChevronRight,
  CreditCard,
  Globe,
  HelpCircle,
  LogOut,
  Trash2,
  Camera,
  Shield,
  Bell,
  Moon,
  MapPin,
  Star,
  FileText,
  Clock,
  Settings,
  Calendar,
  Award,
  Heart,
  Gift,
  Wallet,
  ArrowUpRight,
} from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import type { RootState } from '../../../../store/store';

const { width } = Dimensions.get('window');

// Design System - Consistent with reference images
const theme = {
  colors: {
    primary: '#059669',
    primaryDark: '#047857',
    primaryLight: '#D1FAE5',
    background: '#F9FAFB',
    surface: '#FFFFFF',
    text: {
      primary: '#111827',
      secondary: '#6B7280',
      tertiary: '#9CA3AF',
      inverse: '#FFFFFF',
    },
    border: '#E5E7EB',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    purple: '#8B5CF6',
    pink: '#EC4899',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
};

export default function ProviderProfileScreen() {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const [isAvailable, setIsAvailable] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isUrdu, setIsUrdu] = useState(false);

  // Mock provider data - matches reference design
  const provider = {
    name: 'Muhammad Ali',
    email: 'muhammad.ali@email.com',
    category: 'Premium Member',
    memberSince: 'Jan 2024',
    profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
    bookings: 12,
    reviews: 8,
    points: 240,
    isVerified: true,
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Stats data - matching reference design exactly
  const stats = [
    {
      value: provider.bookings.toString(),
      label: 'Bookings',
      icon: Calendar,
      bgColor: '#EDE9FE',
      iconColor: '#8B5CF6',
    },
    {
      value: provider.reviews.toString(),
      label: 'Reviews',
      icon: Star,
      bgColor: '#FEF3C7',
      iconColor: '#F59E0B',
    },
    {
      value: provider.points.toString(),
      label: 'Points',
      icon: Gift,
      bgColor: '#D1FAE5',
      iconColor: '#059669',
    },
  ];

  // Account menu items - matching reference design
  const accountItems = [
    {
      id: 'edit',
      title: 'Edit Profile',
      subtitle: 'Update your personal info',
      icon: User,
      color: '#059669',
      bgColor: '#D1FAE5',
    },
    {
      id: 'payment',
      title: 'Payment Methods',
      subtitle: 'Manage cards & wallets',
      icon: CreditCard,
      color: '#059669',
      bgColor: '#D1FAE5',
      badge: '3',
    },
    {
      id: 'addresses',
      title: 'My Addresses',
      subtitle: 'Manage delivery locations',
      icon: MapPin,
      color: '#EF4444',
      bgColor: '#FEE2E2',
    },
    {
      id: 'favorites',
      title: 'Favorites',
      subtitle: 'Your saved services',
      icon: Heart,
      color: '#EC4899',
      bgColor: '#FCE7F3',
    },
  ];

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          (navigation as any).reset({
            index: 0,
            routes: [{ name: 'RoleSelection' }],
          });
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {} },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Green Gradient Header - Matching Reference */}
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryDark]}
          style={styles.header}
        >
          {/* Settings Button */}
          <TouchableOpacity style={styles.settingsButton}>
            <Settings size={22} color={theme.colors.text.inverse} />
          </TouchableOpacity>

          {/* Profile Image Section */}
          <Animated.View
            style={[
              styles.profileImageContainer,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.avatarWrapper}>
              <Image
                source={{ uri: provider.profileImage }}
                style={styles.avatar}
              />
              {/* Verification Badge - Top Right */}
              {provider.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Shield size={10} color={theme.colors.text.inverse} fill={theme.colors.text.inverse} />
                </View>
              )}
              {/* Camera Button - Bottom Center */}
              <TouchableOpacity style={styles.cameraButton}>
                <Camera size={14} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Name and Email */}
          <Animated.View
            style={[
              styles.profileInfo,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <Text style={styles.profileName}>{provider.name}</Text>
            <Text style={styles.profileEmail}>{provider.email}</Text>

            {/* Member Badge */}
            <View style={styles.memberBadge}>
              <Award size={14} color="#FFD700" />
              <Text style={styles.memberBadgeText}>
                {provider.category}
              </Text>
              <Text style={styles.memberSince}>Since {provider.memberSince}</Text>
            </View>
          </Animated.View>
        </LinearGradient>

        {/* Stats Cards Row - Matching Reference */}
        <View style={styles.statsContainer}>
          {stats.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: stat.bgColor }]}>
                <stat.icon size={22} color={stat.iconColor} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Rewards Card - Yellow Banner */}
        <TouchableOpacity style={styles.rewardsCard} activeOpacity={0.8}>
          <View style={styles.rewardsIconContainer}>
            <Gift size={24} color="#D97706" />
          </View>
          <View style={styles.rewardsContent}>
            <Text style={styles.rewardsTitle}>Earn Rewards</Text>
            <Text style={styles.rewardsSubtitle}>
              Complete bookings to earn points
            </Text>
          </View>
          <ChevronRight size={22} color="#D97706" />
        </TouchableOpacity>

        {/* Wallet & Earnings Card */}
        <TouchableOpacity
          style={styles.walletCard}
          activeOpacity={0.9}
          onPress={() => (navigation as any).navigate('ProviderWalletScreen')}
        >
          <LinearGradient
            colors={['#10B981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.walletGradient}
          >
            <View style={styles.walletLeft}>
              <View style={styles.walletIconContainer}>
                <Wallet size={22} color="#FFFFFF" />
              </View>
              <View style={styles.walletInfo}>
                <Text style={styles.walletLabel}>Wallet Balance</Text>
                <Text style={styles.walletBalance}>Rs 28,750</Text>
              </View>
            </View>
            <View style={styles.walletAction}>
              <ArrowUpRight size={18} color="rgba(255,255,255,0.9)" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <View style={styles.menuCard}>
            {accountItems.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  index < accountItems.length - 1 && styles.menuItemBorder,
                ]}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: item.bgColor }]}>
                  <item.icon size={20} color={item.color} />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
                <View style={styles.menuRight}>
                  {item.badge && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.badge}</Text>
                    </View>
                  )}
                  <ChevronRight size={18} color={theme.colors.text.tertiary} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PREFERENCES</Text>
          <View style={styles.menuCard}>
            {/* Available for Jobs */}
            <View style={[styles.menuItem, styles.menuItemBorder]}>
              <View style={[styles.menuIconContainer, { backgroundColor: theme.colors.primaryLight }]}>
                <Shield size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Available for Jobs</Text>
                <Text style={styles.menuSubtitle}>Toggle your availability</Text>
              </View>
              <Switch
                value={isAvailable}
                onValueChange={setIsAvailable}
                trackColor={{ false: '#E5E7EB', true: theme.colors.primaryLight }}
                thumbColor={isAvailable ? theme.colors.primary : '#F3F4F6'}
                ios_backgroundColor="#E5E7EB"
              />
            </View>

            {/* Notifications */}
            <View style={[styles.menuItem, styles.menuItemBorder]}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#FEE2E2' }]}>
                <Bell size={20} color="#EF4444" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Notifications</Text>
                <Text style={styles.menuSubtitle}>Push notifications</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#E5E7EB', true: theme.colors.primaryLight }}
                thumbColor={notificationsEnabled ? theme.colors.primary : '#F3F4F6'}
                ios_backgroundColor="#E5E7EB"
              />
            </View>

            {/* Dark Mode */}
            <View style={[styles.menuItem, styles.menuItemBorder]}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#E0E7FF' }]}>
                <Moon size={20} color="#6366F1" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Dark Mode</Text>
                <Text style={styles.menuSubtitle}>Switch theme</Text>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={setIsDarkMode}
                trackColor={{ false: '#E5E7EB', true: theme.colors.primaryLight }}
                thumbColor={isDarkMode ? theme.colors.primary : '#F3F4F6'}
                ios_backgroundColor="#E5E7EB"
              />
            </View>

            {/* Language */}
            <View style={styles.menuItem}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#FCE7F3' }]}>
                <Globe size={20} color="#EC4899" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Language</Text>
                <Text style={styles.menuSubtitle}>App language</Text>
              </View>
              <View style={styles.languageToggle}>
                <Text style={[styles.langText, !isUrdu && styles.langTextActive]}>EN</Text>
                <Switch
                  value={isUrdu}
                  onValueChange={setIsUrdu}
                  trackColor={{ false: '#E5E7EB', true: theme.colors.primaryLight }}
                  thumbColor={isUrdu ? theme.colors.primary : '#F3F4F6'}
                  ios_backgroundColor="#E5E7EB"
                  style={styles.langSwitch}
                />
                <Text style={[styles.langText, isUrdu && styles.langTextActive]}>اردو</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <View style={styles.dangerCard}>
            <TouchableOpacity
              style={[styles.dangerItem, styles.menuItemBorder]}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: '#FEE2E2' }]}>
                <LogOut size={20} color={theme.colors.error} />
              </View>
              <View style={styles.menuContent}>
                <Text style={[styles.menuTitle, { color: theme.colors.error }]}>
                  Logout
                </Text>
                <Text style={styles.menuSubtitle}>Sign out of your account</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dangerItem}
              onPress={handleDeleteAccount}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: '#FEE2E2' }]}>
                <Trash2 size={20} color={theme.colors.error} />
              </View>
              <View style={styles.menuContent}>
                <Text style={[styles.menuTitle, { color: theme.colors.error }]}>
                  Delete Account
                </Text>
                <Text style={styles.menuSubtitle}>Permanently remove account</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 45,
    paddingBottom: 35,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
  },
  settingsButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 38,
    right: 20,
    width: 42,
    height: 42,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageContainer: {
    marginBottom: theme.spacing.lg,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: theme.colors.surface,
  },
  verifiedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 2,
    left: '50%',
    marginLeft: -16,
    width: 32,
    height: 32,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text.inverse,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 14,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  memberBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text.inverse,
  },
  memberSince: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    marginLeft: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: theme.spacing.xl,
    marginTop: -20,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  rewardsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xxl,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  rewardsIconContainer: {
    width: 50,
    height: 50,
    backgroundColor: '#FDE68A',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  rewardsContent: {
    flex: 1,
  },
  rewardsTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 3,
  },
  rewardsSubtitle: {
    fontSize: 13,
    color: '#B45309',
  },

  // Wallet Card
  walletCard: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xxl,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  walletGradient: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 18,
  },
  walletLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  walletIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  walletInfo: {
    marginLeft: 14,
  },
  walletLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.85)',
  },
  walletBalance: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    marginTop: 2,
  },
  walletAction: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },

  section: {
    marginBottom: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.tertiary,
    letterSpacing: 1,
    marginBottom: theme.spacing.md,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 15,
    backgroundColor: theme.colors.surface,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 13,
    color: theme.colors.text.secondary,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  languageToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  langText: {
    fontSize: 13,
    color: theme.colors.text.tertiary,
    fontWeight: '500',
  },
  langTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  langSwitch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  dangerCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    overflow: 'hidden',
  },
  dangerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 15,
    backgroundColor: theme.colors.surface,
  },
  bottomSpacer: {
    height: 100,
  },
});