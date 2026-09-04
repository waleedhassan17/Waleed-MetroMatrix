import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
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
import {
  fetchProfile,
  updateAvailability,
  toggleNotifications,
  toggleDarkMode,
  toggleLanguage,
} from './profileSlice';
import { selectBalance, selectCurrency, fetchWallet } from '../../../../services/wallet';
import { performLogout } from '../../../../services/auth/logout';
import { contactSupport } from '../../../../utils/support/contactSupport';
import { currencySymbol } from '../../../../constants/Currency';
// Values come from the shared tokens via the provider bridge — see
// screens/providers/homeservice/providerTheme.ts.
import { theme } from '../providerTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// Design System - Consistent with reference images

const getInitials = (name?: string) => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
  const initials = parts.map((p) => p[0]?.toUpperCase() ?? '').join('');
  return initials || 'P';
};

export default function ProviderProfileScreen() {
  const navigation = useNavigation();
  // These screens rendered a bare View as their root, so on Android their
  // headers sat under the status bar and on notched iPhones under the
  // notch. Real insets, not StatusBar.currentHeight.
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();

  // NOTE: this slice declares `name: 'providerProfile'` but store.ts mounts it
  // at `profile`, so the slice's generated selectors would read an undefined
  // branch of the tree. Read the mounted path directly instead.
  const {
    provider,
    isAvailable,
    notificationsEnabled,
    isDarkMode,
    isUrdu,
    loading,
    error,
  } = useAppSelector((state: RootState) => state.profile);

  const walletBalance = useAppSelector(selectBalance) as number;
  const walletCurrency = useAppSelector(selectCurrency) as string;

  const [avatarFailed, setAvatarFailed] = useState(false);

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

  useEffect(() => {
    dispatch(fetchWallet());
  }, [dispatch]);

  // Covers the initial mount as well as every return to the tab, so edits made
  // elsewhere show up here without firing a duplicate request on first render.
  useFocusEffect(
    useCallback(() => {
      dispatch(fetchProfile());
    }, [dispatch])
  );

  const memberSince = useMemo(() => {
    if (!provider.joinedDate) return null;
    const parsed = new Date(provider.joinedDate);
    if (Number.isNaN(parsed.getTime())) return provider.joinedDate;
    return parsed.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }, [provider.joinedDate]);

  const stats = [
    {
      value: String(provider.jobsDone ?? 0),
      label: 'Jobs Done',
      icon: Calendar,
      bgColor: '#EDE9FE',
      iconColor: '#8B5CF6',
    },
    {
      value: String(provider.reviews ?? 0),
      label: 'Reviews',
      icon: Star,
      bgColor: '#FEF3C7',
      iconColor: '#F59E0B',
    },
    {
      value: String(provider.points ?? 0),
      label: 'Points',
      icon: Gift,
      bgColor: '#D1FAE5',
      iconColor: '#059669',
    },
  ];

  // Account menu items. Every entry now carries its own onPress — the array
  // previously held presentation only, and the renderer spread no handler, so
  // all four rows were decorative.
  const accountItems = [
    {
      id: 'edit',
      title: 'Edit Profile',
      subtitle: 'Update your personal info',
      icon: User,
      color: '#059669',
      bgColor: '#D1FAE5',
      onPress: () => (navigation as any).navigate('ProviderEditProfile'),
    },
    {
      id: 'payment',
      title: 'Payment Methods',
      subtitle: 'Manage your wallet & payouts',
      icon: CreditCard,
      color: '#059669',
      bgColor: '#D1FAE5',
      // The wallet is where payouts and balance actually live; a separate
      // card-management screen has no backend behind it yet.
      onPress: () => (navigation as any).navigate('WalletScreen'),
    },
    {
      id: 'addresses',
      title: 'My Addresses',
      subtitle: 'Manage saved locations',
      icon: MapPin,
      color: '#EF4444',
      bgColor: '#FEE2E2',
      onPress: () => (navigation as any).navigate('AddressManagement'),
    },
    {
      id: 'favorites',
      title: 'Favorites',
      subtitle: 'Providers you saved',
      icon: Heart,
      color: '#EC4899',
      bgColor: '#FCE7F3',
      onPress: () => (navigation as any).navigate('Favorites'),
    },
  ];

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          // This used to only navigate. The token, the Redux state, the socket
          // and the push registration all survived, so the next provider to
          // sign in on this device inherited the previous one's session.
          await performLogout(dispatch);
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
        {
          text: 'Delete',
          style: 'destructive',
          // There is no account-deletion endpoint yet, and an empty handler
          // that silently does nothing is worse than saying so: the provider
          // would believe their account was gone.
          onPress: () => contactSupport('Account deletion request'),
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Solid accent header. Home services spends its whole gradient
            budget on one hero (the customer's booking-confirmed state); a
            profile header is not that moment. */}
        <View style={styles.header}>
          {/* Settings Button */}
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => (navigation as any).navigate('ProviderSettings')}
            accessibilityLabel="Settings"
          >
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
              {provider.profileImage && !avatarFailed ? (
                <Image
                  source={{ uri: provider.profileImage }}
                  style={styles.avatar}
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarInitials}>{getInitials(provider.name)}</Text>
                </View>
              )}
              {/* Verification Badge - Top Right */}
              {provider.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Shield size={10} color={theme.colors.text.inverse} fill={theme.colors.text.inverse} />
                </View>
              )}
              {/* Camera Button - Bottom Center.
                  Avatar upload needs an image-picker + upload path that does
                  not exist yet; sending the provider to Edit Profile is the
                  honest nearest action. */}
              <TouchableOpacity
                style={styles.cameraButton}
                onPress={() => (navigation as any).navigate('ProviderEditProfile')}
                accessibilityLabel="Edit profile"
              >
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
            <Text style={styles.profileName}>
              {provider.name || (loading ? 'Loading…' : 'Your profile')}
            </Text>
            {!!provider.email && (
              <Text style={styles.profileEmail}>{provider.email}</Text>
            )}
            {provider.rating > 0 && (
              <View style={styles.ratingRow}>
                <Star size={13} color="#FFD700" fill="#FFD700" />
                <Text style={styles.ratingValue}>{provider.rating.toFixed(1)}</Text>
              </View>
            )}

            {/* Member Badge — only shown once we actually know something */}
            {(!!provider.membershipLevel || !!provider.category || !!memberSince) && (
              <View style={styles.memberBadge}>
                <Award size={14} color="#FFD700" />
                {!!(provider.membershipLevel || provider.category) && (
                  <Text style={styles.memberBadgeText}>
                    {provider.membershipLevel || provider.category}
                  </Text>
                )}
                {!!memberSince && (
                  <Text style={styles.memberSince}>Since {memberSince}</Text>
                )}
              </View>
            )}
          </Animated.View>
        </View>

        {!!error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText} numberOfLines={3}>{error}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => dispatch(fetchProfile())}
            >
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

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
        {/* There is no rewards programme behind this yet. */}
        <TouchableOpacity
          style={[styles.rewardsCard, styles.menuItemDisabled]}
          activeOpacity={0.8}
          disabled
        >
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
          onPress={() => (navigation as any).navigate('WalletScreen')}
        >
          <View style={styles.walletGradient}>
            <View style={styles.walletLeft}>
              <View style={styles.walletIconContainer}>
                <Wallet size={22} color="#FFFFFF" />
              </View>
              <View style={styles.walletInfo}>
                <Text style={styles.walletLabel}>Wallet Balance</Text>
                <Text style={styles.walletBalance}>
                  {currencySymbol(walletCurrency)}{' '}
                  {Number(walletBalance || 0).toLocaleString()}
                </Text>
              </View>
            </View>
            <View style={styles.walletAction}>
              <ArrowUpRight size={18} color="rgba(255,255,255,0.9)" />
            </View>
          </View>
        </TouchableOpacity>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.menuCard}>
            {accountItems.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  index < accountItems.length - 1 && styles.menuItemBorder,
                ]}
                activeOpacity={0.7}
                onPress={item.onPress}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: item.bgColor }]}>
                  <item.icon size={20} color={item.color} />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
                <View style={styles.menuRight}>
                  <ChevronRight size={18} color={theme.colors.text.tertiary} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
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
                onValueChange={(next) => {
                  dispatch(updateAvailability({ isOnline: next }));
                }}
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
                onValueChange={() => {
                  dispatch(toggleNotifications());
                }}
                trackColor={{ false: '#E5E7EB', true: theme.colors.primaryLight }}
                thumbColor={notificationsEnabled ? theme.colors.primary : '#F3F4F6'}
                ios_backgroundColor="#E5E7EB"
              />
            </View>

            {/* Dark Mode and Language are shown DISABLED on purpose.
                Their switches were wired to Redux, but nothing in the app
                consumes those values: there is no theme provider and no i18n
                layer, and every screen hardcodes its colours and English
                copy. A switch that flips and changes nothing reads as broken,
                so until those layers exist these say so plainly. */}
            <View style={[styles.menuItem, styles.menuItemBorder, styles.menuItemDisabled]}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#E0E7FF' }]}>
                <Moon size={20} color="#6366F1" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Dark Mode</Text>
                <Text style={styles.menuSubtitle}>Coming soon</Text>
              </View>
              <Switch
                value={false}
                disabled
                trackColor={{ false: '#E5E7EB', true: theme.colors.primaryLight }}
                thumbColor="#F3F4F6"
                ios_backgroundColor="#E5E7EB"
              />
            </View>

            {/* Language */}
            <View style={[styles.menuItem, styles.menuItemDisabled]}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#FCE7F3' }]}>
                <Globe size={20} color="#EC4899" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Language</Text>
                <Text style={styles.menuSubtitle}>English · more coming soon</Text>
              </View>
              <View style={styles.languageToggle}>
                <Text style={[styles.langText, styles.langTextActive]}>EN</Text>
                <Switch
                  value={false}
                  disabled
                  trackColor={{ false: '#E5E7EB', true: theme.colors.primaryLight }}
                  thumbColor="#F3F4F6"
                  ios_backgroundColor="#E5E7EB"
                  style={styles.langSwitch}
                />
                <Text style={styles.langText}>اردو</Text>
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
  menuItemDisabled: {
    opacity: 0.5,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: theme.colors.primary,
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
  avatarFallback: {
    backgroundColor: theme.colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 34,
    fontWeight: '700',
    color: theme.colors.text.inverse,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  ratingValue: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text.inverse,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    marginHorizontal: theme.spacing.xl,
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.md,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#B91C1C',
  },
  retryBtn: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.error,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text.inverse,
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
  // Was a hardcoded ['#10B981','#059669'] gradient that matched neither the
  // theme nor the header above it. A solid accent panel says the same thing.
  walletGradient: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 18,
    backgroundColor: theme.colors.primary,
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
  // Was 12px ALL-CAPS with 1pt tracking — the eyebrow label the shared type
  // scale deliberately has no role for.
  sectionTitle: {
    ...theme.type.heading,
    color: theme.colors.text.primary,
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