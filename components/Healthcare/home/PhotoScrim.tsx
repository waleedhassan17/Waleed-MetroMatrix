// PhotoScrim — a legibility layer over a photo, never a surface.
//   default  clear at the top, dark at the bottom (white banner copy)
//   ground   a soft card's own ground on the photo's edge nearest the words,
//            fading into the photo within its first third (the bento cards)

import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { HC_ON_BLUE } from '../../../constants/HealthcareTheme';

const DOWN = { start: { x: 0, y: 0 }, end: { x: 0, y: 1 } };
const RIGHT = { start: { x: 0, y: 0 }, end: { x: 1, y: 0 } };

const PhotoScrim: React.FC<{ ground?: { from: string; to: string; direction?: 'down' | 'right' } }> = ({ ground }) => {
  if (ground) {
    const right = ground.direction === 'right';
    return (
      <LinearGradient
        pointerEvents="none"
        colors={[ground.from, ground.to]}
        locations={right ? [0, 0.4] : [0, 0.32]}
        start={right ? RIGHT.start : DOWN.start}
        end={right ? RIGHT.end : DOWN.end}
        style={StyleSheet.absoluteFill}
      />
    );
  }
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[HC_ON_BLUE.scrimFaint, HC_ON_BLUE.scrimMid, HC_ON_BLUE.scrimDeep]}
      locations={[0, 0.45, 1]}
      style={StyleSheet.absoluteFill}
    />
  );
};

export default PhotoScrim;
