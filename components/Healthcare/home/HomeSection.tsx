// A Health home section head: the title, an optional line under it, and an
// optional "See all" (or any trailing control, such as the city chip).

import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { HC_HOME, HC_TYPE, HCSpace, makeHC, type HCPalette } from '../../../constants/HealthcareTheme';
import { useTheme } from '../../../theme';

export interface HomeSectionProps {
  title: string;
  subtitle?: string;
  onSeeAll?: () => void;
  seeAllLabel?: string;
  /** Replaces "See all" (e.g. the city chip). */
  trailing?: React.ReactNode;
}

const HomeSection: React.FC<HomeSectionProps> = ({ title, subtitle, onSeeAll, seeAllLabel = 'See all', trailing }) => {
  const { mode } = useTheme();
  const HC = useMemo(() => makeHC(mode), [mode]);
  const styles = useMemo(() => makeStyles(HC), [HC]);
  return (
    <View style={styles.root}>
      <View style={styles.row}>
        <Text style={styles.title} accessibilityRole="header" numberOfLines={2}>
          {title}
        </Text>
        {trailing ??
          (onSeeAll ? (
            <Pressable
              onPress={onSeeAll}
              accessibilityRole="link"
              accessibilityLabel={`${seeAllLabel}: ${title}`}
              hitSlop={HCSpace.sm}
              style={styles.link}
            >
              <Text style={styles.linkText}>{seeAllLabel}</Text>
            </Pressable>
          ) : null)}
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
};

const makeStyles = (HC: HCPalette) =>
  StyleSheet.create({
    root: { gap: HCSpace.xs },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: HCSpace.md },
    title: { ...HC_TYPE.sectionTitle, flex: 1, color: HC.textDark },
    subtitle: { ...HC_TYPE.caption, color: HC.textLight },
    link: { minHeight: HC_HOME.touch, justifyContent: 'center', marginVertical: -HCSpace.md },
    linkText: { ...HC_TYPE.link, color: HC.primary },
  });

export default HomeSection;
