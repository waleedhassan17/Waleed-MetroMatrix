import React, { useMemo } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppBar, Screen } from '../../../components/ui';
import { GUTTER, S, T, useTheme, type ThemeColors } from '../../../theme';

/**
 * The frame every admin auth screen shares: app bar, a title and one line of
 * explanation, then the form — scrollable and clear of the keyboard.
 */
export interface AdminAuthLayoutProps {
  barTitle: string;
  title: string;
  subtitle?: string;
  /** Hide the back arrow (a restricted session has nowhere to go back to). */
  hideBack?: boolean;
  onBack?: () => void;
  children: React.ReactNode;
}

const AdminAuthLayout: React.FC<AdminAuthLayoutProps> = ({ barTitle, title, subtitle, hideBack, onBack, children }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Screen edges={['bottom']}>
      <AppBar title={barTitle} hideBack={hideBack} onBack={onBack} tone="surface" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
            {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    content: { paddingHorizontal: GUTTER, paddingTop: S.xxl, paddingBottom: S.huge },
    header: { marginBottom: S.xxl },
    title: { ...T.title, color: c.ink },
    subtitle: { ...T.body, color: c.inkMuted, marginTop: S.sm },
  });

export default AdminAuthLayout;
