import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { darkShift, type DarkShift } from '../constants/darkShift';
import { useTheme } from '../theme';

interface NavigationButtonsProps {
  currentStep: number;
  totalSteps: number;
  isStepComplete: boolean;
  isLoading: boolean;
  hasProfilePhoto: boolean;
  onBack: () => void;
  onNext: () => void;
  onComplete: () => void;
  onSkip: () => void;
}

const NavigationButtons: React.FC<NavigationButtonsProps> = ({
  currentStep,
  totalSteps,
  isStepComplete,
  isLoading,
  hasProfilePhoto,
  onBack,
  onNext,
  onComplete,
  onSkip,
}) => {
  const { mode } = useTheme();
  const sh = useMemo(() => darkShift(mode), [mode]);
  const styles = useMemo(() => makeStyles(sh), [sh]);
  const isLastStep = currentStep === totalSteps;

  const handleContinue = () => {
    if (isLastStep) {
      if (hasProfilePhoto) {
        onComplete();
      } else {
        onSkip();
      }
    } else {
      onNext();
    }
  };

  const getContinueButtonText = () => {
    if (isLastStep) {
      return hasProfilePhoto ? 'Complete Registration' : 'Skip for now';
    }
    return 'Continue';
  };

  return (
    <View style={styles.buttonContainer}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBack}
        disabled={isLoading}
      >
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.continueButton,
          isStepComplete && !isLoading && styles.continueButtonActive,
        ]}
        onPress={handleContinue}
        disabled={!isStepComplete || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.continueButtonText}>
            {getContinueButtonText()}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const makeStyles = (sh: DarkShift) => StyleSheet.create({
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto',
  },
  backButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: sh.hue('#E0E0E0'),
  },
  backButtonText: {
    color: sh.hue('#1A1A1A'),
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
    flex: 1,
    backgroundColor: sh.hue('#E0E0E0'),
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonActive: {
    backgroundColor: sh.hue('#10B981'),
  },
  continueButtonText: {
    color: sh.n('#FFFFFF', 'inkInverse'),
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NavigationButtons;
