import React from 'react';
import { View, StatusBar, StyleSheet, StyleProp, ViewStyle, Platform } from 'react-native';
import { HC } from '../../../constants/HealthcareTheme';

interface HCScreenProps {
  children: React.ReactNode;
  background?: string;
  barStyle?: 'light-content' | 'dark-content';
  style?: StyleProp<ViewStyle>;
}

/** Screen canvas with a consistent background + status bar config. */
const HCScreen: React.FC<HCScreenProps> = ({
  children,
  background = HC.pageBg,
  barStyle = 'dark-content',
  style,
}) => {
  return (
    <View style={[styles.root, { backgroundColor: background }, style]}>
      <StatusBar
        barStyle={barStyle}
        backgroundColor="transparent"
        translucent
      />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
});

export const STATUS_BAR_PAD = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

export default HCScreen;
