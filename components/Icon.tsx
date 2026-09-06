import React from 'react';
import { StyleProp, TextStyle } from 'react-native';
import { Ionicons, MaterialCommunityIcons, MaterialIcons, Feather } from '@expo/vector-icons';
import { ICONS, IconName, IconSet, IconSizeKey, ICON_SIZES, IconDef } from '../constants/icons';
import { useTheme } from '../theme';

const SET_COMPONENTS: Record<IconSet, React.ComponentType<any>> = {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
  Feather,
};

const resolveSize = (size: IconSizeKey | number | undefined): number => {
  if (typeof size === 'number') return size;
  return ICON_SIZES[size ?? 'md'];
};

interface IconProps {
  name: IconName;
  size?: IconSizeKey | number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

/**
 * Semantic-name icon — <Icon name="cart" />. Glyph lives in constants/icons.ts.
 *
 * The default colour resolves from the ramp rather than being frozen at import
 * time. It used to be the static light `Colors.text.primary` — near-black — so
 * any caller that left `color` off drew an invisible glyph on a dark page.
 */
export const Icon: React.FC<IconProps> = ({ name, size, color, style }) => {
  const { colors } = useTheme();
  const def = ICONS[name];
  const Component = SET_COMPONENTS[def.set];
  return (
    <Component
      name={def.name}
      size={resolveSize(size)}
      color={color ?? colors.ink}
      style={style}
    />
  );
};

interface RawIconProps {
  icon: IconDef;
  size?: IconSizeKey | number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

/** Renders an already-resolved IconDef (e.g. from getCategoryIcon()) rather than a registry name. */
export const RawIcon: React.FC<RawIconProps> = ({ icon, size, color, style }) => {
  const { colors } = useTheme();
  const Component = SET_COMPONENTS[icon.set];
  return (
    <Component
      name={icon.name}
      size={resolveSize(size)}
      color={color ?? colors.ink}
      style={style}
    />
  );
};

export default Icon;
