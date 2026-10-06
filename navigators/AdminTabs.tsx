import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { hasPermission, useAdminProfile, type PermissionKey } from '../hooks/useAdminPermission';
import { useGetOverviewQuery, useGetUnreadCountQuery } from '../networks/admin/adminApi';
import { R, S, T, useTheme, type ThemeColors } from '../theme';

import AdminOverviewScreen from '../screens/admin/overview/AdminOverviewScreen';
import AdminQueueScreen from '../screens/admin/queue/AdminQueueScreen';
import AdminPeopleScreen from '../screens/admin/people/AdminPeopleScreen';
import AdminModulesScreen from '../screens/admin/modules/AdminModulesScreen';
import AdminMoreScreen from '../screens/admin/more/AdminMoreScreen';

// ============================================================================
// The admin console's five tabs: Overview · Queue · People · Modules · More.
//
// A tab is shown only to an admin who can use what is behind it — People needs
// a people permission, Modules a module permission. The server enforces the
// same flags; hiding a tab just keeps the console from offering doors that
// would open onto "you don't have access".
// ============================================================================

export type AdminTabParamList = {
  Overview: undefined;
  Queue: { type?: string } | undefined;
  People: { segment?: 'providers' | 'users' | 'admins' } | undefined;
  Modules: undefined;
  More: undefined;
};

const Tab = createBottomTabNavigator<AdminTabParamList>();

const ICONS: Record<keyof AdminTabParamList, [string, string]> = {
  Overview: ['speedometer-outline', 'speedometer'],
  Queue: ['file-tray-full-outline', 'file-tray-full'],
  People: ['people-outline', 'people'],
  Modules: ['apps-outline', 'apps'],
  More: ['ellipsis-horizontal-circle-outline', 'ellipsis-horizontal-circle'],
};

export const PEOPLE_PERMISSIONS: PermissionKey[] = ['canApproveProviders', 'canManageUsers', 'canManageAdmins'];
// Modules also holds Platform analytics, so an analytics-only admin gets the tab.
export const MODULE_PERMISSIONS: PermissionKey[] = ['canManageHomeServices', 'canManageHealthcare', 'canManageShopping', 'canViewAnalytics'];

const AdminTabs: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const admin = useAdminProfile();
  // The More tab carries the unread count; polled while the console is open.
  const { data: unread } = useGetUnreadCountQuery(undefined, { pollingInterval: 60_000 });
  // The Queue tab shows how much is waiting (the same counts as Overview).
  const { data: overview } = useGetOverviewQuery(undefined, { pollingInterval: 60_000 });
  const waiting = (overview?.queues ?? []).reduce((sum, q) => sum + (q.type !== 'reconciliation_drift' && typeof q.count === 'number' ? q.count : 0), 0);
  const bottom = Math.max(insets.bottom, S.sm);

  const showPeople = PEOPLE_PERMISSIONS.some((p) => hasPermission(admin, p));
  const showModules = MODULE_PERMISSIONS.some((p) => hasPermission(admin, p));

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        lazy: true,
        freezeOnBlur: true,
        tabBarActiveTintColor: colors.accentDeep,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarStyle: [styles.bar, { height: 60 + bottom, paddingBottom: bottom }],
        tabBarLabelStyle: styles.label,
        tabBarBadgeStyle: styles.badge,
        tabBarIcon: ({ focused, color }) => (
          <View style={[styles.icon, focused && styles.iconActive]}>
            <Ionicons name={ICONS[route.name][focused ? 1 : 0] as any} size={22} color={color} />
          </View>
        ),
      })}
    >
      <Tab.Screen name="Overview" component={AdminOverviewScreen} />
      <Tab.Screen
        name="Queue"
        component={AdminQueueScreen}
        options={{
          tabBarBadge: waiting ? (waiting > 99 ? '99+' : waiting) : undefined,
          tabBarAccessibilityLabel: waiting ? `Queue, ${waiting} waiting` : 'Queue',
        }}
      />
      {showPeople && <Tab.Screen name="People" component={AdminPeopleScreen} />}
      {showModules && <Tab.Screen name="Modules" component={AdminModulesScreen} />}
      <Tab.Screen
        name="More"
        component={AdminMoreScreen}
        options={{
          tabBarBadge: unread ? (unread > 99 ? '99+' : unread) : undefined,
          tabBarAccessibilityLabel: unread ? `More, ${unread} unread notification${unread === 1 ? '' : 's'}` : 'More',
        }}
      />
    </Tab.Navigator>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    bar: { backgroundColor: c.surface, borderTopColor: c.line, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: S.sm, elevation: 0 },
    label: { ...T.micro },
    badge: { ...T.micro, backgroundColor: c.error, color: c.inkInverse },
    icon: { width: 48, height: 28, borderRadius: R.control, alignItems: 'center', justifyContent: 'center' },
    iconActive: { backgroundColor: c.accentSoft },
  });

export default AdminTabs;
