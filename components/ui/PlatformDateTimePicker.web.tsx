import React, { useEffect, useRef } from 'react';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { R, S, T } from '../../constants/theme';
import { useTheme } from '../../theme';

/**
 * The web stand-in for @react-native-community/datetimepicker, which renders
 * nothing in a browser — so on web no date could be picked to book a
 * service, date a health record or set a birthday. This is the browser's own
 * date/time input behind the native picker's props and onChange contract:
 * 'set' with the chosen Date, or 'dismissed' when the field is left unchanged.
 *
 * Like the native dialog it opens on mount; the tap that mounted it is the
 * user gesture the browser requires. Props that only mean something to a
 * native picker (display, themeVariant, accentColor, …) are accepted and
 * ignored.
 */
type Mode = 'date' | 'time' | 'datetime';

export interface WebDateTimePickerProps {
  value: Date;
  mode?: Mode;
  minimumDate?: Date;
  maximumDate?: Date;
  onChange?: (event: DateTimePickerEvent, date?: Date) => void;
  [nativeOnly: string]: unknown;
}

const pad = (n: number) => String(n).padStart(2, '0');
const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const timeKey = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** A Date as the input's value: local `YYYY-MM-DD`, `HH:mm` or both. */
export const toInputValue = (d: Date, mode: Mode): string =>
  mode === 'time' ? timeKey(d) : mode === 'datetime' ? `${dateKey(d)}T${timeKey(d)}` : dateKey(d);

/**
 * The input's value as a Date, keeping whatever part of `base` the mode does
 * not set. Local time throughout: `new Date('2026-09-06')` would be UTC
 * midnight, the previous day anywhere west of Greenwich. Undefined until the
 * value is complete — Chrome reports a year typed digit by digit as 0002,
 * 0020, 0202 on the way to 2026.
 */
export const fromInputValue = (raw: string, mode: Mode, base: Date): Date | undefined => {
  const out = new Date(base);
  let time = raw;
  if (mode !== 'time') {
    const [datePart, timePart = ''] = raw.split('T');
    const m = /^(\d{4,})-(\d{2})-(\d{2})$/.exec(datePart);
    if (!m || Number(m[1]) < 1000) return undefined;
    out.setFullYear(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (mode === 'date') return out;
    time = timePart;
  }
  const t = /^(\d{2}):(\d{2})/.exec(time);
  if (!t) return undefined;
  out.setHours(Number(t[1]), Number(t[2]), 0, 0);
  return out;
};

const event = (type: DateTimePickerEvent['type'], date?: Date): DateTimePickerEvent =>
  ({ type, nativeEvent: { timestamp: (date ?? new Date()).getTime(), utcOffset: 0 } }) as DateTimePickerEvent;

const PlatformDateTimePicker: React.FC<WebDateTimePickerProps> = ({
  value,
  mode = 'date',
  minimumDate,
  maximumDate,
  onChange,
}) => {
  const { colors, isDark } = useTheme();
  const input = useRef<HTMLInputElement | null>(null);
  const picked = useRef(false);

  useEffect(() => {
    const el = input.current;
    if (!el) return;
    el.focus();
    try {
      el.showPicker?.();
    } catch {
      // Unsupported, or not counted as a user gesture: the field still works.
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = fromInputValue(e.target.value, mode, value);
    if (!date) return;
    // Typed dates can step outside the bounds the calendar enforces.
    if (minimumDate && mode !== 'time' && dateKey(date) < dateKey(minimumDate)) return;
    if (maximumDate && mode !== 'time' && dateKey(date) > dateKey(maximumDate)) return;
    picked.current = true;
    onChange?.(event('set', date), date);
  };

  const handleBlur = () => {
    if (!picked.current) onChange?.(event('dismissed'));
  };

  return React.createElement('input', {
    ref: input,
    type: mode === 'time' ? 'time' : mode === 'datetime' ? 'datetime-local' : 'date',
    defaultValue: toInputValue(value, mode),
    min: minimumDate && mode !== 'time' ? toInputValue(minimumDate, mode) : undefined,
    max: maximumDate && mode !== 'time' ? toInputValue(maximumDate, mode) : undefined,
    onChange: handleChange,
    onBlur: handleBlur,
    style: {
      fontFamily: T.body.fontFamily,
      fontSize: T.body.fontSize,
      // A bare number is a multiplier in CSS, not pixels.
      lineHeight: `${T.body.lineHeight}px`,
      color: colors.ink,
      backgroundColor: colors.surface,
      border: `1px solid ${colors.line}`,
      borderRadius: R.control,
      padding: `${S.sm}px ${S.md}px`,
      minHeight: 44,
      width: '100%',
      boxSizing: 'border-box',
      colorScheme: isDark ? 'dark' : 'light',
    },
  });
};

export default PlatformDateTimePicker;
