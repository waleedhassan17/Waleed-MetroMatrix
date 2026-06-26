import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../store/store';
import { Ionicons } from '@expo/vector-icons';
import {
  setEmail,
  setPassword,
  togglePasswordVisibility,
  clearError,
  submitProviderSignInAsync,
  submitProviderGoogleSignInAsync,
  submitProviderFacebookSignInAsync,
  selectEmail,
  selectPassword,
  selectShowPassword,
  selectIsLoading,
  selectError,
  selectIsFormComplete,
  selectProvider,
} from './signinSlice';
import {
  selectProviderType,
  selectProviderSubType,
} from '../../provider-selection/providerSlice';
import { ActionButton } from '../../../components/FormComponents';

const isAndroid = Platform.OS === 'android';

type RootStackParamList = {
  SignUp: undefined;
  PersonalInfo: undefined;
  ForgotPassword: undefined;
  ProviderSignUp: undefined;
};

export default function ProviderSignInScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const dispatch = useDispatch<AppDispatch>();

  // Selectors
  const email = useSelector(selectEmail);
  const password = useSelector(selectPassword);
  const showPassword = useSelector(selectShowPassword);
  const isLoading = useSelector(selectIsLoading);
  const error = useSelector(selectError);
  const isFormComplete = useSelector(selectIsFormComplete);
  const provider = useSelector(selectProvider);
  
  const providerType = useSelector((state: RootState) => {
  try {
    return selectProviderType(state);
  } catch (error) {
    console.log('Provider type not available yet');
    return null;
  }
});
  const providerSubType = useSelector((state: RootState) => {
  try {
    return selectProviderSubType(state);
  } catch (error) {
    console.log('Provider subtype not available yet');
    return null;
  }
});

  useEffect(() => {
    console.log('📋 Current Provider Selection:', {
      providerType,
      providerSubType
    });
  }, [providerType, providerSubType]);

  useEffect(() => {
    if (error) {
      Alert.alert('Sign In Failed', error, [
        { text: 'OK', onPress: () => dispatch(clearError()) },
      ]);
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (provider) {
      console.log('✅ Provider signed in successfully:', provider.email);
      console.log('📋 Provider info available:', { providerType, providerSubType });
      // Navigation will be handled after profile is complete
    }
  }, [provider, providerType, providerSubType]);

  const validateForm = (): boolean => {
    if (!email.trim()) {
      Alert.alert('Validation Error', 'Please enter your email address');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return false;
    }

    if (!password.trim()) {
      Alert.alert('Validation Error', 'Please enter your password');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters');
      return false;
    }

    return true;
  };

  const handleSignIn = async () => {
    if (!validateForm()) return;

    // ===== STATIC DEV LOGINS - Bypass API for test accounts =====
    const STATIC_PROVIDERS: Record<string, { password: string; route: string; name: string }> = {
      'drhira@gmail.com': { password: '123456', route: 'DoctorStack', name: 'Dr. Hira' },
      'saim@gmail.com': { password: '123456', route: 'HomeServiceProviderDashboard', name: 'Saim' },
      'outfitters@gmail.com': { password: '123456', route: 'BrandModule', name: 'Outfitters' },
    };

    const staticMatch = STATIC_PROVIDERS[email.trim().toLowerCase()];
    if (staticMatch && password === staticMatch.password) {
      console.log(`✅ [Static] Provider login: ${staticMatch.name} → ${staticMatch.route}`);
      (navigation as any).reset({ index: 0, routes: [{ name: staticMatch.route }] });
      Alert.alert('Success', `Welcome back, ${staticMatch.name}!`);
      return;
    }

    // ===== DYNAMIC LOGIN - Real API authentication =====
    try {
      const result = await dispatch(
        submitProviderSignInAsync({
          email: email.trim(),
          password,
        })
      ).unwrap();
      console.log('✅ Provider sign in successful:', result);

      // Navigate based on provider type. Prefer the freshly-returned result over the
      // selector value (which may be a stale closure right after dispatch).
      const resolvedType = (result as any)?.provider?.providerType || providerType;
      const destination = resolvedType === 'doctor' ? 'DoctorStack' : 'HomeServiceProviderDashboard';

      // Navigate immediately — do NOT gate navigation behind Alert.alert, whose
      // buttons don't render on react-native-web (web users would be stuck here).
      try {
        console.log(`➡️ Navigating to ${destination}`);
        (navigation as any).reset({ index: 0, routes: [{ name: destination }] });
      } catch (navErr) {
        console.log('⚠️ Navigation error:', navErr);
      }
      Alert.alert('Success', 'Welcome back!');
    } catch (err: any) {
      console.error('❌ Provider sign in error:', err);
      Alert.alert(
        'Sign In Failed',
        typeof err === 'string' ? err : (err?.message || 'Please check your credentials and try again.')
      );
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await dispatch(submitProviderGoogleSignInAsync()).unwrap();
      console.log('📋 Provider info available:', { providerType, providerSubType });
    } catch (error) {
      console.error('❌ Google sign in error:', error);
    }
  };

  const handleFacebookSignIn = async () => {
    try {
      await dispatch(submitProviderFacebookSignInAsync()).unwrap();
      console.log('📋 Provider info available:', { providerType, providerSubType });
    } catch (error) {
      console.error('❌ Facebook sign in error:', error);
    }
  };


const handleForgotPassword = () => {
  (navigation as any).navigate('ForgotPassword', { userType: 'provider' });
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


  const handleSignUpPress = () => {
    navigation.navigate('ProviderSignUp');
  };

  const getProviderTypeDisplay = () => {
    if (!providerType) return '';
    
    if (providerType === 'doctor') return 'Doctor';
    if (providerType === 'vendor') return 'Vendor';
    if (providerType === 'home_service') {
      if (!providerSubType) return 'Home Service Provider';
      
      const subTypeMap: Record<string, string> = {
        'electrician': 'Electrician',
        'plumber': 'Plumber',
        'ac_repairer': 'AC Repairer'
      };
      return subTypeMap[providerSubType] || 'Home Service Provider';
    }
    
    return '';
  };

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
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.headerContainer}>
            <Text style={styles.logo}>MetroMatrix</Text>
            <Text style={styles.title}>Welcome Back</Text>
            
            {providerType && (
              <View style={styles.providerBadge}>
                <Text style={styles.providerBadgeText}>
                  {getProviderTypeDisplay()}
                </Text>
              </View>
            )}
            
            <Text style={styles.subtitle}>
              {providerType 
                ? 'Sign in to continue your registration' 
                : 'Sign in to continue to your account'}
            </Text>
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity style={styles.tabActive} disabled>
              <Text style={styles.tabTextActive}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tab}
              onPress={handleSignUpPress}
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
                value={email}
                onChangeText={(text) => dispatch(setEmail(text))}
                placeholder="Enter your email address"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            {/* Password */}
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={(text) => dispatch(setPassword(text))}
                placeholder="Enter your password"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
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
              style={styles.forgotPasswordButton}
              onPress={handleForgotPassword}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotPasswordText}>Forget Password?</Text>
            </TouchableOpacity>
          </View>

          {/* Sign In Button */}
          <ActionButton
            title="Sign In"
            onPress={handleSignIn}
            disabled={!isFormComplete}
            loading={isLoading}
            color="#6366f1"
          />

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
              onPress={handleGoogleSignIn}
              activeOpacity={0.7}
              disabled={isLoading}
            >
              <View style={styles.socialIconWrapper}>
                <Ionicons name="logo-google" size={20} color="#DB4437" />
              </View>
              <Text style={styles.socialButtonText}>Google</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.socialButton}
              onPress={handleFacebookSignIn}
              activeOpacity={0.7}
              disabled={isLoading}
            >
              <View style={styles.socialIconWrapper}>
                <Ionicons name="logo-facebook" size={20} color="#4267B2" />
              </View>
              <Text style={styles.socialButtonText}>Facebook</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 40,
  },
  logo: {
    fontSize: 28,
    fontWeight: '700',
    color: '#8B5CF6',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  providerBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  providerBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803d',
    letterSpacing: 0.3,
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
    color: '#8B5CF6',
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
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginTop: 12,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8B5CF6',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    fontSize: 13,
    color: '#94a3b8',
    marginHorizontal: 16,
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