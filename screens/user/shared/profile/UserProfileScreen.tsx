// Centralized User Profile Screen - Professional MetroMatrix Style
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
  Modal,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector, useAppDispatch } from '../../../../hooks/useReduxHooks';
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
  ChevronLeft,
  Plus,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

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
            trackColor={{ false: '#E5E7EB', true: '#D1FAE5' }}
            thumbColor={item.toggleValue ? '#10B981' : '#9CA3AF'}
            ios_backgroundColor="#E5E7EB"
          />
        )}
        {!item.hasToggle && <ChevronRight size={18} color="#D1D5DB" />}
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

// Main Profile Screen Component
export default function UserProfileScreen() {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const addresses = useAppSelector(selectUserAddresses);
  const isPremium = useAppSelector(selectIsPremium);
  const isVerified = useAppSelector(selectIsVerified);
  const stats = useAppSelector(selectUserStats);

  const [activeTab, setActiveTab] = useState<'overview' | 'addresses' | 'settings'>('overview');
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
      iconBg: '#EDE9FE',
      iconColor: '#8B5CF6',
      onPress: () => setShowEditModal(true),
    },
    {
      id: 'payment-methods',
      icon: CreditCard,
      label: 'Payment Methods',
      subtitle: 'Manage cards & wallets',
      badge: '3',
      badgeColor: '#10B981',
      iconBg: '#D1FAE5',
      iconColor: '#10B981',
      onPress: () => navigation.navigate('WalletScreen' as never),
    },
    {
      id: 'addresses',
      icon: MapPin,
      label: 'My Addresses',
      subtitle: `${addresses.length} saved addresses`,
      iconBg: '#FEE2E2',
      iconColor: '#EF4444',
      onPress: () => setActiveTab('addresses'),
    },
    {
      id: 'favorites',
      icon: Heart,
      label: 'Favorites',
      subtitle: 'Saved services & providers',
      iconBg: '#FCE7F3',
      iconColor: '#EC4899',
      onPress: () => {},
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
      toggleValue: user?.notificationPreferences.pushEnabled ?? true,
      onToggle: () => dispatch(toggleNotificationPreference('pushEnabled')),
    },
    {
      id: 'dark-mode',
      icon: Moon,
      label: 'Dark Mode',
      subtitle: 'Switch theme appearance',
      iconBg: '#1F2937',
      iconColor: '#F9FAFB',
      hasToggle: true,
      toggleValue: user?.darkMode ?? false,
      onToggle: () => dispatch(toggleDarkMode()),
    },
    {
      id: 'language',
      icon: Globe,
      label: 'Language',
      subtitle: user?.language === 'en' ? 'English' : 'اردو',
      iconBg: '#DBEAFE',
      iconColor: '#3B82F6',
      onPress: () => dispatch(setLanguage(user?.language === 'en' ? 'ur' : 'en')),
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
      onPress: () => {},
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
      onPress: () => {},
    },
  ];

  const legalMenuItems: MenuItem[] = [
    {
      id: 'privacy',
      icon: Shield,
      label: 'Privacy & Security',
      iconBg: '#D1FAE5',
      iconColor: '#10B981',
      onPress: () => {},
    },
    {
      id: 'terms',
      icon: FileText,
      label: 'Terms of Service',
      iconBg: '#F3F4F6',
      iconColor: '#6B7280',
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
          color="#8B5CF6"
          bgColor="#EDE9FE"
        />
        <StatsCard
          icon={Star}
          value={stats?.reviews || 0}
          label="Reviews"
          color="#F59E0B"
          bgColor="#FEF3C7"
        />
        <StatsCard
          icon={Coins}
          value={stats?.points || 0}
          label="Points"
          color="#10B981"
          bgColor="#D1FAE5"
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
          <LogOut size={20} color="#EF4444" />
        </View>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {/* Delete Account */}
      <TouchableOpacity style={styles.deleteAccountButton}>
        <Trash2 size={16} color="#EF4444" />
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
        <View style={styles.addAddressIcon}>
          <Plus size={24} color="#FFFFFF" />
        </View>
        <Text style={styles.addAddressText}>Add New Address</Text>
      </TouchableOpacity>

      {addresses.map((address, index) => (
        <View key={address.id} style={styles.addressCard}>
          <View style={styles.addressHeader}>
            <View style={[styles.addressTypeBadge, { backgroundColor: address.label === 'home' ? '#D1FAE5' : '#DBEAFE' }]}>
              <Text style={[styles.addressTypeText, { color: address.label === 'home' ? '#059669' : '#2563EB' }]}>
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
              <Trash2 size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );

  const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#10B981" translucent />

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
          colors={['#10B981', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: STATUS_BAR_HEIGHT + 12 }]}
        >
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />

          {/* Nav Row */}
          <View style={styles.navRow}>
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <ChevronLeft size={22} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Settings size={18} color="#FFFFFF" strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Profile Info */}
          <View style={styles.profileInfo}>
            <View style={styles.avatarContainer}>
              <Image source={{ uri: user?.avatar }} style={styles.avatar} />
              <TouchableOpacity style={styles.cameraButton} onPress={handleAvatarPress}>
                <Camera size={12} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>
              {isPremium && (
                <View style={styles.verifiedBadge}>
                  <Check size={10} color="#FFFFFF" strokeWidth={3} />
                </View>
              )}
            </View>

            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            {user?.phone ? <Text style={styles.userPhone}>{user.phone}</Text> : null}

            {isPremium && (
              <View style={styles.premiumBadge}>
                <Award size={12} color="#FEF3C7" strokeWidth={2.5} />
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
            <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
              Overview
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'addresses' && styles.tabActive]}
            onPress={() => setActiveTab('addresses')}
          >
            <Text style={[styles.tabText, activeTab === 'addresses' && styles.tabTextActive]}>
              Addresses
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'settings' && styles.tabActive]}
            onPress={() => setActiveTab('settings')}
          >
            <Text style={[styles.tabText, activeTab === 'settings' && styles.tabTextActive]}>
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
                <X size={20} color="#6B7280" strokeWidth={2} />
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
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
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
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  verifiedBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
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
    color: '#FEF3C7',
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
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  tabTextActive: {
    color: '#10B981',
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
    backgroundColor: '#FFFFFF',
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
    color: '#1F2937',
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
  },
  statsLabel: {
    fontSize: 11,
    color: '#9CA3AF',
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
    color: '#9CA3AF',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
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
    color: '#1F2937',
    letterSpacing: -0.1,
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 1,
    fontWeight: '500',
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#F3F4F6',
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
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
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
    color: '#EF4444',
  },
  versionText: {
    fontSize: 11,
    color: '#CBD5E1',
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
    backgroundColor: '#10B981',
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
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
  addressCard: {
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
    letterSpacing: 0.2,
  },
  addressText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 3,
    letterSpacing: -0.1,
  },
  addressCity: {
    fontSize: 12,
    color: '#9CA3AF',
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
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  setDefaultText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
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
    backgroundColor: '#E5E7EB',
    marginBottom: 14,
    marginTop: 4,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
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
    color: '#1F2937',
    letterSpacing: -0.3,
  },
  modalBody: {},
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F2937',
    marginBottom: 14,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
});
