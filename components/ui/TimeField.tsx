import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import React, { useMemo, useState } from 'react';
import { Platform, StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

import { R, S, T } from '../../constants/theme';
import { ThemeColors, useTheme } from '../../theme';
import { formatTime, uses24HourClock } from '../../utils/healthcare/doctorFormat';
import Button from './Button';
import FormSheet from './FormSheet';

/**
 * A time, chosen with the phone's own picker — the clock dial on Android, the
 * wheel on iOS — and shown in the phone's 12- or 24-hour format.
 *
 * Doctors used to set hours with ±30-minute steppers (sixteen taps from 9 AM to
 * 5 PM, on 32-point buttons) or a 48-row list that always opened at midnight.
 * The value is always `HH:mm`, 24-hour, whatever the display.
 */
export interface TimeFieldProps {
  label?: string;
  /** `HH:mm`, or '' for none. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string | null;
  disabled?: boolean;
  /** iOS wheel step. Android's clock is always minute-precise. */
  minuteInterval?: 1 | 5 | 10 | 15 | 20 | 30;
  style?: StyleProp<ViewStyle>;
}

const pad = (n: number) => String(n).padStart(2, '0');

const toDate = (hhmm: string) => {
  const d = new Date();
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm || '');
  d.setHours(m ? Number(m[1]) : 9, m ? Number(m[2]) : 0, 0, 0);
  return d;
};

const fromDate = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

const TimeField: React.FC<TimeFieldProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Choose a time',
  error,
  disabled,
  minuteInterval,
  style,
}) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const is24Hour = useMemo(uses24HourClock, []);
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState(() => toDate(value));

  const open = () => {
    if (disabled) return;
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: toDate(value),
        mode: 'time',
        is24Hour,
        onChange: (event, date) => {
          if (event.type === 'set' && date) onChange(fromDate(date));
        },
      });
      return;
    }
    setDraft(toDate(value));
    setIosOpen(true);
  };

  const shown = formatTime(value, is24Hour);

  return (
    <View style={style}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        onPress={open}
        disabled={disabled}
        activeOpacity={0.7}
        style={[styles.field, { borderColor: error ? colors.error : colors.line }, disabled && styles.disabled]}
        accessibilityRole="button"
        accessibilityLabel={`${label ?? 'Time'}: ${shown || 'not set'}`}
        accessibilityHint="Opens the time picker"
      >
        <Text style={[styles.value, !shown && styles.placeholder]} numberOfLines={1}>
          {shown || placeholder}
        </Text>
        <Ionicons name="time-outline" size={18} color={colors.inkFaint} />
      </TouchableOpacity>
      {!!error && <Text style={styles.error}>{error}</Text>}

      {Platform.OS === 'ios' && (
        <FormSheet
          visible={iosOpen}
          title={label || 'Choose a time'}
          onClose={() => setIosOpen(false)}
          scrollable={false}
          footer={
            <Button
              label="Done"
              onPress={() => {
                onChange(fromDate(draft));
                setIosOpen(false);
              }}
            />
          }
        >
          <DateTimePicker
            value={draft}
            mode="time"
            display="spinner"
            is24Hour={is24Hour}
            minuteInterval={minuteInterval}
            themeVariant={isDark ? 'dark' : 'light'}
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

export default TimeField;
