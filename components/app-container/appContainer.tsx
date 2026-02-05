import React, { useEffect, useCallback } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Platform, ActivityIndicator, View, Linking } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAppDispatch, useAppSelector } from "../../hooks/useReduxHooks";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "../../firebaseConfig";

import { BaseRouteNames } from "../../navigation-maps/Base";
import BaseNavigator from "../../navigators/BaseNavigator";

import {
  selectCurrentUser,
  selectCurrentProvider,
  selectStatus,
  selectUserType,
  fetchMe,
  logout,
  persistFcmTokenAction,
  setAppIsReady,
  selectIsAppReady,
  selectIsOnboardingComplete,
  selectSelectedRole,
  loadInitialState,
} from "./appContainerSlice";

import {
  KeyForStorage,
  retrieveData,
} from "../../utils/storage_utils/storageUtils";

// Define colors
const Black = "#000000";
const White = "#FFFFFF";

/**
 * Main App Container Component
 */
export const AppContainer: React.FC = () => {
  const dispatch = useAppDispatch();
  
  // Use selectors with proper root state access
  const currentUser = useAppSelector((state) => state.appContainer.currentUser);
  const currentProvider = useAppSelector((state) => state.appContainer.currentProvider);
  const userType = useAppSelector((state) => state.appContainer.userType);
  const status = useAppSelector((state) => state.appContainer.status);
  const isAppReady = useAppSelector((state) => state.appContainer.isAppReady);
  const onboardingComplete = useAppSelector((state) => state.appContainer.isOnboardingComplete);
  const selectedRole = useAppSelector((state) => state.appContainer.selectedRole);

  // Initialize app and check authentication status
  const initializeApp = useCallback(async () => {
    try {
      console.log('🚀 Initializing app...');
      
      // Load initial state from storage
      await dispatch(loadInitialState()).unwrap();
      console.log('✅ Initial state loaded');
      
      // Check if user has access token
      const token = await retrieveData(KeyForStorage.accessToken);
      
      if (token) {
        console.log('🔑 Token found, fetching user data...');
        // If token exists, fetch user data
        await dispatch(fetchMe()).unwrap();
        console.log('✅ User data fetched');
      } else {
        console.log('ℹ️ No token found');
      }
    } catch (error) {
      console.error('❌ Error initializing app:', error);
    } finally {
      dispatch(setAppIsReady(true));
      console.log('✅ App ready');
    }
  }, [dispatch]);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  // 🔥 Firebase Auth State Listener - VERY IMPORTANT
  // This listens for Firebase authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        console.log('🔥 Firebase user authenticated:', firebaseUser.email);
        console.log('🔥 Firebase UID:', firebaseUser.uid);
        // Firebase user is authenticated
        // You can dispatch actions here if needed to update Redux state
        // For example: dispatch(setFirebaseUser(firebaseUser));
      } else {
        console.log('🔥 Firebase user signed out');
        // User is signed out from Firebase
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [dispatch]);

  // Handle FCM token for push notifications
  useEffect(() => {
    const persistDeviceToken = async () => {
      const fcmToken = ""; // TODO: Get this from your push notification service
      
      if (fcmToken && (currentUser || currentProvider)) {
        dispatch(
          persistFcmTokenAction({
            fcmToken,
            deviceType: Platform.OS,
          })
        );
      }
    };

    persistDeviceToken();
  }, [currentUser, currentProvider, dispatch]);

  // Show loading screen while app is initializing
  if (!isAppReady || status === 'loading') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={White} />
      </View>
    );
  }

  // Determine initial route based on app state
  const getInitialRoute = () => {
    console.log('📍 Determining initial route...', {
      onboardingComplete,
      selectedRole,
      userType,
      hasUser: !!currentUser,
      hasProvider: !!currentProvider,
    });

    // Check onboarding status
    if (!onboardingComplete) {
      console.log('➡️ Navigating to Splash (onboarding not complete)');
      return BaseRouteNames.Splash;
    }
    
    // Check if role is selected
    if (!selectedRole) {
      console.log('➡️ Navigating to RoleSelection (no role selected)');
      return BaseRouteNames.RoleSelection;
    }
    
    // Check authentication based on user type
    if (userType === 'provider' && currentProvider) {
      console.log('➡️ Navigating to HomeServiceProviderDashboard (authenticated provider)');
      return BaseRouteNames.HomeServiceProviderDashboard;
    } else if (userType === 'user' && currentUser) {
      console.log('➡️ Navigating to UserHome (authenticated user)');
      return BaseRouteNames.UserHome;
    }
    
    // Not authenticated, check role to show appropriate sign in
    if (selectedRole === 'provider') {
      console.log('➡️ Navigating to ProviderSignIn (provider not authenticated)');
      return BaseRouteNames.ProviderSignIn;
    } else if (selectedRole === 'user') {
      console.log('➡️ Navigating to SignIn (user not authenticated)');
      return BaseRouteNames.SignIn;
    }
    
    // Default to role selection if nothing else matches
    console.log('➡️ Navigating to RoleSelection (default)');
    return BaseRouteNames.RoleSelection;
  };

  const initialRoute = getInitialRoute();

  // ✅ Deep linking configuration for email verification and OAuth
  const linking = {
    prefixes: ['metromatrix://', 'https://metromatrix.com', 'https://*.metromatrix.com'],
    config: {
      screens: {
        EmailVerification: {
          path: 'verify-email/:token',
          parse: {
            token: (token: string) => token,
          },
        },
        // ✅ Handle verify-success with tokens from backend
        VerifySuccess: {
          path: 'verify-success',
          parse: {
            accessToken: (token: string) => token,
            refreshToken: (token: string) => token,
            userType: (type: string) => type,
          },
        },
        ResetPassword: {
          path: 'reset-password/:token',
          parse: {
            token: (token: string) => token,
          },
        },
        // ✅ OAuth callback routes for Google/Facebook sign-in
        SignIn: {
          path: 'auth/google',
        },
        ProviderSignIn: {
          path: 'auth/provider/google',
        },
        UserHome: {
          path: 'home',
        },
        HomeServiceProviderDashboard: {
          path: 'provider/dashboard',
        },
      },
    },
  };

  return (
    <GestureHandlerRootView style={styles.gestureStyle}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <NavigationContainer linking={linking}>
          <BaseNavigator initialRouteName={initialRoute} />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  gestureStyle: {
    flex: 1,
    backgroundColor: Black,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Black,
  },
});

export default AppContainer;