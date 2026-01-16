import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { BaseRoutes, BaseRouteName, RootStackParamList } from "../navigation-maps/Base";
import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";

type BaseRoute = {
  title: BaseRouteName;
  component: React.ComponentType<any>;
  options?: NativeStackNavigationOptions;
};

type BaseNavigatorProps = {
  initialRouteName: BaseRouteName;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const BaseNavigator: React.FC<BaseNavigatorProps> = ({ initialRouteName }) => {
  // Default screen options
  const defaultOptions: NativeStackNavigationOptions = {
    headerShown: false,
    animation: 'slide_from_right',
  };

  return (
    <Stack.Navigator 
      initialRouteName={initialRouteName}
      screenOptions={defaultOptions}
    >
      {BaseRoutes.map((route: BaseRoute) => (
        <Stack.Screen
          key={route.title}
          name={route.title as keyof RootStackParamList}
          component={route.component}
          options={route.options || { title: route.title }}
        />
      ))}
    </Stack.Navigator>
  );
};

export default BaseNavigator;