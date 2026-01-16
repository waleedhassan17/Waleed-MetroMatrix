import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
  Platform,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  setEmail,
  setToken,
  setUserType,
  setPassword,
  setConfirmPassword,
  togglePasswordVisibility,
  toggleConfirmPasswordVisibility,
  clearError,
  resetForm,
  submitResetPasswordAsync,
  selectEmail,
  selectToken,
  selectPassword,
  selectConfirmPassword,
  selectShowPassword,
  selectShowConfirmPassword,
  selectIsLoading,
  selectError,
  selectPasswordsMatch,
  selectIsPasswordValid,
  selectCanSubmit,
  selectStatus,
} from './resetPasswordSlice';

type UserType = 'user' | 'provider';

interface RouteParams {
  email?: string;
  token?: string;
  resetToken?: string;
  verificationToken?: string;
  userType?: UserType;
}

type RootStackParamList = {
  SignIn: undefined;
  ProviderSignIn: undefined;
};

export default function ResetPasswordScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as RouteParams;
  const dispatch = useAppDispatch();

  const email = useAppSelector(selectEmail);
  const token = useAppSelector(selectToken);
  const password = useAppSelector(selectPassword);
  const confirmPassword = useAppSelector(selectConfirmPassword);
  const showPassword = useAppSelector(selectShowPassword);
  const showConfirmPassword = useAppSelector(selectShowConfirmPassword);
  const isLoading = useAppSelector(selectIsLoading);
  const error = useAppSelector(selectError);
  const passwordsMatch = useAppSelector(selectPasswordsMatch);
  const isPasswordValid = useAppSelector(selectIsPasswordValid);
  const canSubmit = useAppSelector(selectCanSubmit);
  const status = useAppSelector(selectStatus);

  const userType = params?.userType || 'user';

  // Initialize from route params
  useEffect(() => {
    if (params) {
      // Set email if provided
      if (params.email) {
        dispatch(setEmail(params.email));
      }
      
      // Set token - support multiple param names for flexibility
      const resetToken = params.token || params.resetToken || params.verificationToken;
      if (resetToken) {
        dispatch(setToken(resetToken));
        console.log('🔑 Reset token set from params:', resetToken.substring(0, 20) + '...');
      }
      
      // Set user type
      if (params.userType) {
        dispatch(setUserType(params.userType));
      }
    }
  }, [params, dispatch]);

  // Handle errors
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [
        { text: 'OK', onPress: () => dispatch(clearError()) }
      ]);
    }
  }, [error, dispatch]);

  // Handle success
  useEffect(() => {
    if (status === 'succeeded') {
      Alert.alert(
        'Success',
        'Your password has been reset successfully!',
        [
          {
            text: 'Sign In',
            onPress: () => {
              dispatch(resetForm());
              if (userType === 'provider') {
                (navigation as any).reset({
                  index: 0,
                  routes: [{ name: 'ProviderSignIn' }],
                });
              } else {
                (navigation as any).reset({
                  index: 0,
                  routes: [{ name: 'SignIn' }],
                });
              }
            }
          }
        ]
      );
    }
  }, [status, userType, navigation, dispatch]);

  const validateForm = (): boolean => {
    if (!token) {
      Alert.alert('Error', 'Reset token is missing. Please try again from the email link.');
      return false;
    }

    if (!password.trim()) {
      Alert.alert('Validation Error', 'Please enter a new password');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters');
      return false;
    }

    if (!confirmPassword.trim()) {
      Alert.alert('Validation Error', 'Please confirm your password');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('Validation Error', 'Passwords do not match');
      return false;
    }

    return true;
  };

  const handleResetPassword = async () => {
    if (!validateForm()) return;

    console.log('📤 Submitting password reset...');
    console.log('🔑 Token:', token.substring(0, 20) + '...');

    // Use the new API format: { token, password }
    dispatch(submitResetPasswordAsync({
      token: token,
      password: password,
    }));
  };

  const handleBackToSignIn = () => {
    dispatch(resetForm());
    if (userType === 'provider') {
      (navigation as any).navigate('ProviderSignIn');
    } else {
      (navigation as any).navigate('SignIn');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={Platform.OS === 'android' ? '#FFFFFF' : 'transparent'}
        translucent={Platform.OS !== 'android'}
      />

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackToSignIn}
            disabled={isLoading}
          >
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.headerContainer}>
            <View style={styles.iconContainer}>
              <Ionicons name="lock-closed-outline" size={80} color="#6366f1" />
            </View>
            <Text style={styles.title}>Set New Password</Text>
            <Text style={styles.subtitle}>
              Create a strong password for your account
            </Text>
          </View>

          {/* Email Display */}
          {email ? (
            <View style={styles.emailContainer}>
              <Text style={styles.emailLabel}>Resetting password for:</Text>
              <Text style={styles.emailText}>{email}</Text>
            </View>
          ) : null}

          {/* Token Status Indicator - Only show if token is missing (edge case) */}
          {!token && (
            <View style={styles.tokenStatusContainer}>
              <Ionicons 
                name="alert-circle" 
                size={16} 
                color="#F44336" 
              />
              <Text style={[styles.tokenStatusText, styles.tokenInvalid]}>
                Reset token missing - please go back and verify again
              </Text>
            </View>
          )}

          {/* Form Fields */}
          <View style={styles.formContainer}>
            {/* New Password */}
            <Text style={styles.label}>New Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={(text) => dispatch(setPassword(text))}
                placeholder="Enter new password"
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

            {/* Password Requirements */}
            <View style={styles.requirementsContainer}>
              <View style={styles.requirementItem}>
                <Ionicons 
                  name={isPasswordValid ? "checkmark-circle" : "ellipse-outline"} 
                  size={16} 
                  color={isPasswordValid ? "#4CAF50" : "#CCCCCC"} 
                />
                <Text style={[
                  styles.requirementText,
                  isPasswordValid && styles.requirementMet
                ]}>
                  At least 6 characters
                </Text>
              </View>
            </View>

            {/* Confirm Password */}
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={(text) => dispatch(setConfirmPassword(text))}
                placeholder="Confirm new password"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={() => dispatch(toggleConfirmPasswordVisibility())}
                style={styles.eyeIcon}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} 
                  size={20} 
                  color="#64748b" 
                />
              </TouchableOpacity>
            </View>

            {/* Password Match Indicator */}
            {confirmPassword.length > 0 && (
              <View style={styles.matchContainer}>
                <Ionicons 
                  name={passwordsMatch ? "checkmark-circle" : "close-circle"} 
                  size={16} 
                  color={passwordsMatch ? "#4CAF50" : "#F44336"} 
                />
                <Text style={[
                  styles.matchText,
                  passwordsMatch ? styles.matchSuccess : styles.matchError
                ]}>
                  {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                </Text>
              </View>
            )}
          </View>

          {/* Reset Password Button */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (!canSubmit || !token) && styles.buttonDisabled,
              isLoading && styles.buttonLoading,
            ]}
            onPress={handleResetPassword}
            disabled={!canSubmit || !token || isLoading}
            activeOpacity={0.7}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-done-outline" size={18} color="#FFFFFF" style={styles.buttonIcon} />
                <Text style={styles.primaryButtonText}>Reset Password</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Back to Sign In */}
          <TouchableOpacity
            style={styles.footerContainer}
            onPress={handleBackToSignIn}
            disabled={isLoading}
          >
            <Text style={styles.footerText}>
              <Ionicons name="arrow-back-outline" size={16} color="#6366f1" /> Back to Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    paddingTop: 20,
    paddingBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
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
  subtitle: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
  },
  emailContainer: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
  },
  emailLabel: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 4,
  },
  emailText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  tokenInputContainer: {
    marginBottom: 16,
  },
  tokenInputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  tokenHintText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
    fontStyle: 'italic',
  },
  tokenStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 24,
  },
  tokenStatusText: {
    fontSize: 13,
    marginLeft: 8,
    fontWeight: '500',
  },
  tokenValid: {
    color: '#4CAF50',
  },
  tokenInvalid: {
    color: '#F44336',
  },
  formContainer: {
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 12,
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
  requirementsContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 13,
    color: '#666666',
    marginLeft: 8,
  },
  requirementMet: {
    color: '#4CAF50',
  },
  matchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  matchText: {
    fontSize: 13,
    marginLeft: 8,
    fontWeight: '500',
  },
  matchSuccess: {
    color: '#4CAF50',
  },
  matchError: {
    color: '#F44336',
  },
  primaryButton: {
    backgroundColor: '#6366f1',
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
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
  footerContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  footerText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
});