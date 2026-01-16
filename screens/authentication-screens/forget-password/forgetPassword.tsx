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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { Ionicons } from '@expo/vector-icons';
import {
  setEmail,
  setUserType,
  clearError,
  resetForm,
  submitForgotPasswordAsync,
  selectEmail,
  selectUserType,
  selectIsLoading,
  selectError,
  selectIsFormComplete,
  selectStatus,
} from './forgetPasswordSlice';
import {
  selectProviderType,
  selectProviderSubType,
} from '../../provider-selection/providerSlice';
import type { RootState } from '../../../store/store';

const isAndroid = Platform.OS === 'android';

type UserType = 'user' | 'provider';

interface RouteParams {
  userType?: UserType;
}

type RootStackParamList = {
  SignIn: undefined;
  ProviderSignIn: undefined;
  SignUp: undefined;
  ResetPasswordOTP: { 
    email: string; 
    userType: UserType;
  };
};

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute();
  const params = route.params as RouteParams;
  const dispatch = useAppDispatch();

  const email = useAppSelector(selectEmail);
  const userType = useAppSelector(selectUserType);
  const isLoading = useAppSelector(selectIsLoading);
  const error = useAppSelector(selectError);
  const isFormComplete = useAppSelector(selectIsFormComplete);
  const status = useAppSelector(selectStatus);

  const providerType = useAppSelector((state: RootState) => {
    try {
      return selectProviderType(state);
    } catch (error) {
      return null;
    }
  });

  const providerSubType = useAppSelector((state: RootState) => {
    try {
      return selectProviderSubType(state);
    } catch (error) {
      return null;
    }
  });

  // Set user type from navigation params
  useEffect(() => {
    if (params?.userType) {
      dispatch(setUserType(params.userType));
    }
  }, [params, dispatch]);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [
        { text: 'OK', onPress: () => dispatch(clearError()) }
      ]);
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (status === 'succeeded') {
      navigation.navigate('ResetPasswordOTP', {
        email: email.trim(),
        userType: userType,
      });
      dispatch(resetForm());
    }
  }, [status, email, userType, navigation, dispatch]);

  const validateEmail = (): boolean => {
    if (!email.trim()) {
      Alert.alert('Validation Error', 'Please enter your email address');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleResetPassword = async () => {
    if (!validateEmail()) return;
    dispatch(submitForgotPasswordAsync({ email: email.trim() }));
  };

  const handleBackToSignIn = () => {
    dispatch(resetForm());
    if (userType === 'provider') {
      navigation.navigate('ProviderSignIn');
    } else {
      navigation.navigate('SignIn');
    }
  };

  const getProviderTypeDisplay = () => {
    if (!providerType || userType !== 'provider') return '';
    
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

  const getUserTypeDisplay = () => {
    if (userType === 'provider') {
      return getProviderTypeDisplay() || 'Provider';
    }
    return 'User';
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
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            disabled={isLoading}
          >
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.headerContainer}>
            <View style={styles.iconContainer}>
              <Ionicons name="mail-outline" size={64} color="#6366f1" />
            </View>
            <Text style={styles.title}>Forgot Password?</Text>
            
            {/* User Type Badge */}
            {userType && (
              <View style={styles.userTypeBadge}>
                <Text style={styles.userTypeBadgeText}>
                  {getUserTypeDisplay()}
                </Text>
              </View>
            )}
            
            <Text style={styles.subtitle}>
              No worries! We'll send you reset instructions to your email.
            </Text>
          </View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            <Text style={styles.label}>Email Address</Text>
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
          </View>

          {/* Send Reset Link Button */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              !isFormComplete && styles.buttonDisabled,
              isLoading && styles.buttonLoading,
            ]}
            onPress={handleResetPassword}
            disabled={!isFormComplete || isLoading}
            activeOpacity={0.7}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="send-outline" size={18} color="#FFFFFF" style={styles.buttonIcon} />
                <Text style={styles.primaryButtonText}>Send Reset Link</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Back to Sign In */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleBackToSignIn}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <Ionicons name="log-in-outline" size={18} color="#6366f1" style={styles.buttonIcon} />
            <Text style={styles.secondaryButtonText}>Back to Sign In</Text>
          </TouchableOpacity>

          {/* Create Account Link */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>
              Don't have an account?{' '}
              <Text 
                style={styles.footerLink}
                onPress={() => {
                  dispatch(resetForm());
                  navigation.navigate('SignUp');
                }}
              >
                Sign Up
              </Text>
            </Text>
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
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  userTypeBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  userTypeBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803d',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  formContainer: {
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 12,
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
  primaryButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    marginBottom: 16,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    marginBottom: 24,
    gap: 8,
  },
  secondaryButtonText: {
    color: '#6366f1',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 0,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonLoading: {
    backgroundColor: '#6366f1',
    opacity: 0.8,
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
  footerContainer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  footerLink: {
    color: '#6366f1',
    fontWeight: '600',
  },
});