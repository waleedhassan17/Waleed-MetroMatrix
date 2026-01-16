import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { retrieveData, KeyForStorage } from '../../../utils/storage_utils/storageUtils';
import {
  setEmail,
  setVerificationType,
  setUserType,
  decrementResendTimer,
  clearError,
  resetForm,
  resendVerificationEmailAsync,
  verifyEmailAsync,
  checkVerificationStatusAsync,
  selectEmail,
  selectVerificationType,
  selectResendTimer,
  selectIsLoading,
  selectError,
  selectIsVerified,
  selectCanResend,
  selectAccessToken,
  selectUserType,
  selectAutoLoginInProgress,
  selectAutoLoginError,
  selectProviderVerifiedNoLogin,
} from './emailVerificationSlice';

type UserType = 'user' | 'provider';
type VerificationType = 'email_verification';

interface RouteParams {
  email: string;
  verificationType: VerificationType;
  userType?: UserType;
  verificationToken?: string; // Token from email link (deep link)
  token?: string; // Token from deep link path parameter
}

// ✅ Type for the extended verification result
interface ExtendedVerificationResult {
  success: boolean;
  message?: string;
  emailVerified: boolean;
  accessToken?: string;
  refreshToken?: string;
  user?: any;
  provider?: any;
  autoLoginUsed?: boolean;
  autoLoginFailed?: boolean;
  autoLoginError?: string;
  noCredentialsForAutoLogin?: boolean;
}

export default function EmailVerificationScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as RouteParams;
  const dispatch = useAppDispatch();

  const email = useAppSelector(selectEmail);
  const verificationType = useAppSelector(selectVerificationType);
  const resendTimer = useAppSelector(selectResendTimer);
  const isLoading = useAppSelector(selectIsLoading);
  const error = useAppSelector(selectError);
  const isVerified = useAppSelector(selectIsVerified);
  const canResend = useAppSelector(selectCanResend);
  const accessToken = useAppSelector(selectAccessToken);
  const userType = useAppSelector(selectUserType);
  const autoLoginInProgress = useAppSelector(selectAutoLoginInProgress);
  const autoLoginError = useAppSelector(selectAutoLoginError);
  const providerVerifiedNoLogin = useAppSelector(selectProviderVerifiedNoLogin);

  // Track if we've already navigated to prevent double navigation
  const [hasNavigated, setHasNavigated] = useState(false);

  // Initialize params on mount
  useEffect(() => {
    const initializeScreen = async () => {
      if (params) {
        // Handle deep link token (from URL path parameter)
        const deepLinkToken = params.token || params.verificationToken;
        
        if (deepLinkToken) {
          console.log('🔗 Deep link detected with token, auto-verifying...');
          // For deep links, we need to extract email and userType from the token or storage
          // The email might not be in params when coming from deep link
          handleAutoVerification(deepLinkToken);
        } else {
          // Normal flow (from signup)
          dispatch(setEmail(params.email));
          dispatch(setVerificationType(params.verificationType));
          
          if (params.userType) {
            dispatch(setUserType(params.userType));
            console.log('👤 UserType set from params:', params.userType);
          } else {
            // Try to get userType from storage if not in params
            const storedUserType = await retrieveData('tempUserType');
            if (storedUserType) {
              dispatch(setUserType(storedUserType as UserType));
              console.log('👤 UserType set from storage:', storedUserType);
            }
          }
        }
      }
    };
    
    initializeScreen();
  }, [params, dispatch]);

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => {
        dispatch(decrementResendTimer());
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer, dispatch]);

  // Show error alerts
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [
        { text: 'OK', onPress: () => dispatch(clearError()) }
      ]);
    }
  }, [error, dispatch]);

  // ✅ Navigate when verified
  useEffect(() => {
    if (isVerified && !hasNavigated && !autoLoginInProgress) {
      console.log('✅ useEffect triggered: Email verified');
      console.log('📊 State:', { isVerified, accessToken: !!accessToken });
      
      setHasNavigated(true);
      
      // ✅ Email verification after signup - requires token/auto-login
      if (accessToken) {
        // Token available, navigate to profile completion
        console.log('📍 Email verification complete with token - navigating to profile');
        handleVerificationSuccess();
      } else {
        // No token yet, auto-login might be in progress or failed
        console.log('⏳ Waiting for token or auto-login result...');
      }
    }
  }, [isVerified, accessToken, hasNavigated, autoLoginInProgress]);

  // ✅ Handle auto-login error - prompt manual login
  useEffect(() => {
    if (isVerified && autoLoginError && !accessToken && !hasNavigated) {
      console.log('⚠️ Verified but auto-login failed:', autoLoginError);
      
      Alert.alert(
        'Email Verified',
        'Your email has been verified! However, automatic login failed. Please sign in manually.',
        [
          {
            text: 'Sign In',
            onPress: () => {
              setHasNavigated(true);
              dispatch(resetForm());
              const isProvider = userType === 'provider' || params.userType === 'provider';
              (navigation as any).navigate(isProvider ? 'ProviderSignIn' : 'SignIn');
            }
          }
        ],
        { cancelable: false }
      );
    }
  }, [isVerified, autoLoginError, accessToken, hasNavigated]);

  // ✅ Handle provider verification - skip auto-login, go directly to PersonalInfo
  useEffect(() => {
    if (isVerified && providerVerifiedNoLogin && !hasNavigated) {
      console.log('✅ Provider verified - navigating directly to PersonalInfo');
      
      setHasNavigated(true);
      
      Alert.alert(
        'Email Verified! 🎉',
        'Your email has been verified successfully. Please complete your profile to submit for admin approval.',
        [
          {
            text: 'Continue',
            onPress: () => {
              dispatch(resetForm());
              (navigation as any).reset({
                index: 0,
                routes: [{ name: 'PersonalInfo' }],
              });
            }
          }
        ],
        { cancelable: false }
      );
    }
  }, [isVerified, providerVerifiedNoLogin, hasNavigated]);

  // ✅ AUTO-VERIFY: When token is passed from deep link
  const handleAutoVerification = async (token: string) => {
    console.log('🔗 Auto-verifying email with token from link');
    
    try {
      // For deep links, get email and userType from storage (saved during signup)
      let emailForVerification = params?.email || email;
      let userTypeForVerification = params?.userType || userType;
      
      if (!emailForVerification) {
        const storedEmail = await retrieveData('tempEmail');
        if (storedEmail) {
          emailForVerification = storedEmail;
          dispatch(setEmail(storedEmail));
          console.log('📧 Retrieved email from storage:', storedEmail);
        }
      }
      
      if (!userTypeForVerification) {
        const storedUserType = await retrieveData('tempUserType');
        if (storedUserType) {
          userTypeForVerification = storedUserType as UserType;
          dispatch(setUserType(storedUserType as UserType));
          console.log('👤 Retrieved userType from storage:', storedUserType);
        }
      }
      
      const result = await dispatch(verifyEmailAsync({
        token,
        userType: userTypeForVerification || 'user',
      })).unwrap();
      
      console.log('✅ Email verified automatically');
      console.log('📊 Verification result:', JSON.stringify(result, null, 2));
      
      // Navigation will be handled by useEffect watching isVerified && accessToken
    } catch (error: any) {
      console.error('❌ Auto-verification failed:', error);
      Alert.alert('Verification Error', error.message || 'Failed to verify email. Please try again.');
    }
  };

  const handleVerificationSuccess = () => {
    const isProvider = userType === 'provider' || params.userType === 'provider';
    
    console.log('✅ Email verified successfully');
    console.log('✅ User is authenticated with token');
    console.log('👤 User type:', isProvider ? 'provider' : 'user');
    
    // Navigate function with token persistence delay
    const navigateToNextScreen = () => {
      // Add small delay to ensure AsyncStorage writes complete
      setTimeout(() => {
        if (isProvider) {
          console.log('📍 Navigating to PersonalInfo screen');
          (navigation as any).reset({
            index: 0,
            routes: [{ name: 'PersonalInfo' }],
          });
        } else {
          console.log('📍 Navigating to CompleteProfile screen');
          (navigation as any).reset({
            index: 0,
            routes: [{ name: 'CompleteProfile' }],
          });
        }
      }, 500);
    };

    // Show success alert with auto-navigation
    Alert.alert(
      'Email Verified! 🎉',
      `Your email has been verified successfully. ${isProvider ? 'Please complete your profile to continue.' : 'Welcome to MetroMatrix!'}`,
      [
        {
          text: 'Continue',
          onPress: navigateToNextScreen
        }
      ],
      { cancelable: false }
    );
  };

  const handleResendEmail = async () => {
    if (!canResend) return;
    
    // Use userType from Redux state first, then params, then default to 'user'
    const currentUserType = userType || params?.userType || 'user';
    console.log('📤 Resending email, userType:', currentUserType);
    console.log('📤 Email:', email);

    await dispatch(resendVerificationEmailAsync({ 
      email: email,
      verificationType: verificationType,
      userType: currentUserType,
    }));
  };

  // ✅ FIXED: Check with backend and handle auto-login
  const handleCheckVerification = async () => {
    if (!email) {
      Alert.alert('Error', 'Email not found');
      return;
    }

    const currentUserType = userType || params.userType || 'user';
    console.log('🔍 Checking email verification status with backend...');
    console.log('📊 Email:', email);
    console.log('📊 User Type:', currentUserType);
    console.log('📊 Current state:', { isVerified, hasAccessToken: !!accessToken });
    
    try {
      // ⚠️ NOTE: This calls POST /auth/check-verification-status
      // For providers, if that fails, it will fallback to GET /provider/approval-status
      const result = await dispatch(checkVerificationStatusAsync({
        email: email,
        userType: currentUserType,
      })).unwrap() as ExtendedVerificationResult;
      
      console.log('📊 Backend response:', result);
      
      if (result.emailVerified) {
        // ✅ Email is verified!
        console.log('✅ Email verified - backend confirmed');
        
        if (result.accessToken) {
          // Tokens received (either from backend or auto-login)
          // Navigation will be handled by useEffect
          console.log('✅ Tokens received - navigation will trigger automatically');
          
          if (result.autoLoginUsed) {
            console.log('✅ Authentication completed via auto-login');
          }
        } else if (result.autoLoginFailed) {
          // Auto-login was attempted but failed
          console.log('⚠️ Auto-login failed - user needs to login manually');
          // The useEffect watching autoLoginError will handle this
        } else if (result.noCredentialsForAutoLogin) {
          // No temp credentials available
          console.log('⚠️ No credentials for auto-login - prompting manual login');
          
          Alert.alert(
            'Email Verified! 🎉',
            'Your email has been verified. Please sign in to continue.',
            [
              {
                text: 'Sign In',
                onPress: () => {
                  setHasNavigated(true);
                  dispatch(resetForm());
                  const isProvider = userType === 'provider' || params.userType === 'provider';
                  (navigation as any).navigate(isProvider ? 'ProviderSignIn' : 'SignIn');
                }
              }
            ],
            { cancelable: false }
          );
        }
      } else {
        // ❌ Email not verified yet
        console.log('⏳ Email not verified yet');
        console.log('📊 Result data:', JSON.stringify(result, null, 2));
        
        Alert.alert(
          'Email Not Verified Yet',
          `Please check your email at ${email} and click the verification link. Then come back here and tap "I Verified My Email" again.`,
          [
            { 
              text: 'Resend Email',
              onPress: handleResendEmail,
              style: 'default'
            },
            { text: 'OK', style: 'cancel' }
          ]
        );
      }
    } catch (error: any) {
      console.error('❌ Verification check error:', error);
      console.error('❌ Error message:', error.message);
      
      // Handle specific error cases
      if (error.message && error.message.includes('sign up first')) {
        Alert.alert(
          'Registration Not Found',
          'Your registration could not be found in our system. This may happen if:\n\n• The signup process failed\n• You used a different email address\n• There was a network issue during signup\n\nPlease try signing up again with this email address.',
          [
            {
              text: 'Sign Up Again',
              onPress: () => {
                dispatch(resetForm());
                const isProvider = userType === 'provider' || params.userType === 'provider';
                (navigation as any).reset({
                  index: 0,
                  routes: [{ name: isProvider ? 'ProviderSignUp' : 'SignUp' }],
                });
              },
              style: 'default'
            },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      } else if (error.message && error.message.includes('not found')) {
        // Generic "not found" error - account doesn't exist
        Alert.alert(
          'Account Not Found',
          `No account found for ${email}.\n\nYour registration may not have completed successfully. Please try signing up again.`,
          [
            {
              text: 'Sign Up Again',
              onPress: () => {
                dispatch(resetForm());
                const isProvider = userType === 'provider' || params.userType === 'provider';
                (navigation as any).reset({
                  index: 0,
                  routes: [{ name: isProvider ? 'ProviderSignUp' : 'SignUp' }],
                });
              },
              style: 'default'
            },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      } else if (error.message && error.message.includes('verification link')) {
        Alert.alert(
          'Verification Not Complete',
          'Please click the verification link in your email first. After clicking the link, you can close the browser and come back here.\n\nIf you did not receive the email, click "Resend Email" below.',
          [
            {
              text: 'Resend Email',
              onPress: handleResendEmail,
              style: 'default'
            },
            { text: 'OK', style: 'cancel' }
          ]
        );
      } else {
        Alert.alert(
          'Verification Check Failed', 
          error.message || 'Could not check verification status. Please try again or resend the verification email.',
          [
            {
              text: 'Resend Email',
              onPress: handleResendEmail,
              style: 'default'
            },
            { text: 'OK', style: 'cancel' }
          ]
        );
      }
    }
  };

  const handleBackToSignIn = () => {
    dispatch(resetForm());
    
    const isProvider = params.userType === 'provider';
    (navigation as any).navigate(
      isProvider ? 'ProviderSignIn' : 'SignIn'
    );
  };

  const getTitle = () => {
    return 'Verify Your Email';
  };

  const getSubtitle = () => {
    return `We've sent a verification link to ${email}. Please click the link in your email to verify and continue.`;
  };

  const showLoadingState = isLoading || autoLoginInProgress;

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
      >
        <View style={styles.content}>
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackToSignIn}
            disabled={showLoadingState}
          >
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.headerContainer}>
            <View style={styles.iconContainer}>
              <Ionicons 
                name={isVerified ? "checkmark-circle" : "mail-outline"} 
                size={80} 
                color={isVerified ? '#4CAF50' : '#6366f1'} 
              />
            </View>
            <Text style={styles.title}>{getTitle()}</Text>
            <Text style={styles.subtitle}>{getSubtitle()}</Text>
          </View>

          {/* Email Display */}
          <View style={styles.emailContainer}>
            <Text style={styles.emailLabel}>Email sent to:</Text>
            <Text style={styles.emailText}>{email}</Text>
          </View>

          {/* Auto-login indicator */}
          {autoLoginInProgress && (
            <View style={styles.autoLoginContainer}>
              <ActivityIndicator color="#6366f1" size="small" />
              <Text style={styles.autoLoginText}>Signing you in automatically...</Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {/* Check Verification Button */}
            <TouchableOpacity
              style={[
                styles.primaryButton,
                isVerified && styles.verifiedButton,
              ]}
              onPress={handleCheckVerification}
              disabled={isVerified || showLoadingState}
              activeOpacity={0.7}
            >
              {showLoadingState ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : isVerified ? (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                  <Text style={styles.primaryButtonText}>Email Verified ✓</Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                  <Text style={styles.primaryButtonText}>I Verified My Email</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Resend Email Button */}
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                (!canResend || isVerified) && styles.buttonDisabled,
              ]}
              onPress={handleResendEmail}
              disabled={!canResend || showLoadingState || isVerified}
              activeOpacity={0.7}
            >
              {isLoading ? (
                <ActivityIndicator color="#6366f1" size="small" />
              ) : (
                <>
                  <Ionicons name="refresh-outline" size={20} color="#6366f1" style={styles.buttonIcon} />
                  <Text style={styles.secondaryButtonText}>
                    {resendTimer > 0 
                      ? `Resend Email (${resendTimer}s)` 
                      : 'Resend Email'
                    }
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>How to verify:</Text>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>1.</Text>
              <Text style={styles.instructionText}>Check your email inbox (and spam folder)</Text>
            </View>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>2.</Text>
              <Text style={styles.instructionText}>Click the verification link in the email</Text>
            </View>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>3.</Text>
              <Text style={styles.instructionText}>
                Come back here and tap "I Verified My Email"
              </Text>
            </View>
            
            <View style={styles.divider} />
            
            <Text style={styles.instructionsTitle}>Didn't receive the email?</Text>
            <View style={styles.instructionItem}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#6366f1" />
              <Text style={styles.instructionText}>Check your spam/junk folder</Text>
            </View>
            <View style={styles.instructionItem}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#6366f1" />
              <Text style={styles.instructionText}>Verify the email address is correct</Text>
            </View>
            <View style={styles.instructionItem}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#6366f1" />
              <Text style={styles.instructionText}>Wait a few minutes and click "Resend Email"</Text>
            </View>
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
  autoLoginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  autoLoginText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
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
  verifiedButton: {
    backgroundColor: '#4CAF50',
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
  instructionsContainer: {
    backgroundColor: '#F9FAFB',
    padding: 20,
    borderRadius: 12,
    marginBottom: 32,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  instructionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
    width: 24,
  },
  instructionText: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 8,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
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