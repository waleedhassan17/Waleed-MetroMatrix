import React, { useMemo } from 'react';
import { StyleSheet, Platform, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Briefcase, TrendingUp, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HS } from '../../../../constants/HomeServiceTheme';
import { C, F, R, S, T } from '../../../../constants/theme';
import { ThemeColors, useTheme } from '../../../../theme';
import { makeProviderTheme, type ProviderTheme } from '../providerTheme';
import DashboardScreen from './dashboard/dashboard';
import JobsScreen from './jobs/job';
import EarningsScreen from './earnings/earning';
import ProfileScreen from '../profile-screen/profile';
import { ThemeProvider } from '../../../../theme';

// Navigation Types
type TabParamList = {
  Dashboard: undefined;
  Jobs: undefined;
  Earnings: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

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
  const { colors } = useTheme();
  const theme = useMemo(() => makeProviderTheme(colors), [colors]);
  const styles = useMemo(() => makeStyles(colors, theme), [colors, theme]);

  return (
    <View style={[
      styles.iconContainer,
      focused && styles.iconContainerActive
    ]}>
      <Icon 
        size={size - 2} 
        color={focused ? colors.accentDeep : colors.inkFaint}
        strokeWidth={focused ? 2.5 : 2}
      />
    </View>
  );
};

// Home Service Provider Layout with Bottom Tabs
const HomeServiceProviderLayout: React.FC = () => {
  const { colors } = useTheme();
  const theme = useMemo(() => makeProviderTheme(colors), [colors]);
  const styles = useMemo(() => makeStyles(colors, theme), [colors, theme]);

  const insets = useSafeAreaInsets();
  
  return (
    <ThemeProvider module="homeservice">
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            ...styles.tabBar,
            height: 60 + Math.max(insets.bottom, 10),
            paddingBottom: Math.max(insets.bottom, 10),
          },
          tabBarActiveTintColor: colors.accentDeep,
          tabBarInactiveTintColor: colors.inkFaint,
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
      </Tab.Navigator>
    </ThemeProvider>
  );
};

const makeStyles = (c: ThemeColors, theme: ProviderTheme) => StyleSheet.create({
  // Matches the customer tab bar exactly — same ground, same hairline, same
  // pill on the active item — so the two roles read as one app.
  tabBar: {
    backgroundColor: c.surface,
    borderTopColor: c.line,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: S.sm,
    ...Platform.select({
      ios: {
        shadowColor: c.ink,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 8 },
    }),
  },
  tabBarLabel: {
    ...T.caption,
    fontFamily: F.medium,
    marginTop: 2,
  },
  tabBarItem: {
    paddingTop: S.xs,
  },
  iconContainer: {
    width: 44,
    height: 30,
    borderRadius: R.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerActive: {
    backgroundColor: c.accentSoft,
  },
});

export default HomeServiceProviderLayout;