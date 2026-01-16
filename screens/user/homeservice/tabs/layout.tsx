// Tab Navigation Layout - Professional MetroMatrix Style
import React, { useCallback, useRef, useEffect } from 'react';
import { 
  View, 
  TouchableOpacity, 
  StyleSheet, 
  Platform, 
  Animated,
  Dimensions,
  Text,
} from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Home, Calendar, User } from 'lucide-react-native';
import { Colors, Shadows, Spacing, BorderRadius } from '../../../../constants/Colors';
import { Typography } from '../../../../constants/Fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import Screens
import HomeScreen from './home-screen/index';
import BookingsScreen from './booking-screen/booking';
import ProfileScreen from './profile/profile';

const Tab = createBottomTabNavigator();
const { width } = Dimensions.get('window');

// Custom Tab Bar Component
interface TabBarIconProps {
  focused: boolean;
  color: string;
  size: number;
  route: string;
}

const TabBarIcon: React.FC<TabBarIconProps> = ({ focused, color, size, route }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(focused ? 1 : 0.6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: focused ? 1.1 : 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: focused ? 1 : 0.5,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused]);

  const IconComponent = {
    index: Home,
    bookings: Calendar,
    profile: User,
  }[route] || Home;

  return (
    <Animated.View
      style={[
        styles.iconContainer,
        {
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <IconComponent
        size={focused ? 24 : 22}
        color={focused ? Colors.primary : Colors.text.tertiary}
        strokeWidth={focused ? 2.5 : 2}
      />
    </Animated.View>
  );
};

// Custom Tab Bar Button
interface CustomTabButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  accessibilityState?: { selected?: boolean };
}

const CustomTabButton: React.FC<CustomTabButtonProps> = ({
  children,
  onPress,
  accessibilityState,
}) => {
  const isSelected = accessibilityState?.selected ?? false;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={styles.tabButtonWrapper}
    >
      <Animated.View
        style={[
          styles.tabButton,
          isSelected && styles.tabButtonActive,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

// Custom Tab Bar
const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();

  return (
    <View 
      style={[
        styles.tabBarContainer, 
        { 
          paddingBottom: Math.max(insets.bottom, 8),
        }
      ]}
    >
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

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
          <CustomTabButton
            key={route.key}
            onPress={onPress}
            accessibilityState={{ selected: isFocused }}
          >
            <TabBarIcon
              focused={isFocused}
              color={isFocused ? Colors.primary : Colors.text.tertiary}
              size={24}
              route={route.name}
            />
            <Text
              style={[
                styles.tabLabel,
                isFocused && styles.tabLabelActive,
              ]}
            >
              {options.title || route.name}
            </Text>
          </CustomTabButton>
        );
      })}
    </View>
  );
};

// Main Tab Layout Component
const TabLayout: React.FC = () => {
  return (
    <Tab.Navigator
      tabBar={(props: BottomTabBarProps) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="index"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarAccessibilityLabel: 'Navigate to Home',
        }}
      />
      <Tab.Screen
        name="bookings"
        component={BookingsScreen}
        options={{
          title: 'Bookings',
          tabBarAccessibilityLabel: 'Navigate to Bookings',
        }}
      />
      <Tab.Screen
        name="profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarAccessibilityLabel: 'Navigate to Profile',
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingHorizontal: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    // Elevation for Android
    elevation: 8,
  },
  tabButtonWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    minWidth: 64,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.text.tertiary,
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    fontWeight: '600',
    color: Colors.primary,
  },
});

export default TabLayout;