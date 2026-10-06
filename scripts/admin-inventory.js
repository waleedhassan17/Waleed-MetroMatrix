/**
 * Admin screen inventory → docs/ADMIN_SCREEN_INVENTORY.md (and --json).
 *
 * For every admin screen: the routes it is registered under, whether anything
 * navigates there, where its data comes from, and the design-debt counts the
 * migration tracks (lines, hex literals, Alert.alert, console.log, kit use).
 * Re-run it to get the before/after numbers for a phase report.
 *
 *   node scripts/admin-inventory.js [--json]
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name).replace(/\\/g, '/');
    if (e.isDirectory()) {
      if (e.name === '__tests__' || e.name === 'generated') continue;
      walk(rel, out);
    } else if (/\.(ts|tsx)$/.test(e.name)) out.push(rel);
  }
  return out;
}

const appFiles = ['screens', 'components', 'navigators', 'navigation-maps', 'networks', 'store', 'services', 'hooks']
  .filter((d) => fs.existsSync(path.join(root, d)))
  .flatMap((d) => walk(d));
const sources = Object.fromEntries(appFiles.map((f) => [f, read(f)]));

const adminFiles = walk('screens/admin').concat(fs.existsSync(path.join(root, 'components/admin')) ? walk('components/admin') : []);
// Screens live under screens/admin. Shared pieces (components/admin, a screen's
// own *Layout / *View / *Sheet / *Row / *Section parts) count towards the debt
// totals but are not screens.
const isScreen = (f, src) =>
  f.startsWith('screens/admin/') &&
  /\.tsx$/.test(f) &&
  /export default/.test(src) &&
  !/(Layout|View|Sheet|Row|Section|Card|Tile|Bar|Editor)\.tsx$/.test(f);

// Route-name constants: export const XRouteNames = { Key: "Value", … }.
const routeConsts = {};
for (const src of Object.values(sources)) {
  for (const block of src.matchAll(/export const (\w+RouteNames)\s*=\s*\{([\s\S]*?)\n\}/g)) {
    const map = {};
    for (const kv of block[2].matchAll(/(\w+)\s*:\s*['"]([^'"]+)['"]/g)) map[kv[1]] = kv[2];
    routeConsts[block[1]] = map;
  }
}
const routeName = (expr) => {
  const m = /^(\w+)\.(\w+)$/.exec(expr.trim());
  if (m && routeConsts[m[1]]) return routeConsts[m[1]][m[2]];
  return expr.replace(/['"]/g, '');
};

// Route registrations in the navigation maps and stacks:
//   { component: Screen, title: BaseRouteNames.X }   and   <Stack.Screen name={Names.X} component={Screen} />
const registrations = [];
for (const [file, src] of Object.entries(sources)) {
  if (!/navigation-maps|navigators/.test(file)) continue;
  const importMap = {};
  for (const m of src.matchAll(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g)) importMap[m[1]] = m[2];
  const add = (component, nameExpr) => {
    const target = importMap[component];
    if (target && target.startsWith('.')) {
      registrations.push({ route: routeName(nameExpr), file, target: path.join(path.dirname(file), target).split(path.sep).join('/') });
    }
  };
  for (const m of src.matchAll(/component:\s*(\w+),\s*title:\s*([\w.'"]+)/g)) add(m[1], m[2]);
  for (const m of src.matchAll(/name=\{?\s*([\w.'"]+)\s*\}?\s*component=\{(\w+)\}/g)) add(m[2], m[1]);
}
const routesFor = (screenFile) => {
  const noExt = screenFile.replace(/\.(tsx|ts)$/, '');
  return registrations.filter((r) => r.target === noExt || r.target === `${noExt}/index` || `${r.target}/index` === noExt).map((r) => r.route);
};
// Tab roots and stack initial routes are entered by the navigator itself.
const entryRoutes = new Set();
for (const [file, src] of Object.entries(sources)) {
  if (!/navigators|navigation-maps/.test(file)) continue;
  for (const m of src.matchAll(/<Tab\.Screen[^>]*?name=\{?\s*([\w.'"]+)/g)) entryRoutes.add(routeName(m[1]));
  for (const m of src.matchAll(/initialRouteName=\{\s*([\w.]+)/g)) entryRoutes.add(routeName(m[1]));
}
// `navigate(Names.Key)` as well as `navigate('Value')`.
const constRefs = (route) =>
  Object.entries(routeConsts).flatMap(([constName, map]) =>
    Object.entries(map).filter(([, v]) => v === route).map(([k]) => `${constName}\\.${k}\\b`)
  );
const inbound = (route) =>
  entryRoutes.has(route) ||
  Object.entries(sources).some(([f, src]) => {
    if (/navigation-maps/.test(f)) return false;
    const names = [`['"]${route}['"]`, ...constRefs(route)].join('|');
    return new RegExp(`(navigate|push|replace|reset)\\([^)]*(${names})|route:\\s*(${names})|screen:\\s*(${names})|name:\\s*(${names})`).test(src);
  });

function dataSource(file, src) {
  const real = /from ['"][./]*(networks|services)\//.test(src) || /adminApi|apiRequest|healthcareAdminApiRequest|adminRequest/.test(src);
  // The screen's slices: any local `./somethingSlice` it imports.
  const sliceFile = [...src.matchAll(/from ['"](\.{1,2}\/[^'"]*Slice)['"]/g)]
    .map((m) => path.join(path.dirname(file), `${m[1]}.ts`).split(path.sep).join('/'))
    .filter((p) => fs.existsSync(path.join(root, p)))
    .map(read)
    .join('\n');
  // Code only: a comment saying "replaces the hardcoded list" is not static data.
  const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
  const both = stripComments(src + sliceFile);
  const staticData = /Dummy|dummy|hardcoded|BK00\d|12,847|initialState[\s\S]{0,400}\[\s*\{/.test(both);
  const realAny = real || /from ['"][./]*(networks|services)\//.test(sliceFile);
  if (realAny && staticData) return 'hybrid';
  if (realAny) return 'real';
  return staticData ? 'static' : 'none';
}

const count = (src, re) => (src.match(re) || []).length;
const rows = adminFiles
  .map((f) => ({ f, src: read(f) }))
  .filter(({ f, src }) => isScreen(f, src))
  .map(({ f, src }) => {
    const routes = routesFor(f);
    return {
      file: f,
      routes,
      reachable: routes.length ? routes.some(inbound) : false,
      data: dataSource(f, src),
      lines: src.split('\n').length,
      hex: count(src, /['"]#[0-9A-Fa-f]{3,8}['"]/g),
      alerts: count(src, /Alert\.alert\(/g),
      consoleLogs: count(src, /console\.log\(/g),
      // On the kit = built on components/admin (AdminScreen, QueryState …).
      // Importing a stray components/ui piece used to count, which listed
      // screens with a hand-built header and fifty hex colours as migrated.
      usesKit: /from ['"][./]*components\/admin['"/]/.test(src),
    };
  })
  .sort((a, b) => a.file.localeCompare(b.file));

const allAdmin = adminFiles.map((f) => read(f)).join('\n');
const totals = {
  screens: rows.length,
  registered: rows.filter((r) => r.routes.length).length,
  reachable: rows.filter((r) => r.reachable).length,
  staticOrHybrid: rows.filter((r) => r.data === 'static' || r.data === 'hybrid').length,
  hexLiterals: count(allAdmin, /['"]#[0-9A-Fa-f]{3,8}['"]/g),
  alertAlert: count(allAdmin, /Alert\.alert\(/g),
  consoleLog: count(allAdmin, /console\.log\(/g) + walk('networks/admin').reduce((n, f) => n + count(read(f), /console\.log\(/g), 0),
  largestFile: rows.reduce((m, r) => (r.lines > m.lines ? r : m), { lines: 0 }),
  usingKit: rows.filter((r) => r.usesKit).length,
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ totals, rows }, null, 2));
  process.exit(0);
}

const md = [
  '# Admin screen inventory',
  '',
  'Generated by `node scripts/admin-inventory.js` — do not edit by hand.',
  '',
  `Screens: **${totals.screens}** · registered: **${totals.registered}** · reachable from navigation: **${totals.reachable}** · static/hybrid data: **${totals.staticOrHybrid}** · using the design kit: **${totals.usingKit}**`,
  '',
  `Admin-wide: hex literals **${totals.hexLiterals}** · Alert.alert **${totals.alertAlert}** · console.log **${totals.consoleLog}** · largest screen **${totals.largestFile.file}** (${totals.largestFile.lines} lines)`,
  '',
  '| Screen | Route(s) | Reachable | Data | Lines | Hex | Alert.alert | console.log | Kit |',
  '|---|---|---|---|---|---|---|---|---|',
  ...rows.map(
    (r) =>
      `| ${r.file.replace('screens/admin/', '')} | ${r.routes.join(', ') || '—'} | ${r.routes.length ? (r.reachable ? 'yes' : '**no**') : '—'} | ${r.data} | ${r.lines} | ${r.hex} | ${r.alerts} | ${r.consoleLogs} | ${r.usesKit ? 'yes' : 'no'} |`
  ),
  '',
].join('\n');
fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs', 'ADMIN_SCREEN_INVENTORY.md'), md);
console.log(`Wrote docs/ADMIN_SCREEN_INVENTORY.md — ${JSON.stringify({ ...totals, largestFile: `${totals.largestFile.file} (${totals.largestFile.lines})` })}`);
