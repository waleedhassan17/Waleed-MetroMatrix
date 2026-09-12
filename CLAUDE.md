# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start            # expo start --dev-client --port 8082 (custom dev client, not Expo Go)
npm run start:go     # expo start --go --port 8082 (Expo Go — no native modules: no webrtc, no Google/FB native sign-in)
npm run start:offline
npm run android       # expo run:android
npm run ios           # expo run:ios
npm run web           # expo start --web

npm test              # jest (jest-expo preset)
npx jest theme/__tests__/contrast.test.ts        # run a single test file
npx jest -t "name of test"                       # run tests matching a name

npx tsc --noEmit      # type check (strict: true in tsconfig.json; no dedicated script exists)

./scripts/design-gates.sh   # lint hardcoded colors/fonts/sizes in the migrated design-system scope
```

There is no ESLint config and no lint script — `tsc --noEmit` and `design-gates.sh` are the closest things to lint gates. There is no `babel.config.js`/`metro.config.js`; Expo SDK 54 supplies these by convention.

## Architecture

MetroMatrix is a single Expo/React Native app bundling **three independent verticals** — Home Services, Healthcare, and Shopping — each served to **three roles**: User (customer), Provider (service provider/doctor/brand), and Admin. Shared cross-vertical features (auth, wallet, chat/call, theme, notifications) live outside the per-vertical folders and are consumed by all three.

Top-level layout: `screens/` and `networks/` are organized first by vertical/role (`screens/user/homeservice`, `screens/providers/healthcare`, `screens/admin/Shopping`, ...), each with a matching `models/<vertical>` + `serializers/<vertical>` pair. `store/store.ts` is the one place that pulls every screen's slice together.

### Two backends

- **`API_BASE_URL`** (Vercel, serverless) — auth, users, providers, doctors, bookings, appointments, shopping, wallet, Stripe. Defined via the shared axios instance in `networks/network/network.ts`; every per-vertical `networks/<vertical>/config.ts` wraps it (see `networks/serviceProviders/config.ts`'s `apiRequest` for the pattern: normalizes the `{success, data, message}` envelope, tags `bestEffort` requests to downgrade failures to a quiet log instead of a red error).
- **`REALTIME_BASE_URL`** (Heroku, persistent dyno) — chat + call signalling only, via `services/socket/socketClient.ts`. Vercel can't hold a WebSocket open, so this is a separate service that verifies the same JWT the main backend issues (shared `JWT_SECRET`, shared MongoDB) rather than a service the two ever call each other.

Both hosts are configured in `config/env.ts`.

**Auth token lifecycle** (`networks/network/network.ts`): request interceptor attaches a role-audience-matched token (`audienceForUrl` — admin/provider/user, or "whoever is signed in" for shared routes) via `tokenForRequest`. On a 401, `refreshSessionOnce()` performs a **single-flight** refresh (concurrent 401s all await the same promise, since `/auth/refresh` rotates the refresh token and a second concurrent refresh would lose that race and log the user out) and replays the original request once; on failure it clears auth. A successful refresh also re-handshakes the socket client (`refreshSocketAuth`), since the socket only reads its token once at connect time.

Social login (Google/Facebook) flows through Firebase client-side and is independently re-validated by the backend per-provider — see `AUTH_FLOW.md` for the full mint/validate chain and the external config surfaces (Firebase Console, Facebook Developer Console) that can drift out of sync with this repo.

### State (Redux Toolkit)

`store/store.ts` combines one slice per screen (100+ reducers) — there is no shared "domain" slice, each screen owns its own state end to end. Two points that aren't obvious from a single slice file:

- **`RESET_ALL_STATE`**: dispatched on login/logout to wipe account-scoped state back to initial, applied at the **root reducer** rather than by resetting slices individually (a hand-maintained list of "account-scoped slices" would inevitably miss one). `SHELL_SLICES` (`appContainer`, `theme`) survive every reset — they describe the app process/device, not the account. `SIGN_IN_SLICES` additionally survive when `preserveSession` is passed (the login path), so an in-flight sign-in form isn't blanked while clearing the *previous* account.
- **`redux-persist`** whitelists only `cart`, `wishlist`, `theme` — everything else is refetched from the API on boot rather than persisted.

### Theming

Single entry point: `import { useTheme } from './theme'` → `{ colors, type, spacing, radius }`. All color must come through the hook now (dark mode means neutrals change too, not just the accent) — a screen reading the old module-scope `C` constant inside a `StyleSheet.create` will render wrong in dark mode. Pattern for themed styles:

```ts
const makeStyles = (c: ThemeColors) => StyleSheet.create({ ... });
const { colors } = useTheme();
const styles = useMemo(() => makeStyles(colors), [colors]);
```

`ThemeProvider` takes a `module` (brand palette per vertical) and `mode` (`'light' | 'dark'`), set **once** at the app root (`App.tsx`'s `ThemedApp`) using `useResolvedMode()` (reads the persisted `theme` slice preference, falls back to `useColorScheme()` for `'system'`). `navigators/BaseNavigator.tsx` re-wraps each route in its own module's `ThemeProvider` per `RouteModules` in `navigation-maps/Base.tsx`, so a stack can't leak its vertical's brand color into another.

`scripts/design-gates.sh` greps for raw hex/fontFamily/fontWeight/font-size literals, but only within a `SCOPE` list of already-migrated folders (`components/ui`, `constants`, `theme`, `screens/user/homeservice`, `screens/providers/homeservice`, `screens/Shopping/Brand`) — Healthcare, admin, and Shopping/User are not yet migrated. Add a folder to `SCOPE` in the same commit that migrates it.

### Navigation

Single root native-stack navigator (`navigators/BaseNavigator.tsx` + `navigation-maps/Base.tsx`), with per-vertical nested stacks mounted as routes inside it (`navigators/HealthcareStack.tsx`, `ShoppingStack.tsx`, `BrandStack.tsx`, `DoctorStack.tsx`, driven by `navigation-maps/Healthcare.ts` / `Shopping.ts`). Route → theme-module mapping lives in `RouteModules` (`navigation-maps/Base.tsx`).

### Chat and calling are centralized, not per-vertical

One `ChatScreen`/`CallScreen`/`ConversationsScreen` (`screens/shared/communication/`) serves both Home Services and Healthcare, customer and provider side — `roomParams.ts` normalizes the differing param names each call site passes into one shape. Calling (`services/call/`) is peer-to-peer WebRTC (`react-native-webrtc`) relayed through Cloudflare TURN when needed, including telemedicine video consultations (no longer Jitsi, despite `TELEMEDICINE_DECISION.md`) — `POST /video-calls/*` on the main backend is bookkeeping only (open/close the call record for billing/history), it never carries media. `services/call/callBackgroundHandler.ts` registers Notifee's background handler at the true entry point (`index.ts`, before the React tree exists), because a lock-screen call action can arrive in a process with no React tree yet.

### Models & serializers

Each vertical's `networks/<vertical>/` returns raw backend JSON; `serializers/<vertical>/*Serializer.ts` normalizes it into the typed shapes in `models/<vertical>/*.ts` (defensive field-by-field mapping with fallbacks, not a schema validator) before it reaches a slice or component.

### Wallet

`services/wallet/` (slice + API) is a shared feature consumed by every vertical's screens (`screens/user/wallet/`), not owned by any one of them — same pattern as chat/call.

## Reference docs

The repo root and `docs/` carry extensive per-feature specs and change history worth checking before touching that area: `AUTH_FLOW.md` (social login), `HOMESERVICE_SPEC.md` / `HEALTHCARE_SPEC.md` / `SHOPPING_SPEC.md`, `CHAT_CALL_CHANGELOG.md` / `CHAT_CALL_QA_MATRIX.md`, `HEALTHCARE_SLOTS_CHANGELOG.md`, `docs/API_REQUIREMENTS.md` / `docs/ADMIN_API_REQUIREMENTS.md` / `docs/SERVICE_PROVIDER_API_GUIDE.md` / `docs/HEALTHCARE_FLOW_GUIDE.md` / `docs/COMPLETE_FLOW_GUIDE.md`, and `BUILD_AND_SHARE.md` for EAS build/distribution.
