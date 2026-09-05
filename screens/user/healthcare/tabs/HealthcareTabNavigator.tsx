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
import { type ThemeMode } from '../../../../constants/theme';
import { useTheme } from '../../../../theme';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import HealthcareHomeScreen from '../home/healthcareHome';
import MyAppointmentsScreen from '../MyAppointments/MyAppointmentsScreen';
import HealthRecordsScreen from '../health-records/healthRecords';
import UserProfileScreen from '../../shared/profile/UserProfileScreen';

// ── Blue Healthcare Palette ─────────────────
// A function of the mode. Light returns exactly the literals this block
// always held; dark is derived by role — see constants/darkShift.ts.
const makeCOLORS = (mode: ThemeMode) => {
  const { hue, ground, n, grad } = darkShift(mode);
  return {
  primary: hue('#2A7FFF'),
  primaryDark: hue('#1E6AE1'),
  primaryLight: ground('#EAF3FF', '#2A7FFF'),
  accent: hue('#5A9FFF'),
  surface: n('#FFFFFF', 'surface'),
  border: ground('#D6E8FF', '#5A9FFF'),
  textPrimary: hue('#1A1A1A'),
  textSecondary: n('#64748B', 'inkMuted'),
  textTertiary: n('#94A3B8', 'inkFaint'),
  };
};

type TabParamList = {
  HealthHome: undefined;
  Appointments: undefined;
  Records: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

// ── Tab Config ──────────────────────────────
const TAB_CONFIG: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; iconFocused: keyof typeof Ionicons.glyphMap }> = {
  HealthHome:   { label: 'Home',         icon: 'home-outline',          iconFocused: 'home' },
  Appointments: { label: 'Appointments', icon: 'calendar-outline',      iconFocused: 'calendar' },
  Records:      { label: 'Records',      icon: 'document-text-outline', iconFocused: 'document-text' },
  // Find Doctor gave up this slot: it is reached from the search control on the
  // Home tab, from My Appointments and from the Symptom Checker, so it was the
  // fourth way into one screen, while the account had none at all.
  Profile:      { label: 'Profile',      icon: 'person-outline',        iconFocused: 'person' },
};

// ── Animated Tab Icon ───────────────────────
const TabIcon: React.FC<{ routeName: string; focused: boolean }> = ({ routeName, focused }) => {
  const { mode } = useTheme();
  const sh = useMemo(() => darkShift(mode), [mode]);
  const COLORS = useMemo(() => makeCOLORS(mode), [mode]);
  const styles = useMemo(() => makeStyles(COLORS, sh), [COLORS, sh]);
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
    </Animated.View>
  );
};

// ── Custom Tab Bar ──────────────────────────
const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const { mode } = useTheme();
  const sh = useMemo(() => darkShift(mode), [mode]);
  const COLORS = useMemo(() => makeCOLORS(mode), [mode]);
  const styles = useMemo(() => makeStyles(COLORS, sh), [COLORS, sh]);
  const insets = useSafeAreaInsets();

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
              <TabIcon routeName={route.name} focused={isFocused} />
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
const HealthcareTabNavigator: React.FC = () => {
  const { mode } = useTheme();
  const sh = useMemo(() => darkShift(mode), [mode]);
  const COLORS = useMemo(() => makeCOLORS(mode), [mode]);
  const styles = useMemo(() => makeStyles(COLORS, sh), [COLORS, sh]);
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="HealthHome" component={HealthcareHomeScreen} initialParams={{ isTab: true } as any} />
      <Tab.Screen name="Appointments" component={MyAppointmentsScreen} initialParams={{ isTab: true } as any} />
      <Tab.Screen name="Records" component={HealthRecordsScreen} initialParams={{ isTab: true } as any} />
      {/* The shared account screen. `module` is what paints it clinical blue
          instead of the green it is hardcoded to nowhere any more, and `asTab`
          drops its back chevron — a tab root has nothing to go back to. */}
      <Tab.Screen
        name="Profile"
        component={UserProfileScreen}
        initialParams={{ module: 'healthcare', asTab: true } as any}
      />
    </Tab.Navigator>
  );
};

// ── Styles ──────────────────────────────────
const makeStyles = (COLORS: ReturnType<typeof makeCOLORS>, sh: DarkShift) => StyleSheet.create({
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
    fontWeight: '700',
    color: COLORS.primary,
  },
});

export default HealthcareTabNavigator;
