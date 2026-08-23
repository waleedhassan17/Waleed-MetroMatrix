import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector, useAppDispatch } from '../../../hooks/useReduxHooks';
import { resetAllState } from '../../../store/store';
import {
  selectEmail,
  selectPassword,
  selectShowPassword,
  selectStatus,
  selectSocialLoginStatus,
  selectError,
  selectUserType,
  selectIsAdmin,
  setEmail,
  setPassword,
  togglePasswordVisibility,
  clearError,
  submitSignInAsync,
  submitGoogleSignInAsync,
  submitFacebookSignInAsync,
} from './signinSlice';
import {
  useGoogleAuth,
  processGoogleResponse,
  resolveGoogleFirebaseIdToken,
  signInWithFacebookNativeSDK,
} from '../../../utils/social-auth/socialAuthConfig';
import {
  setCurrentUser,
} from '../../../components/app-container/appContainerSlice';

const isAndroid = Platform.OS === 'android';

const SignIn = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const passwordInputRef = useRef<TextInput>(null);

  const email = useAppSelector(selectEmail);
  const password = useAppSelector(selectPassword);
  const showPassword = useAppSelector(selectShowPassword);
  const status = useAppSelector(selectStatus);
  const socialLoginStatus = useAppSelector(selectSocialLoginStatus);
  const error = useAppSelector(selectError);

  // Google auth hook (uses native SDK in dev builds, expo-auth-session in Expo Go)
  const { response: googleResponse, promptAsync: promptGoogleAsync, isReady: isGoogleReady, isNative } = useGoogleAuth();

  const isLoading = status === 'loading' || socialLoginStatus === 'loading';

  useEffect(() => {
    if (error) {
      dispatch(clearError());
    }
  }, [email, password]);

  // Handle Google auth response
  useEffect(() => {
    if (googleResponse) {
      console.log('📥 Received Google auth response:', googleResponse?.type);
      const result = processGoogleResponse(googleResponse);
      
      if (result.type === 'success' && result.idToken) {
        console.log('✅ Google auth successful, calling login API');
        handleGoogleLoginWithToken(result.idToken);
      } else if (result.type === 'cancel') {
        console.log('ℹ️ Google sign-in was cancelled');
      } else if (result.type === 'error') {
        Alert.alert('Google Sign In Failed', result.error || 'Unknown error occurred');
      }
    }
  }, [googleResponse]);

  // Google login — Firebase auth (needed: the backend verifies a FIREBASE ID
  // token for Google, unlike Facebook) then our backend.
  const handleGoogleLoginWithToken = async (idToken: string) => {
    try {
      // Step 1: Exchange the raw Google token for a Firebase session. Unlike
      // the Facebook path, this step is required — google-login calls
      // admin.auth().verifyIdToken(), which only accepts Firebase ID tokens.
      // resolveGoogleFirebaseIdToken absorbs
      // auth/account-exists-with-different-credential instead of dead-ending
      // on it, so an email already registered another way still signs in and
      // gets linked by the backend (task.md Issue 2).
      const firebaseIdToken = await resolveGoogleFirebaseIdToken(idToken);

      if (!firebaseIdToken) {
        throw new Error('Failed to get Firebase ID token');
      }

      // Clear the previous account before the new session lands — the password
      // path does this too, and a social sign-in must not be the side door
      // that leaves the last user's data in the store.
      dispatch(resetAllState(true));

      // Step 2: Call backend API to authenticate with Firebase ID token
      const userFromAuth = await dispatch(submitGoogleSignInAsync({ idToken: firebaseIdToken })).unwrap();
      dispatch(setCurrentUser(userFromAuth.user));

      console.log('✅ Google login successful via backend, navigating to UserHome');

      (navigation as any).reset({
        index: 0,
        routes: [{ name: 'UserHome' }],
      });
    } catch (err: any) {
      console.error('❌ Google login error:', err);
      Alert.alert(
        'Google Sign In Failed',
        typeof err === 'string' ? err : (err?.message || 'Unable to sign in with Google. Please try again.')
      );
    }
  };

  // Facebook login — native SDK straight to our backend, no Firebase step.
  //
  // The backend's /auth/facebook-login verifies the RAW Facebook access token
  // itself (Graph debug_token, see config/facebook.js) and find-or-creates by
  // facebookId OR email, auto-linking to an existing account. So the client
  // never needed a Firebase credential here — and that extra
  // signInWithCredential call was the sole source of Firebase's
  // auth/account-exists-with-different-credential error, i.e. the dead-end
  // "Account Already Exists" modal (task.md Issues 2 & 5). Dropping it
  // removes the collision entirely and lets the backend do the linking.
  const handleFacebookLogin = async () => {
    try {
      console.log('📱 Starting native Facebook Sign-In...');
      const result = await signInWithFacebookNativeSDK();

      if (result.type === 'cancel') {
        console.log('ℹ️ Facebook sign-in was cancelled');
        return;
      }

      if (result.type === 'error' || !result.accessToken) {
        Alert.alert('Facebook Sign In Failed', result.error || 'Unknown error occurred');
        return;
      }

      // Same reasoning as the Google path above.
      dispatch(resetAllState(true));

      const resultAction = await dispatch(submitFacebookSignInAsync({ accessToken: result.accessToken })).unwrap();

      // Hydrate app container immediately on login success
      dispatch(setCurrentUser(resultAction.user));

      console.log('✅ Facebook login successful via backend, navigating to UserHome');

      (navigation as any).reset({
        index: 0,
        routes: [{ name: 'UserHome' }],
      });
    } catch (err: any) {
      console.error('❌ Facebook login error:', err);

      Alert.alert(
        'Facebook Sign In Failed',
        typeof err === 'string' ? err : (err?.message || 'Unable to sign in with Facebook. Please try again.')
      );
    }
  };

  const validateForm = () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }

    if (!password.trim()) {
      Alert.alert('Error', 'Please enter your password');
      return false;
    }

    if (password.trim().length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return false;
    }

    return true;
  };

  const handleSignIn = async () => {
    if (error) {
      dispatch(clearError());
    }

    if (!validateForm()) {
      return;
    }

    try {
      // Clear any previous account's state BEFORE the new session lands, so a
      // crashed or interrupted logout cannot leak the last user's data into
      // this one's screens.
      dispatch(resetAllState(true));

      const result = await dispatch(
        submitSignInAsync({ email: email.trim().toLowerCase(), password })
      ).unwrap();

      if (result.type !== 'admin') {
        // Hydrate app container immediately on a user login so the app does not
        // remain stuck on a loading screen waiting for a stale or missing profile.
        const userPayload = (result.data as any)?.user;
        if (userPayload) {
          dispatch(setCurrentUser(userPayload));
        }
      }

      if (result.type === 'admin') {
        console.log('✅ Admin login successful → AdminDashboard');
        (navigation as any).reset({ index: 0, routes: [{ name: 'AdminDashboard' }] });
      } else {
        console.log('✅ User login successful → UserHome');
        (navigation as any).reset({ index: 0, routes: [{ name: 'UserHome' }] });
      }
    } catch (err: any) {
      console.log('❌ Sign in failed:', err);
      // Error is already set in Redux state and rendered above the form.
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    if (error) {
      dispatch(clearError());
    }

    if (provider === 'google') {
      if (!isGoogleReady) {
        Alert.alert('Please wait', 'Google Sign-In is initializing...');
        return;
      }

      try {
        // For native SDK (dev builds/production), handle response directly
        if (isNative) {
          const result = await promptGoogleAsync() as any;
          console.log('📥 Native Google Sign-In result:', result);

          if (result && result.type === 'success' && result.idToken) {
            console.log('✅ Native Google auth successful, calling login API');
            handleGoogleLoginWithToken(result.idToken);
          } else if (result && result.type === 'cancel') {
            console.log('ℹ️ Google sign-in was cancelled');
          } else if (result && result.type === 'error') {
            Alert.alert('Google Sign In Failed', String(result.error) || 'Unknown error occurred');
          }
        } else {
          // For Expo Go, use expo-auth-session (response handled by useEffect)
          await promptGoogleAsync();
        }
      } catch (err: any) {
        console.error('Error with Google auth:', err);
        Alert.alert('Error', err.message || 'Failed to start Google Sign-In');
      }
    } else {
      try {
        await handleFacebookLogin();
      } catch (err) {
        console.error('Error with Facebook auth:', err);
        Alert.alert('Error', 'Failed to start Facebook Sign-In');
      }
    }
  };

  const handleForgotPassword = () => {
    (navigation as any).navigate('ForgotPassword', { userType: 'user' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <KeyboardAvoidingView
          style={styles.inner}
          behavior={isAndroid ? 'height' : 'padding'}
          keyboardVerticalOffset={isAndroid ? 20 : 0}
        >
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>MyApp</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.title}>Sign In</Text>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#999"
              value={email}
              onChangeText={(text) => dispatch(setEmail(text))}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
              onSubmitEditing={() => passwordInputRef.current?.focus()}
              blurOnSubmit={false}
            />

            <View style={styles.passwordContainer}>
              <TextInput
                ref={passwordInputRef}
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={(text) => dispatch(setPassword(text))}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleSignIn}
              />
              <TouchableOpacity
                style={styles.togglePasswordVisibility}
                onPress={() => dispatch(togglePasswordVisibility())}
              >
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color="#999" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.forgotPasswordButton} onPress={handleForgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot your password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonLoading]}
              onPress={handleSignIn}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>{isLoading ? 'Signing in...' : 'Sign In'}</Text>
            </TouchableOpacity>

            <View style={styles.separator}>
              <View style={styles.line} />
              <Text style={styles.separatorText}>or</Text>
              <View style={styles.line} />
            </View>

            <TouchableOpacity
              style={[styles.button, styles.googleButton, isLoading && styles.buttonLoading]}
              onPress={() => handleSocialLogin('google')}
              disabled={isLoading}
            >
              <Ionicons name="logo-google" size={24} color="#fff" style={styles.googleIcon} />
              <Text style={styles.buttonText}>{isLoading ? 'Signing in with Google...' : 'Sign in with Google'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.facebookButton, isLoading && styles.buttonLoading]}
              onPress={() => handleSocialLogin('facebook')}
              disabled={isLoading}
            >
              <Ionicons name="logo-facebook" size={24} color="#fff" style={styles.facebookIcon} />
              <Text style={styles.buttonText}>{isLoading ? 'Signing in with Facebook...' : 'Sign in with Facebook'}</Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                <Text style={styles.footerLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 20,
    color: '#333',
  },
  errorContainer: {
    backgroundColor: '#f8d7da',
    borderRadius: 4,
    padding: 10,
    marginBottom: 20,
  },
  errorText: {
    color: '#721c24',
    fontSize: 14,
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 10,
    marginBottom: 15,
    fontSize: 16,
    color: '#333',
  },
  passwordContainer: {
    position: 'relative',
  },
  togglePasswordVisibility: {
    position: 'absolute',
    right: 10,
    top: 10,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#007bff',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#007bff',
    borderRadius: 4,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonLoading: {
    backgroundColor: '#0056b3',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#ccc',
  },
  separatorText: {
    marginHorizontal: 10,
    color: '#666',
    fontSize: 14,
  },
  googleButton: {
    backgroundColor: '#db4437',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  googleIcon: {
    marginRight: 10,
  },
  facebookButton: {
    backgroundColor: '#4267b2',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  facebookIcon: {
    marginRight: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#666',
    fontSize: 14,
  },
  footerLink: {
    color: '#007bff',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default SignIn;