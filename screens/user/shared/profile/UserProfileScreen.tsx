// ============================================================================
// The one account screen, for all three verticals.
//
// WHY IT TAKES ITS COLOUR FROM A ROUTE PARAM
// ------------------------------------------
// This screen is registered once, on the Base stack, but it is opened from
// three modules that each own a different accent. `RouteModules` in
// navigation-maps/Base.tsx can only assign a route ONE module, so the usual
// mechanism cannot answer "which vertical did this person come from" — only
// the caller knows. So the caller says, and the screen wraps itself in that
// module's ThemeProvider.
//
// The export is split in two because a component cannot read a context it
// renders itself: `UserProfileScreen` provides the theme, `ProfileContent`
// consumes it.
//
// Omitting `module` is meaningful, not a fallback: ThemeProvider inherits the
// enclosing module, so the entry from the module chooser stays neutral rather
// than claiming a vertical the user has not entered.
//
// WHAT IS ACCENTED AND WHAT IS NOT
// --------------------------------
// The accent carries the hero, the status bar, the active tab, primary
// buttons and the module's own rows. It deliberately does NOT take over the
// per-row icon tints (see ROW_TINT) — those are a fixed categorical palette,
// and flattening fifteen rows to one colour would remove the only thing that
// distinguishes them at a glance. Red/amber stay semantic everywhere.
// ============================================================================
import React, { useMemo, useState, useRef, useEffect } from 'react';
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
  Platform,
  Switch,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
// Route names are string literals here rather than `BaseRouteNames`: that lives
// in navigation-maps/Base, which imports this screen, and importing it back
// would close the cycle.
import { C, ThemeProvider, useTheme, type ModuleName, type ThemeColors } from '../../../../theme';
import { BackButton, BackButtonSpacer } from '../../../../components/ui';
import { useAppSelector, useAppDispatch } from '../../../../hooks/useReduxHooks';
import { selectTotalUnread } from '../../../../store/unreadSlice';
import {
  selectUser,
  selectUserAddresses,
  selectIsPremium,
  selectIsVerified,
  selectUserStats,
  saveUserProfile,
  updateAvatar,
  addAddress,
  deleteAddress,
  setDefaultAddress,
  toggleNotificationPreference,
  toggleDarkMode,
  setLanguage,
  fetchUserProfile,
  selectProfileLoading,
  selectProfileError,
} from './userProfileSlice';
import {
  User,
  Edit3,
  CreditCard,
  MapPin,
  Heart,
  HelpCircle,
  Bell,
  Moon,
  Globe,
  Shield,
  FileText,
  LogOut,
  Trash2,
  ChevronRight,
  Camera,
  Award,
  Calendar,
  Star,
  Coins,
  Check,
  Settings,
  Headphones,
  X,
  Plus,
  MessageSquare,
  ClipboardList,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

/**
 * Categorical tints for the row icons — NOT the module accent.
 *
 * Fifteen rows all painted in one colour is a wall, not a menu; these are what
 * lets someone find "Addresses" by its colour without reading. They stay fixed
 * across modules for the same reason a settings app's icons do. `accent` is the
 * one that follows the module, and it is used only by the rows that belong to
 * that module.
 */
const ROW_TINT = {
  violet: { bg: '#EDE9FE', fg: '#8B5CF6' },
  blue: { bg: '#DBEAFE', fg: '#2563EB' },
  sky: { bg: '#DBEAFE', fg: '#3B82F6' },
  rose: { bg: '#FCE7F3', fg: '#EC4899' },
  amber: { bg: '#FEF3C7', fg: '#F59E0B' },
  red: { bg: C.errorSoft, fg: C.error },
  ink: { bg: C.ink, fg: C.surface },
  grey: { bg: C.surfaceSunken, fg: C.inkMuted },
} as const;

type ProfileTab = 'overview' | 'addresses' | 'settings';

/**
 * The screen has three tabs, but callers do not all know that: SlideOutSidebar
 * asks for `notifications`, which is a row inside Preferences rather than a tab
 * of its own. That param was silently ignored before this screen honoured
 * `tab` at all; now that it does, an unrecognised value would select nothing
 * and render an empty body. Anything unknown resolves to a real tab instead.
 */
const asProfileTab = (tab: string | undefined): ProfileTab => {
  if (tab === 'addresses' || tab === 'settings') return tab;
  if (tab === 'notifications') return 'settings';
  return 'overview';
};

/** Names the module block after the vertical, not after "Services". */
const MODULE_SECTION_TITLE: Record<ModuleName, string> = {
  neutral: '',
  shopping: 'Shopping',
  healthcare: 'Healthcare',
  homeservice: 'Home Services',
};

// Menu Item Component
interface MenuItem {
  id: string;
  icon: typeof User;
  label: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  iconBg: string;
  iconColor: string;
  hasToggle?: boolean;
  toggleValue?: boolean;
  onToggle?: () => void;
  onPress?: () => void;
}

const MenuItemComponent: React.FC<{ 
  item: MenuItem; 
  index: number;
  onPress: () => void;
}> = ({ item, index, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const ItemIcon = item.icon;
  // The one accented thing in a row: a switch that is ON reads as the module's
  // colour, the same way a selected chip does everywhere else.
  const { colors } = useTheme();

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.menuItem}
        activeOpacity={item.hasToggle ? 1 : 0.7}
        onPressIn={!item.hasToggle ? handlePressIn : undefined}
        onPressOut={!item.hasToggle ? handlePressOut : undefined}
        onPress={onPress}
      >
        <View style={[styles.menuIconContainer, { backgroundColor: item.iconBg }]}>
          <ItemIcon size={18} color={item.iconColor} strokeWidth={2} />
        </View>
        <View style={styles.menuContent}>
          <Text style={styles.menuLabel}>{item.label}</Text>
          {item.subtitle && <Text style={styles.menuSubtitle}>{item.subtitle}</Text>}
        </View>
        {item.badge && (
          <View style={[styles.badge, { backgroundColor: `${item.badgeColor}15` }]}>
            <Text style={[styles.badgeText, { color: item.badgeColor }]}>{item.badge}</Text>
          </View>
        )}
        {item.hasToggle && (
          <Switch
            value={item.toggleValue}
            onValueChange={item.onToggle}
            trackColor={{ false: C.line, true: colors.accentSoft }}
            thumbColor={item.toggleValue ? colors.accent : C.inkFaint}
            ios_backgroundColor={C.line}
          />
        )}
        {!item.hasToggle && <ChevronRight size={18} color={C.disabled} />}
      </TouchableOpacity>
    </Animated.View>
  );
};

// Stats Card Component
const StatsCard: React.FC<{
  icon: typeof Calendar;
  value: number | string;
  label: string;
  color: string;
  bgColor: string;
}> = ({ icon: Icon, value, label, color, bgColor }) => {
  return (
    <View style={styles.statsCard}>
      <View style={[styles.statsIconContainer, { backgroundColor: bgColor }]}>
        <Icon size={18} color={color} strokeWidth={2} />
      </View>
      <Text style={styles.statsValue}>{value}</Text>
      <Text style={styles.statsLabel}>{label}</Text>
    </View>
  );
};

export interface ProfileRouteParams {
  /** Which vertical opened this. Omit to inherit — see the file header. */
  module?: ModuleName;
  /** True when rendered as a tab root, which has nothing to go back to. */
  asTab?: boolean;
  /** Opening tab. Unrecognised values resolve — see `asProfileTab`. */
  tab?: string;
}

/**
 * Provides the module theme. All the screen's own rendering is in
 * `ProfileContent`, which sits under this provider so it can read it.
 */
export default function UserProfileScreen() {
  const route = useRoute();
  const params = (route.params ?? {}) as ProfileRouteParams;

  return (
    <ThemeProvider module={params.module}>
      <ProfileContent asTab={!!params.asTab} initialTab={asProfileTab(params.tab)} />
    </ThemeProvider>
  );
}

function ProfileContent({ asTab, initialTab }: { asTab: boolean; initialTab: ProfileTab }) {
  const navigation = useNavigation<any>();
  const { colors, module } = useTheme();
  const accent = useMemo(() => makeAccentStyles(colors), [colors]);
  const dispatch = useAppDispatch();
  const unreadTotal = useAppSelector(selectTotalUnread);
  const user = useAppSelector(selectUser);
  const addresses = useAppSelector(selectUserAddresses);
  const isPremium = useAppSelector(selectIsPremium);
  const isVerified = useAppSelector(selectIsVerified);
  const stats = useAppSelector(selectUserStats);
  const isLoading = useAppSelector(selectProfileLoading);
  const profileError = useAppSelector(selectProfileError);

  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 1],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    dispatch(fetchUserProfile());
  }, [dispatch]);

  // The profile now arrives from the API after the first render, so the edit
  // fields have to pick it up when it lands — seeding them once from the
  // initial (empty) state left the modal blank.
  useEffect(() => {
    setEditName(user?.name ?? '');
    setEditPhone(user?.phone ?? '');
  }, [user?.name, user?.phone]);

  const handleSaveProfile = () => {
    dispatch(saveUserProfile({ name: editName, phone: editPhone }));
    setShowEditModal(false);
  };

  const handleAvatarPress = () => {
    // Handle avatar change
  };

  const accountMenuItems: MenuItem[] = [
    {
      id: 'edit-profile',
      icon: Edit3,
      label: 'Edit Profile',
      subtitle: 'Update your personal info',
      iconBg: ROW_TINT.violet.bg,
      iconColor: ROW_TINT.violet.fg,
      onPress: () => setShowEditModal(true),
    },
    {
      // Symmetry with the provider dashboard: chat was previously reachable
      // only from inside one booking, on both sides.
      id: 'messages',
      icon: MessageSquare,
      label: 'Messages',
      subtitle: 'Your conversations with providers',
      iconBg: ROW_TINT.blue.bg,
      iconColor: ROW_TINT.blue.fg,
      // Live unread count — the menu already renders a `badge` field.
      ...(unreadTotal > 0
        ? { badge: unreadTotal > 99 ? '99+' : String(unreadTotal), badgeColor: C.error }
        : {}),
      onPress: () => navigation.navigate('Conversations' as never),
    },
    {
      id: 'payment-methods',
      icon: CreditCard,
      label: 'Payment Methods',
      subtitle: 'Manage cards & wallets',
      iconBg: colors.accentSoft,
      iconColor: colors.accentDeep,
      onPress: () => navigation.navigate('WalletScreen' as never),
    },
    {
      id: 'addresses',
      icon: MapPin,
      label: 'My Addresses',
      subtitle: `${addresses.length} saved addresses`,
      iconBg: ROW_TINT.red.bg,
      iconColor: ROW_TINT.red.fg,
      onPress: () => setActiveTab('addresses'),
    },
  ];

  /**
   * The rows that only make sense in the vertical you came from.
   *
   * Every destination lives in a different navigator, so each one names its
   * shell and the screen inside it — the same nested form the rest of the app
   * uses to cross a navigator boundary. Without this block the screen showed
   * one fixed set built around home services: a shopping customer had no route
   * to their orders at all, and "Saved services & providers" appeared in
   * healthcare, where it means nothing.
   */
  const moduleMenuItems: MenuItem[] = useMemo(() => {
    const tint = { iconBg: colors.accentSoft, iconColor: colors.accentDeep };

    if (module === 'shopping') {
      return [
        {
          id: 'orders',
          icon: ClipboardList,
          label: 'My Orders',
          // `allBrands` is what makes this the cross-brand history: the
          // per-brand tabs only ever show one store's orders.
          subtitle: 'Track and review every order',
          ...tint,
          onPress: () =>
            navigation.navigate('Shopping', {
              screen: 'MyOrders',
              params: { allBrands: true },
            }),
        },
      ];
    }

    if (module === 'healthcare') {
      return [
        {
          id: 'appointments',
          icon: Calendar,
          label: 'My Appointments',
          subtitle: 'Upcoming and past visits',
          ...tint,
          onPress: () =>
            navigation.navigate('HealthcareStack', { screen: 'MyAppointments' }),
        },
        {
          id: 'records',
          icon: FileText,
          label: 'Health Records',
          subtitle: 'Reports, prescriptions and results',
          ...tint,
          onPress: () => navigation.navigate('HealthcareStack', { screen: 'HealthRecords' }),
        },
      ];
    }

    if (module === 'homeservice') {
      return [
        {
          id: 'bookings',
          icon: Calendar,
          label: 'My Bookings',
          subtitle: 'Jobs booked, active and done',
          ...tint,
          onPress: () => navigation.navigate('HomeServiceLayout', { screen: 'bookings' }),
        },
        {
          id: 'favorites',
          icon: Heart,
          label: 'Saved Providers',
          subtitle: 'Tradespeople you hearted',
          ...tint,
          onPress: () => navigation.navigate('Favorites'),
        },
      ];
    }

    // Neutral: no vertical has been entered, so there is nothing module-shaped
    // to offer. The shared sections below stand on their own.
    return [];
  }, [colors.accentDeep, colors.accentSoft, module, navigation]);

  const preferencesMenuItems: MenuItem[] = [
    {
      id: 'notifications',
      icon: Bell,
      label: 'Notifications',
      subtitle: 'Push notification settings',
      iconBg: ROW_TINT.red.bg,
      iconColor: ROW_TINT.red.fg,
      hasToggle: true,
      toggleValue: user?.notificationPreferences.pushEnabled ?? true,
      onToggle: () => dispatch(toggleNotificationPreference('pushEnabled')),
    },
    {
      id: 'dark-mode',
      icon: Moon,
      label: 'Dark Mode',
      subtitle: 'Switch theme appearance',
      iconBg: ROW_TINT.ink.bg,
      iconColor: ROW_TINT.ink.fg,
      hasToggle: true,
      toggleValue: user?.darkMode ?? false,
      onToggle: () => dispatch(toggleDarkMode()),
    },
    {
      id: 'language',
      icon: Globe,
      label: 'Language',
      subtitle: user?.language === 'en' ? 'English' : 'اردو',
      iconBg: ROW_TINT.sky.bg,
      iconColor: ROW_TINT.sky.fg,
      onPress: () => dispatch(setLanguage(user?.language === 'en' ? 'ur' : 'en')),
    },
  ];

  const supportMenuItems: MenuItem[] = [
    {
      id: 'help',
      icon: HelpCircle,
      label: 'Help Center',
      subtitle: 'FAQs & support articles',
      iconBg: ROW_TINT.sky.bg,
      iconColor: ROW_TINT.sky.fg,
      onPress: () => {},
    },
    {
      id: 'chat',
      icon: Headphones,
      label: 'Live Support',
      subtitle: '24/7 customer support',
      // "Online" is a status, not a brand moment — it stays semantic green in
      // every module rather than turning orange inside shopping.
      badge: 'Online',
      badgeColor: C.success,
      iconBg: C.successSoft,
      iconColor: C.success,
      onPress: () => {},
    },
  ];

  const legalMenuItems: MenuItem[] = [
    {
      id: 'privacy',
      icon: Shield,
      label: 'Privacy & Security',
      iconBg: ROW_TINT.grey.bg,
      iconColor: ROW_TINT.grey.fg,
      onPress: () => {},
    },
    {
      id: 'terms',
      icon: FileText,
      label: 'Terms of Service',
      iconBg: ROW_TINT.grey.bg,
      iconColor: ROW_TINT.grey.fg,
      onPress: () => {},
    },
  ];

  // Render Overview Tab
  const renderOverview = () => (
    <>
      {/* Stats Section */}
      <View style={styles.statsSection}>
        <StatsCard
          icon={Calendar}
          value={stats?.totalBookings || 0}
          label="Total Bookings"
          color={ROW_TINT.violet.fg}
          bgColor={ROW_TINT.violet.bg}
        />
        <StatsCard
          icon={Star}
          value={stats?.reviews || 0}
          label="Reviews"
          color={ROW_TINT.amber.fg}
          bgColor={ROW_TINT.amber.bg}
        />
        <StatsCard
          icon={Coins}
          value={stats?.points || 0}
          label="Points"
          color={colors.accentDeep}
          bgColor={colors.accentSoft}
        />
      </View>

      {/* Account Section */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.menuCard}>
          {accountMenuItems.map((item, index) => (
            <React.Fragment key={item.id}>
              <MenuItemComponent
                item={item}
                index={index}
                onPress={item.onPress || (() => {})}
              />
              {index < accountMenuItems.length - 1 && <View style={styles.menuDivider} />}
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* The vertical you came from. Absent entirely in neutral, so the
          section header never appears over an empty card. */}
      {moduleMenuItems.length > 0 && (
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>{MODULE_SECTION_TITLE[module]}</Text>
          <View style={styles.menuCard}>
            {moduleMenuItems.map((item, index) => (
              <React.Fragment key={item.id}>
                <MenuItemComponent
                  item={item}
                  index={index}
                  onPress={item.onPress || (() => {})}
                />
                {index < moduleMenuItems.length - 1 && <View style={styles.menuDivider} />}
              </React.Fragment>
            ))}
          </View>
        </View>
      )}

      {/* Preferences Section */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.menuCard}>
          {preferencesMenuItems.map((item, index) => (
            <React.Fragment key={item.id}>
              <MenuItemComponent
                item={item}
                index={index}
                onPress={item.onPress || (() => {})}
              />
              {index < preferencesMenuItems.length - 1 && <View style={styles.menuDivider} />}
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* Help Section */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Help & Support</Text>
        <View style={styles.menuCard}>
          {supportMenuItems.map((item, index) => (
            <React.Fragment key={item.id}>
              <MenuItemComponent
                item={item}
                index={index}
                onPress={item.onPress || (() => {})}
              />
              {index < supportMenuItems.length - 1 && <View style={styles.menuDivider} />}
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* Legal Section */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Legal</Text>
        <View style={styles.menuCard}>
          {legalMenuItems.map((item, index) => (
            <React.Fragment key={item.id}>
              <MenuItemComponent
                item={item}
                index={index}
                onPress={item.onPress || (() => {})}
              />
              {index < legalMenuItems.length - 1 && <View style={styles.menuDivider} />}
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton}>
        <View style={styles.logoutIconContainer}>
          <LogOut size={20} color={C.error} />
        </View>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {/* Delete Account */}
      <TouchableOpacity style={styles.deleteAccountButton}>
        <Trash2 size={16} color={C.error} />
        <Text style={styles.deleteAccountText}>Delete Account</Text>
      </TouchableOpacity>

      {/* Version */}
      <Text style={styles.versionText}>MetroMatrix v2.0.1</Text>

      <View style={{ height: 40 }} />
    </>
  );

  // Render Addresses Tab
  const renderAddresses = () => (
    <View style={styles.addressesContainer}>
      <TouchableOpacity style={styles.addAddressButton}>
        <View style={[styles.addAddressIcon, accent.solid]}>
          <Plus size={24} color={C.inkInverse} />
        </View>
        <Text style={styles.addAddressText}>Add New Address</Text>
      </TouchableOpacity>

      {addresses.map((address, index) => (
        <View key={address.id} style={styles.addressCard}>
          <View style={styles.addressHeader}>
            <View
              style={[
                styles.addressTypeBadge,
                {
                  backgroundColor:
                    address.label === 'home' ? colors.accentSoft : ROW_TINT.blue.bg,
                },
              ]}
            >
              <Text
                style={[
                  styles.addressTypeText,
                  { color: address.label === 'home' ? colors.accentDeep : ROW_TINT.blue.fg },
                ]}
              >
                {address.label.charAt(0).toUpperCase() + address.label.slice(1)}
              </Text>
            </View>
            {address.isDefault && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultBadgeText}>Default</Text>
              </View>
            )}
          </View>
          <Text style={styles.addressText}>{address.address}</Text>
          <Text style={styles.addressCity}>{address.city} {address.postalCode}</Text>
          <View style={styles.addressActions}>
            {!address.isDefault && (
              <TouchableOpacity
                style={styles.setDefaultButton}
                onPress={() => dispatch(setDefaultAddress(address.id))}
              >
                <Text style={styles.setDefaultText}>Set as Default</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => dispatch(deleteAddress(address.id))}
            >
              <Trash2 size={16} color={C.error} />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );

  const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

  // The profile is fetched rather than seeded now, so the first paint has no
  // user to render — show that it is loading instead of an empty green header.
  if (!user) {
    return (
      <View style={[styles.container, styles.centered]}>
        <StatusBar barStyle="dark-content" backgroundColor={C.surface} />
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.accent} />
        ) : (
          <>
            <Text style={styles.stateTitle}>Couldn't load your profile</Text>
            <Text style={styles.stateMessage}>
              {profileError || 'Please check your connection and try again.'}
            </Text>
            <TouchableOpacity
              style={[styles.stateRetryBtn, accent.solid]}
              onPress={() => dispatch(fetchUserProfile())}
            >
              <Text style={styles.stateRetryText}>Try Again</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.accent} translucent />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Hero Profile Header */}
        <LinearGradient
          colors={[colors.accent, colors.accentDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: STATUS_BAR_HEIGHT + 12 }]}
        >
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />

          {/* Nav Row */}
          <View style={styles.navRow}>
            {/* A tab root has nothing to go back to, so the chevron would be a
                control that does nothing — the same call FavoritesScreen makes.
                The empty view keeps the gear on the right where it belongs. */}
            {asTab ? (
              <BackButtonSpacer />
            ) : (
              <BackButton tone="onAccent" onPress={() => navigation.goBack()} />
            )}
            {/* Bare, like the back control beside it. One contained button and
                one bare one in the same row reads as an accident. */}
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => setActiveTab('settings')}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Settings"
            >
              <Settings size={20} color={C.inkInverse} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Profile Info */}
          <View style={styles.profileInfo}>
            <View style={styles.avatarContainer}>
              <Image source={{ uri: user?.avatar }} style={styles.avatar} />
              <TouchableOpacity style={styles.cameraButton} onPress={handleAvatarPress}>
                <Camera size={12} color={C.inkInverse} strokeWidth={2.5} />
              </TouchableOpacity>
              {isPremium && (
                <View style={[styles.verifiedBadge, accent.solid]}>
                  <Check size={10} color={C.inkInverse} strokeWidth={3} />
                </View>
              )}
            </View>

            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            {user?.phone ? <Text style={styles.userPhone}>{user.phone}</Text> : null}

            {isPremium && (
              <View style={styles.premiumBadge}>
                <Award size={12} color={ROW_TINT.amber.bg} strokeWidth={2.5} />
                <Text style={styles.premiumText}>Premium Member</Text>
                {stats?.memberSince ? (
                  <Text style={styles.memberSince}>· Since {stats.memberSince}</Text>
                ) : null}
              </View>
            )}
          </View>
        </LinearGradient>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
            onPress={() => setActiveTab('overview')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'overview' && [styles.tabTextActive, accent.text],
              ]}
            >
              Overview
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'addresses' && styles.tabActive]}
            onPress={() => setActiveTab('addresses')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'addresses' && [styles.tabTextActive, accent.text],
              ]}
            >
              Addresses
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'settings' && styles.tabActive]}
            onPress={() => setActiveTab('settings')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'settings' && [styles.tabTextActive, accent.text],
              ]}
            >
              Settings
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'addresses' && renderAddresses()}
          {activeTab === 'settings' && renderOverview()}
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.grabber} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color={C.inkMuted} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.textInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Your name"
              />
              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={styles.textInput}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Your phone number"
                keyboardType="phone-pad"
              />
              <TouchableOpacity
                style={[styles.saveButton, accent.solid]}
                onPress={handleSaveProfile}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/**
 * The rules that change per module — everything else is in `styles` below.
 *
 * Kept deliberately small: rebuilding a 90-rule sheet on every theme change to
 * recolour six of them is waste, and a sheet split this way makes it obvious at
 * a glance which parts of the screen the accent actually owns.
 */
const makeAccentStyles = (c: ThemeColors) =>
  StyleSheet.create({
    /** Filled with the module accent: primary buttons, badges, the add tile. */
    solid: { backgroundColor: c.accent },
    /** Accent as TEXT, so it must be `accentDeep` — see palettes.ts. */
    text: { color: c.accentDeep },
  });

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  stateTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.ink,
  },
  stateMessage: {
    fontSize: 14,
    color: C.inkMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  stateRetryBtn: {
    marginTop: 20,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },
  stateRetryText: {
    color: C.surface,
    fontSize: 14,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  // Matches BackButton's 40x40 bare target so the two ends of the row agree.
  navBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    alignItems: 'center',
  },
  decorCircle1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 14,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ROW_TINT.violet.fg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: C.surface,
  },
  verifiedBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: C.surface,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: C.surface,
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  userEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '500',
    marginBottom: 14,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  premiumText: {
    fontSize: 12,
    fontWeight: '700',
    color: ROW_TINT.amber.bg,
    letterSpacing: 0.2,
  },
  memberSince: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: C.surfaceSunken,
    borderRadius: 10,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: C.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.inkFaint,
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  tabTextActive: {
    fontWeight: '700',
  },
  tabContent: {
    paddingTop: 16,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 10,
  },
  statsCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statsIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statsValue: {
    fontSize: 18,
    fontWeight: '700',
    color: C.ink,
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
  },
  statsLabel: {
    fontSize: 11,
    color: C.inkFaint,
    marginTop: 3,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  menuSection: {
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: C.inkFaint,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  menuCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: C.ink,
    letterSpacing: -0.1,
  },
  menuSubtitle: {
    fontSize: 12,
    color: C.inkFaint,
    marginTop: 1,
    fontWeight: '500',
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.surfaceSunken,
    marginLeft: 62,
    marginRight: 14,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    paddingVertical: 13,
    paddingHorizontal: 14,
    backgroundColor: C.surface,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  logoutIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.errorSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.error,
    letterSpacing: -0.1,
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    gap: 6,
  },
  deleteAccountText: {
    fontSize: 12,
    fontWeight: '500',
    color: C.error,
  },
  versionText: {
    fontSize: 11,
    color: C.disabled,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 40,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  addressesContainer: {
    paddingHorizontal: 20,
  },
  addAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    marginBottom: 14,
    gap: 8,
  },
  addAddressIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addAddressText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.surface,
    letterSpacing: -0.1,
  },
  addressCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  addressTypeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  defaultBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  addressText: {
    fontSize: 14,
    fontWeight: '500',
    color: C.ink,
    marginBottom: 3,
    letterSpacing: -0.1,
  },
  addressCity: {
    fontSize: 12,
    color: C.inkFaint,
    marginBottom: 10,
    fontWeight: '500',
  },
  addressActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  setDefaultButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: C.surfaceSunken,
    borderRadius: 6,
  },
  setDefaultText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.inkMuted,
    letterSpacing: 0.1,
  },
  deleteButton: {
    padding: 6,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.line,
    marginBottom: 14,
    marginTop: 4,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.ink,
    letterSpacing: -0.3,
  },
  modalBody: {},
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: C.inkMuted,
    marginBottom: 6,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  textInput: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: C.ink,
    marginBottom: 14,
    fontWeight: '500',
  },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.surface,
    letterSpacing: -0.1,
  },
});
