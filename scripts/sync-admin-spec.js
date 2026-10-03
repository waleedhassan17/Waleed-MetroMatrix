/**
 * Copy the admin API contract from the backend and regenerate its types.
 *
 *   node scripts/sync-admin-spec.js            (backend checked out next to this repo)
 *   ADMIN_SPEC_PATH=/path/to/admin.openapi.yaml node scripts/sync-admin-spec.js
 *   node scripts/sync-admin-spec.js --check    (CI: committed types match the committed spec copy)
 *
 * docs/admin.openapi.yaml in MetroMatrix-Backend is the source of truth (its
 * own tests keep it matched to the real routes and responses). The copy and
 * the generated networks/admin/generated/schema.d.ts are committed, so the app
 * builds without the backend checked out; re-run this after the contract changes.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'networks', 'admin', 'generated');
const specCopy = path.join(outDir, 'admin.openapi.yaml');
const schemaFile = path.join(outDir, 'schema.d.ts');
const bin = path.join(root, 'node_modules', 'openapi-typescript', 'bin', 'cli.js');

const generate = (spec, out) => execFileSync(process.execPath, [bin, spec, '-o', out], { stdio: 'pipe' });
const normalise = (s) => s.replace(/\r\n/g, '\n');

if (process.argv.includes('--check')) {
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'admin-spec-')), 'schema.d.ts');
  generate(specCopy, tmp);
  if (normalise(fs.readFileSync(tmp, 'utf8')) !== normalise(fs.readFileSync(schemaFile, 'utf8'))) {
    console.error('networks/admin/generated/schema.d.ts is out of date with admin.openapi.yaml — run `npm run gen:admin-api`.');
    process.exit(1);
  }
  console.log('Admin API types match the committed spec.');
  process.exit(0);
}

const candidates = [
  process.env.ADMIN_SPEC_PATH,
  path.join(root, '..', 'MetroMatrix-Backend', 'docs', 'admin.openapi.yaml'),
  path.join(root, '..', '..', 'Gitbackend', 'MetroMatrix-Backend', 'docs', 'admin.openapi.yaml'),
].filter(Boolean);

const source = candidates.find((p) => fs.existsSync(p));
if (!source) {
  console.error(`Admin spec not found. Looked in:\n  ${candidates.join('\n  ')}\nSet ADMIN_SPEC_PATH.`);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(source, specCopy);
console.log(`Copied ${source}`);
generate(specCopy, schemaFile);
console.log('Generated networks/admin/generated/schema.d.ts');
