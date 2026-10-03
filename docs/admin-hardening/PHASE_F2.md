# Phase F2 — Contract-first data layer

Branch `admin-hardening`. Pairs with backend B3 (envelope, pagination, `/meta`,
`/overview`, `/queue`), plus one backend addition made during this phase:
specialty reactivation (`10fdc13`).

## Data layer

- **`networks/admin/adminApi.ts` (RTK Query, already in `@reduxjs/toolkit`).**
  Every endpoint is a `queryFn` over the typed client, so path, method, body and
  response are checked against the contract at compile time. Requests ride the
  shared axios instance, so the F1 refresh still applies.
  - **Covers:** meta, overview, queue; providers (list, detail, approve,
    reject, suspend, unsuspend, delete, restore); users (list, detail,
    activate, deactivate, delete, restore); per-admin notifications; settings;
    own sessions and profile; admin management.
  - **Lists are infinite queries** that follow `meta.nextCursor`, else the next
    page. `flattenPages` de-duplicates by id.
  - **Errors are serialisable `AdminError {status, code, message, details,
    requestId}`.**
- **`networks/admin/healthcareAnalyticsApi.ts`** injects the healthcare
  analytics endpoints. Their response shapes are declared from the controller,
  because the contract types module endpoints generically (open item 14).
- **`hooks/useAdminMeta.ts`** caches `/admin/meta` for the session and
  refetches on return to the foreground after 10 minutes.
  - `presentStatus(meta, group, value)` returns the server's label and tone.
  - An unknown value shows as itself, in neutral.
- **Formatters render a missing value as "—", never 0.**
  - `constants/Currency.ts formatMoney` now renders "—" for null, undefined or
    NaN; it used to render "PKR 0".
  - `utils/admin/format.ts` adds `formatCount`, `formatDelta`, `formatPercent`,
    `formatRating`, `formatAgo` and `formatDate[Time]` (Pakistan time).
  - `utils/admin/parse.ts` handles form input: an emptied field means 0.

## Envelope compatibility (modules not visually migrated)

The backend's admin envelope broke the module network layers in ways that
would have shown up on screen:

| Layer | Problem | Fix |
|---|---|---|
| `networks/healthcare/config.ts` | Error `error` is now an object, so screens showed "[object Object]"; list `meta` was dropped; DELETE sent no body, so delete-review lost its required reason | Reads `error.{code,message,details.fields}`, passes `meta` through, sends the DELETE body |
| `networks/healthcare/adminApi.ts` | Doctor list read `data.doctors`, but the server returns the array, so the list was always empty | Reads the array and `meta` |
| `networks/serviceProviders/config.ts` | Same error-object problem; DELETE had no body | Fixed; `meta` is also exposed as `pagination` for existing callers |
| `networks/shopping/shoppingAxios.ts` | Same error-object problem; error `code` lost | Fixed |
| `networks/shopping/adminShoppingApi.ts` | Orders slice read `pagination.page`, but the server sends `meta`, so it crashed | `meta` is exposed as `pagination` |
| `networks/network/network.ts` | `API.DELETE` dropped the body | Body is sent |

Healthcare settings now show only the three values the server stores. Slot
length, booking horizon and doctor auto-approval were editable but read by
nothing; B1 removed them.

## Fabricated data removed

| Was | Now |
|---|---|
| `screens/admin/providers/service-providers/tabs/*` (7 files, 3 reducers, one route): invented bookings, KPIs and analytics | Deleted. Home services lives in the HS screens. |
| `healthcareAnalyticsSlice` (overlaid real data on invented figures; 4 sections always invented; Export waited 1.2 s and "succeeded") | Slice deleted. The screen is rewritten on the admin kit and shows only `/analytics/{stats,appointments,revenue}`, with a Pakistan-time range filter. Export is removed (exports are B4, not in scope). |
| `specialtyManagementSlice` initial state: 8 invented specialties with doctor counts | Empty and loading until the server answers. Reactivation calls the new `PATCH {isActive:true}`; it used to be local only. A load failure shows an error with retry. The "Delete… cannot be undone" button, which actually ran a reversible deactivation, is removed. |
| `doctorManagementSlice` availability toggle (setTimeout, local flag) | Removed; nothing used it. |
| Healthcare hub: tile grid of zeros on failure | Rewritten on the kit: figures only after a successful load, each with its period. |
| Shopping dashboard: tile grid of zeros on failure; `?? 0` everywhere | Tiles render only with data, through the formatters. |
| `?? 0` / `\|\| 0` money and counts in healthcare and shopping screens | `formatMoney` / `formatCount` / `formatPercent` |

## Kit started early (F3 work)

`components/admin/*` (AdminScreen, QueryState, KpiTile/KpiGrid, BarList,
EntityRow, ConfirmSheet, StatusTimeline, Section/DetailRow, FilterChips,
StatusBadge) and the `admin` theme module were built in this phase so the
rewritten screens did not have to be built twice. Contrast tests cover the
admin palette in light and dark. AppBar's back button is a no-op without
`onBack`; AdminScreen and the auth layout now wire it to `goBack`.

## Gate changes

- **Hex colour moved from `no-static-data.sh` to the design gates.** Colour is
  not data, and the design gates already enforce hex per migrated scope.
  Keeping it here would have made this gate impossible to enforce until every
  healthcare and shopping screen is visually migrated, which is deferred.
- **`StatusBar.currentHeight || 44` is excluded.** It is a layout fallback, not
  a figure.

## Numbers

| | F1 | F2 |
|---|---|---|
| Static/hybrid screens (inventory) | 5 | **0** |
| no-static-data hits (data rules only) | 205 | 62 — all in screens F3/F4 replace (dashboard, provider/user management, notifications, settings) or rewrite (home services) |
| Literal fixture records | 94 | 0 |
| Hex literals in admin code | 1,391 | 1,166 |
| jest | 9 suites / 208 | 10 suites / 232 |

## Deviations

- **The no-static-data gate stays report-only until F4.** The remaining hits
  are in screens that F3/F4 delete or rewrite; enforcing now would mean fixing
  code about to be removed. CI enforces it from the F4 commit.
- **The "no admin endpoint called outside the typed client" test lands in F4,**
  once the legacy `adminAPIs.ts` and its slices are deleted. The module network
  layers (healthcare, home services, shopping admin) are allowed explicit
  exceptions there, because their endpoints are generically typed (open item 14).
