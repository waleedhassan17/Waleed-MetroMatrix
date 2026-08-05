# QA_SHOP_VENDOR — Shopping module, vendor flows

Prompt 3 of `shopping.md`. Run 2026-08-06 against the real backend with the **Cougar + Outfitters** seed,
logged in as both seeded vendors (`vendor.outfitters@` and `vendor.cougar@metromatrix.pk`).

**Environment.** Local backend (`:5055`) against a local MongoDB (`:27018`). The local `.env`
`MONGODB_URI` points at **production Atlas**, so it was overridden — this sweep mutates stock, moves
money and force-transitions orders.

**Result: 76/76 checks pass.** Two real bugs were found and fixed (bulk stock update reporting success
for rejected rows; stock double-restored on refunded returns). Backend suite: **230/230**.

| Flow | Checks | Result |
|---|---|---|
| 1 — Onboarding & brand | 8 | 8 pass |
| 2 — Catalogue & inventory | 16 | 16 pass |
| 3 — **Cross-brand isolation** | 16 | 16 pass |
| 4 — Orders, lifecycle, earnings, returns | 24 | 24 pass |
| 5 — Coupons, reviews, analytics | 12 | 12 pass |

---

## Headline: cross-brand isolation holds

The P0 test. Logged in as the **Outfitters** vendor, every read and write aimed at **Cougar** data was
refused, and the reverse direction too. Nothing leaked and nothing was written.

| Attempt (Outfitters vendor → Cougar data) | Result |
|---|---|
| Modify Cougar product | refused |
| Delete Cougar product | refused |
| Read Cougar order | refused |
| Modify Cougar order status | refused |
| Modify Cougar inventory (single variant) | refused |
| **Modify Cougar inventory (bulk)** | refused *(was reporting 200 — see bug 1)* |
| Modify Cougar category | refused |
| Modify Cougar coupon | refused |
| Cougar vendor → modify an Outfitters product (reverse) | refused |

Also verified by reading the DB afterwards: the Cougar product's name and its variant's stock were
**byte-for-byte unchanged** after the whole attack sequence. List endpoints are scoped both ways (0
foreign rows in either vendor's product or order list), and on a genuine **multi-brand order** the
Outfitters vendor can open its own half and is refused the Cougar half.

The mechanism is sound: `requireBrandOwner` loads the vendor's brand onto `req.brand`, and every
per-id lookup is written as `findOne({ _id: ..., brandId: req.brand._id })`, so a foreign id simply
isn't found. Isolation is enforced by the query, not by a check that could be forgotten.

---

## Bugs found and fixed

### P1 — Bulk stock update reported success for rows it had rejected

**Expected.** A bulk stock update naming a variant the vendor doesn't own is refused, like its
single-variant sibling (`PATCH /vendor/inventory/:variantId` → 404).

**Actual.** `POST /vendor/inventory/bulk` returned **HTTP 200** while every row inside had failed. The
rejections were reported only inside the per-row array, so a vendor would see "stock updated" when
nothing was updated.

**Not a data leak.** `applyStockChange` is brand-scoped and the write never landed — the isolation
check confirmed the Cougar variant's stock was unchanged. The bug was the *honesty of the response*.

**Fix.** `vendorCatalogController.bulkUpdateStock` now partitions rows into applied and failed. If any
row fails it returns a failure — the row's own status when nothing applied, otherwise 400 naming how
many of how many landed — with the failed rows in the `errors` array. Full success still returns the
applied array, matching the existing frontend type.

### P1 — Refunding a return restored stock twice

**Expected.** A returned order puts back exactly the units that came back.

**Actual.** Traced through a real order: 2 units ordered, **4** units returned to stock. Stock drifted
**+2 on every refunded return** — inventory silently inflating over time.

```
stock before order    : 20
after order placed    : 18   (correct, −2)
after return refunded : 22   (WRONG — expected 20, drift +2)
```

**Cause.** Two owners restored the same stock. `updateReturnRequest` restores `request.items`, then
calls `orderService.transition(order, 'refunded')`, whose `refunded` branch called `restoreStock(order)`
over the *whole* order. The comment there asserted "no double-restore" — it was reasoning about the
`cancelled` path and missed that the return controller had already restored.

**Fix.** The return flow keeps ownership, because a `ReturnRequest` knows which lines actually came
back and a **partial return must not restore the whole order**. It now passes `stockAlreadyRestored:
true` and `transition` skips its own restore. Admin force-transitions pass nothing and are still
restored there, so that path is unaffected.

**Verified.** Same trace re-run: 2 ordered, 2 restored, final stock exactly equal to the opening figure,
and the customer refunded the exact order total.

---

## Flow 1 — Onboarding & brand

Dashboard loads and its KPI tiles were checked against the DB, not merely rendered: `kpis.orders` and
`kpis.products` both match `countDocuments` for that brand. Brand profile edits (tagline, `primaryColor`)
save and are **visible customer-side** on `/brands/:id`. A vendor whose `adminVerified` is flipped to
`pending` is blocked from vendor routes with a 403 naming approval, and regains access when approved.

## Flow 2 — Catalogue & inventory

Product creation with variants works, and validation rejects each bad case: missing required fields,
negative price, `salePrice > basePrice`, and a duplicate SKU within the brand. Edits are visible
customer-side.

Inventory lists per-variant stock with low/out flags. Single and bulk updates both apply and both write
an `InventoryLog` row.

**Soft delete.** A never-ordered product deletes and disappears customer-side. Deleting an **ordered**
product leaves its historical order intact — the order keeps its own item snapshot (`productName`,
`unitPrice`), so history doesn't break when a product is withdrawn, and the buying customer can still
open that order.

## Flow 3 — Cross-brand isolation

See the headline table above. 16/16.

## Flow 4 — Orders, lifecycle, earnings, returns

- **Illegal transition** `pending → delivered` is rejected with a message naming the transition.
- **Full legal lifecycle** `confirmed → processing → shipped → out_for_delivery → delivered` succeeds;
  the tracking number is stored and each step is recorded in `statusHistory`.
- **Earnings on delivery.** The vendor's Provider wallet is credited `total − commission`, verified
  against `commissionPercent` from settings, with `vendorPayout.commission` / `paidAt` written onto the
  order and a `shopping_earning` credit in the ledger.
- **COD** is marked `paid` on delivery.
- **Returns are a 3-step flow** — `requested → approved → picked_up → refunded` — and money and stock
  move on the **final** step, not on approve. Skipping straight from `approved` to `refunded` is
  rejected. On refund: stock restored exactly (see bug 2), customer credited the exact order total, and
  the vendor payout reversed (`vendorPayout.paidAt` cleared).
- **Reject path** records the vendor's note.

## Flow 5 — Coupons, reviews, analytics

A vendor-created coupon can be applied by a customer; deactivating it mid-flow blocks re-application;
a coupon at its usage limit is refused. The reviews list loads and a vendor can respond.

**Analytics hand-checked against the DB**, not taken on trust:

| Figure | Hand count | API |
|---|---|---|
| `totalRevenue` | Σ totals of delivered orders for this brand | matches |
| commission (`totalRevenue − totalIncome`) | `revenue × commissionPercent` | matches |
| `totalOrders` | `countDocuments({ brandId })` | matches |

## Note on the earlier prompt wording

`shopping.md` describes returns as "approve restores stock AND triggers the refund". The implementation
is deliberately a three-step flow with the money and stock on the `refunded` step — approve only moves
the order to `returned`. That is the better design (a vendor approves, then settles once goods are
actually received), so the QA was written to the implementation rather than changing it.
