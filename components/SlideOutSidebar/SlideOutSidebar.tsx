import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  Image,
  Platform,
  Modal,
  BackHandler,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  User,
  Settings,
  HelpCircle,
  FileText,
  LogOut,
  X,
  ChevronRight,
  Award,
  Check,
  MapPin,
  Bell,
  Moon,
  Globe,
  Heart,
  Shield,
  Trash2,
  Crown,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector, useAppDispatch } from '../../hooks/useReduxHooks';
import { selectSidebarUserData } from '../../screens/user/shared/profile/userProfileSlice';
import MiniWalletCard from '../MiniWalletCard/MiniWalletCard';

const { width, height } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.85;

interface MenuItem {
  id: string;
  icon: typeof User;
  label: string;
  badge?: string;
  badgeColor?: string;
  onPress?: () => void;
}

interface SlideOutSidebarProps {
  isVisible: boolean;
  onClose: () => void;
}

const SlideOutSidebar: React.FC<SlideOutSidebarProps> = ({ isVisible, onClose }) => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const userData = useAppSelector(selectSidebarUserData);

  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (isVisible) {
      // Open animation
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Close animation
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: -SIDEBAR_WIDTH,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 0.95,
          tension: 100,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible]);

  // Handle back button on Android
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isVisible) {
        onClose();
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [isVisible, onClose]);

  const handleMenuItemPress = useCallback((item: MenuItem) => {
    if (item.onPress) {
      item.onPress();
    } else {
      // Navigate based on item id
      switch (item.id) {
        case 'profile':
          onClose();
          navigation.navigate('UserProfileScreen');
          break;
        case 'addresses':
          onClose();
          navigation.navigate('UserProfileScreen', { tab: 'addresses' });
          break;
        case 'favorites':
          onClose();
          navigation.navigate('UserProfileScreen', { tab: 'favorites' });
          break;
        case 'notifications':
          onClose();
          navigation.navigate('UserProfileScreen', { tab: 'notifications' });
          break;
        case 'settings':
          onClose();
          navigation.navigate('UserProfileScreen', { tab: 'settings' });
          break;
        case 'help':
          onClose();
          // navigation.navigate('HelpCenter');
          break;
        case 'privacy':
          onClose();
          // navigation.navigate('PrivacyPolicy');
          break;
        case 'terms':
          onClose();
          // navigation.navigate('TermsOfService');
          break;
        default:
          break;
      }
    }
  }, [navigation, onClose]);

  const handleLogout = () => {
    onClose();
    // dispatch(logout());
  };

  const mainMenuItems: MenuItem[] = [
    { id: 'profile', icon: User, label: 'My Profile' },
    { id: 'addresses', icon: MapPin, label: 'My Addresses' },
    { id: 'favorites', icon: Heart, label: 'Favorites' },
  ];

  const settingsMenuItems: MenuItem[] = [
    { id: 'notifications', icon: Bell, label: 'Notifications' },
    { id: 'settings', icon: Settings, label: 'App Settings' },
    { id: 'help', icon: HelpCircle, label: 'Help & Support', badge: 'Online', badgeColor: '#10B981' },
  ];

  const legalMenuItems: MenuItem[] = [
    { id: 'privacy', icon: Shield, label: 'Privacy & Security' },
    { id: 'terms', icon: FileText, label: 'Terms of Service' },
  ];

  const MenuItemComponent: React.FC<{ item: MenuItem; index: number }> = ({ item, index }) => {
    const itemScaleAnim = useRef(new Animated.Value(1)).current;
    const Icon = item.icon;

    const handlePressIn = () => {
      Animated.spring(itemScaleAnim, {
        toValue: 0.98,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(itemScaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }).start();
    };

    return (
      <Animated.View
        style={{
          transform: [{ scale: itemScaleAnim }],
          opacity: fadeAnim,
        }}
      >
        <TouchableOpacity
          style={styles.menuItem}
          activeOpacity={0.7}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={() => handleMenuItemPress(item)}
        >
          <View style={styles.menuIconContainer}>
            <Icon size={20} color="#6B7280" strokeWidth={2} />
          </View>
          <Text style={styles.menuLabel}>{item.label}</Text>
          {item.badge && (
            <View style={[styles.badge, { backgroundColor: `${item.badgeColor}15` }]}>
              <Text style={[styles.badgeText, { color: item.badgeColor }]}>{item.badge}</Text>
            </View>
          )}
          <ChevronRight size={18} color="#D1D5DB" />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        >
          <Animated.View
            style={[
              styles.backdropView,
              { opacity: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] }) },
            ]}
          />
        </TouchableOpacity>

        {/* Sidebar */}
        <Animated.View
          style={[
            styles.sidebar,
            {
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* Header with User Info */}
          <LinearGradient
            colors={['#10B981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>

            {/* User Info */}
            <View style={styles.userInfo}>
              <View style={styles.avatarContainer}>
                <Image
                  source={{ uri: userData.avatar }}
                  style={styles.avatar}
                />
                {userData.isVerified && (
                  <View style={styles.verifiedBadge}>
                    <Check size={10} color="#FFFFFF" strokeWidth={3} />
                  </View>
                )}
              </View>

              <View style={styles.userTextContainer}>
                <Text style={styles.userName}>{userData.name}</Text>
                <Text style={styles.userEmail}>{userData.email}</Text>
              </View>

              {userData.isPremium && (
                <View style={styles.premiumBadge}>
                  <Crown size={14} color="#F59E0B" />
                  <Text style={styles.premiumText}>Premium</Text>
                </View>
              )}
            </View>

            {/* Quick Stats */}
            <View style={styles.quickStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{userData.totalBookings}</Text>
                <Text style={styles.statLabel}>Bookings</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{userData.points}</Text>
                <Text style={styles.statLabel}>Points</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Scrollable Content */}
          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Wallet Card */}
            <MiniWalletCard
              onPress={() => {
                onClose();
                navigation.navigate('WalletScreen');
              }}
            />

            {/* Main Menu */}
            <View style={styles.menuSection}>
              <Text style={styles.sectionTitle}>Account</Text>
              <View style={styles.menuCard}>
                {mainMenuItems.map((item, index) => (
                  <MenuItemComponent key={item.id} item={item} index={index} />
                ))}
              </View>
            </View>

            {/* Settings Menu */}
            <View style={styles.menuSection}>
              <Text style={styles.sectionTitle}>Settings</Text>
              <View style={styles.menuCard}>
                {settingsMenuItems.map((item, index) => (
                  <MenuItemComponent key={item.id} item={item} index={index} />
                ))}
              </View>
            </View>

            {/* Legal Menu */}
            <View style={styles.menuSection}>
              <Text style={styles.sectionTitle}>Legal</Text>
              <View style={styles.menuCard}>
                {legalMenuItems.map((item, index) => (
                  <MenuItemComponent key={item.id} item={item} index={index} />
                ))}
              </View>
            </View>

            {/* Logout Button */}
            <TouchableOpacity
              style={styles.logoutButton}
              activeOpacity={0.7}
              onPress={handleLogout}
            >
              <View style={styles.logoutIconContainer}>
                <LogOut size={20} color="#EF4444" />
              </View>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>

            {/* Delete Account */}
            <TouchableOpacity style={styles.deleteAccount} activeOpacity={0.7}>
              <Trash2 size={16} color="#EF4444" />
              <Text style={styles.deleteAccountText}>Delete Account</Text>
            </TouchableOpacity>

            {/* App Version */}
            <Text style={styles.versionText}>MetroMatrix v2.0.1</Text>

            <View style={styles.bottomSpacing} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropView: {
    flex: 1,
    backgroundColor: '#000000',
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    height: '100%',
    backgroundColor: '#F9FAFB',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 4,
    marginBottom: 8,
  },
  userInfo: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userTextContainer: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  premiumText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FEF3C7',
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  scrollContent: {
    flex: 1,
  },
  menuSection: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
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
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
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
    fontSize: 15,
    fontWeight: '500',
    color: '#EF4444',
  },
  deleteAccount: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
  },
  deleteAccountText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#EF4444',
  },
  versionText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 24,
  },
  bottomSpacing: {
    height: 40,
  },
});

export default SlideOutSidebar;
