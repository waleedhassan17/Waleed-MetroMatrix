import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../hooks/useReduxHooks';

interface ProviderData {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  profilePhoto?: string;
  providerType?: string;
}

const ProviderHome: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  // Get provider data from app container
  const currentProvider = useAppSelector(
    (state: any) => state.appContainer?.currentProvider
  );

  const provider: ProviderData | null = currentProvider || {
    id: '1',
    email: 'provider@example.com',
    fullName: 'Service Provider',
    phoneNumber: '+1 234 567 8900',
    providerType: 'Home Service',
  };

  useEffect(() => {
    console.log('👨‍💼 ProviderHome mounted');
    console.log('Current provider:', provider);
  }, [provider]);

  const handleLogout = () => {
    // TODO: Implement logout logic
    console.log('Logging out...');
    // dispatch(logout());
    // navigation.reset({
    //   index: 0,
    //   routes: [{ name: 'RoleSelection' }],
    // });
  };

  const handleProfile = () => {
    console.log('Opening profile...');
    // TODO: Navigate to provider profile screen
  };

  const handleBookings = () => {
    console.log('Opening bookings...');
    // TODO: Navigate to provider bookings screen
  };

  const handleServices = () => {
    console.log('Opening services...');
    // TODO: Navigate to services management screen
  };

  const handleEarnings = () => {
    console.log('Opening earnings...');
    // TODO: Navigate to earnings screen
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      <ScrollView style={styles.scrollView}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.greeting}>Welcome Back! 👋</Text>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Ionicons name="log-out-outline" size={24} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.userName}>{provider?.fullName || 'Provider'}</Text>
          <Text style={styles.userEmail}>{provider?.email || 'provider@example.com'}</Text>
          <View style={styles.badgeContainer}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{provider?.providerType || 'Service Provider'}</Text>
            </View>
          </View>
        </View>

        {/* Key Metrics */}
        <View style={styles.metricsSection}>
          <Text style={styles.sectionTitle}>Your Activity</Text>
          
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <View style={styles.metricIconContainer}>
                <Ionicons name="checkmark-circle-outline" size={24} color="#00D4FF" />
              </View>
              <Text style={styles.metricNumber}>0</Text>
              <Text style={styles.metricLabel}>Completed</Text>
            </View>
            <View style={styles.metricCard}>
              <View style={styles.metricIconContainer}>
                <Ionicons name="time-outline" size={24} color="#FFB800" />
              </View>
              <Text style={styles.metricNumber}>0</Text>
              <Text style={styles.metricLabel}>Pending</Text>
            </View>
            <View style={styles.metricCard}>
              <View style={styles.metricIconContainer}>
                <Ionicons name="star-outline" size={24} color="#FFD700" />
              </View>
              <Text style={styles.metricNumber}>0</Text>
              <Text style={styles.metricLabel}>Rating</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={handleBookings}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="calendar-outline" size={28} color="#FFFFFF" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Manage Bookings</Text>
              <Text style={styles.actionSubtitle}>View upcoming and past bookings</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#CCCCCC" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={handleServices}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="briefcase-outline" size={28} color="#FFFFFF" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Manage Services</Text>
              <Text style={styles.actionSubtitle}>Add or update your services</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#CCCCCC" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={handleEarnings}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="wallet-outline" size={28} color="#FFFFFF" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Earnings</Text>
              <Text style={styles.actionSubtitle}>View your earnings and payouts</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#CCCCCC" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={handleProfile}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="person-outline" size={28} color="#FFFFFF" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>My Profile</Text>
              <Text style={styles.actionSubtitle}>Update your profile and documents</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#CCCCCC" />
          </TouchableOpacity>
        </View>

        {/* Support Section */}
        <View style={styles.supportSection}>
          <Text style={styles.sectionTitle}>Help & Support</Text>
          
          <TouchableOpacity style={styles.supportCard}>
            <Text style={styles.supportTitle}>📞 Contact Support</Text>
            <Text style={styles.supportDescription}>
              Get help with your account or bookings
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.supportCard}>
            <Text style={styles.supportTitle}>📚 FAQ</Text>
            <Text style={styles.supportDescription}>
              Find answers to common questions
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  greeting: {
    fontSize: 18,
    color: '#CCCCCC',
    fontWeight: '500',
  },
  logoutButton: {
    padding: 8,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 10,
  },
  badgeContainer: {
    marginTop: 10,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#00D4FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
  },
  metricsSection: {
    paddingHorizontal: 20,
    paddingTop: 25,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 10,
    marginHorizontal: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  metricIconContainer: {
    marginBottom: 8,
  },
  metricNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00D4FF',
    marginBottom: 3,
  },
  metricLabel: {
    fontSize: 11,
    color: '#888888',
  },
  quickActions: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#888888',
  },
  supportSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 30,
  },
  supportCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  supportDescription: {
    fontSize: 13,
    color: '#888888',
  },
});

export default ProviderHome;
