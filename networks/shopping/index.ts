export { shoppingApiRequest, SHOPPING_BASE_URL, USE_SHOPPING_DUMMY_DATA } from './config';
export { default as shoppingAxios, shoppingGet, shoppingPost, shoppingPut, shoppingPatch, shoppingDelete } from './baseShoppingApi';
export type { ShoppingApiEnvelope } from './baseShoppingApi';
export * from './shoppingNetwork';
