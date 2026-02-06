import React, { useEffect } from 'react';
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
import type { NavigationProp } from '@react-navigation/native';
import { useAppSelector, useAppDispatch } from '../../../hooks/useReduxHooks';
import {
  selectFullName,
  selectPhoneNumber,
  selectEmail,
  selectPassword,
  selectShowPassword,
  selectStatus,
  selectSocialSignupStatus,
  selectError,
  selectRequiresEmailVerification,
  selectUser,
  setFullName,
  setPhoneNumber,
  setEmail,
  setPassword,
  togglePasswordVisibility,
  clearError,
  submitSignUpAsync,
  submitGoogleSignUpAsync,
} from './signupSlice';
import {
  useGoogleAuth,
  processGoogleResponse,
  firebaseSignInWithGoogle,
  firebaseSignInWithFacebook,
  signInWithFacebookNativeSDK,
  getFirebaseIdToken,
  AccountExistsWithDifferentCredentialError,
} from '../../../utils/social-auth/socialAuthConfig';
import { auth } from '../../../firebaseConfig';
import { saveData, saveUserInfo, KeyForStorage } from '../../../utils/storage_utils/storageUtils';

const isAndroid = Platform.OS === 'android';

type AuthStackParamList = {
  SignUp: undefined;
  SignIn: undefined;
  EmailVerification: { 
    email: string; 
    verificationType: 'email_verification';
    userType: 'user';
  };
};

const SignUp = () => {
  const navigation = useNavigation<NavigationProp<AuthStackParamList>>();
  const dispatch = useAppDispatch();

  const fullName = useAppSelector(selectFullName);
  const phoneNumber = useAppSelector(selectPhoneNumber);
  const email = useAppSelector(selectEmail);
  const password = useAppSelector(selectPassword);
  const showPassword = useAppSelector(selectShowPassword);
  const status = useAppSelector(selectStatus);
  const socialSignupStatus = useAppSelector(selectSocialSignupStatus);
  const error = useAppSelector(selectError);
  const requiresEmailVerification = useAppSelector(selectRequiresEmailVerification);
  const user = useAppSelector(selectUser);

  // Social auth hooks
  const { response: googleResponse, promptAsync: promptGoogleAsync, isReady: isGoogleReady, isNative } = useGoogleAuth();

  const isLoading = status === 'loading' || socialSignupStatus === 'loading';

  useEffect(() => {
    if (error) {
      dispatch(clearError());
    }
  }, [fullName, phoneNumber, email, password, dispatch]);

  // Handle Google auth response
  useEffect(() => {
    if (googleResponse) {
      console.log('📥 Received Google auth response:', googleResponse?.type);
      const result = processGoogleResponse(googleResponse);
      
      if (result.type === 'success' && result.idToken) {
        console.log('✅ Google auth successful, calling signup API');
        handleGoogleSignupWithToken(result.idToken);
      } else if (result.type === 'cancel') {
        console.log('ℹ️ Google sign-in was cancelled');
      } else if (result.type === 'error') {
        Alert.alert('Google Sign Up Failed', result.error || 'Unknown error occurred');
      }
    }
  }, [googleResponse]);

  // Google signup with token (Firebase-only, backend API skipped for now)
  const handleGoogleSignupWithToken = async (idToken: string) => {
    try {
      // Step 1: Authenticate with Firebase using the raw Google token
      const userCredential = await firebaseSignInWithGoogle(idToken);
      const firebaseUser = userCredential.user;
      
      console.log('✅ Firebase Google auth successful:', firebaseUser.email);
      
      // Step 2: Get Firebase ID token for future backend use
      const firebaseIdToken = await getFirebaseIdToken();
      
      // Step 3: Save user data from Firebase to AsyncStorage (skip backend API for now)
      const userData = {
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        fullName: firebaseUser.displayName || '',
        phoneNumber: firebaseUser.phoneNumber || '',
        profilePhoto: firebaseUser.photoURL || '',
        profileComplete: false,
        isVerified: firebaseUser.emailVerified,
      };
      
      await saveUserInfo(userData);
      await saveData(KeyForStorage.userType, 'user');
      await saveData(KeyForStorage.isAuthenticated, true);
      if (firebaseIdToken) {
        await saveData(KeyForStorage.accessToken, firebaseIdToken);
      }
      
      // TODO: Re-enable backend API call when backend is ready
      // const result = await dispatch(submitGoogleSignUpAsync({ idToken: firebaseIdToken })).unwrap();
      
      console.log('✅ Google signup successful, navigating to UserHome');
      
      // Navigate directly to UserHome using reset for clean navigation stack
      (navigation as any).reset({
        index: 0,
        routes: [{ name: 'UserHome' }],
      });
    } catch (err: any) {
      console.error('❌ Google signup error:', err);
      Alert.alert(
        'Google Sign Up Failed',
        typeof err === 'string' ? err : (err?.message || 'Unable to sign up with Google. Please try again.')
      );
    }
  };

  // Facebook signup with native SDK (Firebase-only, backend API skipped - same as Google)
  const handleFacebookSignup = async () => {
    try {
      console.log('📱 Starting native Facebook Sign-Up...');
      const result = await signInWithFacebookNativeSDK();

      if (result.type === 'cancel') {
        console.log('ℹ️ Facebook sign-up was cancelled');
        return;
      }

      if (result.type === 'error' || !result.accessToken) {
        Alert.alert('Facebook Sign Up Failed', result.error || 'Unknown error occurred');
        return;
      }

      // Step 1: Authenticate with Firebase using the Facebook access token
      const userCredential = await firebaseSignInWithFacebook(result.accessToken);
      const firebaseUser = userCredential.user;

      console.log('✅ Firebase Facebook auth successful:', firebaseUser.email);

      // Step 2: Get Firebase ID token for future backend use
      const firebaseIdToken = await getFirebaseIdToken();

      // Step 3: Save user data from Firebase + Facebook profile to AsyncStorage
      const userData = {
        id: firebaseUser.uid,
        email: firebaseUser.email || result.profile?.email || '',
        fullName: firebaseUser.displayName || result.profile?.name || '',
        phoneNumber: firebaseUser.phoneNumber || '',
        profilePhoto: firebaseUser.photoURL || result.profile?.imageURL || '',
        profileComplete: false,
        isVerified: firebaseUser.emailVerified,
      };

      await saveUserInfo(userData);
      await saveData(KeyForStorage.userType, 'user');
      await saveData(KeyForStorage.isAuthenticated, true);
      if (firebaseIdToken) {
        await saveData(KeyForStorage.accessToken, firebaseIdToken);
      }

      console.log('✅ Facebook signup successful, navigating to UserHome');

      (navigation as any).reset({
        index: 0,
        routes: [{ name: 'UserHome' }],
      });
    } catch (err: any) {
      console.error('❌ Facebook signup error:', err);

      if (err instanceof AccountExistsWithDifferentCredentialError) {
        const providerNames = err.existingProviders.map((p: string) => {
          if (p === 'password') return 'Email/Password';
          if (p === 'google.com') return 'Google';
          if (p === 'facebook.com') return 'Facebook';
          return p;
        });
        Alert.alert(
          'Account Already Exists',
          `The email ${err.email} is already registered with ${providerNames.join(', ')}. ` +
          `Please sign in using ${providerNames[0] || 'your original method'} first, then your Facebook will be automatically linked.`,
          [
            {
              text: 'Go to Sign In',
              onPress: () => navigation.navigate('SignIn'),
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        return;
      }

      Alert.alert(
        'Facebook Sign Up Failed',
        typeof err === 'string' ? err : (err?.message || 'Unable to sign up with Facebook. Please try again.')
      );
    }
  };

  // Navigate to email verification after successful signup
  useEffect(() => {
    if (requiresEmailVerification && status === 'idle' && user) {
      console.log('✅ Sign up successful, navigating to email verification');
      
      // ✅ CRITICAL: Use user.email from backend (not user input)
      // Backend may normalize email (e.g., remove dots from Gmail)
      const backendEmail = user.email || email.trim();
      console.log('📧 Using email for verification:', backendEmail);
      
      if (backendEmail !== email.trim()) {
        console.log('⚠️ Backend normalized email differently than user input');
      }
      
      // Navigate to email verification screen
      navigation.navigate('EmailVerification', {
        email: backendEmail,
        verificationType: 'email_verification',
        userType: 'user',
      });
    }
  }, [requiresEmailVerification, status, email, user, navigation]);

  const validateForm = () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return false;
    }

    if (fullName.trim().length < 2) {
      Alert.alert('Error', 'Name must be at least 2 characters long');
      return false;
    }

    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return false;
    }

    const phoneRegex = /^[0-9]{10,15}$/;
    if (!phoneRegex.test(phoneNumber.trim().replace(/[\s-]/g, ''))) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return false;
    }

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

  const handleSignUp = async () => {
    console.log('🔘 handleSignUp called');
    console.log('Form values:', { fullName, phoneNumber, email, hasPassword: !!password });
    
    if (error) {
      dispatch(clearError());
    }

    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }

    console.log('✅ Form validation passed, submitting...');

    try {
      const result = await dispatch(
        submitSignUpAsync({
          fullName: fullName.trim(),
          phoneNumber: phoneNumber.trim(),
          email: email.trim(),
          password,
        })
      ).unwrap();
      
      console.log('✅ Sign up successful');
      
      // ✅ Navigate to email verification
      Alert.alert(
        'Signup Successful! 🎉',
        'Please verify your email to complete registration.',
        [
          {
            text: 'Continue',
            onPress: () => {
              (navigation as any).navigate('EmailVerification', {
                email: email.trim(),
                verificationType: 'email_verification',
                userType: 'user',
              });
            },
          },
        ]
      );
    } catch (err: any) {
      console.log('❌ Sign up error:', err);
      console.log('❌ Full error:', JSON.stringify(err, null, 2));
      
      const errorMessage = err?.message || err || 'Unable to create account. Please try again.';
      
      // Add more detail for debugging
      let displayMessage = errorMessage;
      if (errorMessage.includes('Invalid response format')) {
        displayMessage = `${errorMessage}\n\nPlease check your internet connection and try again. If the problem persists, contact support.`;
      }
      
      Alert.alert(
        'Sign Up Failed',
        displayMessage
      );
    }
  };

  const handleSignIn = () => {
    navigation.navigate('SignIn');
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
            console.log('✅ Native Google auth successful, calling signup API');
            handleGoogleSignupWithToken(result.idToken);
          } else if (result && result.type === 'cancel') {
            console.log('ℹ️ Google sign-in was cancelled');
          } else if (result && result.type === 'error') {
            Alert.alert('Google Sign Up Failed', String(result.error) || 'Unknown error occurred');
          }
        } else {
          // For Expo Go, use expo-auth-session (response handled by useEffect)
          await promptGoogleAsync();
        }
      } catch (err: any) {
        console.error('Error prompting Google auth:', err);
        Alert.alert('Error', err.message || 'Failed to start Google Sign-In');
      }
    } else {
      try {
        await handleFacebookSignup();
      } catch (err) {
        console.error('Error with Facebook auth:', err);
        Alert.alert('Error', 'Failed to start Facebook Sign-Up');
      }
    }
  };

  const isFormComplete = 
    fullName.trim().length > 0 &&
    phoneNumber.trim().length > 0 &&
    email.trim().length > 0 &&
    password.trim().length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={isAndroid ? '#FFFFFF' : 'transparent'}
        translucent={!isAndroid}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.headerContainer}>
              <Text style={styles.logo}>MetroMatrix</Text>
              <Text style={styles.title}>Get Started</Text>
              <Text style={styles.subtitle}>
                Create your account to get started
              </Text>
            </View>

            {/* Tabs */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={styles.tab}
                onPress={handleSignIn}
                disabled={isLoading}
              >
                <Text style={styles.tabText}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tabActive} disabled>
                <Text style={styles.tabTextActive}>Sign Up</Text>
              </TouchableOpacity>
            </View>

            {/* Error Display */}
            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#D32F2F" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Form Fields */}
            <View style={styles.formContainer}>
              {/* Full Name */}
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  value={fullName}
                  onChangeText={(value) => dispatch(setFullName(value))}
                  autoCapitalize="words"
                  autoComplete="name"
                  editable={!isLoading}
                  placeholderTextColor="#94a3b8"
                />
              </View>

              {/* Phone Number */}
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your phone number"
                  value={phoneNumber}
                  onChangeText={(value) => dispatch(setPhoneNumber(value))}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  editable={!isLoading}
                  placeholderTextColor="#94a3b8"
                />
              </View>

              {/* Email */}
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email address"
                  value={email}
                  onChangeText={(value) => dispatch(setEmail(value))}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!isLoading}
                  placeholderTextColor="#94a3b8"
                />
              </View>

              {/* Password */}
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={(value) => dispatch(setPassword(value))}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  editable={!isLoading}
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => dispatch(togglePasswordVisibility())}
                  style={styles.eyeIcon}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={showPassword ? "eye-outline" : "eye-off-outline"} 
                    size={20} 
                    color="#64748b" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Create Account Button */}
            <TouchableOpacity
              style={[
                styles.signUpButton,
                isFormComplete && !isLoading && styles.signUpButtonActive,
                isLoading && styles.signUpButtonLoading,
              ]}
              onPress={handleSignUp}
              disabled={!isFormComplete || isLoading}
              activeOpacity={0.7}
            >
              <Text style={styles.signUpButtonText}>
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Login Buttons */}
            <View style={styles.socialContainer}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleSocialLogin('google')}
                disabled={isLoading}
              >
                <Ionicons name="logo-google" size={20} color="#DB4437" />
                <Text style={styles.socialButtonText}>Google</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleSocialLogin('facebook')}
                disabled={isLoading}
              >
                <Ionicons name="logo-facebook" size={20} color="#4267B2" />
                <Text style={styles.socialButtonText}>Facebook</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 40,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  logo: {
    fontSize: 28,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabActive: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  tabTextActive: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 4,
    borderLeftColor: '#D32F2F',
    padding: 12,
    marginBottom: 20,
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: '#D32F2F',
    fontSize: 14,
  },
  formContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 8,
    marginTop: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    height: 56,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
    paddingVertical: 0,
  },
  eyeIcon: {
    padding: 4,
    marginLeft: 8,
  },
  signUpButton: {
    backgroundColor: '#E0E0E0',
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  signUpButtonActive: {
    backgroundColor: '#10B981',
  },
  signUpButtonLoading: {
    backgroundColor: '#10B981',
    opacity: 0.7,
  },
  signUpButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
    color: '#94a3b8',
  },
  socialContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    height: 50,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  socialIconWrapper: {
    marginRight: 0,
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
});

export default SignUp;