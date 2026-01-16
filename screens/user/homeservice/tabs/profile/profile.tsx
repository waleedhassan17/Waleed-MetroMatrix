// Profile Screen - Professional MetroMatrix Style
import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  User,
  Edit3,
  CreditCard,
  MapPin,
  Heart,
  HelpCircle,
  MessageCircle,
  Phone,
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
  Gift,
  Headphones,
} from 'lucide-react-native';
import { Colors, Gradients, Shadows, BorderRadius, Spacing } from '../../../../../constants/Colors';
import { Typography } from '../../../../../constants/Fonts';

const { width } = Dimensions.get('window');

// User Profile Interface
interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  isPremium: boolean;
  memberSince: string;
  stats: {
    bookings: number;
    reviews: number;
    points: number;
  };
}

// Mock User Data
const mockUser: UserProfile = {
  id: 'user-1',
  name: 'Muhammad Ali',
  email: 'muhammad.ali@email.com',
  phone: '+92 300 1234567',
  avatar: 'https://i.pravatar.cc/200?img=68',
  isPremium: true,
  memberSince: 'Jan 2024',
  stats: {
    bookings: 12,
    reviews: 8,
    points: 240,
  },
};

// Menu Item Interface
interface MenuItem {
  id: string;
  icon: typeof User;
  label: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  iconBg: string;
  iconColor: string;
  isDanger?: boolean;
  hasToggle?: boolean;
  hasLanguageToggle?: boolean;
}

// Menu Sections
const accountMenuItems: MenuItem[] = [
  {
    id: 'edit-profile',
    icon: Edit3,
    label: 'Edit Profile',
    subtitle: 'Update your personal info',
    iconBg: '#EDE9FE',
    iconColor: '#8B5CF6',
  },
  {
    id: 'payment-methods',
    icon: CreditCard,
    label: 'Payment Methods',
    subtitle: 'Manage cards & wallets',
    badge: '3',
    badgeColor: Colors.primary,
    iconBg: '#D1FAE5',
    iconColor: '#10B981',
  },
  {
    id: 'addresses',
    icon: MapPin,
    label: 'My Addresses',
    subtitle: 'Manage delivery locations',
    iconBg: '#FEE2E2',
    iconColor: '#EF4444',
  },
  {
    id: 'favorites',
    icon: Heart,
    label: 'Favorites',
    subtitle: 'Saved services & providers',
    iconBg: '#FCE7F3',
    iconColor: '#EC4899',
  },
];

const supportMenuItems: MenuItem[] = [
  {
    id: 'help',
    icon: HelpCircle,
    label: 'Help Center',
    subtitle: 'FAQs & support articles',
    iconBg: '#DBEAFE',
    iconColor: '#3B82F6',
  },
  {
    id: 'chat',
    icon: Headphones,
    label: 'Live Support',
    subtitle: '24/7 customer support',
    badge: 'Online',
    badgeColor: '#10B981',
    iconBg: '#D1FAE5',
    iconColor: '#10B981',
  },
];

const preferencesMenuItems: MenuItem[] = [
  {
    id: 'notifications',
    icon: Bell,
    label: 'Notifications',
    subtitle: 'Push notification settings',
    iconBg: '#FEE2E2',
    iconColor: '#EF4444',
    hasToggle: true,
  },
  {
    id: 'dark-mode',
    icon: Moon,
    label: 'Dark Mode',
    subtitle: 'Switch theme appearance',
    iconBg: '#1F2937',
    iconColor: '#F9FAFB',
    hasToggle: true,
  },
  {
    id: 'language',
    icon: Globe,
    label: 'Language',
    subtitle: 'App language preference',
    iconBg: '#DBEAFE',
    iconColor: '#3B82F6',
    hasLanguageToggle: true,
  },
];

const legalMenuItems: MenuItem[] = [
  {
    id: 'privacy',
    icon: Shield,
    label: 'Privacy & Security',
    iconBg: '#D1FAE5',
    iconColor: '#10B981',
  },
  {
    id: 'terms',
    icon: FileText,
    label: 'Terms of Service',
    iconBg: '#F3F4F6',
    iconColor: '#6B7280',
  },
];

const dangerMenuItems: MenuItem[] = [
  {
    id: 'logout',
    icon: LogOut,
    label: 'Logout',
    subtitle: 'Sign out of your account',
    iconBg: '#FEF2F2',
    iconColor: '#EF4444',
    isDanger: true,
  },
];

// Stats Card Component
interface StatsCardProps {
  icon: typeof Calendar;
  value: number | string;
  label: string;
  color: string;
  bgColor: string;
  index: number;
}

const StatsCard: React.FC<StatsCardProps> = ({
  icon: Icon,
  value,
  label,
  color,
  bgColor,
  index,
}) => {
  const slideAnim = useRef(new Animated.Value(30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

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
  }, []);

  return (
    <Animated.View
      style={[
        styles.statsCard,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={[styles.statsIconContainer, { backgroundColor: bgColor }]}>
        <Icon size={18} color={color} strokeWidth={2} />
      </View>
      <Text style={styles.statsValue}>{value}</Text>
      <Text style={styles.statsLabel}>{label}</Text>
    </Animated.View>
  );
};

// Menu Item Component
interface MenuItemComponentProps {
  item: MenuItem;
  index: number;
  notificationsEnabled?: boolean;
  darkModeEnabled?: boolean;
  language?: 'en' | 'ur';
  onToggleNotifications?: () => void;
  onToggleDarkMode?: () => void;
  onToggleLanguage?: (lang: 'en' | 'ur') => void;
}

const MenuItemComponent: React.FC<MenuItemComponentProps> = ({
  item,
  index,
  notificationsEnabled,
  darkModeEnabled,
  language,
  onToggleNotifications,
  onToggleDarkMode,
  onToggleLanguage,
}) => {
  const slideAnim = useRef(new Animated.Value(30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const ItemIcon = item.icon;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

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

  const getToggleValue = () => {
    if (item.id === 'notifications') return notificationsEnabled;
    if (item.id === 'dark-mode') return darkModeEnabled;
    return false;
  };

  const handleToggle = () => {
    if (item.id === 'notifications') onToggleNotifications?.();
    if (item.id === 'dark-mode') onToggleDarkMode?.();
  };

  return (
    <Animated.View
      style={[
        styles.menuItemContainer,
        {
          transform: [{ scale: scaleAnim }, { translateX: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.menuItem, item.isDanger && styles.menuItemDanger]}
        activeOpacity={item.hasToggle || item.hasLanguageToggle ? 1 : 0.7}
        onPressIn={!item.hasToggle && !item.hasLanguageToggle ? handlePressIn : undefined}
        onPressOut={!item.hasToggle && !item.hasLanguageToggle ? handlePressOut : undefined}
      >
        <View
          style={[
            styles.menuIconContainer,
            { backgroundColor: item.iconBg },
          ]}
        >
          <ItemIcon size={18} color={item.iconColor} strokeWidth={2} />
        </View>

        <View style={styles.menuContent}>
          <Text
            style={[
              styles.menuLabel,
              item.isDanger && styles.menuLabelDanger,
            ]}
          >
            {item.label}
          </Text>
          {item.subtitle && (
            <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
          )}
        </View>

        {/* Badge */}
        {item.badge && (
          <View
            style={[
              styles.menuBadge,
              { backgroundColor: item.badgeColor + '15' },
            ]}
          >
            <Text
              style={[styles.menuBadgeText, { color: item.badgeColor }]}
            >
              {item.badge}
            </Text>
          </View>
        )}

        {/* Toggle Switch */}
        {item.hasToggle && (
          <Switch
            value={getToggleValue()}
            onValueChange={handleToggle}
            trackColor={{ false: '#E5E7EB', true: '#D1FAE5' }}
            thumbColor={getToggleValue() ? Colors.primary : '#9CA3AF'}
            ios_backgroundColor="#E5E7EB"
          />
        )}

        {/* Language Toggle */}
        {item.hasLanguageToggle && (
          <View style={styles.languageToggle}>
            <TouchableOpacity
              style={[
                styles.languageOption,
                language === 'en' && styles.languageOptionActive,
              ]}
              onPress={() => onToggleLanguage?.('en')}
            >
              <Text
                style={[
                  styles.languageOptionText,
                  language === 'en' && styles.languageOptionTextActive,
                ]}
              >
                EN
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.languageOption,
                language === 'ur' && styles.languageOptionActive,
              ]}
              onPress={() => onToggleLanguage?.('ur')}
            >
              <Text
                style={[
                  styles.languageOptionText,
                  language === 'ur' && styles.languageOptionTextActive,
                ]}
              >
                اردو
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Chevron */}
        {!item.hasToggle && !item.hasLanguageToggle && (
          <ChevronRight
            size={18}
            color={item.isDanger ? '#EF4444' : '#D1D5DB'}
          />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// Main Profile Screen Component
export default function ProfileScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [language, setLanguage] = useState<'en' | 'ur'>('en');

  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Header Card */}
        <Animated.View
          style={[
            styles.profileCard,
            {
              opacity: headerAnim,
              transform: [
                {
                  translateY: headerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-30, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={['#10B981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileGradient}
          >
            {/* Decorative Elements */}
            <View style={styles.decorCircle1} />
            <View style={styles.decorCircle2} />
            <View style={styles.decorPattern} />

            {/* Settings Button */}
            <TouchableOpacity style={styles.settingsButton}>
              <Settings size={20} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>

            {/* Avatar */}
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: mockUser.avatar }}
                style={styles.avatar}
              />
              <TouchableOpacity style={styles.cameraButton}>
                <Camera size={14} color="#fff" />
              </TouchableOpacity>
              {mockUser.isPremium && (
                <View style={styles.verifiedBadge}>
                  <Check size={10} color="#fff" strokeWidth={3} />
                </View>
              )}
            </View>

            {/* User Info */}
            <Text style={styles.userName}>{mockUser.name}</Text>
            <Text style={styles.userEmail}>{mockUser.email}</Text>

            {/* Premium Badge */}
            {mockUser.isPremium && (
              <View style={styles.premiumBadge}>
                <Award size={14} color="#F59E0B" />
                <Text style={styles.premiumBadgeText}>Premium Member</Text>
                <Text style={styles.memberSince}>Since {mockUser.memberSince}</Text>
              </View>
            )}
          </LinearGradient>
        </Animated.View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <StatsCard
            icon={Calendar}
            value={mockUser.stats.bookings}
            label="Bookings"
            color="#8B5CF6"
            bgColor="#EDE9FE"
            index={0}
          />
          <StatsCard
            icon={Star}
            value={mockUser.stats.reviews}
            label="Reviews"
            color="#F59E0B"
            bgColor="#FEF3C7"
            index={1}
          />
          <StatsCard
            icon={Coins}
            value={mockUser.stats.points}
            label="Points"
            color="#10B981"
            bgColor="#D1FAE5"
            index={2}
          />
        </View>

        {/* Rewards Card */}
        <TouchableOpacity style={styles.rewardsCard} activeOpacity={0.9}>
          <LinearGradient
            colors={['#FEF3C7', '#FDE68A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.rewardsGradient}
          >
            <View style={styles.rewardsIcon}>
              <Gift size={22} color="#F59E0B" />
            </View>
            <View style={styles.rewardsContent}>
              <Text style={styles.rewardsTitle}>Earn Rewards</Text>
              <Text style={styles.rewardsSubtitle}>Complete bookings to earn points</Text>
            </View>
            <ChevronRight size={20} color="#F59E0B" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Account Section */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.menuCard}>
            {accountMenuItems.map((item, index) => (
              <React.Fragment key={item.id}>
                <MenuItemComponent item={item} index={index} />
                {index < accountMenuItems.length - 1 && <View style={styles.menuDivider} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Help & Support Section */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Help & Support</Text>
          <View style={styles.menuCard}>
            {supportMenuItems.map((item, index) => (
              <React.Fragment key={item.id}>
                <MenuItemComponent item={item} index={index} />
                {index < supportMenuItems.length - 1 && <View style={styles.menuDivider} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.menuCard}>
            {preferencesMenuItems.map((item, index) => (
              <React.Fragment key={item.id}>
                <MenuItemComponent
                  item={item}
                  index={index}
                  notificationsEnabled={notificationsEnabled}
                  darkModeEnabled={darkModeEnabled}
                  language={language}
                  onToggleNotifications={() =>
                    setNotificationsEnabled(!notificationsEnabled)
                  }
                  onToggleDarkMode={() => setDarkModeEnabled(!darkModeEnabled)}
                  onToggleLanguage={setLanguage}
                />
                {index < preferencesMenuItems.length - 1 && <View style={styles.menuDivider} />}
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
                <MenuItemComponent item={item} index={index} />
                {index < legalMenuItems.length - 1 && <View style={styles.menuDivider} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Logout Section */}
        <View style={styles.menuSection}>
          <View style={styles.menuCard}>
            {dangerMenuItems.map((item, index) => (
              <MenuItemComponent key={item.id} item={item} index={index} />
            ))}
          </View>
        </View>

        {/* Delete Account Link */}
        <TouchableOpacity style={styles.deleteAccountButton}>
          <Trash2 size={16} color="#EF4444" />
          <Text style={styles.deleteAccountText}>Delete Account</Text>
        </TouchableOpacity>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>MetroMatrix v2.0.1</Text>
          <Text style={styles.copyrightText}>© 2025 MetroMatrix Services</Text>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 140 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? 0 : 0,
  },

  // Profile Card
  profileCard: {
    marginHorizontal: 0,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  profileGradient: {
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  decorCircle1: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  decorPattern: {
    position: 'absolute',
    top: 30,
    left: 30,
    width: 60,
    height: 60,
    opacity: 0.1,
  },
  settingsButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  verifiedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 12,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  premiumBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  memberSince: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 4,
  },

  // Stats Section
  statsSection: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: -20,
    gap: 12,
  },
  statsCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  statsIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statsValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  statsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 2,
  },

  // Rewards Card
  rewardsCard: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  rewardsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  rewardsIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardsContent: {
    flex: 1,
    marginLeft: 14,
  },
  rewardsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
  },
  rewardsSubtitle: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
  },

  // Menu Sections
  menuSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 12,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 68,
  },

  // Menu Items
  menuItemContainer: {
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  menuItemDanger: {
    backgroundColor: '#FEF2F2',
  },
  menuIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
    marginLeft: 14,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  menuLabelDanger: {
    color: '#EF4444',
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  menuBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginRight: 8,
  },
  menuBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Language Toggle
  languageToggle: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 3,
  },
  languageOption: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  languageOptionActive: {
    backgroundColor: Colors.primary,
  },
  languageOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  languageOptionTextActive: {
    color: '#fff',
  },

  // Delete Account
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 6,
  },
  deleteAccountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },

  // Version
  versionContainer: {
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 16,
  },
  versionText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  copyrightText: {
    fontSize: 12,
    color: '#D1D5DB',
    marginTop: 4,
  },
});