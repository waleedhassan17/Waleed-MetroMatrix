# Shopping Module — FYP Report Section (draft)

Everything below is implemented and verifiable in the two repositories. File paths are given as evidence. Gaps are listed honestly at the end.

## 1. Module overview

The Shopping module turns MetroMatrix into a multi-vendor storefront alongside Healthcare and Home Services. Three roles:

- **Customer (User):** browses brands and products, maintains a cart across multiple brands, checks out once, pays by MetroMatrix Wallet or cash-on-delivery, tracks per-brand orders, requests returns, writes verified-purchase reviews.
- **Vendor (Provider, `providerType='vendor'`):** owns exactly one Brand profile; manages catalogue, inventory, coupons and reviews; fulfils orders through a controlled status pipeline; receives wallet payouts minus platform commission on delivery.
- **Admin:** approves/suspends brands, oversees every order, can force status changes and issue manual refunds (both audited), manages outlets, and sets the platform parameters (commission, shipping rule, thresholds) that the live checkout reads.

Frontend: 47 React Native screens (36 pre-existing + 11 built in this phase), each with a Redux Toolkit slice (`screens/Shopping/**`, `screens/admin/Shopping/**`). Backend: a self-contained Express module (`src/modules/shopping/` — 14 models, 6 services, 10 controllers, 6 routers) mounted at `/api/shopping` (`src/app.js`), deployed on Vercel serverless (`api/index.js`, `vercel.json`).

## 2. Data model (for the class/ER diagram)

| Collection | Purpose | Key relationships |
|---|---|---|
| Brand | vendor storefront profile, theme, policies, status enum pending/active/suspended | owner → Provider; approvedBy → Admin |
| ShoppingCategory | 2-level tree per brand | brandId → Brand; parentId → self |
| ShoppingProduct | catalogue item with variant subdocuments (size/colour/stock/sku), denormalised rating | brandId, categoryId |
| Outlet | physical store with GeoJSON point (2dsphere) | brandId |
| ShoppingCart | one per user; lines pin variant + unitPrice at add time | userId; items.product |
| ShoppingCoupon | percentage/fixed, validity window, usage limit, optional brand scope | brandId? |
| ShoppingWishlist | one per user | items.product |
| ShoppingAddress | saved shipping addresses with isDefault | userId |
| ShoppingOrderGroup | what the customer pays once: totals, payment, address snapshot | orders[] → ShoppingOrder; walletTransactionId |
| ShoppingOrder | one brand's slice: own status, tracking, append-only statusHistory, vendorPayout | orderGroup, brandId, userId |
| ShoppingReturnRequest | return with item subset, window enforced from deliveredAt | order, brandId, userId |
| ShoppingProductReview | verified purchase; unique (product,user,order) | productId, order |
| ShoppingInventoryLog | append-only stock adjustments | brandId, variantId |
| ShoppingAuditLog | who/what/before/after/reason for every admin mutation | admin |

Files: `src/modules/shopping/models/*.js`. Platform settings live in the existing `AdminSettings` singleton under a `shopping` sub-document (`src/models/AdminSettings.js`) — the same values the checkout and inventory code read (`settingsService.js`), no duplicated constants.

## 3. Multi-vendor single-checkout design

`Cart → OrderGroup → N per-brand Orders.`

The cart may contain items from any number of brands. Checkout (`checkoutService.js`) produces one **OrderGroup** — the thing the customer sees and pays once — and one **Order per distinct brand**, which is what each vendor sees and fulfils independently with its own status and tracking number. Discounts split proportionally to brand subtotals using largest-remainder allocation so child totals always reconcile exactly to the group total (unit-tested); brand-scoped coupons land entirely on their brand's order. Chosen because a single `Order` with one `brandId` cannot represent a cross-brand checkout, and giving vendors visibility only into their own slice falls out of the model for free — the same design used by production marketplaces.

Checkout hardening: every line revalidated against live stock/brand state; all totals recomputed server-side; stock decremented with an atomic `$elemMatch + $inc` guard so concurrent checkouts cannot oversell; compensating rollback on failure (documented in code — the shared Atlas tier does not support multi-document transactions).

## 4. Order lifecycle (9 states)

```
pending → confirmed → processing → shipped → out_for_delivery → delivered → returned → refunded
pending/confirmed/processing → cancelled          cancelled, refunded terminal
```

Single source of truth: `ALLOWED_TRANSITIONS` + `transition()` in `orderService.js`. Actor rules: the owning **vendor** drives fulfilment; the **customer** may only cancel and only while pending/confirmed; the **admin** may force any legal transition, recorded in the append-only `statusHistory` with admin id and a mandatory reason. Illegal moves throw 400. Side effects ride the transition: cancel restores stock and refunds a paid wallet order; delivered captures COD payment and credits the vendor's wallet minus commission; refunded reverses the payout. 31 unit tests cover legal/illegal moves and actor rules (`__tests__/orders.test.js`).

## 5. Vendor onboarding

No new authentication was built. A vendor is an existing `Provider` with `providerType='vendor'` that has passed the pre-existing two-step pipeline: email verification (FR-04) and admin approval (FR-06); `checkDocumentsComplete()` already requires businessLicense + nationalIdCard for vendors (`src/models/Provider.js`). A Brand is a profile document owned by an approved vendor; new brands start `pending` unless the admin enables auto-approval, and the admin approve/suspend loop closes inside BrandManagementScreen.

## 6. Endpoint summary

~70 endpoints under `/api/shopping`, grouped: public catalogue (10), customer cart/coupons/wishlist (11), checkout/orders/addresses/reviews (13), vendor (24), admin (20). Full table with methods, params, response shapes and error cases: `SHOPPING_API.md` (backend repo). All responses use the `PaginatedResponse<T>` / `SingleResponse<T>` envelopes from `types/shopping.ts`, field-for-field — the frontend has no adapter layer.

## 7. Screen inventory

- **Customer (21):** ShoppingHome, BrandList, BrandStore, CategoryList, ProductList, ProductSearch, ProductDetail, ProductReviews, Cart, Wishlist, CheckoutAddress/Delivery/Payment/Review, OrderConfirmation, MyOrders, **OrderDetail**, OrderTracking, ReturnRequest, WriteReview, **AddressSelection**, **PaymentSelection**, **CouponList**, **ShoppingTabs** (bold = built this phase).
- **Vendor (14):** BrandHome, BrandProducts, ProductForm, Inventory, BrandOrders, ProcessOrder, ReturnRequests, BrandDeliveries, BrandAnalytics, **BrandTabs**, **BrandProfile**, **BrandSettings**, **BrandCoupons**, **AddCoupon**, **BrandReviews**.
- **Admin (11):** BrandManagement (+approve/suspend), AddBrand, EditBrand, OutletManagement, AddOutlet, OutletDetail, **AdminShoppingDashboard**, **AdminShoppingOrders**, **AdminShoppingOrderDetail**, **AdminShoppingAnalytics**, **AdminShoppingSettings**.

## 8. Proposed functional requirements (FR-21 onwards)

| FR | Requirement | Status |
|---|---|---|
| FR-21 | Customers shall browse active brands and filter/sort their products (price, rating, recency, popularity, stock, price range, text search). | Implemented |
| FR-22 | Customers shall maintain a server-side cart that may span multiple brands; all totals computed server-side. | Implemented |
| FR-23 | The system shall validate coupons (validity window, usage limit, minimum order, discount cap, brand scope) and report a specific reason for every rejection. | Implemented |
| FR-24 | A single checkout shall produce one payment and one order per brand, with totals that reconcile exactly. | Implemented |
| FR-25 | The system shall prevent overselling under concurrent checkouts via atomic stock guards. | Implemented |
| FR-26 | Customers shall pay by wallet (debited at checkout) or COD (captured at delivery). | Implemented |
| FR-27 | Orders shall follow a 9-state lifecycle with role-restricted transitions and an append-only history. | Implemented |
| FR-28 | Vendors shall manage only their own brand's catalogue, inventory, orders, coupons and analytics; cross-brand access shall be denied. | Implemented (tested 403) |
| FR-29 | Vendors shall be credited order value minus platform commission when an order is delivered; refunds shall reverse the payout. | Implemented |
| FR-30 | Customers shall request returns within the brand's return window; approved refunds restore stock and credit the wallet. | Implemented |
| FR-31 | Only customers with a delivered order containing a product may review it (verified purchase, one review per product per order). | Implemented |
| FR-32 | Admins shall approve/suspend brands; suspension immediately hides the brand's storefront. | Implemented |
| FR-33 | Admins shall view all orders, force status changes and issue manual refunds, with every action audited (who/what/before/after/reason). | Implemented |
| FR-34 | Platform parameters (commission %, shipping rule, low-stock threshold, return window, brand auto-approval) shall be admin-configurable and drive live behaviour. | Implemented |

## 9. Honest "not implemented / FYP-II" list

- **Card payments** — only wallet and COD; no Stripe card flow inside shopping checkout (wallet top-up via Stripe exists elsewhere in the app).
- **Conversion-rate analytics** — reported as 0; no traffic/impression tracking exists to compute it.
- **Push notifications** for order status changes — statusHistory exists, no push wiring.
- **Vendor payout withdrawal** — earnings land in the Provider wallet; bank settlement/payout scheduling is out of scope.
- **Return pickup logistics** — return states exist; no courier integration for pickups (as with forward shipping, which is tracking-number-only).
- **Product image upload from the vendor app UI** — the endpoint exists (`/vendor/products/:id/images`); ProductForm sends image URLs but has no camera/gallery picker yet.
- **Delivery-options screen** is display-only; the shipping fee actually charged comes from the server rule, not the selected option.
- **Multi-warehouse stock / stock reservations** — single stock pool per variant; reservation happens only at checkout decrement.
- **Mongo transactions** — compensating rollback used instead (shared Atlas tier); a paid-tier replica set would allow true multi-document transactions.
