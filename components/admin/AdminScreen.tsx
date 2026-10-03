import React, { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AppBar, Screen } from '../ui';
import { GUTTER, S, useTheme, type ThemeColors } from '../../theme';

/**
 * The frame of every admin console screen: surface app bar, safe areas, a
 * scrolling body with pull-to-refresh, and an optional pinned footer for the
 * screen's one primary action.
 *
 * Back goes back when there is somewhere to go; a tab root has no back arrow.
 */
export interface AdminScreenProps {
  title: string;
  subtitle?: string;
  /** Force-hide the back arrow (tab roots hide it automatically). */
  hideBack?: boolean;
  onBack?: () => void;
  /** Header action, e.g. an icon button. */
  right?: React.ReactNode;
  /** Set false when the body scrolls itself (a FlatList). */
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Pinned below the body: the screen's primary action. */
  footer?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

const AdminScreen: React.FC<AdminScreenProps> = ({
  title,
  subtitle,
  hideBack,
  onBack,
  right,
  scroll = true,
  refreshing = false,
  onRefresh,
  footer,
  contentStyle,
  children,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();

  return (
    <Screen edges={['bottom']}>
      <AppBar
        title={title}
        subtitle={subtitle}
        tone="surface"
        hideBack={hideBack || (!onBack && !canGoBack)}
        onBack={onBack ?? (() => navigation.goBack())}
        right={right}
      />
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.inkMuted} colors={[colors.accent]} />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, contentStyle]}>{children}</View>
      )}
      {!!footer && <View style={styles.footer}>{footer}</View>}
    </Screen>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    content: { paddingHorizontal: GUTTER, paddingTop: S.lg, paddingBottom: S.huge },
    footer: {
      paddingHorizontal: GUTTER,
      paddingTop: S.md,
      paddingBottom: S.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.line,
      backgroundColor: c.surface,
    },
  });

export default AdminScreen;
