import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { BaseRoutes, BaseRouteName, RouteModules, RootStackParamList } from "../navigation-maps/Base";
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
 * Wrap a route's screen in its module's theme, per RouteModules.
 *
 * Memoised by route name because `component` identity has to be stable: a fresh
 * component type on every render makes React Navigation remount the screen, and
 * a screen that remounts loses its scroll position and refetches on every
 * parent render.
 */
const themedCache = new Map<string, React.ComponentType<any>>();

const themed = (route: BaseRoute): React.ComponentType<any> => {
  const moduleName = RouteModules[route.title];
  if (!moduleName) return route.component;

  const cached = themedCache.get(route.title);
  if (cached) return cached;

  const Screen = route.component;
  const Themed: React.ComponentType<any> = (props) => (
    <ThemeProvider module={moduleName}>
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