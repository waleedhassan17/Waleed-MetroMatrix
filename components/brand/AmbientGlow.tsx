import React, { useId } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

/**
 * A soft radial light behind a hero — the logo's glow, carried onto a light
 * ground.
 *
 * It replaces flat tinted discs, whose hard edge reads as a shape sitting on the
 * page rather than light falling on it. Alpha stops rather than pale hexes, so
 * one glow works on paper and on the dark ground alike: a pale `accentSoft` disc
 * is a glare panel in dark mode, a 16% emerald is a halo in both.
 */
export interface AmbientGlowProps {
  size: number;
  /** Centre colour. */
  color: string;
  /** Colour the falloff fades through. Defaults to `color`. */
  edge?: string;
  /** Opacity at the centre. The edge stop is a third of it. */
  strength?: number;
  style?: StyleProp<ViewStyle>;
}

const AmbientGlow: React.FC<AmbientGlowProps> = ({ size, color, edge, strength = 0.16, style }) => {
  // Several glows can be mounted at once (one per onboarding slide), and on web
  // the gradient id is a document-wide DOM id — a shared one would paint every
  // glow in the first slide's colour. useId's colons are not valid in `url(#…)`.
  const id = `glow${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const r = size / 2;

  return (
    <Svg width={size} height={size} style={style} pointerEvents="none">
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={strength} />
          <Stop offset="0.55" stopColor={edge ?? color} stopOpacity={strength / 3} />
          <Stop offset="1" stopColor={edge ?? color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={r} cy={r} r={r} fill={`url(#${id})`} />
    </Svg>
  );
};

export default AmbientGlow;
