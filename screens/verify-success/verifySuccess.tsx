import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { saveData, KeyForStorage } from '../../utils/storage_utils/storageUtils';

interface RouteParams {
  verified?: string; // 'true' from deep link
  accessToken?: string;
  refreshToken?: string;
  userType?: 'user' | 'provider';
  userId?: string;
  email?: string;
  fullName?: string;
}

/**
 * VerifySuccess Screen
 * Handles deep link from backend after email verification
 * Backend redirects to: metromatrix://verify-success?verified=true&accessToken=xxx&refreshToken=xxx&userType=provider&userId=xxx&email=xxx&fullName=xxx
 */
export default function VerifySuccessScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as RouteParams;

  useEffect(() => {
    handleVerificationSuccess();
  }, []);

  const handleVerificationSuccess = async () => {
    try {
      console.log('🎉 Email verification success via deep link!');
      console.log('📊 Received params:', params);

      const { verified, accessToken, refreshToken, userType, userId, email, fullName } = params;

      if (!accessToken || !refreshToken) {
        console.error('❌ Missing tokens in deep link');
        // Fallback to email verification screen
        (navigation as any).navigate('EmailVerification');
        return;
      }

      // Save tokens to storage
      console.log('💾 Saving tokens from deep link...');
      await saveData(KeyForStorage.accessToken, accessToken);
      await saveData(KeyForStorage.refreshToken, refreshToken);

      if (userType) {
        await saveData(KeyForStorage.userType, userType);
      }

      // Save additional user data
      if (userId) {
        await saveData('userId', userId);
      }
      if (email) {
        await saveData('tempEmail', email);
      }
      if (fullName) {
        await saveData('fullName', fullName);
      }

      console.log('✅ Tokens and user data saved successfully');

      // Navigate based on user type
      if (userType === 'provider') {
        console.log('👤 Provider verified - navigating to PersonalInfo');
        (navigation as any).reset({
          index: 0,
          routes: [{ name: 'PersonalInfo' }],
        });
      } else {
        console.log('👤 User verified - navigating to CompleteProfile');
        (navigation as any).reset({
          index: 0,
          routes: [{ name: 'CompleteProfile' }],
        });
      }
    } catch (error) {
      console.error('❌ Error handling verification success:', error);
      (navigation as any).navigate('EmailVerification');
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#6366f1" />
      <Text style={styles.text}>Completing verification...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
});
