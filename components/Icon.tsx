import React from 'react';
import { StyleProp, TextStyle } from 'react-native';
import { Ionicons, MaterialCommunityIcons, MaterialIcons, Feather } from '@expo/vector-icons';
import { ICONS, IconName, IconSet, IconSizeKey, ICON_SIZES, IconDef } from '../constants/icons';
import { Colors } from '../constants/Colors';

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

/** Semantic-name icon — <Icon name="cart" />. Glyph lives in constants/icons.ts. */
export const Icon: React.FC<IconProps> = ({ name, size, color = Colors.text.primary, style }) => {
  const def = ICONS[name];
  const Component = SET_COMPONENTS[def.set];
  return <Component name={def.name} size={resolveSize(size)} color={color} style={style} />;
};

interface RawIconProps {
  icon: IconDef;
  size?: IconSizeKey | number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

/** Renders an already-resolved IconDef (e.g. from getCategoryIcon()) rather than a registry name. */
export const RawIcon: React.FC<RawIconProps> = ({ icon, size, color = Colors.text.primary, style }) => {
  const Component = SET_COMPONENTS[icon.set];
  return <Component name={icon.name} size={resolveSize(size)} color={color} style={style} />;
};

export default Icon;
