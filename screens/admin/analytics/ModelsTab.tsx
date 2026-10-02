// ============================================================================
// Models — what the ML service has trained, how good it really is, and
// whether provider search uses it.
//
// Every model shows its own metric beside its baseline's, where its data came
// from (real or synthetic), and why it did or did not pass its gates. A model
// that failed its gates can still be switched on for a demo, but only with a
// note, which stays attached to it.
// ============================================================================

import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormSheet,
  SectionHeader,
  SegmentedControl,
  SkeletonCard,
  TextField,
  ToneBadge,
  showToast,
} from '../../../components/ui';
import { GUTTER, S, T } from '../../../constants/theme';
import { ThemeColors, useTheme } from '../../../theme';
import {
  activateModel,
  archiveModel,
  fetchModels,
  RankingMode,
  RegistryModel,
  setRankingMode,
} from '../../../networks/admin/platformAnalyticsApi';

const MODES: { value: RankingMode; label: string }[] = [
  { value: 'heuristic', label: 'Rules' },
  { value: 'shadow', label: 'Shadow' },
  { value: 'blend', label: 'Blend' },
  { value: 'model', label: 'Model' },
];
const MODE_HELP: Record<RankingMode, string> = {
  heuristic: 'Search ranks by the weighted rules only (distance, rating, available now, reliability).',
  shadow: 'The model scores every search and the scores are logged, but customers still see the rules order.',
  blend: '70% model score, 30% rules score.',
  model: 'Search ranks by the model; new providers get a small boost so they are not locked out.',
};

const pct = (n?: number | null) => (n === null || n === undefined ? '—' : `${Math.round(n * 100)}%`);
const num = (n?: number | null, d = 3) => (n === null || n === undefined ? '—' : n.toFixed(d));

export default function ModelsTab() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchModels>>['data'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<RegistryModel | null>(null);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    const res = await fetchModels();
    if (res.success && res.data) {
      setData(res.data);
      setError(null);
    } else setError(res.message || 'Could not load models');
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const doActivate = async (m: RegistryModel, why?: string) => {
    const res = await activateModel(m._id, why);
    if (res.success) {
      showToast({ message: `${m.version} is active`, tone: 'success' });
      load();
    } else showToast({ message: res.message || 'Not activated', tone: 'error' });
  };

  const onActivate = (m: RegistryModel) => {
    if (m.gates?.passed) doActivate(m);
    else {
      setNote('');
      setPending(m);
    }
  };

  const onMode = async (mode: RankingMode) => {
    const res = await setRankingMode(mode);
    if (res.success) {
      showToast({ message: `Ranking: ${MODES.find((x) => x.value === mode)?.label}`, tone: 'success' });
      load();
    } else showToast({ message: res.message || 'Not saved', tone: 'error' });
  };

  if (error && !data) return <ErrorState title="Models unavailable" message={error} onRetry={load} />;
  if (!data) return <View style={styles.pad}><SkeletonCard lines={4} /></View>;

  const matching = data.models.filter((m) => m.task === 'provider_matching');
  const forecasts = data.models.filter((m) => m.task === 'demand_forecast').slice(0, 3);
  const mode = data.serving.ranking?.mode || 'heuristic';
  const activeMatching = matching.find((m) => m.status === 'active');

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <SectionHeader title="Provider search ranking" />
      <Card>
        <SegmentedControl options={MODES} value={mode} onChange={onMode} />
        <Text style={styles.help}>{MODE_HELP[mode]}</Text>
        {mode !== 'heuristic' && !activeMatching && (
          <Text style={styles.warn}>No model is active, so search is using the rules until one is.</Text>
        )}
        {data.serving.matching?.lastError && (
          <Text style={styles.warn}>Last load problem: {data.serving.matching.lastError.message}</Text>
        )}
      </Card>

      <SectionHeader title="Matching models" style={styles.section} />
      {!matching.length ? (
        <EmptyState icon="git-network-outline" title="No models yet" message="The nightly ML job trains one; trigger it from GitHub Actions to see one now." />
      ) : (
        matching.slice(0, 8).map((m) => {
          const mt = m.metrics || {};
          const base = mt.baseline || {};
          return (
            <Card key={m._id} style={styles.card}>
              <View style={styles.titleRow}>
                <Text style={styles.version}>{m.version}</Text>
                <ToneBadge
                  label={m.status}
                  tone={m.status === 'active' ? 'success' : m.status === 'candidate' ? 'info' : 'neutral'}
                />
              </View>
              <Text style={styles.line}>
                AUC {num(mt.auc)} {mt.aucCI ? `(95% ${num(mt.aucCI[0], 2)}–${num(mt.aucCI[1], 2)})` : ''} vs rules {num(base.heuristicAuc)}
              </Text>
              <Text style={styles.line}>
                Top-5 hit rate {pct(mt.precisionAt5)} vs rules {pct(base.heuristicPrecisionAt5)} · {mt.nTrain ?? '—'} train / {mt.nTest ?? '—'} test rows
              </Text>
              <View style={styles.badges}>
                <ToneBadge
                  label={m.trainedOn?.source === 'real' ? 'Real platform data' : 'Synthetic data'}
                  tone={m.trainedOn?.source === 'real' ? 'success' : 'warning'}
                  style={styles.badge}
                />
                <ToneBadge label={m.gates?.passed ? 'Passed gates' : 'Did not pass gates'} tone={m.gates?.passed ? 'success' : 'warning'} style={styles.badge} />
              </View>
              {!!m.gates?.reasons?.length && <Text style={styles.reasons}>{m.gates.reasons.join(' · ')}</Text>}
              {!!m.activationNote && <Text style={styles.reasons}>Note: {m.activationNote}</Text>}
              <View style={styles.actions}>
                {m.status !== 'active' && <Button label="Activate" size="sm" fullWidth={false} onPress={() => onActivate(m)} style={styles.btn} />}
                {m.status === 'active' && (
                  <Button label="Archive" variant="secondary" size="sm" fullWidth={false} onPress={() => archiveModel(m._id).then(load)} style={styles.btn} />
                )}
              </View>
            </Card>
          );
        })
      )}

      <SectionHeader title="Demand forecasts" style={styles.section} />
      {forecasts.map((m) => (
        <Card key={m._id} style={styles.card}>
          <Text style={styles.version}>{m.version}</Text>
          <Text style={styles.line}>
            {m.metrics?.series ?? '—'} series · median WAPE {pct(m.metrics?.wape)} · beats last week in {pct(m.metrics?.shareBeatingLastWeek)} of series
          </Text>
          <Text style={styles.line}>Methods: {Object.entries(m.metrics?.methods || {}).map(([k, v]) => `${k} ${v}`).join(', ') || '—'}</Text>
          {m.trainedOn?.source === 'synthetic' && <ToneBadge label="Synthetic data" tone="warning" style={styles.badge} />}
        </Card>
      ))}

      <FormSheet
        visible={!!pending}
        title="Activate without passing gates?"
        subtitle={pending?.gates?.reasons?.join(' · ')}
        onClose={() => setPending(null)}
        footer={
          <Button
            label="Activate for demo"
            disabled={!note.trim()}
            onPress={() => {
              const m = pending;
              setPending(null);
              if (m) doActivate(m, note.trim());
            }}
          />
        }
      >
        <TextField label="Why (kept with the model)" value={note} onChangeText={setNote} placeholder="e.g. FYP demo on synthetic data" />
      </FormSheet>
    </ScrollView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    pad: { padding: GUTTER, paddingBottom: S.huge },
    section: { marginTop: S.lg },
    help: { ...T.caption, color: c.inkMuted, marginTop: S.sm },
    warn: { ...T.caption, color: c.warning, marginTop: S.sm },
    card: { marginBottom: S.sm },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    version: { ...T.label, color: c.ink },
    line: { ...T.caption, color: c.inkMuted, marginTop: 4 },
    badges: { flexDirection: 'row', flexWrap: 'wrap', marginTop: S.sm },
    badge: { marginRight: S.xs, marginBottom: S.xs },
    reasons: { ...T.caption, color: c.inkFaint, marginTop: 2 },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: S.sm },
    btn: { paddingHorizontal: S.lg },
  });
