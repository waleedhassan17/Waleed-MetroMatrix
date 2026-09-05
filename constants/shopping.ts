// ============================================
// Shopping — shared vocabulary
//
// One definition each for the two lists that were previously copy-pasted
// across the admin and vendor brand forms with *different* values in each.
// ============================================

/**
 * The payment rails checkout actually supports.
 *
 * `value` is what goes into `Brand.policies.paymentMethods`, and it must stay
 * in the server's enum (`Order.paymentMethod`: 'wallet' | 'cod'). The admin
 * brand forms used to offer 'Credit/Debit Card', 'Bank Transfer', 'JazzCash'
 * and 'EasyPaisa' and store those human labels into the same field the vendor
 * form fills with 'wallet' / 'cod' — so ticking JazzCash wrote a value nothing
 * could read and no shopper could ever pick.
 */
export const SHOPPING_PAYMENT_METHODS = [
  { value: 'cod', label: 'Cash on Delivery' },
  { value: 'wallet', label: 'MetroMatrix Wallet' },
] as const;

export type ShoppingPaymentMethod = (typeof SHOPPING_PAYMENT_METHODS)[number]['value'];

/** All supported values, for defaulting a brand that has chosen none. */
export const SHOPPING_PAYMENT_VALUES: ShoppingPaymentMethod[] = SHOPPING_PAYMENT_METHODS.map(
  (m) => m.value
);

export const paymentMethodLabel = (value: string): string =>
  SHOPPING_PAYMENT_METHODS.find((m) => m.value === value)?.label ?? value;

/**
 * Department names offered when creating or editing a brand. These populate
 * `Brand.categories`, the denormalised list the storefront's department tiles
 * are built from. Declared once — the add and edit wizards each had their own
 * copy, and the add wizard's was inlined inside a render function.
 */
export const SHOPPING_BRAND_CATEGORIES = [
  'Men',
  'Women',
  'Kids',
  'Shoes',
  'Accessories',
  'Home',
  'Sports',
];
