// ============================================================================
// "Recommended for you" on the Home Services home: providers this customer
// rated well ("book again") and top matches in the trades they book, ranked by
// the same discovery pipeline as search (GET /api/recommendations/homeservice).
// Renders nothing for a customer with no history — no generic filler.
// ============================================================================

import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar, Card, SectionHeader } from '../ui';
import { S, T } from '../../constants/theme';
import { ThemeColors, useTheme } from '../../theme';
import { searchOrigin } from '../../networks/serviceProviders/providerNetwork';
import { fetchRecommendedProviders } from '../../networks/recommendations/recommendationsApi';
import { providerSerializer } from '../../serializers/serviceProviders/providerSerializer';
import type { Provider } from '../../models/serviceProviders';
import { track } from '../../services/analytics/track';
import { providerMetaLine, type TradeKey } from './providerMeta';

interface Props {
  onOpenProvider: (providerId: string, category: TradeKey | undefined) => void;
}

const CARD_WIDTH = 200;

export default function RecommendedProviders({ onOpenProvider }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [items, setItems] = useState<{ provider: Provider; reason: string }[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const res = await fetchRecommendedProviders(await searchOrigin());
        if (!alive || !res.success) return;
        setItems((res.data?.items || []).map((i) => ({ provider: providerSerializer(i.provider), reason: i.reason })));
      })();
      return () => {
        alive = false;
      };
    }, [])
  );

  if (!items.length) return null;

  return (
    <View style={styles.wrap} testID="recommended-providers">
      <SectionHeader title="Recommended for you" subtitle="From your bookings and ratings" style={styles.header} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {items.map(({ provider: p, reason }, position) => (
          <Card
            key={p.id}
            style={styles.card}
            onPress={() => {
              track({ module: 'homeservice', type: 'click', refId: p.id, meta: { position, context: 'recommended', category: p.category ?? undefined } });
              onOpenProvider(p.id, (p.category as TradeKey) ?? undefined);
            }}
            accessibilityLabel={`${p.name}. ${reason}`}
          >
            <View style={styles.top}>
              <Avatar uri={p.image} name={p.name} size={44} />
              <View style={styles.topText}>
                <Text style={styles.name} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {p.specialty || p.category || 'Home service'}
                </Text>
              </View>
            </View>
            <Text style={styles.meta} numberOfLines={1}>
              {providerMetaLine(p)}
            </Text>
            <Text style={styles.reason} numberOfLines={2}>
              {reason}
            </Text>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    wrap: { marginBottom: S.xl },
    header: { marginBottom: S.md },
    row: { gap: S.md, paddingRight: S.lg },
    card: { width: CARD_WIDTH },
    top: { flexDirection: 'row', alignItems: 'center', gap: S.sm, marginBottom: S.sm },
    topText: { flex: 1 },
    name: { ...T.bodyStrong, color: c.ink },
    meta: { ...T.caption, color: c.inkMuted },
    reason: { ...T.caption, color: c.accentDeep, marginTop: S.xs },
  });
