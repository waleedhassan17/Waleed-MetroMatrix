import React from 'react';
import { StyleSheet, Platform, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Briefcase, TrendingUp, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import DashboardScreen from './dashboard/dashboard';
import JobsScreen from './jobs/job';
import EarningsScreen from './earnings/earning';
import ProfileScreen from '../profie-screen/profile';

import { Ionicons } from '@expo/vector-icons';

// Navigation Types
type TabParamList = {
  Dashboard: undefined;
  Jobs: undefined;
  Earnings: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const Colors = {
  primary: '#059669',
  primaryLight: '#D1FAE5',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  text: { 
    primary: '#111827',
    secondary: '#6B7280',
    tertiary: '#9CA3AF' 
  },
};

// Custom Tab Icon Component
const TabIcon = ({ 
  focused, 
  Icon, 
  size 
}: { 
  focused: boolean; 
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>; 
  size: number;
}) => {
  return (
    <View style={[
      styles.iconContainer,
      focused && styles.iconContainerActive
    ]}>
      <Icon 
        size={size - 2} 
        color={focused ? Colors.primary : Colors.text.tertiary}
        strokeWidth={focused ? 2.5 : 2}
      />
    </View>
  );
};

// Home Service Provider Layout with Bottom Tabs
const HomeServiceProviderLayout: React.FC = () => {
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          ...styles.tabBar,
          height: 60 + Math.max(insets.bottom, 10),
          paddingBottom: Math.max(insets.bottom, 10),
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.text.tertiary,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused, size }) => (
            <TabIcon focused={focused} Icon={Home} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Jobs"
        component={JobsScreen}
        options={{
          tabBarLabel: 'Jobs',
          tabBarIcon: ({ focused, size }) => (
            <TabIcon focused={focused} Icon={Briefcase} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Earnings"
        component={EarningsScreen}
        options={{
          tabBarLabel: 'Earnings',
          tabBarIcon: ({ focused, size }) => (
            <TabIcon focused={focused} Icon={TrendingUp} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused, size }) => (
            <TabIcon focused={focused} Icon={User} size={size} />
          ),
        }}
      />
	  <Tab.Screen
  name="Messages"
  component={ProviderChatListScreen}
  options={{
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="chatbubbles-outline" size={size} color={color} />
    ),
    tabBarLabel: 'Messages',
  }}
/>
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    paddingTop: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  tabBarItem: {
    paddingTop: 4,
  },
  iconContainer: {
    width: 40,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerActive: {
    backgroundColor: Colors.primaryLight,
  },
});

export default HomeServiceProviderLayout;