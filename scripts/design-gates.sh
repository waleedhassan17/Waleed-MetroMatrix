#!/usr/bin/env bash
#
# Design-system gates.
#
# SCOPED ON PURPOSE. Healthcare (44 screens), admin (38) and Shopping/User have
# not been migrated, and between them still hold roughly 4,000 raw hex literals
# and 1,500 ad-hoc font sizes. Running these gates app-wide would fail on day
# one and be switched off by the end of the week, which is how a lint rule
# becomes decoration.
#
# So the gates cover what has actually been migrated. When a module moves, add
# it to SCOPE in the same commit — the list is the record of how far the
# migration has got.
#
#   ./scripts/design-gates.sh
#
set -uo pipefail
cd "$(dirname "$0")/.."

SCOPE=(
  components/ui
  constants
  theme
  screens/user/homeservice
  screens/providers/homeservice
  screens/Shopping/Brand
)

# Files that legitimately hold raw values: the token definitions themselves.
EXCLUDE='constants/theme.ts|constants/Fonts.ts|constants/HealthcareTheme.ts|constants/DoctorTheme.ts|constants/HomeServiceTheme.ts|constants/Colors.ts|constants/ProductColors.ts|screens/Shopping/Brand/theme.ts|theme/palettes.ts|theme/contrast.ts'

fail=0

gate() {
  local name="$1" pattern="$2"
  local hits
  hits=$(grep -rnE "$pattern" "${SCOPE[@]}" --include='*.ts' --include='*.tsx' 2>/dev/null \
         | grep -vE "$EXCLUDE" \
         | grep -vE ':[0-9]+: *(//|\*|/\*)' || true)   # a hex named in a comment is prose
  if [ -n "$hits" ]; then
    printf '\n\033[31m✗ %s\033[0m\n' "$name"
    echo "$hits" | sed 's/^/    /'
    fail=1
  else
    printf '\033[32m✓\033[0m %s\n' "$name"
  fi
}

echo "Design gates — scope: ${SCOPE[*]}"
echo

# A family literal means the token map was bypassed, and 'Inter-Regular' in
# particular is a name no loaded face answers to.
gate "no font-family literals"      "fontFamily: '"

# Emphasis picks a family. fontWeight on top of a named face is a no-op on iOS
# and a synthesised double-bold on Android.
gate "no fontWeight"               "fontWeight:"

# Sizes come from the T scale.
gate "no ad-hoc font sizes"        "fontSize: [0-9]"

# The Tailwind slate ramp — what everything reached for when no palette existed.
gate "no slate hexes"              "#(64748B|1E293B|94A3B8|F8FAFC|E2E8F0|F1F5F9|CBD5E1|0F172A|334155|475569)"

# Any raw hex at all, in the migrated scope.
gate "no raw hex literals"         "['\"]#[0-9A-Fa-f]{3,8}['\"]"

# The ten per-screen gradient config blocks this system replaced.
gate "no SERVICE_CONFIG"           "SERVICE_CONFIG"

echo
if [ "$fail" -eq 0 ]; then
  printf '\033[32mAll gates pass.\033[0m\n'
else
  printf '\033[31mGates failed.\033[0m Use a token from constants/theme.ts, or\n'
  printf 'useTheme() when the value has to follow the module or brand.\n'
fi
exit "$fail"
