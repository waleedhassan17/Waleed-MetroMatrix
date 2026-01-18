// screens/HomeScreen.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { signOut, linkWithCredential, GoogleAuthProvider, FacebookAuthProvider } from 'firebase/auth';
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

export default function HomeScreen({ navigation }) {
  const [linking, setLinking] = useState(false);
  const user = auth.currentUser;

  // Get linked providers
  const linkedProviders = user?.providerData?.map(p => p.providerId) || [];
  const hasGoogle = linkedProviders.includes('google.com');
  const hasFacebook = linkedProviders.includes('facebook.com');
  const hasPassword = linkedProviders.includes('password');

  // Google linking for web
  const [googleRequest, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    webClientId: AUTH_CONFIG.GOOGLE_WEB_CLIENT_ID,
    androidClientId: AUTH_CONFIG.GOOGLE_ANDROID_CLIENT_ID,
    scopes: ['profile', 'email'],
  });

  // Facebook linking for web
  const [fbRequest, fbResponse, fbPromptAsync] = Facebook.useAuthRequest({
    clientId: AUTH_CONFIG.FACEBOOK_APP_ID,
  });

  // Configure native Google Sign-In for Android & iOS
  React.useEffect(() => {
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      GoogleSignin.configure({
        webClientId: AUTH_CONFIG.GOOGLE_WEB_CLIENT_ID,
        iosClientId: AUTH_CONFIG.GOOGLE_IOS_CLIENT_ID,
        offlineAccess: true,
      });
    }
  }, []);

  // Handle Google linking response
  React.useEffect(() => {
    if (googleResponse?.type === 'success' && linking) {
      const { authentication } = googleResponse;
      if (authentication?.idToken || authentication?.accessToken) {
        linkGoogleAccount(authentication.idToken, authentication.accessToken);
      }
      setLinking(false);
    }
  }, [googleResponse]);

  // Handle Facebook linking response
  React.useEffect(() => {
    if (fbResponse?.type === 'success' && linking) {
      const { authentication } = fbResponse;
      if (authentication?.accessToken) {
        linkFacebookAccount(authentication.accessToken);
      }
      setLinking(false);
    }
  }, [fbResponse]);

  const linkGoogleAccount = async (idToken, accessToken) => {
    try {
      const credential = GoogleAuthProvider.credential(idToken, accessToken);
      await linkWithCredential(user, credential);
      Alert.alert('Success', 'Google account linked successfully!');
    } catch (error) {
      console.error('Link Google Error:', error);
      Alert.alert('Error', `Failed to link Google: ${error.message}`);
    }
  };

  const linkFacebookAccount = async (accessToken) => {
    try {
      const credential = FacebookAuthProvider.credential(accessToken);
      await linkWithCredential(user, credential);
      Alert.alert('Success', 'Facebook account linked successfully!');
    } catch (error) {
      console.error('Link Facebook Error:', error);
      Alert.alert('Error', `Failed to link Facebook: ${error.message}`);
    }
  };

  const handleLinkGoogle = async () => {
    setLinking(true);
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      try {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        const userInfo = await GoogleSignin.signIn();
        const idToken = userInfo.data.idToken;
        await linkGoogleAccount(idToken, null);
      } catch (error) {
        console.error('Native Google Link Error:', error);
        Alert.alert('Error', 'Failed to link Google account');
      }
      setLinking(false);
    } else {
      await googlePromptAsync();
    }
  };

  const handleLinkFacebook = async () => {
    setLinking(true);
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      try {
        const result = await LoginManager.logInWithPermissions(['public_profile']);
        if (!result.isCancelled) {
          const data = await AccessToken.getCurrentAccessToken();
          await linkFacebookAccount(data.accessToken);
        }
      } catch (error) {
        console.error('Native Facebook Link Error:', error);
        Alert.alert('Error', 'Failed to link Facebook account');
      }
      setLinking(false);
    } else {
      await fbPromptAsync();
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.navigate('Login');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome! 🎉</Text>
      <Text style={styles.email}>{user?.email || user?.displayName || 'User'}</Text>
      
      <View style={styles.providersContainer}>
        <Text style={styles.sectionTitle}>Linked Accounts:</Text>
        
        {hasPassword && (
          <View style={styles.providerRow}>
            <Text style={styles.providerText}>✅ Email/Password</Text>
          </View>
        )}
        
        {hasGoogle ? (
          <View style={styles.providerRow}>
            <Text style={styles.providerText}>✅ Google</Text>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.linkButton} 
            onPress={handleLinkGoogle}
            disabled={linking}
          >
            <Text style={styles.linkButtonText}>
              {linking ? 'Linking...' : '+ Link Google Account'}
            </Text>
          </TouchableOpacity>
        )}
        
        {hasFacebook ? (
          <View style={styles.providerRow}>
            <Text style={styles.providerText}>✅ Facebook</Text>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.linkButton} 
            onPress={handleLinkFacebook}
            disabled={linking}
          >
            <Text style={styles.linkButtonText}>
              {linking ? 'Linking...' : '+ Link Facebook Account'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  email: {
    fontSize: 18,
    color: '#666',
    marginBottom: 40,
  },
  providersContainer: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    padding: 20,
    borderRadius: 12,
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  providerRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  providerText: {
    fontSize: 16,
    color: '#333',
  },
  linkButton: {
    backgroundColor: '#4285F4',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  linkButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});