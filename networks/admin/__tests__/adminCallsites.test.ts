/**
 * Admin endpoints are called only through the typed client (networks/admin/*),
 * where tsc checks every path and method against the backend contract.
 *
 * The exceptions are listed with their reason. They are the module network
 * layers whose admin endpoints the contract types generically (backend
 * docs/ADMIN_OPEN_ITEMS.md #14) and the provider-app onboarding call (#12).
 * Adding a file here needs a reason as good as these.
 */
import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..', '..', '..');

const ALLOWED: Record<string, string> = {
  'networks/network/network.ts': 'lists the public admin endpoints for token handling; calls none',
  'networks/network/sessionRefresh.ts': 'the admin token refresh: a bare axios post, so it cannot re-enter the interceptors',
  'networks/healthcare/config.ts': 'healthcare admin prefix (/v1/admin) for the healthcare module layer (#14)',
  'networks/serviceProviders/adminHomeServiceApi.ts': 'home-services admin module layer (#14)',
  'networks/shopping/adminShoppingApi.ts': 'shopping admin module layer (#14)',
  'networks/shopping/brandApi.ts': 'shopping admin module layer (#14)',
  'networks/shopping/outletApi.ts': 'shopping admin module layer (#14)',
  'networks/shopping/bannerApi.ts': 'shopping admin module layer (#14)',
  'networks/authcalls/providerProfile.ts': 'provider-app onboarding submit (#12), not the admin console',
};

const DIRS = ['screens', 'components', 'networks', 'hooks', 'store', 'services', 'utils', 'navigators', 'navigation-maps', 'config'];

function walk(dir: string, out: string[] = []): string[] {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return out;
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) {
      if (!['__tests__', 'generated', 'node_modules'].includes(e.name)) walk(rel, out);
    } else if (/\.(ts|tsx)$/.test(e.name)) out.push(rel);
  }
  return out;
}

// A string literal that is an admin API path: '/admin/…', 'v1/admin/…', `shopping/admin…`.
const ADMIN_PATH = /['"`]\/?(?:api\/)?(?:v1\/|shopping\/)?admin\//;

it('no admin endpoint is called outside the typed client', () => {
  const offenders: string[] = [];
  for (const file of DIRS.flatMap((d) => walk(d))) {
    if (file.startsWith('networks/admin/') || ALLOWED[file]) continue;
    const lines = fs.readFileSync(path.join(root, file), 'utf8').split(/\r?\n/);
    lines.forEach((line, i) => {
      const code = line.replace(/\/\/.*$/, '');
      if (/^\s*\*/.test(line)) return;
      if (ADMIN_PATH.test(code)) offenders.push(`${file}:${i + 1}: ${line.trim()}`);
    });
  }
  expect(offenders).toEqual([]);
});

it('every allowed exception still exists (prune the list when a layer migrates)', () => {
  for (const file of Object.keys(ALLOWED)) {
    expect(fs.existsSync(path.join(root, file))).toBe(true);
  }
});
