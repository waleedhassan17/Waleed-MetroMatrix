# SHOPPING_SPEC.md — MetroMatrix Shopping Module Contract

This is the contract both repos build against.
Frontend: `Waleed-MetroMatrix` (Expo SDK 54, TS, Redux Toolkit). Backend: `MetroMatrix-Backend` (Express + Mongoose).
`types/shopping.ts` is **authoritative** for field names and response shapes. The backend serializes to it exactly — no adapter layer on the frontend.

---

## 1. SCREEN INVENTORY

Legend — data source today: **DUMMY** = calls `networks/shopping/*Api` which returns from `dummyData.ts`; **LOCAL** = slice holds local/hardcoded state, no API module at all; **MIXED** = some of both.

### User (19 screens built)

| Screen (path under `screens/Shopping/User/`) | API functions called | Slice / thunks | Source |
|---|---|---|---|
| ShoppingHome | `fetchBrandsApi`, `fetchProductsApi` | `shoppingHomeSlice` — `fetchHomeData`, `refreshHomeData` | DUMMY (banners hardcoded from `SHOPPING_BANNERS`) |
| BrandList | `fetchBrandsApi` | `brandListSlice` | DUMMY |
| BrandStore | `fetchBrandByIdApi`, `fetchBrandCategoriesApi`, `fetchProductsApi` | `brandStoreSlice` | DUMMY |
| CategoryList | `fetchBrandCategoriesApi` | `categoryListSlice` | DUMMY |
| ProductList | `fetchProductsApi` | `productListSlice` | DUMMY |
| ProductSearch | `searchProductsApi` | `productSearchSlice` | DUMMY |
| ProductDetail | `fetchProductByIdApi` | `productDetailSlice` | DUMMY |
| ProductReviews | `fetchProductReviewsApi` | `productReviewsSlice` | DUMMY |
| Cart | none | `cartSlice` — pure local reducers (`addItem`, `removeItem`, `updateQuantity`), `applyCouponAsync` validates against a **hardcoded coupon table** | LOCAL |
| Wishlist | none | `wishlistSlice` — local reducers only | LOCAL |
| CheckoutAddress | none | `checkoutAddressSlice` — `fetchAddresses` returns hardcoded list | LOCAL |
| CheckoutDelivery | none | `checkoutDeliverySlice` — `fetchDeliveryOptions` hardcoded | LOCAL |
| CheckoutPayment | none | `checkoutPaymentSlice` — `fetchPaymentMethods` hardcoded, fake wallet balance | LOCAL |
| CheckoutReview | none | `checkoutReviewSlice` — `placeOrder` fabricates an order locally, dispatches `myOrders/addOrder` | LOCAL |
| OrderConfirmation | none | `orderConfirmationSlice` — display-only | LOCAL |
| MyOrders | none | `myOrdersSlice` — in-memory list fed by `placeOrder` | LOCAL |
| OrderTracking | none | `orderTrackingSlice` — hardcoded tracking steps | LOCAL |
| ReturnRequest | none | `returnRequestSlice` — form state only, no submit API | LOCAL |
| WriteReview | none | `writeReviewSlice` — form state only, no submit API | LOCAL |

### Vendor / Brand (9 screens built)

| Screen (`screens/Shopping/Brand/`) | API functions | Slice | Source |
|---|---|---|---|
| BrandHome | none | `brandHomeSlice` — hardcoded dashboard tiles | LOCAL |
| BrandProducts | none (imports `OUTFITTERS_PRODUCTS` directly) | `brandProductsSlice` | LOCAL/DUMMY |
| ProductForm | none | `productFormSlice` — form state, no create/update call wired | LOCAL |
| Inventory | none | `inventorySlice` — hardcoded rows | LOCAL |
| BrandOrders | none (imports `SAMPLE_ORDERS` directly) | `brandOrdersSlice` | LOCAL/DUMMY |
| ProcessOrder | none | `processOrderSlice` — local status change | LOCAL |
| ReturnRequests | none | `returnRequestsSlice` — hardcoded | LOCAL |
| BrandDeliveries | none | `brandDeliveriesSlice` — hardcoded shipments/courier stats | LOCAL |
| BrandAnalytics | none | `brandAnalyticsSlice` — hardcoded `RevenuePoint[]`, `TopProduct[]`, `CategoryBreakdown[]`, `FinancialSummary` | LOCAL |

### Admin (6 screens built)

| Screen (`screens/admin/Shopping/`) | API functions | Slice | Source |
|---|---|---|---|
| BrandManagement | `fetchBrandsApi`, `deleteBrandApi` | `brandManagementSlice` | DUMMY |
| AddBrand | `createBrandApi` | `addBrandSlice` | DUMMY |
| EditBrand | `fetchBrandByIdApi`, `updateBrandApi` | `editBrandSlice` | DUMMY |
| OutletManagement | `fetchOutletsApi`, `deleteOutletApi`, `toggleOutletStatusApi` | `outletManagementSlice` | DUMMY |
| AddOutlet | `createOutletApi`, `updateOutletApi` | `addOutletSlice` | DUMMY |
| OutletDetail | `fetchOutletByIdApi`, `assignBrandToOutletApi`, `updateOutletColorSchemeApi` | `outletDetailSlice` | DUMMY |

**Key structural fact:** the entire checkout/cart/order flow on the user side and the entire vendor side are *local state only* — they never touch even the dummy API layer. S6 must introduce real thunks for these, not just swap a base URL.

`networks/shopping/shoppingAxios.ts` exists, injects admin→user token fallback, handles 401 — and **nothing imports it** today.

---

## 2. MISSING SCREENS

Declared in ParamLists (`types/shopping.ts`) + route names (`navigation-maps/Shopping.ts`) but with **no screen file and no `Stack.Screen`**:

### User (`ShoppingStackParamList`)
| Route | Must do |
|---|---|
| `ShoppingTabs` | Bottom-tab shell (Home, Categories, Cart+badge, Wishlist, Orders). No tab shell exists for shopping today. |
| `OrderDetail { orderId }` | Full order-group view: per-brand sub-orders with independent statuses, items, totals, payment, address; actions cancel / return / reorder / review. MyOrders currently navigates nowhere. |
| `OrderList` | Alias for MyOrders in the ParamList — **decision: keep MyOrders as the screen, do not build OrderList** (register nothing; remove usage if any). |
| `CouponList { brandId? }` | Available coupons for current cart, apply/remove, per-coupon rejection reason. |
| `AddressSelection` | Saved-address CRUD + select + default. CheckoutAddress should navigate here rather than re-implement. |
| `PaymentSelection { orderId? }` | Wallet vs COD, live wallet balance, block wallet if insufficient. |

### Vendor (`BrandStackParamList`)
| Route | Must do |
|---|---|
| `BrandTabs` | Tab shell: Dashboard, Products, Orders, Analytics, Profile. |
| `BrandProfile` | View/edit identity: name, tagline, description, logo, banner, theme colours, contact, social. Cloudinary upload flow. |
| `BrandSettings` | Policies (returnDays, shippingInfo, paymentMethods), active toggle. |
| `BrandCoupons` / `AddCoupon { couponCode? }` | List/create/edit/deactivate my coupons. |
| `BrandReviews` | Reviews across my products, filter by rating. |

### Admin (`AdminShoppingParamList`)
| Route | Must do |
|---|---|
| `AdminShoppingDashboard` | Entry tiles: pending brand approvals, orders today, GMV today, open returns, low-stock alerts. |
| `AdminShoppingOrders` | All orders, filters (brand/status/paymentStatus/date/customer), paginated. |
| `AdminShoppingOrderDetail { orderId }` | Order group detail + statusHistory timeline + force-transition + manual refund (audited, confirm dialogs). |
| `AdminShoppingAnalytics` | GMV series, revenue by brand, commission, orders by status, top products, return rate. |
| `AdminShoppingSettings` | Commission %, shipping rule, low-stock threshold, return window, vendor auto-approve. |

---

## 3. API CONTRACT

Base: `/api/shopping` (mounted in `src/app.js` beside healthcare). All responses use **exactly**:

```ts
PaginatedResponse<T> = { success: true, data: T[], pagination: { page, limit, total, pages } }
SingleResponse<T>    = { success: true, data: T }
Errors               = { success: false, error: string, errors?: [{ field: msg }] }  // 4xx/5xx
```

**ID convention:** Mongo `_id` is serialized as the domain id (`brandId`, `productId`, `outletId`, `orderId`, `categoryId`, `variantId`, `itemId`, `reviewId`, `addressId`, `returnId`) via `toJSON` transforms. `odexId` is a human-readable code (`ODX-B-xxxx`, `ODX-P-xxxx`, `ODX-O-xxxx`) generated at create.

**Auth tokens:** the shared `protect` middleware (User / Provider / Admin by JWT). Roles: *customer* = User; *vendor* = Provider with `providerType='vendor'`, `adminVerified.status='approved'`; *admin* = Admin with `shopping` permission.

### 3.1 Public / customer catalogue (auth optional)

| FE function | Endpoint |
|---|---|
| `fetchBrandsApi({page,limit})` | `GET /brands?page&limit` → `PaginatedResponse<BrandConfig>` (active only) |
| `fetchBrandByIdApi(brandId)` | `GET /brands/:brandId` → `SingleResponse<BrandConfig>` |
| `fetchBrandBySlugApi(slug)` | `GET /brands/slug/:slug` → `SingleResponse<BrandConfig>` |
| `fetchBrandCategoriesApi(brandId)` | `GET /brands/:brandId/categories` → `{ success, data: Category[] }` (tree, 2 levels) |
| — | `GET /categories/:categoryId` → `SingleResponse<Category>` |
| `fetchProductsApi(FetchProductsParams)` | `GET /products?brandId&categoryId&search&sortBy&minPrice&maxPrice&inStock&isFeatured&isNewArrival&page&limit` → `PaginatedResponse<Product>` |
| `fetchProductByIdApi(id)` | `GET /products/:productId` → `SingleResponse<Product>` |
| `searchProductsApi(q,{brandId,page,limit})` | same as products with `search=q` |
| `fetchProductReviewsApi(id,{page,limit})` | `GET /products/:productId/reviews?page&limit` → `PaginatedResponse<ProductReview>` |
| `fetchOutletsApi({page,limit,brandId})` | `GET /outlets?page&limit&brandId&city&lat&lng&radiusKm` → `PaginatedResponse<OutletConfig>` |
| `fetchOutletByIdApi(id)` | `GET /outlets/:outletId` → `SingleResponse<OutletConfig>` |

`sortBy ∈ price_asc | price_desc | rating | newest | popular` (popular = totalReviews desc, default).

### 3.2 Cart / coupons / wishlist (customer auth)

| Endpoint | Notes |
|---|---|
| `GET /cart` → `SingleResponse<Cart>` | creates empty cart lazily |
| `POST /cart/items { productId, variantId, quantity }` → `SingleResponse<Cart>` | brandId derived server-side; same (product,variant) increments |
| `PATCH /cart/items/:itemId { quantity }` → `SingleResponse<Cart>` | |
| `DELETE /cart/items/:itemId` → `SingleResponse<Cart>` | |
| `DELETE /cart` → `{ success: true }` | clear |
| `POST /cart/coupon { couponCode }` → `SingleResponse<Cart>` | user-facing message on every rejection |
| `DELETE /cart/coupon` → `SingleResponse<Cart>` | |
| `GET /coupons?brandId` → `{ success, data: Coupon[] }` | active coupons visible to customer |
| `GET /wishlist` → `{ success, data: WishlistItem[] }` | (FE also wants product cards — items are populated with `product` object; see Open Q3) |
| `POST /wishlist/:productId` / `DELETE /wishlist/:productId` → `{ success, data: WishlistItem[] }` | |

Server always recomputes `subtotal`, `discount`, `shippingFee`, `total`. Shipping rule (FYP scope, single exported constant): **PKR 150 per brand in cart; free for a brand's lines when that brand's subtotal ≥ PKR 3000** (matches `cartSlice` local logic).

### 3.3 Checkout & orders (customer auth)

```
Cart → OrderGroup (customer-facing, carries payment)
     → N Order docs, one per brand (vendor-facing, own status + tracking)
```

| Endpoint | Notes |
|---|---|
| `POST /checkout { addressId? , shippingAddress?, paymentMethod: 'wallet'|'cod', deliveryOptionId? }` → `SingleResponse<OrderGroupView>` | revalidate lines, recompute totals, atomic `$inc` stock guard, split per brand, wallet debit or COD, clear cart, coupon usedCount++ |
| `GET /orders?page&limit&status` → `PaginatedResponse<OrderGroupView>` | my order groups |
| `GET /orders/:groupId` → `SingleResponse<OrderGroupView>` | also accepts a child orderId (resolves to its group) |
| `GET /orders/:orderId/tracking` → `{ success, data: { orderId, orderStatus, trackingNumber, statusHistory[] } }` | |
| `POST /orders/:orderId/cancel { reason }` → `SingleResponse<Order>` | customer, only pending/confirmed |
| `POST /orders/:orderId/return { items[], reason, images[] }` → `SingleResponse<ReturnRequest>` | within brand returnDays of delivered |
| `GET/POST /addresses`, `PATCH/DELETE /addresses/:addressId` → `SingleResponse<Address>` / list | isDefault flag |
| `POST /products/:productId/review { rating, title?, comment, images? }` → `SingleResponse<ProductReview>` | delivered order containing product required; one review per product per order |

`OrderGroupView` = `{ groupId, odexId, userId, orders: Order[], shippingAddress, paymentMethod, paymentStatus, subtotal, discount, shippingFee, total, appliedCoupon?, createdAt }` — each child `Order` matches the `Order` interface exactly.

**Order state machine** (single source: `orderService.js`):

```
pending → confirmed | cancelled
confirmed → processing | cancelled
processing → shipped | cancelled
shipped → out_for_delivery
out_for_delivery → delivered
delivered → returned
returned → refunded
cancelled, refunded terminal
```
Actors: vendor drives confirmed→…→delivered (and pending→confirmed); customer may cancel only pending/confirmed; admin may force-transition (recorded in statusHistory with admin id + mandatory reason).

**Payment:** existing Wallet (`ownerType: 'User'`/`'Provider'`). wallet: debit customer at checkout, WalletTransaction linked to OrderGroup, group+children `paid`. cod: `pending` until vendor marks delivered. Vendor payout: credit vendor wallet at `delivered` minus platform commission (from ShoppingSettings). Refund: credit customer wallet, reverse vendor payout if already made.

### 3.4 Vendor `/vendor/*` (requireVendor + requireBrandOwner)

| Endpoint | |
|---|---|
| `POST /vendor/brand` | create my brand (status `pending` unless auto-approve setting) |
| `GET /vendor/brand` / `PATCH /vendor/brand` | my brand profile/theme/policies/social |
| `POST /vendor/brand/logo` / `POST /vendor/brand/banner` | existing Cloudinary upload middleware |
| `GET /vendor/products?page&limit&search&stockStatus` | my products |
| `POST /vendor/products` / `PATCH /vendor/products/:productId` / `DELETE /vendor/products/:productId` (soft: isActive=false) | |
| `POST /vendor/products/:productId/images` | |
| `GET /vendor/categories` / `POST /vendor/categories` / `PATCH /vendor/categories/:categoryId` / `DELETE /vendor/categories/:categoryId` | scoped to my brand |
| `GET /vendor/inventory` | per-variant rows + lowStock/outOfStock flags (threshold from settings) |
| `PATCH /vendor/inventory/:variantId { stockQuantity, reason }` | appends InventoryLog |
| `POST /vendor/inventory/bulk` | batch |
| `GET /vendor/orders?status&page&limit` / `GET /vendor/orders/:orderId` | my brand's orders |
| `PATCH /vendor/orders/:orderId/status { status, note?, trackingNumber? }` | via state machine, actor=vendor |
| `GET /vendor/returns` / `PATCH /vendor/returns/:returnId { status, vendorNote }` | approve→restock + wallet refund |
| `GET /vendor/coupons` / `POST /vendor/coupons` / `PATCH /vendor/coupons/:couponCode` | my coupons |
| `GET /vendor/reviews?rating&page&limit` | reviews across my products |
| `GET /vendor/analytics?from&to` | shape matches `brandAnalyticsSlice`: `{ revenueSeries: RevenuePoint[], ordersByStatus, topProducts[], categoryBreakdown[], summary: { totalRevenue, totalOrders, avgOrderValue, returnRate, lowStockCount } }` |
| `GET /vendor/dashboard` | BrandHome tiles: todayRevenue, todayOrders, pendingOrders, lowStock, totalProducts, rating |

### 3.5 Admin `/admin/*` (adminOnly + `shopping` permission)

| Endpoint | |
|---|---|
| `GET /admin/brands?status&search&page&limit` | all brands |
| `GET /admin/brands/:brandId` | + owner Provider, productCount, orderCount, revenue |
| `POST /admin/brands` / `PATCH /admin/brands/:brandId` / `DELETE /admin/brands/:brandId` (soft) | AddBrand/EditBrand screens |
| `PATCH /admin/brands/:brandId/status { status: active|suspended|pending, reason }` | suspend hides brand+products from customer endpoints immediately |
| `GET/POST /admin/outlets`, `GET/PUT/DELETE /admin/outlets/:outletId`, `PATCH …/assign-brand`, `PATCH …/color-scheme`, `PATCH …/toggle-status` | matches outletApi.ts exactly |
| `GET /admin/orders?brandId&status&paymentStatus&from&to&search&page&limit` | all orders |
| `GET /admin/orders/:orderId` | full detail: group, statusHistory, customer, vendor, payment trail |
| `PATCH /admin/orders/:orderId/status { status, reason }` | force-transition, audited |
| `POST /admin/orders/:orderId/refund { reason }` | wallet refund + audit |
| `GET /admin/analytics?from&to` | GMV series, revenueByBrand top10, commission, ordersByStatus, newCustomers, activeBrands, AOV, returnRate, topProducts |
| `GET /admin/dashboard` | pendingBrandApprovals, ordersToday, gmvToday, openReturns, lowStockAlerts |
| `GET /admin/settings` / `PATCH /admin/settings` | `shopping` section of AdminSettings: `commissionPercent`, `shippingFeePerBrand`, `freeShippingThreshold`, `lowStockThreshold`, `defaultReturnDays`, `autoApproveBrands` — the SAME doc checkout/inventory reads |

Every admin mutation → `ShoppingAuditLog { admin, action, targetType, targetId, before, after, reason, at }`.

---

## 4. DATA MODEL (MongoDB, `src/modules/shopping/models/`)

| Collection | Fields (beyond the TS interface) | Indexes |
|---|---|---|
| **Brand** | all `BrandConfig` fields; `owner` (ref Provider, indexed, required for vendor-created, nullable for admin-created); `status` enum `[pending, active, suspended]` (serialized: `isActive = status==='active'`); `approvedBy` (ref Admin), `approvedAt`; `isDeleted` | unique `slug`; `owner`; `status` |
| **Category** | `Category` fields; `brandId` (ref Brand); `parentId` (self-ref, 2-level); `isActive`. `children`/`productCount` computed at read | unique `(brandId, slug)` |
| **Product** | `Product` fields; `variants[]` subdocs (each gets `_id`→`variantId`); `isActive`; `rating`+`totalReviews` denormalised; `inStock` derived (any variant stock>0) but stored for filtering | `(brandId, categoryId)`; text `(name, description, tags)`; `isFeatured`; `isNewArrival`; `createdAt` |
| **Outlet** | `OutletConfig` fields; `location.coordinates` GeoJSON Point | `2dsphere(geo)`; `brandId`; unique `slug` |
| **Cart** | `userId` (ref User); `items[]` `{ product, variantId, quantity, unitPrice }`; `appliedCoupon` (code); totals computed on serialize | unique `userId` |
| **Coupon** | `Coupon` fields; `brandId?` (ref); `isActive`; `createdBy` | unique `couponCode` (upper) |
| **Wishlist** | `userId`; `items[] { product, brandId, addedAt }` | unique `userId` |
| **Address** | `ShippingAddress` fields + `userId`, `isDefault`, `label?` | `userId` |
| **OrderGroup** | `odexId`; `userId`; `orders[]` (ref Order); `shippingAddress` (snapshot); `paymentMethod`; `paymentStatus`; `subtotal/discount/shippingFee/total`; `appliedCoupon?`; `walletTransactionId?` | `userId`, `createdAt` |
| **Order** | matches `Order` interface + `orderGroup` (ref); `statusHistory[] { status, changedBy { id, role }, changedAt, note }` append-only; items snapshot productName/image/variantLabel/prices | `(brandId, orderStatus)`; `userId`; `orderGroup`; `createdAt` |
| **ReturnRequest** | `order` (ref); `userId`; `brandId`; `items[]`; `reason`; `images[]`; `status [requested, approved, rejected, picked_up, refunded]`; `vendorNote?` | `brandId`, `userId` |
| **ProductReview** | `ProductReview` fields + `order` (ref, enforces one per product per order) | unique `(productId, userId, order)`; `productId` |
| **InventoryLog** | `variantId`, `product`, `brandId`, `delta`, `newQuantity`, `reason`, `actor`, `at` | `brandId`, `at` |
| **ShoppingAuditLog** | `admin`, `action`, `targetType`, `targetId`, `before`, `after`, `reason`, `at` | `at` |

Settings live in the existing `AdminSettings` singleton under a new `shopping` sub-document (not a new collection).

---

## 5. OPEN QUESTIONS → DECISIONS

1. **Single `brandId` on Order vs multi-brand checkout.** RESOLVED: `Cart → OrderGroup → N per-brand Orders`. The customer sees/pays the group once; each vendor fulfils only their own Order with independent status/tracking. Trade-off: customer-facing "an order" is a group whose children can be in different states — OrderDetail must render per-brand sections; `GET /orders` returns groups. This matches how real marketplaces (Daraz/Amazon) model it and keeps vendor isolation trivial.
2. **Vendor identity.** RESOLVED: no new auth. Vendor = existing `Provider` with `providerType='vendor'` through the existing email-verify + admin-approval pipeline (`checkDocumentsComplete()` already demands businessLicense + nationalIdCard). A Brand is a profile document owned by an approved vendor Provider. Admin-created brands (AddBrandScreen) have `owner=null` until claimed/assigned.
3. **Wishlist shape.** `WishlistItem` in TS has only ids; the Wishlist screen renders product cards. Backend returns items with a populated `product` object as an **extra** field (additive, doesn't break the interface).
4. **`OrderList` route** is a duplicate of MyOrders — not built; ParamList keeps the key (harmless) but nothing registers it.
5. **`Checkout` route** already maps to CheckoutAddressScreen; `AddressSelection` becomes the saved-address manager the checkout flow pushes to.
6. **Coupon scope at checkout:** a brand-scoped coupon discounts only that brand's lines; a platform coupon discounts the whole cart, split across child orders proportionally to their subtotals (largest-remainder rounding so the split reconciles to the group discount exactly).
7. **Envelope divergence:** the rest of the backend uses ad-hoc envelopes; shopping uses the FE's `{success,data,pagination}` exactly, as required.
8. **`shoppingAxios.ts` base URL** is hardcoded to Heroku. S6 moves it to a single shared config so dev/prod hosts are switchable app-wide.
