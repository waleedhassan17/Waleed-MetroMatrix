import React, { useEffect, useCallback, useRef } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Platform, ActivityIndicator, View, Linking, Alert } from "react-native";
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

// ── NEW imports ───────────────────────────────────────────────────────────────
import SocketService from "../../utils/socketService";
import { NavigationContainerRef } from "@react-navigation/native";
// ─────────────────────────────────────────────────────────────────────────────

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

  // ── NEW: navigation ref so we can navigate from outside components ──────────
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  // ───────────────────────────────────────────────────────────────────────────

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

        // ── NEW: reconnect socket on app restart if already logged in ──────
        SocketService.connect(token as string);
        console.log('🔌 Socket reconnected on app restart');
        // ──────────────────────────────────────────────────────────────────
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

  // ── NEW: Connect socket when user/provider logs in; disconnect on logout ────
  //
  // This watches the auth state. When currentUser or currentProvider appears
  // (after login OR after app restart + fetchMe), we grab the token from storage
  // and connect. When both are null (logout), we disconnect.
  //
  useEffect(() => {
    const isLoggedIn = !!(currentUser || currentProvider);

    if (isLoggedIn) {
      // Only connect if not already connected (avoids double-connect)
      if (!SocketService.isConnected()) {
        retrieveData(KeyForStorage.accessToken).then((token) => {
          if (token) {
            SocketService.connect(token as string);
            console.log('🔌 Socket connected after login');
          }
        });
      }
    } else {
      // User logged out — disconnect socket
      if (SocketService.isConnected()) {
        SocketService.disconnect();
        console.log('🔌 Socket disconnected after logout');
      }
    }
  }, [currentUser, currentProvider]);
  // ───────────────────────────────────────────────────────────────────────────

  // ── NEW: Global incoming call listener ─────────────────────────────────────
  //
  // This is only relevant for PROVIDERS (users initiate calls, providers receive them).
  // Shows a native Alert with Accept / Decline. On Accept, navigates to CallScreen.
  //
  useEffect(() => {
    if (userType !== 'provider') return; // users don't receive calls here

    const unsubscribe = SocketService.onCallEvent('call:incoming', (data) => {
      const callerName = data.callerInfo?.name || 'A customer';
      const serviceType = data.serviceType || 'general';

      Alert.alert(
        '📞 Incoming Call',
        `${callerName} is calling`,
        [
          {
            text: 'Decline',
            style: 'destructive',
            onPress: () => {
              SocketService.rejectCall({
                callerId: data.callerId,
                callerRole: data.callerRole,
                channelName: data.channelName,
              });
              console.log('📵 Call declined');
            },
          },
          {
            text: 'Accept',
            onPress: () => {
              // Navigate to CallScreen passing the full incoming call data
              navigationRef.current?.navigate('CallScreen', {
                serviceType,
                incomingCallData: {
                  callerId: data.callerId,
                  callerRole: data.callerRole,
                  channelName: data.channelName,
                  callerInfo: data.callerInfo,
                },
              });
            },
          },
        ],
        { cancelable: false } // prevent dismissing by tapping outside
      );
    });

    return () => unsubscribe();
  }, [userType]); // re-registers if role changes (edge case: same device role switch)
  // ───────────────────────────────────────────────────────────────────────────

  // 🔥 Firebase Auth State Listener - VERY IMPORTANT
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        console.log('🔥 Firebase user authenticated:', firebaseUser.email);
        console.log('🔥 Firebase UID:', firebaseUser.uid);
      } else {
        console.log('🔥 Firebase user signed out');
      }
    });

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

    if (!onboardingComplete) {
      console.log('➡️ Navigating to Splash (onboarding not complete)');
      return BaseRouteNames.Splash;
    }
    
    if (!selectedRole) {
      console.log('➡️ Navigating to RoleSelection (no role selected)');
      return BaseRouteNames.RoleSelection;
    }
    
    if (userType === 'provider' && currentProvider) {
      console.log('➡️ Navigating to HomeServiceProviderDashboard (authenticated provider)');
      return BaseRouteNames.HomeServiceProviderDashboard;
    } else if (userType === 'user' && currentUser) {
      console.log('➡️ Navigating to UserHome (authenticated user)');
      return BaseRouteNames.UserHome;
    }
    
    if (selectedRole === 'provider') {
      console.log('➡️ Navigating to ProviderSignIn (provider not authenticated)');
      return BaseRouteNames.ProviderSignIn;
    } else if (selectedRole === 'user') {
      console.log('➡️ Navigating to SignIn (user not authenticated)');
      return BaseRouteNames.SignIn;
    }
    
    console.log('➡️ Navigating to RoleSelection (default)');
    return BaseRouteNames.RoleSelection;
  };

  const initialRoute = getInitialRoute();

  // ✅ Deep linking configuration
  const linking = {
    prefixes: ['metromatrix://', 'https://metromatrix.com', 'https://*.metromatrix.com'],
    config: {
      screens: {
        EmailVerification: {
          path: 'verify-email/:token',
          parse: { token: (token: string) => token },
        },
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
          parse: { token: (token: string) => token },
        },
        SignIn: { path: 'auth/google' },
        ProviderSignIn: { path: 'auth/provider/google' },
        UserHome: { path: 'home' },
        HomeServiceProviderDashboard: { path: 'provider/dashboard' },
      },
    },
  };

  return (
    <GestureHandlerRootView style={styles.gestureStyle}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        {/* ── NEW: pass ref to NavigationContainer ── */}
        <NavigationContainer linking={linking} ref={navigationRef}>
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
