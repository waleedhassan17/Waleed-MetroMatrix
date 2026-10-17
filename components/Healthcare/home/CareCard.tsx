// CareCard — "How can we help you today?"
// A soft-ground card led by a photo: the words sit on the card's own tint and
// the photo rises out of it (the ground fades into the picture). `tall` is the
// bento's big card, photo below the words; the short cards keep the words on
// the left and the photo on the right. An arrow says it opens.

import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  HC_HOME,
  HC_TYPE,
  HCRadius,
  HCShadow,
  HCSpace,
  makeCareTints,
  makeHC,
  type CareTint,
  type HCPalette,
} from '../../../constants/HealthcareTheme';
import { useTheme } from '../../../theme';
import FocusImage, { type PhotoFocus } from './FocusImage';
import PhotoScrim from './PhotoScrim';

export interface CareCardProps {
  title: string;
  body: string;
  image: ImageSourcePropType;
  /** Where the photo's subject is. */
  focus: PhotoFocus;
  tint: CareTint;
  tall?: boolean;
  onPress: () => void;
}

const CareCard: React.FC<CareCardProps> = ({ title, body, image, focus, tint, tall, onPress }) => {
  const { mode } = useTheme();
  const HC = useMemo(() => makeHC(mode), [mode]);
  const tints = useMemo(() => makeCareTints(mode), [mode]);
  const styles = useMemo(() => makeStyles(HC), [HC]);
  const t = tints[tint];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${body}`}
      style={({ pressed }) => [styles.root, tall ? styles.tall : styles.short, { backgroundColor: t.bg }, pressed && styles.pressed]}
    >
      <View style={tall ? styles.tallPhoto : styles.shortPhoto} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <FocusImage source={image} focus={focus} />
        <PhotoScrim ground={{ from: t.bg, to: t.fade, direction: tall ? 'down' : 'right' }} />
      </View>
      <View style={[styles.text, !tall && styles.shortText]}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.body} numberOfLines={tall ? 2 : 3}>
          {body}
        </Text>
      </View>
      <View style={styles.arrow}>
        <Ionicons name="arrow-forward" size={HCSpace.lg} color={t.fg} />
      </View>
    </Pressable>
  );
};

const makeStyles = (HC: HCPalette) =>
  StyleSheet.create({
    root: { borderRadius: HCRadius.lg, overflow: 'hidden', ...HCShadow.sm },
    pressed: { opacity: 0.85 },
    tall: { height: HC_HOME.careTall },
    short: { height: HC_HOME.careShort },
    text: { padding: HCSpace.lg, gap: HCSpace.xs },
    shortText: { width: '64%', paddingRight: 0 },
    tallPhoto: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%' },
    shortPhoto: { position: 'absolute', top: 0, right: 0, bottom: 0, width: '50%' },
    title: { ...HC_TYPE.cardTitle, color: HC.textDark },
    body: { ...HC_TYPE.caption, color: HC.textMedium },
    arrow: {
      position: 'absolute',
      right: HCSpace.md,
      bottom: HCSpace.md,
      width: HC_HOME.arrowWell,
      height: HC_HOME.arrowWell,
      borderRadius: HCRadius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: HC.card,
    },
  });

export default CareCard;
