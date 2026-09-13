import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GUTTER, R, S, T } from '../../constants/theme';
import { ThemeColors, useTheme } from '../../theme';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * A bottom sheet holding a small form: add a clinic, add extra hours, take time
 * off, pick a time on iOS.
 *
 * The four sheets it replaces were each hand-built, stayed white in dark mode,
 * and — the one that mattered — had no `onRequestClose`, so Android's back
 * button did nothing while they were open. This one closes on back, on the
 * scrim, and on its close button; none of those work while `busy`.
 */
export interface FormSheetProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Pinned below the content — the sheet's primary action. */
  footer?: React.ReactNode;
  /** A save in flight: the sheet cannot be dismissed. */
  busy?: boolean;
  /** Set false for content that must not scroll (a native picker). */
  scrollable?: boolean;
}

const FormSheet: React.FC<FormSheetProps> = ({
  visible,
  title,
  subtitle,
  onClose,
  children,
  footer,
  busy,
  scrollable = true,
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const reducedMotion = useReducedMotion();
  const slide = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (reducedMotion) {
      slide.setValue(visible ? 1 : 0);
      return;
    }
    Animated.timing(slide, { toValue: visible ? 1 : 0, duration: visible ? 200 : 140, useNativeDriver: true }).start();
  }, [visible, reducedMotion, slide]);

  const requestClose = () => {
    if (!busy) onClose();
  };

  const Body = scrollable ? ScrollView : View;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={requestClose} statusBarTranslucent>
      <Pressable style={styles.scrim} onPress={requestClose} accessibilityLabel="Close" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.avoider}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: insets.bottom + S.lg,
              opacity: slide,
              transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [32, 0] }) }],
            },
          ]}
          accessibilityViewIsModal
        >
          <View style={styles.grabber} />
          <View style={styles.header}>
            <View style={styles.titles}>
              <Text style={styles.title} accessibilityRole="header">
                {title}
              </Text>
              {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
            <TouchableOpacity
              onPress={requestClose}
              disabled={busy}
              style={styles.close}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={22} color={busy ? colors.inkFaint : colors.inkMuted} />
            </TouchableOpacity>
          </View>

          <Body
            style={styles.body}
            {...(scrollable ? { keyboardShouldPersistTaps: 'handled', showsVerticalScrollIndicator: false } : {})}
          >
            {children}
          </Body>

          {!!footer && <View style={styles.footer}>{footer}</View>}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: c.scrim },
    avoider: { flex: 1, justifyContent: 'flex-end' },
    sheet: {
      maxHeight: '92%',
      backgroundColor: c.surface,
      borderTopLeftRadius: R.sheet,
      borderTopRightRadius: R.sheet,
      paddingHorizontal: GUTTER,
      paddingTop: S.md,
    },
    grabber: {
      alignSelf: 'center',
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.line,
      marginBottom: S.md,
    },
    header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: S.lg },
    titles: { flex: 1, marginRight: S.md },
    title: { ...T.heading, color: c.ink },
    subtitle: { ...T.body, color: c.inkMuted, marginTop: S.xs },
    close: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    body: { flexGrow: 0 },
    footer: { paddingTop: S.md },
  });

export default FormSheet;
