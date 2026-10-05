import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { toneColours } from '../ui';
import type { Tone } from '../../constants/theme';
import { formatAgo, formatDateTime } from '../../utils/admin/format';
import { S, T, useTheme, type ThemeColors } from '../../theme';

/**
 * What admins have done to this record, newest first — from the audit log
 * (`history[]` on provider and user detail). Who, what, why, when.
 */
export interface TimelineEntry {
  id: string;
  action: string;
  actor?: { id?: string; name?: string; role?: string } | null;
  reason?: string | null;
  createdAt: string;
}

const VERBS: Record<string, string> = {
  approve: 'Approved',
  reject: 'Rejected',
  suspend: 'Suspended',
  unsuspend: 'Suspension lifted',
  delete: 'Deleted',
  restore: 'Restored',
  activate: 'Activated',
  deactivate: 'Deactivated',
  create: 'Created',
  update: 'Updated',
};

/** An icon and tone per verb, so a suspension reads differently from an approval at a glance. */
const LOOKS: Record<string, { icon: string; tone: Tone }> = {
  approve: { icon: 'checkmark', tone: 'success' },
  activate: { icon: 'checkmark', tone: 'success' },
  restore: { icon: 'refresh', tone: 'success' },
  unsuspend: { icon: 'play', tone: 'success' },
  reject: { icon: 'close', tone: 'error' },
  delete: { icon: 'trash-outline', tone: 'error' },
  suspend: { icon: 'pause', tone: 'warning' },
  deactivate: { icon: 'pause', tone: 'warning' },
  create: { icon: 'add', tone: 'info' },
  update: { icon: 'create-outline', tone: 'neutral' },
};

export function lookOf(action: string): { icon: string; tone: Tone } {
  const verb = action.split('.').pop() || action;
  return LOOKS[verb] || { icon: 'ellipse', tone: 'neutral' };
}

/** 'provider.unsuspend' → 'Suspension lifted'; unknown actions are spelled out, not hidden. */
export function describeAction(action: string): string {
  const verb = action.split('.').pop() || action;
  if (VERBS[verb]) return VERBS[verb];
  const words = verb.replace(/[_-]+/g, ' ').trim();
  return words ? words[0].toUpperCase() + words.slice(1) : action;
}

const StatusTimeline: React.FC<{ entries: TimelineEntry[] }> = ({ entries }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (!entries.length) return <Text style={styles.empty}>No admin actions on this record yet.</Text>;

  return (
    <View>
      {entries.map((e, i) => {
        const look = lookOf(e.action);
        const { ground, ink } = toneColours(colors, look.tone);
        return (
        <View key={e.id} style={styles.row}>
          <View style={styles.rail}>
            <View style={[styles.dot, { backgroundColor: ground }]}>
              <Ionicons name={look.icon as any} size={12} color={ink} />
            </View>
            {i < entries.length - 1 && <View style={styles.line} />}
          </View>
          <View style={styles.body}>
            <Text style={styles.action}>{describeAction(e.action)}</Text>
            <Text style={styles.meta} accessibilityLabel={`${e.actor?.name || 'An admin'}, ${formatDateTime(e.createdAt)}`}>
              {(e.actor?.name || 'An admin') + ' · ' + formatAgo(e.createdAt)}
            </Text>
            {!!e.reason && <Text style={styles.reason}>“{e.reason}”</Text>}
          </View>
        </View>
        );
      })}
    </View>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    row: { flexDirection: 'row' },
    rail: { width: 24, alignItems: 'center' },
    dot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    line: { flex: 1, width: StyleSheet.hairlineWidth * 2, backgroundColor: c.line, marginVertical: 2 },
    body: { flex: 1, paddingBottom: S.lg, paddingLeft: S.sm, paddingTop: 2 },
    action: { ...T.bodyStrong, color: c.ink },
    meta: { ...T.caption, color: c.inkMuted, marginTop: 2 },
    reason: { ...T.body, color: c.ink, marginTop: S.xs },
    empty: { ...T.body, color: c.inkMuted },
  });

export default StatusTimeline;
