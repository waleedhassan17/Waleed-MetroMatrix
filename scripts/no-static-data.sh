#!/usr/bin/env bash
#
# No fabricated data in the admin console.
#
# Every number, list and status an admin sees must come from the API — or the
# screen says there is no data. This gate fails on the patterns that produced
# invented figures before: Math.random() keys, setTimeout pretending to load,
# dummy/mock/sample data, literal fixture records, `?? 12` / `|| 12` numeric fallbacks, hex colours
# (the theme owns colour), and console.log of auth data.
#
#   ./scripts/no-static-data.sh            fail on any hit (CI)
#   ./scripts/no-static-data.sh --report   list hits, always exit 0
#
set -uo pipefail
cd "$(dirname "$0")/.."

REPORT=0
[ "${1:-}" = "--report" ] && REPORT=1

SCOPE=()
for d in screens/admin components/admin networks/admin models/admin.ts; do
  [ -e "$d" ] && SCOPE+=("$d")
done

# Generated contract types and tests are not app code.
EXCLUDE='networks/admin/generated/|__tests__/|contract\.typecheck\.ts'

total=0
gate() {
  local name="$1" pattern="$2"
  local hits
  hits=$(grep -rnE "$pattern" "${SCOPE[@]}" --include='*.ts' --include='*.tsx' 2>/dev/null \
         | grep -vE "$EXCLUDE" \
         | grep -vE ':[0-9]+: *(//|\*|/\*)' || true)
  if [ -n "$hits" ]; then
    local n
    n=$(echo "$hits" | wc -l | tr -d ' ')
    total=$((total + n))
    printf '\n\033[31m✗ %s (%s)\033[0m\n' "$name" "$n"
    echo "$hits" | sed 's/^/    /' | head -40
  else
    printf '\033[32m✓\033[0m %s\n' "$name"
  fi
}

echo "No-static-data gate — scope: ${SCOPE[*]}"
echo

gate "no Math.random (keys, ids or figures)"        'Math\.random'
gate "no fake loading (setTimeout inside a Promise)" 'new Promise[^;]*setTimeout|setTimeout\(\(\) => *set(Refreshing|Loading)'
gate "no dummy/mock/sample data"                    '\b(dummy|DUMMY|mock[A-Z_]|MOCK_|sample[A-Z_]|SAMPLE_)'
gate "no numeric fallbacks (?? N / || N)"           '(\?\?|\|\|) *-?[0-9]+(\.[0-9]+)? *[),;}]'
gate "no hardcoded trends"                          'trend=\{ *-?[0-9]'
gate "no literal records (fixture ids, KPI numbers)"  "\b_?id: *['\"]([0-9]+|[A-Z]{2}[0-9]{3}|c[0-9]+)['\"]|\b(total|value|count|amount|revenue|appointments|completed|cancelled): *['\"]?[0-9][0-9,]{3,}"
gate "no hex colours (use the theme)"               "['\"]#[0-9A-Fa-f]{3,8}['\"]"
gate "no console.log of auth data"                  'console\.log\([^)]*(token|Token|password|refresh|response\.data|adminResult)'

echo
if [ "$total" -gt 0 ]; then
  printf '\033[31m%s hit(s).\033[0m\n' "$total"
  [ "$REPORT" = 1 ] && exit 0
  exit 1
fi
printf '\033[32mNo static data.\033[0m\n'
