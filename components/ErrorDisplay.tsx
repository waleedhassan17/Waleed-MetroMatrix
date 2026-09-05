import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { darkShift, type DarkShift } from '../constants/darkShift';
import { useTheme } from '../theme';
import { Ionicons } from '@expo/vector-icons';

interface ErrorDisplayProps {
  message: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message }) => {
  const { mode } = useTheme();
  const sh = useMemo(() => darkShift(mode), [mode]);
  const styles = useMemo(() => makeStyles(sh), [sh]);
  if (!message) return null;

  return (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle" size={20} color="#D32F2F" />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
};

const makeStyles = (sh: DarkShift) => StyleSheet.create({
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: sh.hue('#FFEBEE'),
    borderLeftWidth: 4,
    borderLeftColor: sh.hue('#D32F2F'),
    padding: 12,
    marginBottom: 20,
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: sh.hue('#D32F2F'),
    fontSize: 14,
  },
});

export default ErrorDisplay;
