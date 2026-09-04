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

import { navigationRef } from "../../navigation-maps/navigationRef";
import { IncomingCallProvider } from "../call/IncomingCallProvider";
import {
  configureNotificationHandler,
  registerForPushNotifications,
} from "../../services/push/pushNotifications";
import { useNotificationRouting } from "../../services/push/useNotificationRouting";

// Configure once at module load, before any notification can arrive.
configureNotificationHandler();

// Define colors
const Black = "#000000";
const White = "#FFFFFF";

/**
 * Lives INSIDE IncomingCallProvider so it can surface a call from a
 * notification tap. Renders nothing.
 */
const NotificationRouter: React.FC = () => {
  useNotificationRouting();
  return null;
};

/**
 * Main App Container Component
 */
interface AppContainerProps {
  /**
   * Fired when the root view has laid out. App.tsx uses it to drop the native
   * splash exactly as the first real frame paints, so there is no gap where a
   * blank root is visible between the splash and the UI.
   */
  onLayout?: () => void;
}

export const AppContainer: React.FC<AppContainerProps> = ({ onLayout }) => {
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

  // Register for push once a session exists. The token goes to the REALTIME
  // service (which sends the notifications), not the main API.
  //
  // This replaces a placeholder that read `const fcmToken = ""` and therefore
  // never registered anything — which is why incoming calls could not wake the
  // app. Requires an EAS build; it no-ops in Expo Go and on simulators.
  useEffect(() => {
    if (!currentUser && !currentProvider) return;
    registerForPushNotifications();
  }, [currentUser, currentProvider]);

  // Show loading screen while app is initializing.
  // `onLayout` fires here too: if init stalls, the native splash must still come
  // down and show this spinner rather than leaving the app apparently frozen.
  if (!isAppReady || status === 'loading') {
    return (
      <View style={styles.loadingContainer} onLayout={onLayout}>
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
      // Route doctors to the healthcare DoctorStack, home_service providers to the existing dashboard
      const providerSubType = currentProvider.providerType;
      if (providerSubType === 'doctor') {
        console.log('➡️ Navigating to DoctorStack (authenticated doctor)');
        return BaseRouteNames.DoctorStack;
      }
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
        HealthcareStack: {
          path: 'healthcare',
        },
        DoctorStack: {
          path: 'doctor/dashboard',
        },
        // Wallet top-up deep links
        WalletTopUpSuccess: {
          path: 'wallet/topup-success',
        },
        WalletTopUpCancel: {
          path: 'wallet/topup-cancel',
        },
      },
    },
  };

  return (
    <GestureHandlerRootView style={styles.gestureStyle} onLayout={onLayout}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <NavigationContainer ref={navigationRef} linking={linking}>
          {/* Wraps the navigator so an incoming ring can surface over ANY
              screen — the server targets a per-user room, so a call arrives
              regardless of where the callee happens to be. */}
          <IncomingCallProvider>
            <NotificationRouter />
            <BaseNavigator initialRouteName={initialRoute} />
          </IncomingCallProvider>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  gestureStyle: {
    flex: 1,
    // Light app-root background. Screens cover this on native, but on web some
    // screens (e.g. the doctor tab scenes) don't fully cover it — a black root
    // showed through and made those screens look odd/blank.
    backgroundColor: '#F8FBFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Black,
  },
});

export default AppContainer;