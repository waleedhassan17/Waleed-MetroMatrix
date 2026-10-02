// ============================================================================
// "Expected demand, next 7 days" — for a provider's, doctor's or vendor's own
// dashboard. The server resolves the series from the account (their trade,
// their specialty, their brand); this card renders nothing when there is no
// forecast for it yet, rather than an empty box.
// ============================================================================

import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Card from './Card';
import MiniColumns from './charts/MiniColumns';
import { S, T } from '../../constants/theme';
import { ThemeColors, useTheme } from '../../theme';
import { fetchMyDemand, MyDemand } from '../../networks/admin/platformAnalyticsApi';

const DAY = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const UNITS: Record<string, string> = { homeservice: 'requests', healthcare: 'appointments', shopping: 'orders' };

export default function DemandCard({ style }: { style?: any }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [data, setData] = useState<MyDemand | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      fetchMyDemand().then((res) => {
        if (alive && res.success) setData(res.data || null);
      });
      return () => {
        alive = false;
      };
    }, [])
  );

  if (!data || !data.next7 || !data.daily.length) return null;
  const unit = UNITS[data.vertical] || 'jobs';
  const change = data.lastWeek ? Math.round(((data.next7.total - data.lastWeek) / data.lastWeek) * 100) : null;

  return (
    <Card style={style}>
      <Text style={styles.title}>Expected demand · next 7 days</Text>
      <Text style={styles.subtitle}>
        {data.vertical === 'shopping' ? 'Orders for your store' : `For ${data.label}`}
      </Text>
      <View style={styles.figureRow}>
        <Text style={styles.figure}>~{data.next7.total}</Text>
        <Text style={styles.figureUnit}> {unit}</Text>
      </View>
      <Text style={styles.meta}>
        Likely {data.next7.lo}–{data.next7.hi}
        {change !== null ? ` · ${change >= 0 ? '+' : ''}${change}% vs last week (${data.lastWeek})` : ''}
      </Text>
      <View style={styles.chart}>
        <MiniColumns
          unit={unit}
          data={data.daily.map((p) => {
            const [y, m, d] = p.date.split('-').map(Number);
            return { label: DAY[new Date(Date.UTC(y, m - 1, d)).getUTCDay()], value: p.yhat };
          })}
        />
      </View>
      {data.model?.dataQuality === 'thin' && (
        <Text style={styles.note}>Based on little history so far — expect it to sharpen as bookings grow.</Text>
      )}
      {data.model?.source === 'synthetic' && <Text style={styles.note}>Demo forecast (synthetic data).</Text>}
    </Card>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    title: { ...T.subhead, color: c.ink },
    subtitle: { ...T.caption, color: c.inkMuted, marginTop: 2 },
    figureRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: S.md },
    figure: { ...T.heading, color: c.ink },
    figureUnit: { ...T.body, color: c.inkMuted },
    meta: { ...T.caption, color: c.inkMuted, marginTop: 2 },
    chart: { marginTop: S.md },
    note: { ...T.caption, color: c.inkFaint, marginTop: S.sm },
  });
