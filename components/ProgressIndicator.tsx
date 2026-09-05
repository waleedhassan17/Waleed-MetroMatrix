import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { darkShift, type DarkShift } from '../constants/darkShift';
import { useTheme } from '../theme';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
}) => {
  const { mode } = useTheme();
  const sh = useMemo(() => darkShift(mode), [mode]);
  const styles = useMemo(() => makeStyles(sh), [sh]);
  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressBarContainer}>
        <View
          style={[styles.progressBar, { width: `${progressPercentage}%` }]}
        />
      </View>
      <View style={styles.progressDots}>
        {Array.from({ length: totalSteps }, (_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index < currentStep && styles.dotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const makeStyles = (sh: DarkShift) => StyleSheet.create({
  progressContainer: {
    marginBottom: 32,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: sh.hue('#E0E0E0'),
    borderRadius: 2,
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    backgroundColor: sh.hue('#10B981'),
    borderRadius: 2,
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: sh.hue('#E0E0E0'),
  },
  dotActive: {
    backgroundColor: sh.hue('#10B981'),
  },
});

export default ProgressIndicator;
