import React, { useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { darkShift, type DarkShift } from '../../../../constants/darkShift';
import { useTheme } from '../../../../theme';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import DoctorDashboardScreen from '../doctor-home/doctorHome';
import DoctorScheduleScreen from '../doctor-schedule/doctorSchedule';
import PatientQueueScreen from '../patient-queue/patientQueue';
import DoctorEarningsScreen from '../doctor-earnings/doctorEarnings';
import { useAppSelector } from '../../../../hooks/useReduxHooks';

// ── Blue Healthcare Palette ─────────────────
const COLORS = {
  primary: '#2A7FFF',
  primaryDark: '#1E6AE1',
  primaryLight: '#EAF3FF',
  accent: '#5A9FFF',
  surface: '#FFFFFF',
  border: '#D6E8FF',
  textPrimary: '#1A1A1A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
};

type TabParamList = {
  DoctorHome: undefined;
  Schedule: undefined;
  Patients: undefined;
  Earnings: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

// ── Tab Config ──────────────────────────────
const TAB_CONFIG: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; iconFocused: keyof typeof Ionicons.glyphMap }> = {
  DoctorHome:       { label: 'Dashboard',  icon: 'grid-outline',     iconFocused: 'grid' },
  Schedule:         { label: 'Schedule',    icon: 'calendar-outline', iconFocused: 'calendar' },
  Patients:         { label: 'Patients',    icon: 'people-outline',   iconFocused: 'people' },
  Earnings:         { label: 'Earnings',    icon: 'wallet-outline',   iconFocused: 'wallet' },
};

// ── Animated Tab Icon ───────────────────────
const TabIcon: React.FC<{ routeName: string; focused: boolean; badgeCount?: number }> = ({ routeName, focused, badgeCount = 0 }) => {
  const { mode } = useTheme();
  const sh = useMemo(() => darkShift(mode), [mode]);
  const styles = useMemo(() => makeStyles(sh), [sh]);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const config = TAB_CONFIG[routeName];

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: focused ? 1.15 : 1,
      tension: 300,
      friction: 12,
      useNativeDriver: true,
    }).start();
  }, [focused]);

  return (
    <Animated.View style={[styles.iconWrap, { transform: [{ scale: scaleAnim }] }]}>
      {focused ? (
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconBgActive}
        >
          <Ionicons name={config.iconFocused} size={20} color="#FFFFFF" />
        </LinearGradient>
      ) : (
        <View style={styles.iconBgInactive}>
          <Ionicons name={config.icon} size={20} color={COLORS.textTertiary} />
        </View>
      )}
      {badgeCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Text>
        </View>
      )}
    </Animated.View>
  );
};

// ── Custom Tab Bar ──────────────────────────
const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const { mode } = useTheme();
  const sh = useMemo(() => darkShift(mode), [mode]);
  const styles = useMemo(() => makeStyles(sh), [sh]);
  const insets = useSafeAreaInsets();

  // Was a hardcoded literal 3, which contradicted the queue's own header
  // ("0 waiting"). Derived from the same slice the queue counts from, so the
  // two can never disagree. Subscribed once here rather than in every icon.
  const waitingCount = useAppSelector(
    (s) => s.patientQueue.queue.filter((p) => p.status === 'waiting').length,
  );

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.tabBarInner}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const config = TAB_CONFIG[route.name];

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.7}
              style={styles.tabButton}
              accessibilityRole="button"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={config.label}
            >
              <TabIcon
                routeName={route.name}
                focused={isFocused}
                badgeCount={route.name === 'Patients' ? waitingCount : 0}
              />
              <Text
                style={[
                  styles.tabLabel,
                  isFocused && styles.tabLabelActive,
                ]}
                numberOfLines={1}
              >
                {config.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// ── Main Tab Navigator ──────────────────────
const DoctorTabNavigator: React.FC = () => {
  const { mode } = useTheme();
  const sh = useMemo(() => darkShift(mode), [mode]);
  const styles = useMemo(() => makeStyles(sh), [sh]);
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="DoctorHome" component={DoctorDashboardScreen} initialParams={{ isTab: true } as any} />
      <Tab.Screen name="Schedule" component={DoctorScheduleScreen} initialParams={{ isTab: true } as any} />
      <Tab.Screen name="Patients" component={PatientQueueScreen} initialParams={{ isTab: true } as any} />
      <Tab.Screen name="Earnings" component={DoctorEarningsScreen} initialParams={{ isTab: true } as any} />
    </Tab.Navigator>
  );
};

// ── Styles ──────────────────────────────────
const makeStyles = (sh: DarkShift) => StyleSheet.create({
  tabBarContainer: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.10,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  tabBarInner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconWrap: {
    marginBottom: 4,
  },
  iconBgActive: {
    width: 40,
    height: 32,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBgInactive: {
    width: 40,
    height: 32,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textTertiary,
    letterSpacing: 0.1,
  },
  tabLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: sh.hue('#EF4444'),
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: sh.n('#FFFFFF', 'surface'),
  },
  badgeText: {
    color: sh.n('#FFFFFF', 'inkInverse'),
    fontSize: 9,
    fontWeight: '800',
  },
});

export default DoctorTabNavigator;
