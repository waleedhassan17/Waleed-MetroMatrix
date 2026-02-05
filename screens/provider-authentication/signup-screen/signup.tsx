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
import type { AppDispatch } from '../../../store/store';
import { Ionicons } from '@expo/vector-icons';
import {
  setFullName,
  setEmail,
  setPhoneNumber,
  setPassword,
  togglePasswordVisibility,
  clearError,
  submitProviderSignUpAsync,
  submitProviderGoogleSignUpAsync,
  submitProviderFacebookSignUpAsync,
  selectFullName,
  selectEmail,
  selectPhoneNumber,
  selectPassword,
  selectShowPassword,
  selectIsLoading,
  selectError,
  selectIsFormComplete,
  selectProvider,
  selectRequiresEmailVerification,
  selectStatus,
} from './signupSlice';
import {
  selectProviderType,
  selectProviderSubType,
} from '../../provider-selection/providerSlice';
import { ActionButton } from '../../../components/FormComponents';

const isAndroid = Platform.OS === 'android';

type RootStackParamList = {
  SignIn: undefined;
  PersonalInfo: undefined;
  ProviderSignIn: undefined;
  EmailVerification: {
    email: string;
    verificationType: string;
    userType: string;
  };
};

export default function ProviderSignUpScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const dispatch = useDispatch<AppDispatch>();



  // Selectors
  const fullName = useSelector(selectFullName);
  const email = useSelector(selectEmail);
  const phoneNumber = useSelector(selectPhoneNumber);
  const password = useSelector(selectPassword);
  const showPassword = useSelector(selectShowPassword);
  const isLoading = useSelector(selectIsLoading);
  const error = useSelector(selectError);
  const isFormComplete = useSelector(selectIsFormComplete);
  const provider = useSelector(selectProvider);
  const requiresEmailVerification = useSelector(selectRequiresEmailVerification);
  const status = useSelector(selectStatus);
  
  const providerType = useSelector(selectProviderType);
  const providerSubType = useSelector(selectProviderSubType);

  useEffect(() => {
    console.log('📋 Current Provider Selection:', {
      providerType,
      providerSubType
    });
  }, [providerType, providerSubType]);

  useEffect(() => {
    if (error) {
      Alert.alert('Sign Up Failed', error, [
        { text: 'OK', onPress: () => dispatch(clearError()) },
      ]);
    }
  }, [error, dispatch]);

  // Handle navigation to email verification after successful signup
  useEffect(() => {
    if (requiresEmailVerification && status === 'idle' && provider) {
      console.log('✅ Provider sign up successful, navigating to email verification');
      
      // ✅ CRITICAL: Use provider.email from backend (not user input)
      // Backend may normalize email (e.g., remove dots from Gmail)
      const backendEmail = provider.email || email.trim();
      console.log('📧 Using email for verification:', backendEmail);
      
      if (backendEmail !== email.trim()) {
        console.log('⚠️ Backend normalized email differently than user input');
      }
      
      // Navigate to email verification screen
      navigation.navigate('EmailVerification', {
        email: backendEmail,
        verificationType: 'email_verification',
        userType: 'provider',
      });
    }
  }, [requiresEmailVerification, status, email, provider, navigation]);

  const validateForm = (): boolean => {
    if (!fullName.trim()) {
      Alert.alert('Validation Error', 'Please enter your full name');
      return false;
    }

    if (fullName.trim().length < 2) {
      Alert.alert('Validation Error', 'Name must be at least 2 characters');
      return false;
    }

    if (!phoneNumber.trim()) {
      Alert.alert('Validation Error', 'Please enter your phone number');
      return false;
    }

    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
      Alert.alert('Validation Error', 'Please enter a valid phone number');
      return false;
    }

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
      Alert.alert('Validation Error', 'Please enter a password');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters');
      return false;
    }

    return true;
  };

  const handleSignUp = async () => {
    // API COMMENTED OUT FOR TESTING - Direct navigation without API call
    console.log('🧪 TEST MODE: Navigating directly to HomeServiceProviderDashboard without API');
    
    try {
      (navigation as any).navigate('HomeServiceProviderDashboard');
    } catch (navigationError) {
      console.log('⚠️ Navigation error, using reset:', navigationError);
      (navigation as any).reset({
        index: 0,
        routes: [{ name: 'HomeServiceProviderDashboard' }],
      });
    }
    
    /* ORIGINAL API CODE - COMMENTED OUT
    console.log('🔘 Provider handleSignUp called');
    console.log('Form values:', { 
      fullName, 
      phoneNumber, 
      email, 
      hasPassword: !!password,
      providerType,
      providerSubType 
    });
    
    if (error) {
      dispatch(clearError());
    }

    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }

    console.log('✅ Form validation passed, submitting...');

    try {
      await dispatch(
        submitProviderSignUpAsync({
          fullName: fullName.trim(),
          email: email.trim(),
          phoneNumber: phoneNumber.trim(),
          password,
        })
      ).unwrap();
      
      console.log('✅ Provider sign up successful');
      // Navigation happens automatically in useEffect when requiresEmailVerification becomes true
    } catch (err: any) {
      console.log('❌ Provider sign up error:', err);
      // Error alert is already handled by the error useEffect
    }
    */
  };

  const handleGoogleSignUp = async () => {
    // API COMMENTED OUT FOR TESTING - Direct navigation without API call
    console.log('🧪 TEST MODE: Google signup - Navigating directly to HomeServiceProviderDashboard without API');
    
    try {
      (navigation as any).navigate('HomeServiceProviderDashboard');
    } catch (navigationError) {
      console.log('⚠️ Navigation error, using reset:', navigationError);
      (navigation as any).reset({
        index: 0,
        routes: [{ name: 'HomeServiceProviderDashboard' }],
      });
    }
    
    /* ORIGINAL API CODE - COMMENTED OUT
    console.log('🔘 Google sign up called');
    
    try {
      const result = await dispatch(submitProviderGoogleSignUpAsync()).unwrap();
      
      console.log('✅ Provider Google sign up successful');
      
      // Navigate to PersonalInfo after successful Google signup
      navigation.navigate('PersonalInfo');
    } catch (err: any) {
      console.error('❌ Google sign up error:', err);
      // Error alert is already handled by the error useEffect
    }
    */
  };

  const handleFacebookSignUp = async () => {
    // API COMMENTED OUT FOR TESTING - Direct navigation without API call
    console.log('🧪 TEST MODE: Facebook signup - Navigating directly to HomeServiceProviderDashboard without API');
    
    try {
      (navigation as any).navigate('HomeServiceProviderDashboard');
    } catch (navigationError) {
      console.log('⚠️ Navigation error, using reset:', navigationError);
      (navigation as any).reset({
        index: 0,
        routes: [{ name: 'HomeServiceProviderDashboard' }],
      });
    }
    
    /* ORIGINAL API CODE - COMMENTED OUT
    console.log('🔘 Facebook sign up called');
    
    try {
      const result = await dispatch(submitProviderFacebookSignUpAsync()).unwrap();
      
      console.log('✅ Provider Facebook sign up successful');
      
      // Navigate to PersonalInfo after successful Facebook signup
      navigation.navigate('PersonalInfo');
    } catch (err: any) {
      console.error('❌ Facebook sign up error:', err);
      // Error alert is already handled by the error useEffect
    }
    */
  };

  const handleSignInPress = () => {
    navigation.navigate('ProviderSignIn');
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
            <Text style={styles.title}>Get Started</Text>
            
            {providerType && (
              <View style={styles.providerBadge}>
                <Text style={styles.providerBadgeText}>
                  {getProviderTypeDisplay()}
                </Text>
              </View>
            )}
            
            <Text style={styles.subtitle}>
              {providerType 
                ? 'Create your account to continue registration' 
                : 'Create your account to get started'}
            </Text>
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={styles.tab}
              onPress={handleSignInPress}
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
                value={fullName}
                onChangeText={(text) => dispatch(setFullName(text))}
                placeholder="Enter your full name"
                placeholderTextColor="#94a3b8"
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            {/* Phone Number */}
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="call-outline" size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={phoneNumber}
                onChangeText={(text) => dispatch(setPhoneNumber(text))}
                placeholder="Enter your phone number"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

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
          </View>

          {/* Create Account Button */}
          <ActionButton
            title="Create Account"
            onPress={handleSignUp}
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
              onPress={handleGoogleSignUp}
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
              onPress={handleFacebookSignUp}
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