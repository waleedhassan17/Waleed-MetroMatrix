import { useWindowDimensions } from 'react-native';

/**
 * Shared 2-column product-grid sizing, computed from the LIVE window width
 * (not a Dimensions.get() snapshot taken once at module load — that freezes
 * every card at whatever size the screen happened to be on first render,
 * so rotation and split-screen/tablet layouts never resize).
 */
const GUTTER = 12;
const H_PADDING = 16;

export interface ProductGridSizing {
  cardWidth: number;
  imageHeight: number;
  gutter: number;
  hPadding: number;
}

export function useProductGridSizing(columns: number = 2): ProductGridSizing {
  const { width } = useWindowDimensions();
  const cardWidth = (width - H_PADDING * 2 - GUTTER * (columns - 1)) / columns;
  // 3:4 portrait — correct for apparel product photography.
  const imageHeight = cardWidth * (4 / 3);
  return { cardWidth, imageHeight, gutter: GUTTER, hPadding: H_PADDING };
}
