// ============================================================================
// "Recommended for you" on the healthcare home: doctors picked from this
// patient's own history (specialties they have seen, doctors they would see
// again), with the distance to the nearest clinic when we know where they are
// (GET /api/recommendations/healthcare). Renders nothing without history.
// ============================================================================

import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

import { Avatar, Card } from '../ui';
import { S, T } from '../../constants/theme';
import { ThemeColors, useTheme } from '../../theme';
import { searchOrigin } from '../../networks/serviceProviders/providerNetwork';
import { fetchRecommendedDoctors } from '../../networks/recommendations/recommendationsApi';
import { doctorSerializer } from '../../serializers/healthcare/healthcareSerializer';
import type { Doctor } from '../../models/healthcare/types';
import { track } from '../../services/analytics/track';

interface Props {
  onOpenDoctor: (doctor: Doctor) => void;
  /** The host screen's section styles, so this matches its neighbours. */
  sectionStyle?: StyleProp<ViewStyle>;
  headerStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
}

const CARD_WIDTH = 220;

function metaLine(d: Doctor): string {
  const parts: string[] = [];
  parts.push(d.totalReviews > 0 ? `${d.rating.toFixed(1)}★ (${d.totalReviews})` : 'New');
  if (typeof d.distanceKm === 'number') parts.push(`${d.distanceKm} km`);
  if (d.consultationFee) parts.push(`PKR ${Math.round(d.consultationFee).toLocaleString('en-US')}`);
  return parts.join(' · ');
}

export default function RecommendedDoctors({ onOpenDoctor, sectionStyle, headerStyle, titleStyle, subtitleStyle }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [items, setItems] = useState<{ doctor: Doctor; reason: string }[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const res = await fetchRecommendedDoctors(await searchOrigin());
        if (!alive || !res.success) return;
        setItems((res.data?.items || []).map((i) => ({ doctor: doctorSerializer(i.doctor), reason: i.reason })));
      })();
      return () => {
        alive = false;
      };
    }, [])
  );

  if (!items.length) return null;

  return (
    <View style={sectionStyle} testID="recommended-doctors">
      <View style={[styles.header, headerStyle]}>
        {/* Wrapped: a host header may lay its children out in a row. */}
        <View>
          <Text style={[styles.title, titleStyle]}>Recommended for you</Text>
          <Text style={[styles.subtitle, subtitleStyle]}>From your appointments</Text>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {items.map(({ doctor: d, reason }, position) => (
          <Card
            key={d.doctorId}
            style={styles.card}
            onPress={() => {
              track({ module: 'healthcare', type: 'click', refId: d.doctorId, meta: { position, context: 'recommended' } });
              onOpenDoctor(d);
            }}
            accessibilityLabel={`${d.name}, ${d.specialtyName}. ${reason}`}
          >
            <View style={styles.top}>
              <Avatar uri={d.profileImage} name={d.name} size={44} />
              <View style={styles.topText}>
                <Text style={styles.name} numberOfLines={1}>
                  {d.name}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {d.specialtyName}
                </Text>
              </View>
            </View>
            <Text style={styles.meta} numberOfLines={1}>
              {metaLine(d)}
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
    header: { paddingHorizontal: S.xl, marginBottom: S.md },
    title: { ...T.heading, color: c.ink },
    subtitle: { ...T.caption, color: c.inkMuted, marginTop: 2 },
    row: { gap: S.md, paddingHorizontal: S.xl },
    card: { width: CARD_WIDTH },
    top: { flexDirection: 'row', alignItems: 'center', gap: S.sm, marginBottom: S.sm },
    topText: { flex: 1 },
    name: { ...T.bodyStrong, color: c.ink },
    meta: { ...T.caption, color: c.inkMuted },
    reason: { ...T.caption, color: c.accentDeep, marginTop: S.xs },
  });
