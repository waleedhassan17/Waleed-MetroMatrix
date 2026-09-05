import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { darkShift, type DarkShift } from '../../../constants/darkShift';
import { useTheme } from '../../../theme';
import { Ionicons } from '@expo/vector-icons';
import { STATUS_STYLE, AppointmentStatus } from '../../../constants/HealthcareTheme';

interface HCStatusPillProps {
  status: AppointmentStatus | string;
  size?: 'sm' | 'md';
}

const HCStatusPill: React.FC<HCStatusPillProps> = ({ status, size = 'md' }) => {
  const { mode } = useTheme();
  const sh = useMemo(() => darkShift(mode), [mode]);
  const styles = useMemo(() => makeStyles(sh), [sh]);
  const cfg = STATUS_STYLE[status as AppointmentStatus] || STATUS_STYLE.pending;
  const fs = size === 'sm' ? 10 : 12;
  return (
    <View style={[styles.pill, { backgroundColor: cfg.bg, paddingVertical: size === 'sm' ? 3 : 5 }]}>
      <Ionicons name={cfg.icon as any} size={fs + 2} color={cfg.color} />
      <Text style={[styles.text, { color: cfg.color, fontSize: fs }]}>{cfg.label}</Text>
    </View>
  );
};

const makeStyles = (sh: DarkShift) => StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  text: { fontWeight: '700', letterSpacing: 0.2 },
});

export default HCStatusPill;
