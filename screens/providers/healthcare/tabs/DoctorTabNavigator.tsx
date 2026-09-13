import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React, { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { F, R, S, T } from '../../../../constants/theme';
import { useAppSelector } from '../../../../hooks/useReduxHooks';
import type { DoctorTabParamList } from '../../../../models/healthcare/types';
import { selectTotalUnread } from '../../../../store/unreadSlice';
import { ThemeColors, useTheme } from '../../../../theme';

import DoctorAccountScreen from '../account/DoctorAccountScreen';
import DoctorEarningsScreen from '../doctor-earnings/doctorEarnings';
import DoctorHomeScreen from '../doctor-home/doctorHome';
import DoctorScheduleScreen from '../doctor-schedule/doctorSchedule';
import PatientQueueScreen from '../patient-queue/patientQueue';

// ============================================================================
// The doctor's five tabs.
//
// The stock tab bar, styled exactly like the home-service provider's — same
// ground, hairline and accent pill — so both provider roles read as one app.
// The custom bar it replaces had its own hardcoded palette (so it stayed white
// in dark mode) and no Account tab: profile, settings and sign-out were only
// reachable through a dashboard tile or a system dialog.
//
// `lazy` mounts a tab on first visit; `freezeOnBlur` stops a hidden tab from
// re-rendering on every store update (the queue's poll, the wallet loop).
// ============================================================================

const Tab = createBottomTabNavigator<DoctorTabParamList>();

const ICONS: Record<keyof DoctorTabParamList, [string, string]> = {
  DoctorHome: ['home-outline', 'home'],
  Schedule: ['calendar-outline', 'calendar'],
  Patients: ['people-outline', 'people'],
  Earnings: ['wallet-outline', 'wallet'],
  Account: ['person-circle-outline', 'person-circle'],
};

const DoctorTabNavigator: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const pendingRequests = useAppSelector((s) => s.doctorDashboard.data?.pendingRequests ?? 0);
  const unread = useAppSelector(selectTotalUnread);
  const bottom = Math.max(insets.bottom, S.sm);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        lazy: true,
        freezeOnBlur: true,
        tabBarActiveTintColor: colors.accentDeep,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarStyle: [styles.bar, { height: 60 + bottom, paddingBottom: bottom }],
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
        tabBarBadgeStyle: styles.badge,
        tabBarIcon: ({ focused, color }) => (
          <View style={[styles.icon, focused && styles.iconActive]}>
            <Ionicons name={ICONS[route.name][focused ? 1 : 0] as any} size={21} color={color} />
          </View>
        ),
      })}
    >
      <Tab.Screen name="DoctorHome" component={DoctorHomeScreen} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen
        name="Schedule"
        component={DoctorScheduleScreen}
        initialParams={{ isTab: true } as any}
        options={{
          tabBarLabel: 'Schedule',
          tabBarBadge: pendingRequests > 0 ? pendingRequests : undefined,
          tabBarAccessibilityLabel: pendingRequests
            ? `Schedule, ${pendingRequests} request${pendingRequests === 1 ? '' : 's'} waiting`
            : 'Schedule',
        }}
      />
      <Tab.Screen
        name="Patients"
        component={PatientQueueScreen}
        initialParams={{ isTab: true } as any}
        options={{ tabBarLabel: 'Patients' }}
      />
      <Tab.Screen
        name="Earnings"
        component={DoctorEarningsScreen}
        initialParams={{ isTab: true } as any}
        options={{ tabBarLabel: 'Earnings' }}
      />
      <Tab.Screen
        name="Account"
        component={DoctorAccountScreen}
        options={{
          tabBarLabel: 'Account',
          tabBarBadge: unread > 0 ? (unread > 99 ? '99+' : unread) : undefined,
          tabBarAccessibilityLabel: unread ? `Account, ${unread} unread messages` : 'Account',
        }}
      />
    </Tab.Navigator>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    bar: {
      backgroundColor: c.surface,
      borderTopColor: c.line,
      borderTopWidth: StyleSheet.hairlineWidth,
      paddingTop: S.sm,
      ...Platform.select({
        ios: { shadowColor: c.ink, shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 8 },
        android: { elevation: 8 },
      }),
    },
    item: { paddingTop: S.xs },
    label: { ...T.caption, fontFamily: F.medium, marginTop: 2 },
    icon: {
      width: 44,
      height: 30,
      borderRadius: R.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconActive: { backgroundColor: c.accentSoft },
    badge: {
      ...T.micro,
      backgroundColor: c.error,
      color: c.inkInverse,
    },
  });

export default DoctorTabNavigator;
