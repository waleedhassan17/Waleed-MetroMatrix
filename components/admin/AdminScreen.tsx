import React, { useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { AppBar, barInk, Screen } from '../ui';
import { GUTTER, S, T, useTheme, type ThemeColors } from '../../theme';

/**
 * The frame of every admin console screen: the module's page header (the
 * customer healthcare screens' blue gradient, from the admin palette), a white
 * page like the customer screens, safe areas, a scrolling body with
 * pull-to-refresh, and an optional pinned footer for the screen's one primary
 * action.
 *
 * Back goes back when there is somewhere to go; a tab root has no back arrow.
 * `headerActions` puts up to three icon buttons in the bar (each labelled for
 * screen readers); `summary` is a compact strip pinned under the bar.
 */
export interface HeaderAction {
  icon: string;
  label: string;
  onPress: () => void;
  badge?: number;
}

export interface AdminScreenProps {
  title: string;
  subtitle?: string;
  /** Force-hide the back arrow (tab roots hide it automatically). */
  hideBack?: boolean;
  onBack?: () => void;
  /** Header action, e.g. an icon button. */
  right?: React.ReactNode;
  /** Icon buttons in the bar; ignored when `right` is given. */
  headerActions?: HeaderAction[];
  /** Pinned under the app bar: a one-line summary of the screen. */
  summary?: React.ReactNode;
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
  headerActions,
  summary,
  scroll = true,
  refreshing = false,
  onRefresh,
  footer,
  contentStyle,
  children,
}) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();
  // Header icons sit on the bar, so they take its ink: white on the gradient.
  const ink = barInk(colors, isDark);
  const onGradient = colors.barTone === 'gradient';

  return (
    <Screen edges={['bottom']} background={colors.surface}>
      <AppBar
        title={title}
        subtitle={subtitle}
        hideBack={hideBack || (!onBack && !canGoBack)}
        onBack={onBack ?? (() => navigation.goBack())}
        right={
          right ??
          (headerActions?.length ? (
            <View style={styles.actions}>
              {headerActions.slice(0, 3).map((a) => (
                <Pressable
                  key={a.label}
                  onPress={a.onPress}
                  hitSlop={6}
                  style={({ pressed }) => [styles.action, pressed && (onGradient ? styles.actionPressedOnBar : styles.actionPressed)]}
                  accessibilityRole="button"
                  accessibilityLabel={a.badge ? `${a.label}, ${a.badge} new` : a.label}
                >
                  <Ionicons name={a.icon as any} size={22} color={ink} />
                  {!!a.badge && a.badge > 0 && (
                    // On the gradient the red badge gets a ring in the bar's colour, as in AppBar.
                    <View style={[styles.badge, onGradient && { borderWidth: 2, borderColor: colors.accentDeep }]}>
                      <Text style={styles.badgeText}>{a.badge > 9 ? '9+' : a.badge}</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          ) : undefined)
        }
      />
      {!!summary && <View style={styles.summary}>{summary}</View>}
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
    actions: { flexDirection: 'row', alignItems: 'center', gap: S.xs },
    action: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    actionPressed: { backgroundColor: c.surfaceSunken },
    // A grey well on the gradient reads as a hole; dim the icon instead.
    actionPressedOnBar: { opacity: 0.6 },
    badge: {
      position: 'absolute',
      top: 4,
      right: 4,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      paddingHorizontal: 3,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.error,
    },
    badgeText: { ...T.micro, color: c.inkInverse },
    summary: {
      paddingHorizontal: GUTTER,
      paddingVertical: S.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.line,
      backgroundColor: c.surface,
    },
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
