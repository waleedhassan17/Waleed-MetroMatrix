// ============================================================================
// "Describe the problem" — the customer says what is wrong, not which trade
// fixes it: "AC dripping water, need someone today" → AC technicians,
// available now (backend: GET /api/search/services — keyword rules first,
// Gemini only for descriptions the rules cannot place).
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar, Button, Card, Chip, TextField } from '../ui';
import { S, T } from '../../constants/theme';
import { ThemeColors, useTheme } from '../../theme';
import { searchOrigin } from '../../networks/serviceProviders/providerNetwork';
import { searchServices, type ServiceSearchResult } from '../../networks/recommendations/recommendationsApi';
import { providerSerializer } from '../../serializers/serviceProviders/providerSerializer';
import { track } from '../../services/analytics/track';
import { providerMetaLine, TRADE_PLURAL, type TradeKey } from './providerMeta';

interface Props {
  onOpenCategory: (category: TradeKey, opts: { availableNow: boolean }) => void;
  onOpenProvider: (providerId: string, category: TradeKey) => void;
}

const article = (label: string) => (/^[aeiou]/i.test(label) ? 'an' : 'a');

export default function DescribeProblemCard({ onOpenCategory, onOpenProvider }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ServiceSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    const q = text.trim();
    if (q.length < 2 || loading) return;
    setLoading(true);
    setError(null);
    track({ module: 'homeservice', type: 'search', query: q.slice(0, 120), meta: { context: 'describe_problem' } });
    const res = await searchServices(q, await searchOrigin());
    setLoading(false);
    if (res.success && res.data) setResult(res.data);
    else {
      setResult(null);
      setError(res.message || 'Could not search right now. Try again.');
    }
  }, [text, loading]);

  const interp = result?.interpreted;
  const providers = useMemo(() => (result?.providers || []).map(providerSerializer), [result]);

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Describe the problem</Text>
      <Text style={styles.subtitle}>We'll match you with the right tradesperson.</Text>
      <TextField
        value={text}
        onChangeText={(t) => {
          setText(t);
          if (result) setResult(null);
        }}
        placeholder="e.g. AC not cooling, need someone today"
        returnKeyType="search"
        onSubmitEditing={submit}
        accessibilityLabel="Describe the problem"
        containerStyle={styles.field}
        maxLength={200}
        right={
          loading ? (
            <ActivityIndicator size="small" color={colors.accentDeep} />
          ) : (
            <Pressable onPress={submit} hitSlop={10} accessibilityRole="button" accessibilityLabel="Find help">
              <Ionicons name="arrow-forward-circle" size={26} color={colors.accentDeep} />
            </Pressable>
          )
        }
      />

      {!!error && <Text style={styles.error}>{error}</Text>}

      {interp && interp.category && interp.label ? (
        <View style={styles.result} testID="describe-result">
          <Text style={styles.resultTitle}>
            Looks like you need {article(interp.label)} {interp.label.toLowerCase()}
            {interp.availableNow ? ', today' : ''}
          </Text>
          {result?.noneAvailableNow && (
            <Text style={styles.caption}>Nobody is available this minute — these can come a little later.</Text>
          )}
          {providers.map((p) => (
            <Pressable
              key={p.id}
              style={styles.row}
              onPress={() => onOpenProvider(p.id, interp.category as TradeKey)}
              accessibilityRole="button"
              accessibilityLabel={`${p.name}, ${providerMetaLine(p)}`}
            >
              <Avatar uri={p.image} name={p.name} size={40} />
              <View style={styles.rowText}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={styles.caption} numberOfLines={1}>
                  {providerMetaLine(p)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
            </Pressable>
          ))}
          <Button
            label={`See all ${TRADE_PLURAL[interp.category]}`}
            variant="secondary"
            size="sm"
            onPress={() =>
              onOpenCategory(interp.category as TradeKey, {
                availableNow: interp.availableNow && !result?.noneAvailableNow,
              })
            }
            style={styles.more}
          />
        </View>
      ) : interp && interp.candidates.length > 0 ? (
        <View style={styles.result}>
          <Text style={styles.resultTitle}>Which of these is it?</Text>
          <View style={styles.chips}>
            {interp.candidates.map((c) => (
              <Chip
                key={c.category}
                label={c.label}
                onPress={() => onOpenCategory(c.category, { availableNow: interp.availableNow })}
              />
            ))}
          </View>
        </View>
      ) : interp ? (
        <Text style={[styles.caption, styles.result]}>
          We couldn't tell which trade that is. Pick a service below.
        </Text>
      ) : null}
    </Card>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: { marginBottom: S.xl },
    title: { ...T.subhead, color: c.ink },
    subtitle: { ...T.caption, color: c.inkMuted, marginTop: 2 },
    field: { marginTop: S.md },
    error: { ...T.caption, color: c.error, marginTop: S.sm },
    result: { marginTop: S.md },
    resultTitle: { ...T.bodyStrong, color: c.ink, marginBottom: S.xs },
    caption: { ...T.caption, color: c.inkMuted },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: S.sm, gap: S.md },
    rowText: { flex: 1 },
    rowTitle: { ...T.body, color: c.ink },
    more: { marginTop: S.sm, alignSelf: 'flex-start' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, marginTop: S.xs },
  });
