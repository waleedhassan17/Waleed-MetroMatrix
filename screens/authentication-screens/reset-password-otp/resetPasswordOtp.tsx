import React, { useEffect, useRef, useState } from 'react';
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
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  setEmail,
  setUserType,
  setOtpDigit,
  setFullOtp,
  clearOtp,
  decrementResendTimer,
  clearError,
  resetForm,
  verifyOtpAsync,
  resendOtpAsync,
  selectEmail,
  selectUserType,
  selectOtp,
  selectOtpString,
  selectResetToken,
  selectResendTimer,
  selectAttemptsRemaining,
  selectError,
  selectStatus,
  selectIsLoading,
  selectIsResending,
  selectCanResend,
  selectIsOtpComplete,
  selectCanSubmit,
} from './resetPasswordOtpSlice';

type UserType = 'user' | 'provider';

interface RouteParams {
  email: string;
  userType?: UserType;
}

export default function ResetPasswordOTPScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as RouteParams;
  const dispatch = useAppDispatch();

  // Refs for OTP inputs
  const inputRefs = useRef<(TextInput | null)[]>([]);
  
  // Selectors
  const email = useAppSelector(selectEmail);
  const userType = useAppSelector(selectUserType);
  const otp = useAppSelector(selectOtp);
  const otpString = useAppSelector(selectOtpString);
  const resetToken = useAppSelector(selectResetToken);
  const resendTimer = useAppSelector(selectResendTimer);
  const attemptsRemaining = useAppSelector(selectAttemptsRemaining);
  const error = useAppSelector(selectError);
  const status = useAppSelector(selectStatus);
  const isLoading = useAppSelector(selectIsLoading);
  const isResending = useAppSelector(selectIsResending);
  const canResend = useAppSelector(selectCanResend);
  const isOtpComplete = useAppSelector(selectIsOtpComplete);
  const canSubmit = useAppSelector(selectCanSubmit);

  // Initialize from params
  useEffect(() => {
    if (params) {
      dispatch(setEmail(params.email));
      if (params.userType) {
        dispatch(setUserType(params.userType));
      }
    }

    return () => {
      dispatch(resetForm());
    };
  }, [params, dispatch]);

  // Resend timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        dispatch(decrementResendTimer());
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendTimer, dispatch]);

  // Handle errors
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [
        { text: 'OK', onPress: () => dispatch(clearError()) }
      ]);
    }
  }, [error, dispatch]);

  // Navigate to ResetPassword on success
  useEffect(() => {
    if (status === 'succeeded' && resetToken) {
      console.log('✅ OTP verified, navigating to ResetPassword');
      (navigation as any).navigate('ResetPassword', {
        email: email,
        resetToken: resetToken,
        userType: userType,
      });
    }
  }, [status, resetToken, email, userType, navigation]);

  // Handle OTP input
  const handleOtpChange = (text: string, index: number) => {
    // Handle paste
    if (text.length > 1) {
      const cleanedText = text.replace(/\D/g, '');
      if (cleanedText.length >= 6) {
        dispatch(setFullOtp(cleanedText));
        inputRefs.current[5]?.focus();
        Keyboard.dismiss();
        return;
      }
    }

    // Single digit input
    const digit = text.replace(/\D/g, '').slice(-1);
    dispatch(setOtpDigit({ index, value: digit }));

    // Auto-focus next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace
  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Verify OTP
  const handleVerifyOtp = () => {
    if (!canSubmit) return;

    console.log('📤 Verifying OTP...');
    dispatch(verifyOtpAsync({
      email: email,
      otp: otpString,
      userType: userType,
    }));
  };

  // Resend OTP
  const handleResendOtp = () => {
    if (!canResend) return;

    console.log('📤 Resending OTP...');
    dispatch(resendOtpAsync({
      email: email,
      userType: userType,
    }));
  };

  // Back to forgot password
  const handleBack = () => {
    dispatch(resetForm());
    navigation.goBack();
  };

  // Back to sign in
  const handleBackToSignIn = () => {
    dispatch(resetForm());
    if (userType === 'provider') {
      (navigation as any).navigate('ProviderSignIn');
    } else {
      (navigation as any).navigate('SignIn');
    }
  };

  // Format timer display
  const formatTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  const showLoadingState = isLoading || isResending;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={Platform.OS === 'android' ? '#FFFFFF' : 'transparent'}
        translucent={Platform.OS !== 'android'}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            disabled={showLoadingState}
          >
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Enter Verification Code</Text>
            <Text style={styles.subtitle}>
              We've sent a 6-digit code to your email address
            </Text>
          </View>

          {/* Email Display */}
          <View style={styles.emailContainer}>
            <Text style={styles.emailText}>{email}</Text>
          </View>

          {/* OTP Input */}
          <View style={styles.otpContainer}>
            <View style={styles.otpInputsRow}>
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { inputRefs.current[index] = ref; }}
                  style={[
                    styles.otpInput,
                    otp[index] ? styles.otpInputFilled : null,
                    showLoadingState ? styles.otpInputDisabled : null,
                  ]}
                  value={otp[index]}
                  onChangeText={(text) => handleOtpChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={6} // Allow paste
                  editable={!showLoadingState}
                  selectTextOnFocus
                  caretHidden
                />
              ))}
            </View>

            {/* Attempts remaining */}
            {attemptsRemaining < 5 && (
              <View style={styles.attemptsContainer}>
                <Ionicons 
                  name={attemptsRemaining > 2 ? "alert-circle-outline" : "warning-outline"} 
                  size={16} 
                  color={attemptsRemaining > 2 ? "#F59E0B" : "#EF4444"} 
                />
                <Text style={[
                  styles.attemptsText,
                  attemptsRemaining <= 2 && styles.attemptsTextDanger
                ]}>
                  {attemptsRemaining} attempts remaining
                </Text>
              </View>
            )}
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {/* Verify Button */}
            <TouchableOpacity
              style={[
                styles.primaryButton,
                !canSubmit && styles.buttonDisabled,
              ]}
              onPress={handleVerifyOtp}
              disabled={!canSubmit || showLoadingState}
              activeOpacity={0.7}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                  <Text style={styles.primaryButtonText}>Verify Code</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Resend Button */}
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                !canResend && styles.buttonDisabled,
              ]}
              onPress={handleResendOtp}
              disabled={!canResend || showLoadingState}
              activeOpacity={0.7}
            >
              {isResending ? (
                <ActivityIndicator color="#6366f1" size="small" />
              ) : (
                <>
                  <Ionicons name="refresh-outline" size={20} color="#6366f1" style={styles.buttonIcon} />
                  <Text style={styles.secondaryButtonText}>
                    {resendTimer > 0 
                      ? `Resend Code (${formatTimer(resendTimer)})` 
                      : 'Resend Code'
                    }
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Back to Sign In */}
          <TouchableOpacity
            style={styles.footerContainer}
            onPress={handleBackToSignIn}
            disabled={showLoadingState}
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
    paddingHorizontal: 16,
  },
  emailContainer: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
  },
  emailText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  otpContainer: {
    marginBottom: 32,
  },
  otpInputsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    color: '#1A1A1A',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  otpInputFilled: {
    borderColor: '#6366f1',
    backgroundColor: '#F5F3FF',
  },
  otpInputDisabled: {
    opacity: 0.5,
  },
  attemptsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 6,
  },
  attemptsText: {
    fontSize: 13,
    color: '#F59E0B',
    fontWeight: '500',
  },
  attemptsTextDanger: {
    color: '#EF4444',
  },
  buttonContainer: {
    marginBottom: 32,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#6366f1',
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#6366f1',
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
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
