import { useFocusEffect, useNavigation, useScrollToTop } from '@react-navigation/native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import {
  AppBar,
  Button,
  Card,
  DateField,
  EmptyState,
  ErrorState,
  FormSheet,
  Screen,
  SectionHeader,
  SegmentedControl,
  SkeletonCard,
  ToneBadge,
} from '../../../../components/ui';
import { APP_CURRENCY, formatMoney } from '../../../../constants/Currency';
import { GUTTER, R, S, SECTION, T } from '../../../../constants/theme';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import type { EarningsRangeKey, EarningsReport } from '../../../../models/healthcare/doctorHub';
import { ThemeColors, useTheme } from '../../../../theme';
import {
  consultationLabel,
  dateFromKey,
  formatDateLabel,
  MONTHS_SHORT,
} from '../../../../utils/healthcare/doctorFormat';
import { addDaysToKey, dateKeyOf, daysBetweenKeys, todayDateKey } from '../../../../utils/healthcare/timeRanges';
import { fetchEarnings, fetchTransactions, setCustomRange, setRange } from './doctorEarningsSlice';

// ============================================================================
// Earnings: what the selected period brought in, compared with the one before,
// and the consultations behind it.
//
// Replaces a chart that drew one bar per day since the doctor's first
// appointment with a staggered JS-thread animation, a hero total that summed all
// time, a "Share" button, and a "{n} points" badge nobody could read.
// ============================================================================

const STALE_MS = 60000;
const money = (amount: number) => formatMoney(amount, { code: APP_CURRENCY });

type NamedRange = Exclude<EarningsRangeKey, 'custom'>;

/** Every bucket in the window, including the empty ones, so the chart has no gaps. */
function chartBuckets(report: EarningsReport): { key: string; label: string; total: number }[] {
  const byKey = new Map(report.buckets.map((b) => [b.key, b.total]));
  const out: { key: string; label: string; total: number }[] = [];

  if (report.bucket === 'month') {
    const [fy, fm] = report.from.split('-').map(Number);
    const [ty, tm] = report.to.split('-').map(Number);
    for (let y = fy, m = fm; y < ty || (y === ty && m <= tm); m === 12 ? ((y += 1), (m = 1)) : (m += 1)) {
      const key = `${y}-${String(m).padStart(2, '0')}`;
      out.push({ key, label: MONTHS_SHORT[m - 1], total: byKey.get(key) || 0 });
      if (out.length > 24) break;
    }
    return out;
  }

  const span = Math.min(daysBetweenKeys(report.from, report.to), 62);
  for (let i = 0; i <= span; i += 1) {
    const key = addDaysToKey(report.from, i);
    out.push({ key, label: String(dateFromKey(key)?.getDate() ?? ''), total: byKey.get(key) || 0 });
  }
  return out;
}

const Bars: React.FC<{ report: EarningsReport }> = ({ report }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const buckets = useMemo(() => chartBuckets(report), [report]);
  const max = Math.max(...buckets.map((b) => b.total), 0);
  // Label roughly six bars, whatever the count.
  const every = Math.max(1, Math.ceil(buckets.length / 6));

  if (buckets.length <= 1) return null;

  return (
    <View>
      <View style={styles.bars} accessibilityLabel={`Earnings chart, highest ${money(max)}`}>
        {buckets.map((b) => (
          <View key={b.key} style={styles.barSlot}>
            <View
              style={[
                styles.bar,
                { height: max ? Math.max(2, Math.round((b.total / max) * 120)) : 2 },
                !b.total && styles.barEmpty,
              ]}
            />
          </View>
        ))}
      </View>
      <View style={styles.barLabels}>
        {buckets.map((b, i) => (
          <Text key={b.key} style={styles.barLabel} numberOfLines={1}>
            {i % every === 0 ? b.label : ''}
          </Text>
        ))}
      </View>
    </View>
  );
};

const DoctorEarningsScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  const e = useAppSelector((s) => s.doctorEarnings);
  const [customOpen, setCustomOpen] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const loadAll = useCallback(
    (refresh = false) => {
      dispatch(fetchEarnings({ refresh }));
      dispatch(fetchTransactions());
    },
    [dispatch]
  );

  useFocusEffect(
    useCallback(() => {
      if (!e.lastFetchedAt || Date.now() - e.lastFetchedAt > STALE_MS) loadAll();
    }, [loadAll, e.lastFetchedAt])
  );

  const pickRange = (range: NamedRange) => {
    dispatch(setRange(range));
    dispatch(fetchEarnings());
  };

  const today = todayDateKey();
  const customError = !from || !to ? 'Choose both dates' : to < from ? 'The end date must be on or after the start' : daysBetweenKeys(from, to) > 365 ? 'Choose a range of a year or less' : null;

  const report = e.report;
  const trend =
    report && report.previousTotal > 0
      ? Math.round(((report.total - report.previousTotal) / report.previousTotal) * 100)
      : null;

  return (
    <Screen>
      <AppBar title="Earnings" hideBack />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={e.refreshing} onRefresh={() => loadAll(true)} tintColor={colors.accent} colors={[colors.accent]} />
        }
      >
        <SegmentedControl<NamedRange>
          options={[
            { value: 'today', label: 'Today' },
            { value: 'thisWeek', label: 'Week' },
            { value: 'thisMonth', label: 'Month' },
            { value: 'thisYear', label: 'Year' },
          ]}
          value={e.range === 'custom' ? ('' as NamedRange) : (e.range as NamedRange)}
          onChange={pickRange}
        />
        <TouchableOpacity
          onPress={() => {
            setFrom(e.custom?.startDate || addDaysToKey(today, -29));
            setTo(e.custom?.endDate || today);
            setCustomOpen(true);
          }}
          style={styles.customLink}
          accessibilityRole="button"
        >
          <Text style={[styles.customText, e.range === 'custom' && styles.customActive]}>
            {e.range === 'custom' && e.custom
              ? `${formatDateLabel(e.custom.startDate, { weekday: false })} – ${formatDateLabel(e.custom.endDate, { weekday: false, year: true })} · Change`
              : 'Custom range'}
          </Text>
        </TouchableOpacity>

        {!report ? (
          e.status === 'error' ? (
            <ErrorState message={e.error} onRetry={() => dispatch(fetchEarnings())} />
          ) : (
            <SkeletonCard lines={3} />
          )
        ) : (
          <>
            {!!e.error && <Text style={styles.stale}>Couldn't refresh. Showing what was loaded earlier.</Text>}
            <Card elevation="raised">
              <Text style={styles.caption}>{report.label}</Text>
              <Text style={styles.total} numberOfLines={1} adjustsFontSizeToFit>
                {money(report.total)}
              </Text>
              <View style={styles.totalMeta}>
                <Text style={styles.caption}>
                  {report.count} consultation{report.count === 1 ? '' : 's'}
                </Text>
                {trend !== null && (
                  <ToneBadge
                    style={styles.trend}
                    tone={trend >= 0 ? 'success' : 'error'}
                    icon={trend >= 0 ? 'arrow-up' : 'arrow-down'}
                    label={`${Math.abs(trend)}% vs ${report.previousLabel.toLowerCase().startsWith('last') || report.previousLabel === 'Yesterday' ? report.previousLabel.toLowerCase() : report.previousLabel}`}
                  />
                )}
              </View>
              <Bars report={report} />
            </Card>

            {report.byType.length > 0 && (
              <Card style={styles.section}>
                {report.byType.map((t, i) => {
                  const share = report.total ? Math.round((t.total / report.total) * 100) : 0;
                  return (
                    <View key={t.type} style={[styles.typeRow, i > 0 && styles.divider]}>
                      <View style={styles.flex}>
                        <Text style={styles.strong}>{consultationLabel(t.type)}</Text>
                        <Text style={styles.caption}>
                          {t.count} consultation{t.count === 1 ? '' : 's'} · {share}%
                        </Text>
                        <View style={styles.shareTrack}>
                          <View style={[styles.shareFill, { width: `${share}%` }]} />
                        </View>
                      </View>
                      <Text style={styles.amount}>{money(t.total)}</Text>
                    </View>
                  );
                })}
              </Card>
            )}
          </>
        )}

        <SectionHeader
          title="Recent consultations"
          actionLabel="Wallet"
          onAction={() => navigation.navigate('WalletScreen')}
          style={styles.section}
        />
        {e.transactionsStatus === 'error' ? (
          <ErrorState message={e.transactionsError} onRetry={() => dispatch(fetchTransactions())} />
        ) : e.transactionsStatus !== 'ready' ? (
          <SkeletonCard lines={2} />
        ) : e.transactions.length === 0 ? (
          <Card>
            <EmptyState icon="receipt-outline" title="No completed consultations yet" message="Completed consultations and what they earned appear here." />
          </Card>
        ) : (
          <Card padded={false} style={styles.listCard}>
            {e.transactions.map((t, i) => (
              <View key={t.id} style={[styles.txRow, i > 0 && styles.divider]}>
                <View style={styles.flex}>
                  <Text style={styles.strong} numberOfLines={1}>
                    {t.patientName}
                  </Text>
                  <Text style={styles.caption}>
                    {[t.date ? formatDateLabel(dateKeyOf(new Date(t.date)), { weekday: false, year: true }) : '', consultationLabel(t.type)]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
                <Text style={styles.amount}>{money(t.amount)}</Text>
              </View>
            ))}
          </Card>
        )}

        <Button
          label="Withdraw from wallet"
          variant="secondary"
          icon="wallet-outline"
          onPress={() => navigation.navigate('WalletScreen')}
          style={styles.section}
        />
        <View style={styles.bottomSpace} />
      </ScrollView>

      <FormSheet
        visible={customOpen}
        title="Custom range"
        onClose={() => setCustomOpen(false)}
        footer={
          <Button
            label="Show earnings"
            disabled={!!customError}
            onPress={() => {
              dispatch(setCustomRange({ startDate: from, endDate: to }));
              dispatch(fetchEarnings());
              setCustomOpen(false);
            }}
          />
        }
      >
        <DateField label="From" value={from} max={today} onChange={setFrom} style={styles.field} />
        <DateField label="To" value={to} min={from} max={today} onChange={setTo} error={from && to ? customError : null} />
      </FormSheet>
    </Screen>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    content: { paddingHorizontal: GUTTER, paddingTop: S.md },
    section: { marginTop: SECTION },
    customLink: { alignSelf: 'flex-end', minHeight: 40, justifyContent: 'center', marginVertical: S.xs },
    customText: { ...T.label, color: c.accentDeep },
    customActive: { color: c.ink },
    stale: { ...T.caption, color: c.warning, marginBottom: S.sm },
    caption: { ...T.caption, color: c.inkMuted, marginTop: 2 },
    strong: { ...T.bodyStrong, color: c.ink },
    total: { ...T.display, color: c.ink, marginTop: S.xs },
    totalMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: S.lg },
    trend: { marginLeft: S.sm, marginTop: 2 },
    bars: { flexDirection: 'row', alignItems: 'flex-end', height: 124 },
    barSlot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
    bar: { width: '70%', maxWidth: 18, borderRadius: 3, backgroundColor: c.accent },
    barEmpty: { backgroundColor: c.line },
    barLabels: { flexDirection: 'row', marginTop: S.xs },
    barLabel: { ...T.micro, color: c.inkMuted, flex: 1, textAlign: 'center' },
    typeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: S.sm },
    divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },
    shareTrack: { height: 4, borderRadius: 2, backgroundColor: c.surfaceSunken, marginTop: S.sm, overflow: 'hidden' },
    shareFill: { height: 4, borderRadius: 2, backgroundColor: c.accent },
    amount: { ...T.bodyStrong, color: c.ink, marginLeft: S.md },
    listCard: { paddingHorizontal: S.lg },
    txRow: { flexDirection: 'row', alignItems: 'center', minHeight: 60, paddingVertical: S.sm },
    field: { marginBottom: S.lg },
    bottomSpace: { height: S.huge * 2 },
  });

export default DoctorEarningsScreen;
