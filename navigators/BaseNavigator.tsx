import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { BaseRoutes, BaseRouteName, LightOnlyRoutes, RouteModules, RootStackParamList } from "../navigation-maps/Base";
import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { ThemeProvider } from "../theme";

type BaseRoute = {
  title: BaseRouteName;
  component: React.ComponentType<any>;
  options?: NativeStackNavigationOptions;
};

type BaseNavigatorProps = {
  initialRouteName: BaseRouteName;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Wrap a route's screen in its module's theme, per RouteModules — and hold it
 * at light if it is in LightOnlyRoutes.
 *
 * The mode is set ONCE, at the root, and inherited. What happens here is the
 * escape hatch: an explicit `mode="light"` overriding the inherited value for
 * a screen whose colours are still hardcoded. That set is empty today, because
 * every screen was migrated — it stays as the cheap way to hold one back.
 *
 * Memoised by route name because `component` identity has to be stable: a fresh
 * component type on every render makes React Navigation remount the screen, and
 * a screen that remounts loses its scroll position and refetches on every
 * parent render. The cache stays keyed by name alone — both inputs below are
 * static properties of the route, so a wrapper never needs rebuilding when the
 * theme changes; the ThemeProvider inside it re-renders on its own.
 */
const themedCache = new Map<string, React.ComponentType<any>>();

const themed = (route: BaseRoute): React.ComponentType<any> => {
  const moduleName = RouteModules[route.title];
  // Empty today — see LightOnlyRoutes.
  const pinLight = LightOnlyRoutes.has(route.title);
  if (!moduleName && !pinLight) return route.component;

  const cached = themedCache.get(route.title);
  if (cached) return cached;

  const Screen = route.component;
  const Themed: React.ComponentType<any> = (props) => (
    <ThemeProvider module={moduleName} mode={pinLight ? 'light' : undefined}>
      <Screen {...props} />
    </ThemeProvider>
  );
  Themed.displayName = `Themed(${route.title})`;
  themedCache.set(route.title, Themed);
  return Themed;
};

const BaseNavigator: React.FC<BaseNavigatorProps> = ({ initialRouteName }) => {
  // Default screen options
  const defaultOptions: NativeStackNavigationOptions = {
    headerShown: false,
    animation: 'slide_from_right',
  };

  return (
    <Stack.Navigator 
      initialRouteName={initialRouteName as keyof RootStackParamList}
      screenOptions={defaultOptions}
    >
      {BaseRoutes.map((route: BaseRoute) => (
        <Stack.Screen
          key={route.title}
          name={route.title as keyof RootStackParamList}
          component={themed(route)}
          options={route.options || { title: route.title }}
        />
      ))}
    </Stack.Navigator>
  );
};

export default BaseNavigator;