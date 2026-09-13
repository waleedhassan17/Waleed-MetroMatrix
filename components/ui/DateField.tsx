import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import React, { useMemo, useState } from 'react';
import { Platform, StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

import { R, S, T } from '../../constants/theme';
import { ThemeColors, useTheme } from '../../theme';
import { dateFromKey, formatDateLabel } from '../../utils/healthcare/doctorFormat';
import { dateKeyOf } from '../../utils/healthcare/timeRanges';
import Button from './Button';
import FormSheet from './FormSheet';

/**
 * A calendar day, chosen with the phone's own date picker.
 *
 * Leave dates were typed into "YYYY-MM-DD" text boxes, so "2026-9-1" or "abc"
 * passed the only check and were silently dropped on save. The value here is
 * always a local `YYYY-MM-DD` — never parsed as UTC, which put devices west of
 * UTC on the previous day.
 */
export interface DateFieldProps {
  label?: string;
  /** Local `YYYY-MM-DD`, or '' for none. */
  value: string;
  onChange: (value: string) => void;
  /** Earliest selectable day, `YYYY-MM-DD`. */
  min?: string;
  /** Latest selectable day, `YYYY-MM-DD`. */
  max?: string;
  placeholder?: string;
  error?: string | null;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const DateField: React.FC<DateFieldProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  placeholder = 'Choose a date',
  error,
  disabled,
  style,
}) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [iosOpen, setIosOpen] = useState(false);

  const initial = () => dateFromKey(value) ?? dateFromKey(min ?? '') ?? new Date();
  const [draft, setDraft] = useState<Date>(initial);

  const minimumDate = min ? dateFromKey(min) ?? undefined : undefined;
  const maximumDate = max ? dateFromKey(max) ?? undefined : undefined;

  const open = () => {
    if (disabled) return;
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: initial(),
        mode: 'date',
        minimumDate,
        maximumDate,
        onChange: (event, date) => {
          if (event.type === 'set' && date) onChange(dateKeyOf(date));
        },
      });
      return;
    }
    setDraft(initial());
    setIosOpen(true);
  };

  const shown = value ? formatDateLabel(value, { weekday: true, year: true }) : '';

  return (
    <View style={style}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        onPress={open}
        disabled={disabled}
        activeOpacity={0.7}
        style={[styles.field, { borderColor: error ? colors.error : colors.line }, disabled && styles.disabled]}
        accessibilityRole="button"
        accessibilityLabel={`${label ?? 'Date'}: ${shown || 'not set'}`}
        accessibilityHint="Opens the date picker"
      >
        <Text style={[styles.value, !shown && styles.placeholder]} numberOfLines={1}>
          {shown || placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={18} color={colors.inkFaint} />
      </TouchableOpacity>
      {!!error && <Text style={styles.error}>{error}</Text>}

      {Platform.OS === 'ios' && (
        <FormSheet
          visible={iosOpen}
          title={label || 'Choose a date'}
          onClose={() => setIosOpen(false)}
          scrollable={false}
          footer={
            <Button
              label="Done"
              onPress={() => {
                onChange(dateKeyOf(draft));
                setIosOpen(false);
              }}
            />
          }
        >
          <DateTimePicker
            value={draft}
            mode="date"
            display="inline"
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            themeVariant={isDark ? 'dark' : 'light'}
            accentColor={colors.accent}
            onChange={(_event, date) => date && setDraft(date)}
          />
        </FormSheet>
      )}
    </View>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    label: { ...T.label, color: c.inkMuted, marginBottom: S.xs + 2 },
    field: {
      minHeight: 48,
      borderWidth: 1,
      borderRadius: R.control,
      backgroundColor: c.surface,
      paddingHorizontal: S.md,
      flexDirection: 'row',
      alignItems: 'center',
    },
    disabled: { backgroundColor: c.surfaceSunken, opacity: 0.6 },
    value: { ...T.bodyStrong, color: c.ink, flex: 1 },
    placeholder: { fontFamily: T.body.fontFamily, color: c.inkFaint },
    error: { ...T.caption, color: c.error, marginTop: S.xs },
  });

export default DateField;
