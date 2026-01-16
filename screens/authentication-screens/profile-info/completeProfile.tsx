import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector, useAppDispatch } from '../../../hooks/useReduxHooks';
import {
  selectCurrentStep,
  selectError,
  selectStatus,
  selectIsStepComplete,
  selectAllProfileData,
  setCurrentStep,
  clearError,
  submitCompleteProfileAsync,
} from './completeProfileSlice';
import ProfileHeader from '../../../components/Profileheader';
import ProgressIndicator from '../../../components/ProgressIndicator';
import ErrorDisplay from '../../../components/ErrorDisplay';
import Step1PersonalInfo from '../../../components/PersonalInfo';
import Step2LocationInfo from '../../../components/LocationInfo';
import Step3PhotoUpload from '../../../components/PhotoUpload';
import NavigationButtons from '../../../components/NavigationButtons';

const CompleteProfile = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  // Selectors accept the root state via the typed hooks
  const currentStep = useAppSelector(selectCurrentStep);
  const error = useAppSelector(selectError);
  const status = useAppSelector(selectStatus);
  const isStepComplete = useAppSelector(selectIsStepComplete);
  const profileData = useAppSelector(selectAllProfileData);

  const isLoading = status === 'loading';

  const handleBack = () => {
    if (currentStep > 1) {
      dispatch(setCurrentStep(currentStep - 1));
      dispatch(clearError());
    } else {
      navigation.goBack();
    }
  };

  const handleNext = () => {
    if (currentStep < 3) {
      dispatch(setCurrentStep(currentStep + 1));
      dispatch(clearError());
    }
  };

  const handleComplete = async () => {
    if (currentStep === 3) {
      try {
        const result = await dispatch(submitCompleteProfileAsync(profileData)).unwrap();

        Alert.alert('Success', 'Your profile has been completed!', [
          {
            text: 'Get Started',
            onPress: () => {
              // Navigate to UserHome after profile completion
              try {
                (navigation as any).reset({
                  index: 0,
                  routes: [{ name: 'UserHome' }],
                });
              } catch (navigationError) {
                (navigation as any).navigate('UserHome');
              }
            },
          },
        ]);
      } catch (err: any) {
        Alert.alert(
          'Error',
          err || 'Unable to complete profile. Please try again.'
        );
      }
    }
  };

  const handleSkipPhoto = () => {
    Alert.alert(
      'Skip Photo',
      'You can add a profile photo later from your profile settings.',
      [
        {
          text: 'Go Back',
          style: 'cancel',
        },
        {
          text: 'Skip',
          onPress: handleComplete,
        },
      ]
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <Step1PersonalInfo />;
      case 2:
        return <Step2LocationInfo />;
      case 3:
        return <Step3PhotoUpload />;
      default:
        return null;
    }
  };

  const getSubtitle = () => {
    switch (currentStep) {
      case 1:
        return 'Personal information';
      case 2:
        return 'Where are you Located?';
      case 3:
        return 'Add a profile photo';
      default:
        return '';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
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
            <ProfileHeader
              title="Complete Your Profile"
              subtitle={getSubtitle()}
            />

            {/* Progress */}
            <ProgressIndicator currentStep={currentStep} totalSteps={3} />

            {/* Error Display */}
            {error && <ErrorDisplay message={error} />}

            {/* Step Content */}
            <View style={styles.stepContainer}>
              {renderStepContent()}
            </View>

            {/* Navigation Buttons */}
            <NavigationButtons
              currentStep={currentStep}
              totalSteps={3}
              isStepComplete={isStepComplete}
              isLoading={isLoading}
              hasProfilePhoto={!!profileData.profilePhoto}
              onBack={handleBack}
              onNext={handleNext}
              onComplete={handleComplete}
              onSkip={handleSkipPhoto}
            />
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
    paddingTop: 40,
    paddingBottom: 40,
  },
  stepContainer: {
    flex: 1,
    marginBottom: 24,
  },
});

export default CompleteProfile;