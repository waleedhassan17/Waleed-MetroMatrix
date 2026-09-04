// ============================================================================
// Home services — tab shell
//
// Two tabs, so the bar's only job is to say which one you are on. Selection is
// carried by the accent fill, the icon's filled/outline variant AND the label
// weight — three signals, none of them motion. The spring-scale-on-focus and
// press-scale animations are gone: a tab bar that bounces every time you switch
// draws attention to the chrome rather than the content.
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HS } from '../../../../constants/HomeServiceTheme';
import { C, F, R, S, T } from '../../../../constants/theme';
import { ThemeProvider } from '../../../../theme';
import BookingsScreen from './booking-screen/booking';
import HomeScreen from './home-screen/index';

const Tab = createBottomTabNavigator();

const ICONS: Record<string, { on: string; off: string }> = {
  index: { on: 'home', off: 'home-outline' },
  bookings: { on: 'calendar', off: 'calendar-outline' },
};

const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, S.sm) }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const glyph = ICONS[route.name] ?? ICONS.index;
        const color = focused ? HS.accentDeep : C.inkFaint;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            activeOpacity={0.8}
            style={styles.slot}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={options.tabBarAccessibilityLabel}
          >
            <View style={[styles.pill, focused && styles.pillActive]}>
              <Ionicons name={(focused ? glyph.on : glyph.off) as any} size={22} color={color} />
            </View>
            <Text style={[styles.label, { color }, focused && styles.labelActive]}>
              {options.title || route.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const TabLayout: React.FC = () => (
  <ThemeProvider module="homeservice">
    <Tab.Navigator
      tabBar={(props: BottomTabBarProps) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true }}
    >
      <Tab.Screen
        name="index"
        component={HomeScreen}
        options={{ title: 'Home', tabBarAccessibilityLabel: 'Home' }}
      />
      <Tab.Screen
        name="bookings"
        component={BookingsScreen}
        options={{ title: 'Bookings', tabBarAccessibilityLabel: 'Bookings' }}
      />
    </Tab.Navigator>
  </ThemeProvider>
);

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    paddingTop: S.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.line,
    ...Platform.select({
      ios: {
        shadowColor: '#1C1917',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 8 },
    }),
  },
  slot: {
    flex: 1,
    alignItems: 'center',
  },
  pill: {
    paddingHorizontal: S.lg,
    paddingVertical: 5,
    borderRadius: R.pill,
  },
  pillActive: {
    backgroundColor: HS.accentSoft,
  },
  label: {
    ...T.caption,
    marginTop: 3,
  },
  labelActive: {
    fontFamily: F.semibold,
  },
});

export default TabLayout;
