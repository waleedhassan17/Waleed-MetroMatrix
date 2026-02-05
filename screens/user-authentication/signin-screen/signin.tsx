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
import { useAppSelector, useAppDispatch } from '../../../hooks/useReduxHooks';
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
  useFacebookAuth,
  processFacebookResponse,
  processGoogleResponse,
} from '../../../utils/social-auth/socialAuthConfig';

const isAndroid = Platform.OS === 'android';

const SignIn = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const email = useAppSelector(selectEmail);
  const password = useAppSelector(selectPassword);
  const showPassword = useAppSelector(selectShowPassword);
  const status = useAppSelector(selectStatus);
  const socialLoginStatus = useAppSelector(selectSocialLoginStatus);
  const error = useAppSelector(selectError);

  // Facebook auth hook (still uses expo-auth-session)
  const { response: facebookResponse, promptAsync: promptFacebookAsync, isReady: isFacebookReady } = useFacebookAuth();
  
  // Google auth hook (uses native SDK in dev builds, expo-auth-session in Expo Go)
  const { response: googleResponse, promptAsync: promptGoogleAsync, isReady: isGoogleReady, isNative } = useGoogleAuth();

  const isLoading = status === 'loading' || socialLoginStatus === 'loading';

  useEffect(() => {
    if (error) {
      dispatch(clearError());
    }
  }, [email, password]);

  // Handle Facebook auth response
  useEffect(() => {
    if (facebookResponse) {
      const result = processFacebookResponse(facebookResponse);
      
      if (result.type === 'success' && result.accessToken) {
        console.log('✅ Facebook auth successful, calling login API');
        handleFacebookLoginWithToken(result.accessToken);
      } else if (result.type === 'cancel') {
        console.log('ℹ️ Facebook sign-in was cancelled');
      } else if (result.type === 'error') {
        Alert.alert('Facebook Sign In Failed', result.error || 'Unknown error occurred');
      }
    }
  }, [facebookResponse]);

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

  // Google login with token
  const handleGoogleLoginWithToken = async (idToken: string) => {
    try {
      const result = await dispatch(submitGoogleSignInAsync({ idToken })).unwrap();
      
      console.log('✅ Google login successful, navigating to UserHome');
      
      // Navigate directly to UserHome using reset for clean navigation stack
      (navigation as any).reset({
        index: 0,
        routes: [{ name: 'UserHome' }],
      });
    } catch (err: any) {
      console.error('❌ Google login error:', err);
      Alert.alert(
        'Google Sign In Failed',
        err || 'Unable to sign in with Google. Please try again.'
      );
    }
  };

  // Facebook login with token
  const handleFacebookLoginWithToken = async (accessToken: string) => {
    try {
      const result = await dispatch(submitFacebookSignInAsync({ accessToken })).unwrap();
      
      console.log('✅ Facebook login successful');
      
      Alert.alert(
        'Success', 
        `Welcome! You've successfully signed in with Facebook.`,
        [
          {
            text: 'Continue',
            onPress: () => {
              try {
                (navigation as any).navigate('UserHome');
              } catch (navigationError) {
                (navigation as any).reset({
                  index: 0,
                  routes: [{ name: 'UserHome' }],
                });
              }
            },
          },
        ]
      );
    } catch (err: any) {
      console.error('❌ Facebook login error:', err);
      Alert.alert(
        'Facebook Sign In Failed',
        err || 'Unable to sign in with Facebook. Please try again.'
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
      const result = await dispatch(
        submitSignInAsync({
          email: email.trim(),
          password,
        })
      ).unwrap();

      // Check if admin or user from the result (not from Redux state)
      const isAdminUser = result.type === 'admin';
      const loginType = isAdminUser ? 'Admin' : 'User';
      const welcomeMessage = isAdminUser 
        ? 'Welcome to Admin Dashboard!' 
        : 'Welcome back!';

      console.log(`✅ Login successful as ${loginType}`);

      Alert.alert('Success', welcomeMessage, [
        {
          text: 'Continue',
          onPress: () => {
            try {
              // Navigate based on the result type, not Redux state
              if (isAdminUser) {
                console.log('🔐 Admin detected, navigating to AdminDashboard');
                (navigation as any).navigate('AdminDashboard');
              } else {
                console.log('👤 User detected, navigating to UserHome');
                (navigation as any).navigate('UserHome');
              }
            } catch (navigationError) {
              console.log('⚠️ Navigation error, using reset:', navigationError);
              // Fallback to reset navigation
              if (isAdminUser) {
                (navigation as any).reset({
                  index: 0,
                  routes: [{ name: 'AdminDashboard' }],
                });
              } else {
                (navigation as any).reset({
                  index: 0,
                  routes: [{ name: 'UserHome' }],
                });
              }
            }
          },
        },
      ]);
    } catch (err: any) {
      console.error('❌ Login error:', err);
      Alert.alert(
        'Login Failed',
        err || 'Please check your credentials and try again.'
      );
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
      if (!isFacebookReady) {
        Alert.alert('Please wait', 'Facebook Sign-In is initializing...');
        return;
      }
      
      try {
        await promptFacebookAsync();
      } catch (err) {
        console.error('Error prompting Facebook auth:', err);
        Alert.alert('Error', 'Failed to start Facebook Sign-In');
      }
    }
  };

  const handleForgotPassword = () => {
    (navigation as any).navigate('ForgotPassword', { userType: 'user' });
  };

  const handleSignUp = () => {
    (navigation as any).navigate('SignUp');
  };

  // Handle back navigation
  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // Navigate to RoleSelection if can't go back
      (navigation as any).navigate('RoleSelection');
    }
  };

  const isFormComplete = email.trim() && password.trim();

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
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.headerContainer}>
              <Text style={styles.logo}>MetroMatrix</Text>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>
                Sign in to continue to your account
              </Text>
            </View>

            {/* Tabs */}
            <View style={styles.tabContainer}>
              <TouchableOpacity style={styles.tabActive} disabled>
                <Text style={styles.tabTextActive}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.tab}
                onPress={handleSignUp}
                disabled={isLoading}
              >
                <Text style={styles.tabText}>Sign Up</Text>
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

              {/* Forgot Password */}
              <TouchableOpacity
                style={styles.forgotPasswordContainer}
                onPress={handleForgotPassword}
                disabled={isLoading}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              style={[
                styles.signInButton,
                isFormComplete && !isLoading && styles.signInButtonActive,
                isLoading && styles.signInButtonLoading,
              ]}
              onPress={handleSignIn}
              disabled={!isFormComplete || isLoading}
            >
              <Text style={styles.signInButtonText}>
                {status === 'loading' ? 'Signing in...' : 'Sign In'}
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
                <Text style={styles.socialButtonText}>
                  {socialLoginStatus === 'loading' ? 'Loading...' : 'Google'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleSocialLogin('facebook')}
                disabled={isLoading}
              >
                <Ionicons name="logo-facebook" size={20} color="#4267B2" />
                <Text style={styles.socialButtonText}>
                  {socialLoginStatus === 'loading' ? 'Loading...' : 'Facebook'}
                </Text>
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
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: 12,
  },
  forgotPasswordText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '500',
  },
  signInButton: {
    backgroundColor: '#E0E0E0',
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  signInButtonActive: {
    backgroundColor: '#10B981',
  },
  signInButtonLoading: {
    backgroundColor: '#10B981',
    opacity: 0.7,
  },
  signInButtonText: {
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

export default SignIn;