# QA_SHOP_CUSTOMER — Shopping module, customer flows

Prompt 2 of `shopping.md`. Run 2026-08-06 against the real backend with the **Cougar + Outfitters**
seed (`seed-shopping.js`), logged in as seeded customers `shopper1/2.qa@metromatrix.pk`.

**Environment.** A local backend (`:5055`) against a local MongoDB (`:27018`), seeded fresh. The local
`.env` `MONGODB_URI` points at the **production Atlas** cluster, so it was overridden explicitly — a
sweep that places orders, debits wallets and mutates stock must not run against live demo data.

**Result: 89/89 checks pass.** One real product bug was found and fixed (category filter). Everything
else passed on first run or was a wrong assumption in the harness, corrected and re-run.

| Flow | Checks | Result |
|---|---|---|
| 1 — Discovery (filters, sorts, search, outlets) | 25 | 25 pass |
| 2 — Product, cart, wishlist, coupons | 21 | 21 pass |
| 3 — Checkout + wallet | 25 | 25 pass |
| 4 — Orders, tracking, returns, reviews | 18 | 18 pass |

---

## Bug found and fixed

### P1 — Tapping a parent category opened an empty store

**Expected.** `/brands/:id/categories` labels a parent category "Men (6)"; tapping it lists those 6 products.

**Actual.** `GET /products?categoryId=<Men>` returned **0** products, so any parent category opened an
empty store while advertising a non-zero count.

**Cause.** Categories are a 2-level tree and products hang off **leaf** categories only.
`buildCategoryTree` rolls child counts up into the parent (`parent.productCount += cat.productCount`),
but `buildProductQuery` matched `categoryId` **exactly**, which never matches a parent. The count was
descendant-aware; the filter was not.

**Fix.** `src/modules/shopping/services/catalogService.js` — when the requested category has children,
match the subtree:

```js
const children = await Category.find({ parentId: categoryId }).select('_id');
queryParams.categoryId = children.length
  ? { $in: [categoryId, ...children.map((c) => c._id)] }
  : categoryId;
```

**Verified.** Filtering by a parent now returns exactly the advertised `productCount`, and every row
belongs to that subtree; filtering by a leaf still returns exactly that leaf's count.

---

## Flow 1 — Discovery

Both seeded brands are listed and their stores load with theme and categories. Every filter and sort
was checked for *actually changing the result set*, not merely returning 200:

- `brandId` — every row belongs to that brand.
- `categoryId` — parent and leaf both return their advertised counts (see bug above).
- `minPrice` / `maxPrice` — narrow the set, and honour **effective price** (`salePrice ?? basePrice`),
  so a discounted product is filtered on what the customer actually pays.
- `isFeatured` / `isNewArrival` / `inStock` — each narrows the set and every returned row has the flag.
- Sorts `price_asc`, `price_desc`, `rating`, `newest`, `popular` — each verified genuinely ordered, and
  `price_asc` vs `price_desc` confirmed to return different orders (a sort that silently no-ops would
  otherwise pass).
- Search — a matching term returns hits; a non-matching term returns `total: 0` with an empty array
  rather than an error; regex metacharacters (`a+b(c)[d]*`) are escaped and return 200, not a 500.
- Outlets — both brands expose ≥2 outlets; outlet detail loads.

## Flow 2 — Product, cart, wishlist

- Product detail exposes variants; where `salePrice` is set it is below `basePrice`; reviews load publicly.
- **Out-of-stock variant is refused** with HTTP 400 naming stock.
- Adding the same variant twice **increments one line** (quantity 2, not two lines); a different variant
  adds a separate line; items from **both brands coexist** in one cart.
- Totals are recomputed server-side: `subtotal == Σ(unitPrice × quantity)` and
  `total == subtotal − discount + shipping`.
- Quantity update and line removal both apply.
- Coupons give **specific** reasons, not a generic failure: unknown code rejected; a coupon for the other
  brand rejected; a coupon below its `minOrderAmount` rejected with a message naming the minimum.
- Wishlist add / list / remove all work, and adding the same product twice does **not** duplicate it.

## Flow 3 — Checkout + wallet

Addresses create, list, and honour `isDefault`.

**Multi-brand wallet payment — rupee-exact.** Real numbers from the run:

```
cart shown to customer : subtotal 7978  discount 0  shipping 0  TOTAL 7978
order group ODX-G-73E02F72 : subtotal 7978  discount 0  shipping 0  TOTAL 7978

per-brand split
  Outfitters  ODX-O-9C089735   subtotal 4480   ship 0   total 4480
  Cougar      ODX-O-115D8F98   subtotal 3498   ship 0   total 3498
                                        SUM    7978  ==  group total 7978   EXACT MATCH

wallet: before 41876  −  7978  =  33898     actual after 33898              EXACT MATCH
ledger: debit 7978  source=shopping_payment  relatedTo=OrderGroup           amount matches order total
```

(Shipping is 0 because each brand's subtotal clears the free-shipping threshold — the per-brand shipping
rule was exercised separately in the cart-total arithmetic check.)

Also verified:

- One `OrderGroup` and **one `Order` per brand**; child totals sum to the group total exactly.
- Stock decremented by the ordered quantity on **every** line; cart cleared after checkout.
- Coupon `usedCount` increments on a completed order, and the discount is reflected in the group total.
- **Vendors are not credited at checkout.** Payout is deliberately deferred to delivery
  (`orderService.payoutVendor` → `WalletService.settlePayout`), so no `payout.settledAt` exists yet at
  this point. Vendor earnings are verified in `QA_SHOP_VENDOR.md`.
- **Insufficient balance**: rejected with a message naming the balance, **no partial debit**, and **no
  stock consumed**.
- **COD**: succeeds, leaves `paymentStatus: pending`, and does not touch the wallet.

## Flow 4 — Orders, tracking, returns, reviews

- My Orders loads; every status tab (`pending`, `confirmed`, `processing`, `shipped`, `delivered`,
  `cancelled`) returns only groups containing a child order in that status. Note the list is
  **group-level**: a multi-brand order appears under a tab when any of its per-brand orders matches.
- Order detail and tracking (with timeline) load.
- **Cancel** from an allowed state succeeds, marks the order cancelled, **refunds the exact order total**
  to the wallet, restores stock, and writes a `source=refund` credit linked to the order. Cancelling an
  already-cancelled order is rejected.
- **Reviews** are refused before delivery, accepted after, update the product's rating aggregate, and
  cannot be submitted twice for the same product.
- **Returns**: accepted inside the window, rejected outside it; the returns list loads.

## Ledger shape worth knowing

Payment and refund rows link to **different** entities, and that is correct:

| Row | `source` | `relatedTo.kind` |
|---|---|---|
| Payment | `shopping_payment` | `OrderGroup` (the customer pays once for the whole basket) |
| Refund | `refund` | `Order` (cancellation is per-brand, so refunds are per child order) |

## Not a bug

The API rate limiter (100 requests / 10 min) returns 429 under a sweep. That is correct production
behaviour; the backend already exposes `DISABLE_RATE_LIMIT=true`, honoured only when
`NODE_ENV !== 'production'`, which was used for this run.
