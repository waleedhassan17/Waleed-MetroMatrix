import React, { useEffect, useState } from 'react';
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
} from './signupSlice';

// Import Google Sign-In components and functions
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri, ResponseType } from 'expo-auth-session';
import { submitGoogleSignInWithTokenAsync } from '../signin-screen/signinSlice';

// ✅ FACEBOOK: Import Facebook authentication
import { initializeFacebook } from '../../../networks/authcalls/facebookAuth';
import { submitFacebookSignUpAsync } from './signupSlice';

WebBrowser.maybeCompleteAuthSession();

const isAndroid = Platform.OS === 'android';

type AuthStackParamList = {
  SignUp: undefined;
  SignIn: undefined;
  EmailVerification: { 
    email: string; 
    verificationType: 'email_verification';
    userType: 'user';
  };
  UserHome: undefined;
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
  const error = useAppSelector(selectError);
  const requiresEmailVerification = useAppSelector(selectRequiresEmailVerification);
  const user = useAppSelector(selectUser);

  const isLoading = status === 'loading';
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isFacebookLoading, setIsFacebookLoading] = useState(false); // ✅ FACEBOOK: Add loading state

  // ✅ Google Sign-In Configuration
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: '942315940095-t465i8sfr4dc3m685fm9juqm8d4o49c5.apps.googleusercontent.com',
    responseType: ResponseType.IdToken,
    scopes: ['profile', 'email'],
    redirectUri: makeRedirectUri({
      scheme: 'metromatrix',
      path: 'redirect'
    }),
  });

  // ✅ Handle Google Sign-In Response
  useEffect(() => {
    if (response?.type === 'success') {
      const { params, authentication } = response;
      const idToken = params?.id_token || authentication?.idToken;
      
      console.log('🔍 Google response:', {
        type: response.type,
        hasParams: !!params,
        hasAuth: !!authentication,
        hasIdToken: !!idToken
      });

      if (idToken) {
        handleGoogleToken(idToken);
      } else {
        console.error('❌ No ID token received from Google');
        Alert.alert('Error', 'Failed to get authentication token from Google');
        setIsGoogleLoading(false);
      }
    } else if (response?.type === 'error') {
      console.error('❌ Google auth error:', response.error);
      Alert.alert('Google Sign-In Failed', 'Please try again');
      setIsGoogleLoading(false);
    } else if (response?.type === 'dismiss' || response?.type === 'cancel') {
      console.log('ℹ️ Google sign-in cancelled by user');
      setIsGoogleLoading(false);
    }
  }, [response]);

  // ✅ FACEBOOK: Initialize Facebook SDK on mount
  useEffect(() => {
    initializeFacebook().catch(error => {
      console.error('❌ Facebook SDK initialization failed:', error);
    });
  }, []);

  const handleGoogleToken = async (idToken: string) => {
    try {
      setIsGoogleLoading(true);
      console.log('📤 Sending Google ID token to backend...');
      
      const result = await dispatch(
        submitGoogleSignInWithTokenAsync(idToken)
      ).unwrap();
      
      console.log('✅ Google sign-in successful:', result);
      
      // Navigate based on user profile status
      if (result.user.profileComplete) {
        Alert.alert(
          'Welcome Back!',
          `Signed in as ${result.user.fullName}`,
          [
            {
              text: 'Continue',
              onPress: () => {
                (navigation as any).reset({
                  index: 0,
                  routes: [{ name: 'UserHome' }],
                });
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Account Created!',
          'Please complete your profile to continue',
          [
            {
              text: 'Continue',
              onPress: () => {
                (navigation as any).navigate('CompleteProfile');
              }
            }
          ]
        );
      }
    } catch (error: any) {
      console.error('❌ Google sign-in error:', error);
      Alert.alert(
        'Sign-In Failed',
        error?.message || 'Failed to sign in with Google. Please try again.'
      );
    } finally {
      setIsGoogleLoading(false);
    }
  };

  useEffect(() => {
    if (error) {
      dispatch(clearError());
    }
  }, [fullName, phoneNumber, email, password, dispatch]);

  // Navigate to email verification after successful signup
  useEffect(() => {
    if (requiresEmailVerification && status === 'idle' && user) {
      console.log('✅ Sign up successful, navigating to email verification');
      
      const backendEmail = user.email || email.trim();
      console.log('📧 Using email for verification:', backendEmail);
      
      if (backendEmail !== email.trim()) {
        console.log('⚠️ Backend normalized email differently than user input');
      }
      
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

    // ✅ FIXED: Phone validation that accepts + and other characters
    const cleanPhone = phoneNumber.trim().replace(/[\s\-\+\(\)]/g, '');
    const phoneRegex = /^[0-9]{10,15}$/;
    if (!phoneRegex.test(cleanPhone)) {
      Alert.alert(
        'Invalid Phone Number',
        'Please enter a valid phone number (10-15 digits).\nExample: +923001234567'
      );
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
      
      Alert.alert(
        'Signup Successful! 🎉',
        'Please check your email to verify your account and complete registration.',
        [
          {
            text: 'Continue',
            onPress: () => {
              navigation.navigate('EmailVerification', {
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
      
      let errorMessage = 'Unable to create account. Please try again.';
      
      if (err?.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      // Specific error messages
      if (errorMessage.includes('already exists')) {
        Alert.alert(
          'Account Exists',
          'An account with this email already exists. Would you like to sign in instead?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Sign In', 
              onPress: () => navigation.navigate('SignIn'),
              style: 'default'
            },
          ]
        );
        return;
      }
      
      if (errorMessage.includes('Invalid response format')) {
        errorMessage = 'Server error. Please check your internet connection and try again.';
      }
      
      if (errorMessage.includes('reserved for administrator')) {
        errorMessage = 'This email is reserved for administrators. Please use a different email address.';
      }
      
      Alert.alert('Sign Up Failed', errorMessage);
    }
  };

  const handleSignIn = () => {
    navigation.navigate('SignIn');
  };

  // ✅ FIXED: Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    try {
      console.log('🔘 Google Sign-In button pressed');
      setIsGoogleLoading(true);
      
      // Trigger Google Sign-In
      const result = await promptAsync();
      
      if (result.type === 'cancel' || result.type === 'dismiss') {
        setIsGoogleLoading(false);
      }
      // Response will be handled by useEffect above
    } catch (error) {
      console.error('❌ Error triggering Google sign-in:', error);
      Alert.alert('Error', 'Failed to start Google Sign-In. Please try again.');
      setIsGoogleLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    if (provider === 'google') {
      handleGoogleSignIn();
    } else if (provider === 'facebook') {
      handleFacebookSignUp(); // ✅ FACEBOOK: Call Facebook handler
    }
  };

  // ✅ FACEBOOK: Facebook Sign-Up Handler
  const handleFacebookSignUp = async () => {
    try {
      setIsFacebookLoading(true);
      console.log('🔘 Facebook Sign-Up button pressed');
      
      const result = await dispatch(submitFacebookSignUpAsync()).unwrap();
      
      console.log('✅ Facebook sign-up successful:', result);
      
      // Navigate based on profile status
      if (result.user.profileComplete) {
        Alert.alert(
          'Account Created! 🎉',
          'Your account has been created successfully.',
          [
            {
              text: 'Continue',
              onPress: () => {
                (navigation as any).reset({
                  index: 0,
                  routes: [{ name: 'UserHome' }],
                });
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Complete Your Profile',
          'Please add your phone number to continue',
          [
            {
              text: 'Continue',
              onPress: () => {
                (navigation as any).navigate('CompleteProfile');
              }
            }
          ]
        );
      }
    } catch (error: any) {
      console.error('❌ Facebook sign-up error:', error);
      
      // Handle specific errors
      if (error?.message?.includes('already exists')) {
        Alert.alert(
          'Account Exists',
          'An account with this email already exists. Would you like to sign in instead?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Sign In', 
              onPress: () => navigation.navigate('SignIn'),
            },
          ]
        );
      } else if (error?.message?.includes('cancelled')) {
        // User cancelled, just log it
        console.log('ℹ️ Facebook sign-up cancelled by user');
      } else {
        Alert.alert(
          'Sign-Up Failed',
          error?.message || 'Failed to sign up with Facebook. Please try again.'
        );
      }
    } finally {
      setIsFacebookLoading(false);
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
                disabled={isLoading || isGoogleLoading}
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
                  editable={!isLoading && !isGoogleLoading}
                  placeholderTextColor="#94a3b8"
                />
              </View>

              {/* Phone Number */}
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. +923001234567"
                  value={phoneNumber}
                  onChangeText={(value) => dispatch(setPhoneNumber(value))}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  editable={!isLoading && !isGoogleLoading}
                  placeholderTextColor="#94a3b8"
                />
              </View>

              {/* Email */}
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={(value) => dispatch(setEmail(value))}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!isLoading && !isGoogleLoading}
                  placeholderTextColor="#94a3b8"
                />
              </View>

              {/* Password */}
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password (min. 6 characters)"
                  value={password}
                  onChangeText={(value) => dispatch(setPassword(value))}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  editable={!isLoading && !isGoogleLoading}
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => dispatch(togglePasswordVisibility())}
                  style={styles.eyeIcon}
                  activeOpacity={0.7}
                  disabled={isLoading || isGoogleLoading}
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
                isFormComplete && !isLoading && !isGoogleLoading && styles.signUpButtonActive,
                (isLoading || isGoogleLoading) && styles.signUpButtonLoading,
              ]}
              onPress={handleSignUp}
              disabled={!isFormComplete || isLoading || isGoogleLoading}
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
                style={[
                  styles.socialButton,
                  isGoogleLoading && styles.socialButtonLoading
                ]}
                onPress={() => handleSocialLogin('google')}
                disabled={isLoading || isGoogleLoading || isFacebookLoading} // ✅ FACEBOOK: Also disable Google when Facebook loading
              >
                <Ionicons name="logo-google" size={20} color="#DB4437" />
                <Text style={styles.socialButtonText}>
                  {isGoogleLoading ? 'Signing in...' : 'Google'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.socialButton,
                  isFacebookLoading && styles.socialButtonLoading // ✅ FACEBOOK: Add loading style
                ]}
                onPress={() => handleSocialLogin('facebook')}
                disabled={isLoading || isGoogleLoading || isFacebookLoading} // ✅ FACEBOOK: Disable when loading
              >
                <Ionicons name="logo-facebook" size={20} color="#4267B2" />
                <Text style={styles.socialButtonText}>
                  {isFacebookLoading ? 'Signing in...' : 'Facebook'} 
                </Text>
              </TouchableOpacity>
            </View>

            {/* Terms & Conditions */}
            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                By creating an account, you agree to our{' '}
                <Text style={styles.termsLink}>Terms & Conditions</Text>
                {' '}and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
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
    marginBottom: 24,
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
  socialButtonLoading: {
    opacity: 0.6,
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  termsContainer: {
    paddingHorizontal: 8,
  },
  termsText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: '#10B981',
    fontWeight: '500',
  },
});

export default SignUp;
