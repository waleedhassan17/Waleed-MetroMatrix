/**
 * Admin console navigation is complete in both directions:
 *  - every route the admin code navigates to is registered (no dead buttons);
 *  - every gated admin route has a way in (no orphaned screens — five
 *    healthcare screens, notifications and settings were unreachable before);
 *  - every route that renders an admin screen is gated and reads as the
 *    console (PlatformAnalytics was registered with neither).
 *
 * Read from source, so it covers screens nobody has opened in a test.
 */
import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..', '..', '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) {
      if (e.name !== '__tests__') walk(rel, out);
    } else if (/\.tsx?$/.test(e.name)) out.push(rel);
  }
  return out;
}

const base = read('navigation-maps/Base.tsx');
const constBlock = (name: string, src: string) => {
  const m = new RegExp(`export const ${name}\\s*=\\s*\\{([\\s\\S]*?)\\n\\}`).exec(src);
  return m ? Object.fromEntries([...m[1].matchAll(/(\w+)\s*:\s*["']([^"']+)["']/g)].map((x) => [x[1], x[2]])) : {};
};
const baseNames = constBlock('BaseRouteNames', base) as Record<string, string>;
const shoppingNames = constBlock('AdminShoppingRouteNames', read('navigation-maps/Shopping.ts'));

// Registered = a BaseRoutes entry `title: BaseRouteNames.X`, the admin tabs, the shopping admin stack.
const registered = new Set<string>([
  ...[...base.matchAll(/title:\s*BaseRouteNames\.(\w+)/g)].map((m) => baseNames[m[1]]),
  ...[...read('navigators/AdminTabs.tsx').matchAll(/<Tab\.Screen\s+name="(\w+)"/g)].map((m) => m[1]),
  ...Object.values(shoppingNames),
]);

const adminRoutes = (() => {
  const block = /export const AdminRoutes[\s\S]*?new Set<BaseRouteName>\(\[([\s\S]*?)\]\)/.exec(base)?.[1] ?? '';
  return [...block.matchAll(/BaseRouteNames\.(\w+)/g)].map((m) => baseNames[m[1]]);
})();

const sources = [
  ...walk('screens/admin'),
  ...walk('components/admin'),
  'navigators/AdminTabs.tsx',
  'navigators/AdminShoppingStack.tsx',
  'screens/user-authentication/signin-screen/signin.tsx',
  'navigation-maps/landingRoute.ts',
].map((f) => [f, read(f)] as const);

/** Literal route names this code can open. */
const targets = new Map<string, string[]>();
const add = (name: string, file: string) => targets.set(name, [...(targets.get(name) ?? []), file]);
for (const [file, src] of sources) {
  for (const m of src.matchAll(/(?:\.navigate|\.push|navigation\.replace)\(\s*['"](\w+)['"]/g)) add(m[1], file);
  for (const m of src.matchAll(/routes:\s*\[\s*\{\s*name:\s*['"](\w+)['"]/g)) add(m[1], file);
  for (const m of src.matchAll(/\broute:\s*['"](\w+)['"]/g)) add(m[1], file);
  // Route objects ({ name: 'X', params }) — not createSlice({ name: 'x' }).
  if (!/Slice\.ts$/.test(file)) for (const m of src.matchAll(/\{\s*name:\s*['"]([A-Z]\w+)['"]/g)) add(m[1], file);
  for (const m of src.matchAll(/return ['"](Admin\w+)['"]/g)) add(m[1], file);
  for (const m of src.matchAll(/(?:home|signIn|totp|changePassword|enrol):\s*['"](Admin\w+)['"]/g)) add(m[1], file);
  for (const m of src.matchAll(/ADMIN_HOME_ROUTE = ['"](\w+)['"]/g)) add(m[1], file);
  for (const m of src.matchAll(/AdminShoppingRouteNames\.(\w+)/g)) add(shoppingNames[m[1]] ?? m[1], file);
}


it('finds the admin routes and navigation calls', () => {
  expect(adminRoutes.length).toBeGreaterThan(20);
  expect(targets.size).toBeGreaterThan(20);
});

it('every route the admin code opens is registered', () => {
  const missing = [...targets.entries()].filter(([name]) => !registered.has(name)).map(([name, files]) => `${name} (from ${files[0]})`);
  expect(missing).toEqual([]);
});

it('every gated admin route has a way in', () => {
  const orphans = adminRoutes.filter((r) => !targets.has(r));
  expect(orphans).toEqual([]);
});

// Routes whose component is an admin screen or an admin navigator.
const adminScreenRoutes = (() => {
  const adminComponents = new Set(
    [...base.matchAll(/^import (\w+) from ["']\.\.\/(?:screens\/admin\/|navigators\/Admin)[^"']*["']/gm)].map((m) => m[1])
  );
  return [...base.matchAll(/component:\s*(\w+),\s*title:\s*BaseRouteNames\.(\w+)/g)]
    .filter((m) => adminComponents.has(m[1]))
    .map((m) => baseNames[m[2]]);
})();

const consoleThemed = (() => {
  const block = /export const RouteModules[\s\S]*?=\s*\{([\s\S]*?)\n\};/.exec(base)?.[1] ?? '';
  return new Set([...block.matchAll(/\[BaseRouteNames\.(\w+)\]:\s*'admin'/g)].map((m) => baseNames[m[1]]));
})();

// The 2FA step is part of the way in, so it renders without a session.
const UNGATED = new Set(['AdminTotp']);

it('every route that renders an admin screen is gated and themed as the console', () => {
  expect(adminScreenRoutes.length).toBeGreaterThan(25);
  expect(adminScreenRoutes.filter((r) => !UNGATED.has(r) && !adminRoutes.includes(r))).toEqual([]);
  expect(adminScreenRoutes.filter((r) => !consoleThemed.has(r))).toEqual([]);
});
