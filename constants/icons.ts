/**
 * Single icon registry — semantic name -> icon set + glyph. Screens should
 * reference ICONS.cart / <Icon name="cart" />, never a raw glyph string, so
 * changing a glyph is a one-line edit here instead of a repo-wide grep.
 *
 * Scope: this covers @expo/vector-icons usage (Ionicons / MaterialCommunityIcons
 * / MaterialIcons / Feather). The Shopping module's product-card iconography
 * (cart, wishlist heart, star rating, etc.) is intentionally NOT migrated here
 * — it already runs on lucide-react-native consistently across ~70 files, and
 * that is a separate, established, internally-consistent icon system, not
 * legacy dead weight. This registry serves the rest of the app (home-services,
 * healthcare, admin, auth) plus new apparel-category glyph lookups.
 */

export type IconSet = 'Ionicons' | 'MaterialCommunityIcons' | 'MaterialIcons' | 'Feather';

export interface IconDef {
  set: IconSet;
  name: string;
}

// 16 / 20 / 24 / 32 scale (shop.md Prompt 3 item 5). Pass a raw number to
// <Icon size={18} /> when a design genuinely needs an in-between value, but
// default to one of these everywhere else.
export const ICON_SIZES = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
} as const;

export type IconSizeKey = keyof typeof ICON_SIZES;

export const ICONS = {
  // Navigation
  back: { set: 'Ionicons', name: 'chevron-back' },
  forward: { set: 'Ionicons', name: 'chevron-forward' },
  close: { set: 'Ionicons', name: 'close' },
  menu: { set: 'Ionicons', name: 'menu-outline' },
  more: { set: 'Ionicons', name: 'ellipsis-horizontal' },

  // Common actions
  search: { set: 'Ionicons', name: 'search-outline' },
  filter: { set: 'Ionicons', name: 'filter-outline' },
  add: { set: 'Ionicons', name: 'add' },
  edit: { set: 'Ionicons', name: 'create-outline' },
  delete: { set: 'Ionicons', name: 'trash-outline' },
  share: { set: 'Ionicons', name: 'share-social-outline' },
  download: { set: 'Ionicons', name: 'download-outline' },
  camera: { set: 'Ionicons', name: 'camera-outline' },
  image: { set: 'Ionicons', name: 'image-outline' },

  // Status
  checkCircle: { set: 'Ionicons', name: 'checkmark-circle' },
  checkCircleOutline: { set: 'Ionicons', name: 'checkmark-circle-outline' },
  alert: { set: 'Ionicons', name: 'alert-circle-outline' },
  star: { set: 'Ionicons', name: 'star' },
  starOutline: { set: 'Ionicons', name: 'star-outline' },

  // Commerce (non-Shopping-module contexts — e.g. admin dashboards)
  cart: { set: 'Ionicons', name: 'cart-outline' },
  cartFilled: { set: 'Ionicons', name: 'cart' },
  wishlist: { set: 'Ionicons', name: 'heart-outline' },
  wishlistFilled: { set: 'Ionicons', name: 'heart' },
  bag: { set: 'Ionicons', name: 'bag-outline' },
  storefront: { set: 'Ionicons', name: 'storefront-outline' },
  receipt: { set: 'Ionicons', name: 'receipt-outline' },
  wallet: { set: 'Ionicons', name: 'wallet-outline' },
  pricetag: { set: 'Ionicons', name: 'pricetag-outline' },

  // Account / chrome
  home: { set: 'Ionicons', name: 'home-outline' },
  homeFilled: { set: 'Ionicons', name: 'home' },
  profile: { set: 'Ionicons', name: 'person-outline' },
  profileFilled: { set: 'Ionicons', name: 'person' },
  settings: { set: 'Ionicons', name: 'settings-outline' },
  settingsFilled: { set: 'Ionicons', name: 'settings' },
  notification: { set: 'Ionicons', name: 'notifications-outline' },
  notificationFilled: { set: 'Ionicons', name: 'notifications' },
  lock: { set: 'Ionicons', name: 'lock-closed-outline' },
  logout: { set: 'Ionicons', name: 'log-out-outline' },

  // Contact / scheduling
  location: { set: 'Ionicons', name: 'location-outline' },
  calendar: { set: 'Ionicons', name: 'calendar-outline' },
  time: { set: 'Ionicons', name: 'time-outline' },
  chat: { set: 'Ionicons', name: 'chatbubble-outline' },
  call: { set: 'Ionicons', name: 'call-outline' },
} as const satisfies Record<string, IconDef>;

export type IconName = keyof typeof ICONS;

// ── Apparel category icons (shop.md Prompt 3 item 3) ───────────────────────
// Keyed by the REAL category names produced by the seed script
// (MetroMatrix-Backend src/modules/shopping/seed/brands.seed.js
// OUTFITTERS_TYPE_MAP / COUGAR_TYPE_MAP), not the doc's illustrative
// taxonomy, so this actually matches what's in the database.
//
// MaterialCommunityIcons has no dedicated glyph for trousers/jeans, shorts,
// dresses, co-ord sets, eastern wear, hoodies, outerwear, belts or scarves —
// verified against the installed glyph map, not assumed. Per product
// decision, these use the closest available *generic clothing-item* glyph
// (a hanger) rather than a specific-but-wrong one — a shirt icon on "Jeans"
// reads as careless — and rather than hand-drawn custom SVGs, to keep this
// scoped to an icon audit rather than an illustration project.
export const CATEGORY_ICONS: Record<string, IconDef> = {
  'T-Shirts': { set: 'MaterialCommunityIcons', name: 'tshirt-crew-outline' },
  Polos: { set: 'MaterialCommunityIcons', name: 'tshirt-crew-outline' },
  Shirts: { set: 'MaterialCommunityIcons', name: 'tshirt-v-outline' },
  'Tops & Blouses': { set: 'MaterialCommunityIcons', name: 'tshirt-v-outline' },
  Jeans: { set: 'MaterialCommunityIcons', name: 'hanger' },
  Denim: { set: 'MaterialCommunityIcons', name: 'hanger' },
  Trousers: { set: 'MaterialCommunityIcons', name: 'hanger' },
  Shorts: { set: 'MaterialCommunityIcons', name: 'hanger' },
  Dresses: { set: 'MaterialCommunityIcons', name: 'hanger' },
  'Co-Ord Sets': { set: 'MaterialCommunityIcons', name: 'hanger' },
  'Eastern Wear': { set: 'MaterialCommunityIcons', name: 'hanger' },
  'Hoodies & Sweatshirts': { set: 'MaterialCommunityIcons', name: 'hanger' },
  Outerwear: { set: 'MaterialCommunityIcons', name: 'hanger' },
  Footwear: { set: 'MaterialCommunityIcons', name: 'shoe-sneaker' },
  Fragrances: { set: 'MaterialCommunityIcons', name: 'spray-bottle' },
  Accessories: { set: 'MaterialCommunityIcons', name: 'diamond-stone' },

  // Not produced as distinct categories by the current seed script (they
  // all collapse into "Accessories" — see OUTFITTERS_TYPE_MAP /
  // COUGAR_TYPE_MAP) but mapped in case a category ever gets split out.
  'Formal Shoes': { set: 'MaterialCommunityIcons', name: 'shoe-formal' },
  'Sandals & Slides': { set: 'MaterialCommunityIcons', name: 'shoe-cleat' },
  Bags: { set: 'MaterialCommunityIcons', name: 'bag-personal-outline' },
  Wallets: { set: 'MaterialCommunityIcons', name: 'wallet-outline' },
  Belts: { set: 'MaterialCommunityIcons', name: 'hanger' },
  Caps: { set: 'MaterialCommunityIcons', name: 'hat-fedora' },
  Sunglasses: { set: 'MaterialCommunityIcons', name: 'sunglasses' },
  Watches: { set: 'MaterialCommunityIcons', name: 'watch-variant' },
  Underwear: { set: 'MaterialCommunityIcons', name: 'underwear-outline' },
  Scarves: { set: 'MaterialCommunityIcons', name: 'hanger' },
};

export const DEFAULT_CATEGORY_ICON: IconDef = { set: 'MaterialCommunityIcons', name: 'hanger' };

export function getCategoryIcon(categoryName?: string | null): IconDef {
  if (!categoryName) return DEFAULT_CATEGORY_ICON;
  return CATEGORY_ICONS[categoryName] || DEFAULT_CATEGORY_ICON;
}
