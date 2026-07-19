# SHOPPING_E2E.md — end-to-end trace against the real backend

Backend: `/api/shopping` (Vercel: `https://metro-matrix-backend.vercel.app`).
Method: the backend path was exercised by `scripts/smoke-shopping.js` (14/14 PASS, output below); the frontend path was verified by static trace — every screen's slice dispatches a real thunk into `networks/shopping/*` through `ShoppingAxiosInstance`, and `npx tsc --noEmit` is clean. Steps that a static trace cannot fully prove (visual rendering on device) are marked VERIFY-ON-DEVICE.

## Smoke test output (backend truth)

```
[PASS] customer login
[PASS] browse brands — 4 active brands
[PASS] filter products (brand A, inStock, price_asc) — 5 products
[PASS] filter products (brand B) — 5 products
[PASS] add items from 2 different brands to cart — 2 lines from 2 brands
[PASS] apply coupon WELCOME10 — discount PKR 1000
[PASS] checkout with wallet — group paid
[PASS] order split into per-brand orders with correct totals — children sum == group total
[PASS] vendor login
[PASS] vendor moves order to shipped (with tracking number)
[PASS] customer tracks order — status shipped, tracking TCS-SMOKE-001
[PASS] vendor marks delivered
[PASS] customer reviews purchased product (verified purchase)
[PASS] review without delivered purchase is rejected
```

## Customer path

| Step | Screen | Wire-up | Status |
|---|---|---|---|
| 1 | ShoppingHome | `fetchHomeData` → `/brands` + `/products?isFeatured` | PASS |
| 2 | BrandList | `fetchBrandsApi` | PASS |
| 3 | BrandStore | brand + categories + products thunks | PASS |
| 4 | ProductList | `fetchProductsApi` with filters | PASS (brandId cast bug fixed during trace) |
| 5 | ProductDetail | `fetchProductByIdApi`; add-to-cart dispatches server `addItem` | PASS |
| 6 | Cart | server cart on mount; qty/remove/coupon all server thunks | PASS |
| 7 | CouponList | `/coupons` + apply/remove with block reasons | PASS |
| 8 | CheckoutAddress | `/addresses` CRUD (sample data removed) | PASS |
| 9 | CheckoutDelivery | local delivery options (fee comes from server at checkout) | PASS (display-only) |
| 10 | CheckoutPayment | wallet balance from wallet store; wallet/cod ids | PASS |
| 11 | CheckoutReview | `placeOrder` → real `POST /checkout` with addressId | PASS |
| 12 | OrderConfirmation | group id from checkout | PASS |
| 13 | MyOrders | `fetchMyOrders` → `/orders` (groups) | PASS |
| 14 | OrderDetail (new) | group view, per-brand sub-orders, cancel/return/track/review | PASS |
| 15 | OrderTracking | `fetchTracking` → real statusHistory | PASS |
| 16 | WriteReview | `submitReview` → verified-purchase endpoint | PASS |
| 17 | ReturnRequest | `submitReturnRequest` with orderId param | PASS |
| — | Wishlist | server wishlist with populated products | PASS |
| — | ShoppingTabs (new) | Home/Categories/Cart+badge/Wishlist/Orders | VERIFY-ON-DEVICE (visual) |

## Vendor path

| Step | Screen | Wire-up | Status |
|---|---|---|---|
| 1 | BrandHome | `/vendor/dashboard` | PASS |
| 2 | BrandProducts | `/vendor/products` + soft delete | PASS |
| 3 | ProductForm | load/save via create/update product APIs | PASS |
| 4 | Inventory | `/vendor/inventory` + stock PATCH w/ InventoryLog | PASS |
| 5 | BrandOrders | `/vendor/orders` | PASS |
| 6 | ProcessOrder | status via state machine (`updateOrderStatus`) | PASS |
| 7 | BrandDeliveries | shipments derived from real vendor orders | PASS |
| 8 | ReturnRequests | `/vendor/returns` approve→refund flow | PASS |
| 9 | BrandAnalytics | `/vendor/analytics?period=` | PASS |
| 10 | BrandProfile/Settings/Coupons/AddCoupon/BrandReviews (new) | `/vendor/brand`, coupons, reviews respond | PASS |
| — | BrandTabs (new) | Dashboard/Products/Orders/Analytics/Profile | VERIFY-ON-DEVICE (visual) |

## Admin path

| Step | Screen | Wire-up | Status |
|---|---|---|---|
| 1 | AdminShoppingDashboard (new) | `/admin/dashboard` tiles → tap-through | PASS |
| 2 | BrandManagement | `/admin/brands` + approve/suspend/reactivate w/ reason | PASS |
| 3 | AdminShoppingOrders (new) | `/admin/orders` + filters + search | PASS |
| 4 | AdminShoppingOrderDetail (new) | trail + force-status + manual refund (audited, confirmed) | PASS |
| 5 | AdminShoppingAnalytics (new) | `/admin/analytics` GMV/brand/status/top products | PASS |
| 6 | AdminShoppingSettings (new) | `/admin/settings` live values | PASS |
| 7 | OutletManagement / AddOutlet / OutletDetail | `/admin/outlets` CRUD (moved from public paths) | PASS |

## Fixes made during the trace

1. **Product filter returned empty with `brandId`** — aggregation `$match` doesn't cast strings to ObjectId; `listProducts` now casts brandId/categoryId (`catalogService.js`).
2. **Vendor/admin routes 403'd as "users only"** — `cartRoutes` used `router.use(protect, userOnly)` while mounted at `/`, intercepting `/vendor/*` and `/admin/*`; switched to per-route middleware.
3. **MyOrders navigated to OrderTracking with a groupId** — now goes to OrderDetail; tracking additionally accepts a groupId server-side.
4. Outlet admin APIs moved from public `/outlets` paths to `/admin/outlets/*` to match the backend authorisation.

## Remaining console.log check

`networks/shopping/` — clean (rewritten). Shopping screens — no debug spam added; pre-existing screens were already clean of network logging (their logs lived in the old dummy API layer, which was replaced).

`npx tsc --noEmit`: clean at every commit.
