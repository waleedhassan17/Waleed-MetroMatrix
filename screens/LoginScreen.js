// screens/LoginScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet,
  Alert,
  Platform 
} from 'react-native';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithCredential,
  fetchSignInMethodsForEmail
} from 'firebase/auth';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as Facebook from 'expo-auth-session/providers/facebook';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { auth } from '../firebaseConfig';
import { AUTH_CONFIG } from '../authConfig';

// Conditionally import Facebook SDK only on native platforms
let LoginManager, AccessToken;
if (Platform.OS !== 'web') {
  const FBSDK = require('react-native-fbsdk-next');
  LoginManager = FBSDK.LoginManager;
  AccessToken = FBSDK.AccessToken;
}

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  // Configure Google Sign-In for WEB
  const [googleRequest, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    webClientId: AUTH_CONFIG.GOOGLE_WEB_CLIENT_ID,
    androidClientId: AUTH_CONFIG.GOOGLE_ANDROID_CLIENT_ID,
    scopes: ['profile', 'email'],
  });

  // Configure Facebook Sign-In for WEB
  const [fbRequest, fbResponse, fbPromptAsync] = Facebook.useAuthRequest({
    clientId: AUTH_CONFIG.FACEBOOK_APP_ID,
  });

  // Configure native Google Sign-In for ANDROID & iOS
  useEffect(() => {
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      GoogleSignin.configure({
        webClientId: AUTH_CONFIG.GOOGLE_WEB_CLIENT_ID,
        iosClientId: AUTH_CONFIG.GOOGLE_IOS_CLIENT_ID, // iOS-specific client ID
        offlineAccess: true,
        forceCodeForRefreshToken: true,
      });
    }
  }, []);

  // Handle Google Sign-In response (WEB)
  useEffect(() => {
    if (googleResponse?.type === 'success') {
      console.log('✅ Web Google Auth Success');
      
      const { authentication } = googleResponse;
      
      if (!authentication) {
        console.error('No authentication object');
        Alert.alert('Error', 'Authentication failed');
        return;
      }

      const accessToken = authentication.accessToken;
      const idToken = authentication.idToken;

      if (accessToken || idToken) {
        authenticateWithGoogle(idToken, accessToken);
      } else {
        console.error('No tokens received');
        Alert.alert('Error', 'No authentication tokens received');
      }
    } else if (googleResponse?.type === 'error') {
      console.error('❌ Google Auth Error:', googleResponse.error);
      Alert.alert('Error', `Sign-in failed: ${googleResponse.error?.message || 'Unknown error'}`);
    }
  }, [googleResponse]);

  // Handle Facebook Sign-In response (WEB)
  useEffect(() => {
    if (fbResponse?.type === 'success') {
      console.log('✅ Web Facebook Auth Success');
      
      const { authentication } = fbResponse;
      
      if (!authentication || !authentication.accessToken) {
        console.error('No access token');
        Alert.alert('Error', 'Facebook authentication failed');
        return;
      }

      authenticateWithFacebook(authentication.accessToken);
    } else if (fbResponse?.type === 'error') {
      console.error('❌ Facebook Auth Error:', fbResponse.error);
      Alert.alert('Error', `Facebook sign-in failed: ${fbResponse.error?.message || 'Unknown error'}`);
    }
  }, [fbResponse]);

  const authenticateWithGoogle = async (idToken, accessToken) => {
    try {
      console.log('🔐 Authenticating with Firebase (Google)...');
      
      const credential = GoogleAuthProvider.credential(idToken, accessToken);
      
      try {
        const result = await signInWithCredential(auth, credential);
        console.log('✅ Firebase Sign-In Success:', result.user.email);
        Alert.alert('Success', `Welcome ${result.user.displayName || result.user.email}!`);
        navigation.navigate('Home');
      } catch (signInError) {
        if (signInError.code === 'auth/account-exists-with-different-credential') {
          await handleProviderConflict('Google', signInError);
        } else {
          throw signInError;
        }
      }
      
    } catch (error) {
      console.error('❌ Google Authentication Error:', error);
      Alert.alert('Error', `Failed to authenticate: ${error.message}`);
    }
  };

  const authenticateWithFacebook = async (accessToken) => {
    try {
      console.log('🔐 Authenticating with Firebase (Facebook)...');
      
      const credential = FacebookAuthProvider.credential(accessToken);
      
      try {
        const result = await signInWithCredential(auth, credential);
        console.log('✅ Firebase Sign-In Success:', result.user.displayName);
        Alert.alert('Success', `Welcome ${result.user.displayName || 'User'}!`);
        navigation.navigate('Home');
      } catch (signInError) {
        if (signInError.code === 'auth/account-exists-with-different-credential') {
          await handleProviderConflict('Facebook', signInError);
        } else {
          throw signInError;
        }
      }
      
    } catch (error) {
      console.error('❌ Facebook Authentication Error:', error);
      Alert.alert('Error', `Failed to authenticate: ${error.message}`);
    }
  };

  const handleProviderConflict = async (attemptedProvider, error) => {
    try {
      const email = error.customData?.email;
      
      if (!email) {
        Alert.alert('Error', 'Could not retrieve email for account');
        return;
      }

      // Get existing sign-in methods
      const methods = await fetchSignInMethodsForEmail(auth, email);
      const existingProvider = methods[0]?.includes('google') ? 'Google' : 
                              methods[0]?.includes('facebook') ? 'Facebook' : 
                              methods[0]?.includes('password') ? 'Email/Password' : 'another provider';

      Alert.alert(
        'Account Already Exists',
        `You already have an account with ${existingProvider}.\n\nTo use ${attemptedProvider}, please:\n1. Sign in with ${existingProvider}\n2. Go to your profile\n3. Link your ${attemptedProvider} account`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('❌ Provider Conflict Error:', error);
      Alert.alert('Error', 'An account with this email already exists. Please sign in with your original method.');
    }
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        Alert.alert('Success', 'Logged in!');
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        Alert.alert('Success', 'Account created!');
      }
      navigation.navigate('Home');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  // Native Google Sign-In (Android & iOS)
  const handleNativeGoogleSignIn = async () => {
    try {
      console.log('🚀 Starting Native Google Sign-In...');
      
      // Sign out first to force account selection
      await GoogleSignin.signOut();
      
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();
      console.log('✅ Google Sign-In Success:', userInfo.data.user.email);
      
      const idToken = userInfo.data.idToken;
      
      if (!idToken) {
        throw new Error('No ID token received');
      }

      await authenticateWithGoogle(idToken, null);
      
    } catch (error) {
      console.error('❌ Native Google Sign-In Error:', error);
      
      if (error.code === 'sign_in_cancelled') {
        console.log('User cancelled sign-in');
      } else if (error.code === 'in_progress') {
        Alert.alert('Error', 'Sign-in already in progress');
      } else if (error.code === 'play_services_not_available') {
        Alert.alert('Error', 'Play Services not available or outdated');
      } else {
        Alert.alert('Error', `Sign-in failed: ${error.message}`);
      }
    }
  };

  // Web Google Sign-In (expo-auth-session)
  const handleWebGoogleSignIn = async () => {
    try {
      console.log('🚀 Starting Web Google Sign-In...');
      await googlePromptAsync();
    } catch (error) {
      console.error('❌ Prompt Error:', error);
      Alert.alert('Error', 'Failed to start Google Sign-In');
    }
  };

  // Main Google Sign-In handler (platform-specific)
  const handleGoogleSignIn = async () => {
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      // Use native Google Sign-In for Android & iOS
      await handleNativeGoogleSignIn();
    } else {
      // Use expo-auth-session for Web
      await handleWebGoogleSignIn();
    }
  };

  // Native Facebook Sign-In (Android & iOS)
  const handleNativeFacebookSignIn = async () => {
    try {
      console.log('🚀 Starting Native Facebook Sign-In...');
      
      const result = await LoginManager.logInWithPermissions(['public_profile']);
      
      if (result.isCancelled) {
        console.log('User cancelled Facebook sign-in');
        return;
      }

      const data = await AccessToken.getCurrentAccessToken();
      
      if (!data) {
        throw new Error('No access token received');
      }

      console.log('✅ Facebook Sign-In Success');
      await authenticateWithFacebook(data.accessToken);
      
    } catch (error) {
      console.error('❌ Native Facebook Sign-In Error:', error);
      Alert.alert('Error', `Facebook sign-in failed: ${error.message}`);
    }
  };

  // Web Facebook Sign-In (expo-auth-session)
  const handleWebFacebookSignIn = async () => {
    try {
      console.log('🚀 Starting Web Facebook Sign-In...');
      await fbPromptAsync();
    } catch (error) {
      console.error('❌ Prompt Error:', error);
      Alert.alert('Error', 'Failed to start Facebook Sign-In');
    }
  };

  // Main Facebook Sign-In handler (platform-specific)
  const handleFacebookSignIn = async () => {
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      // Use native Facebook SDK for Android & iOS
      await handleNativeFacebookSignIn();
    } else {
      // Use expo-auth-session for Web
      await handleWebFacebookSignIn();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏙️ MetroMatrix</Text>
      <Text style={styles.subtitle}>Multi-Platform Authentication</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TouchableOpacity style={styles.button} onPress={handleEmailAuth}>
        <Text style={styles.buttonText}>
          {isLogin ? 'Login' : 'Sign Up'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
        <Text style={styles.switchText}>
          {isLogin ? 'Need an account? Sign Up' : 'Have an account? Login'}
        </Text>
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.orText}>OR</Text>
        <View style={styles.line} />
      </View>

      <TouchableOpacity 
        style={[
          styles.googleButton, 
          Platform.OS !== 'android' && !googleRequest && styles.disabledButton
        ]} 
        onPress={handleGoogleSignIn}
        disabled={Platform.OS !== 'android' && !googleRequest}
      >
        <Text style={styles.buttonText}>
          {Platform.OS !== 'android' && !googleRequest 
            ? 'Loading Google...' 
            : 'Sign in with Google'
          }
        </Text>
      </TouchableOpacity>

      <View style={styles.debugContainer}>
        <Text style={styles.debugText}>Platform: {Platform.OS}</Text>
        <Text style={styles.debugText}>
          Auth Method: {Platform.OS === 'web' ? 'Web OAuth' : 'Native SDKs'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 14,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  googleButton: {
    backgroundColor: '#4285F4',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  facebookButton: {
    backgroundColor: '#1877F2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  switchText: {
    textAlign: 'center',
    color: '#2563EB',
    marginBottom: 24,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  orText: {
    marginHorizontal: 10,
    color: '#666',
  },
  debugContainer: {
    marginTop: 24,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
});