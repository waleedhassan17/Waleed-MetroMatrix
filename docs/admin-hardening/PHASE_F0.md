# Phase F0 — Frontend baseline & gates

Branch `admin-hardening`. No app behaviour changes in this phase. It adds the
measurements and gates the later phases are judged against.

## Baseline (before any admin change)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | **0 errors.** The tracked `tsc_errors.log` listed 3 errors that no longer reproduce, so it was deleted. CI now requires 0 errors, so no baseline file is needed. |
| `npx jest` | 3 suites / 141 tests pass (4 / 147 with this phase's client tests) |
| `bash scripts/design-gates.sh` | pass (admin is not in its scope yet) |
| `bash scripts/no-static-data.sh --report` | **1,446 hits** — see below |
| `node scripts/admin-inventory.js` | 39 screens · 33 registered · **21 reachable** · 6 static/hybrid data · 1 uses the design kit |

Admin-wide debt (from the inventory): 1,391 hex literals, 99 `Alert.alert`,
82 `console.log`. The largest screen is `admin-dashboard/adminDashboard.tsx` at
2,258 lines. The per-screen table is in `docs/ADMIN_SCREEN_INVENTORY.md`.

### No-static-data hits by rule

| Rule | Hits |
|---|---|
| `Math.random` | 5 |
| fake loading (`setTimeout` resolving a Promise / clearing a spinner) | 7 |
| dummy/mock/sample identifiers | 0 |
| numeric fallbacks (`?? 12`, `\|\| 0`) | 97 |
| hardcoded trends (`trend={5.2}`) | 2 |
| literal records (fixture ids, KPI numbers) | 94 — all in the five fabricated slices: healthcare analytics, specialty management, and the three service-provider tabs |
| hex colours | 1,203 |
| `console.log` of auth data | 38 |

## What was added

- **Typed admin client.** `scripts/sync-admin-spec.js` copies the backend
  contract (`MetroMatrix-Backend/docs/admin.openapi.yaml`) into
  `networks/admin/generated/` and runs `openapi-typescript`.
  `networks/admin/client.ts` exposes `adminRequest(method, path, …)`. Its path,
  method, params, body and response `data` are all typed from the spec.
  - `contract.typecheck.ts` proves the compiler rejects an unknown path, a wrong
    method and a wrong response type.
  - Failures arrive as `AdminApiError {status, code, details, requestId}`
    (`networks/admin/errors.ts`, unit-tested).
  - `--check` mode lets CI verify the committed types match the committed spec copy.
- **`scripts/no-static-data.sh`.** Report mode now; it enforces from F2.
- **`scripts/admin-inventory.js` → `docs/ADMIN_SCREEN_INVENTORY.md`.** Re-run it
  for the before/after numbers.
- **npm scripts:** `typecheck`, `gen:admin-api`, `gates:design`, `gates:static`,
  `admin:inventory`, `gates`.
- **`.github/workflows/ci.yml`** runs typecheck, jest, the spec check, the
  design gates, and the static-data gate in report mode. It only runs once the
  branch is pushed.
- **`MainAxiosInstance` is exported from `networks/network/network.ts`,** so the
  admin client shares the app's interceptors.

## Deviations

- The tsc gate is "0 errors", not a baseline diff, because the baseline is already 0.
- The "no admin endpoint called outside the client" test is part of F2. Today
  every admin call is outside the client, so the test would only list them.
