import { Colors, makeColors } from '../../constants/Colors';
import { C, DARK_C, Ramp, ThemeMode } from '../../constants/theme';
import {
  AA_BODY,
  AA_LARGE,
  barStyleOn,
  contrastRatio,
  headerGradientStops,
  lift,
  softInkOn,
} from '../contrast';
import { brandPalette, ModuleName, modulePalette } from '../palettes';

// ============================================================================
// Every colour pair in both ramps, measured.
//
// WHY THIS IS A TEST AND NOT A COMMENT
// ------------------------------------
// A dark ramp fails silently. Nothing throws when a border is 1.02:1 against
// its card — the app renders, the screenshot looks fine at a glance, and the
// bug surfaces as "I can't read this" from one user on one screen in one
// state. The numbers in constants/theme.ts's header were measured by hand
// once; this keeps them true after the next person edits a hex.
//
// It asserts the DARK ramp strictly, because that is what this change owns.
// Light is asserted only where it already passes — see the quarantined block
// at the bottom for the three places it does not.
// ============================================================================

const MODES: ThemeMode[] = ['light', 'dark'];
const MODULES: ModuleName[] = ['neutral', 'healthcare', 'homeservice', 'shopping'];

const ramps: Record<ThemeMode, Ramp> = { light: C, dark: DARK_C };

/** Grounds a screen can paint, cheapest to most raised. */
const grounds = (r: Ramp) => [
  ['bg', r.bg],
  ['surface', r.surface],
  ['surfaceSunken', r.surfaceSunken],
  ['surfaceRaised', r.surfaceRaised],
] as const;

describe('ramp shape', () => {
  it('dark carries every key light does, and no extras', () => {
    expect(Object.keys(DARK_C).sort()).toEqual(Object.keys(C).sort());
  });

  it('the two ramps are actually different', () => {
    expect(DARK_C.bg).not.toBe(C.bg);
    expect(DARK_C.ink).not.toBe(C.ink);
  });

  it('dark grounds are dark and dark ink is light', () => {
    // Guards against a paste that leaves a light value in the dark ramp — the
    // shape test above would still pass with `bg: '#FFFFFF'`.
    expect(contrastRatio(DARK_C.bg, '#000000')).toBeLessThan(2);
    expect(contrastRatio(DARK_C.ink, '#FFFFFF')).toBeLessThan(2);
  });

  it('dark expresses elevation by tone, since shadows are invisible on dark', () => {
    const lum = (hex: string) => contrastRatio(hex, '#000000');
    expect(lum(DARK_C.surfaceSunken)).toBeLessThan(lum(DARK_C.bg));
    expect(lum(DARK_C.bg)).toBeLessThan(lum(DARK_C.surface));
    expect(lum(DARK_C.surface)).toBeLessThan(lum(DARK_C.surfaceRaised));
  });
});

describe.each(MODES)('%s ramp — body text', (mode) => {
  const r = ramps[mode];

  it.each(grounds(r))('ink reads on %s', (_name, ground) => {
    expect(contrastRatio(r.ink, ground)).toBeGreaterThanOrEqual(AA_BODY);
  });

  it.each(grounds(r))('inkMuted reads on %s', (_name, ground) => {
    expect(contrastRatio(r.inkMuted, ground)).toBeGreaterThanOrEqual(AA_BODY);
  });
});

describe.each(MODES)('%s ramp — status colours', (mode) => {
  const r = ramps[mode];
  const statuses = [
    ['success', r.success, r.successSoft],
    ['warning', r.warning, r.warningSoft],
    ['error', r.error, r.errorSoft],
    ['info', r.info, r.infoSoft],
  ] as const;

  it.each(statuses)('%s reads on the page and on a card', (_name, fg) => {
    expect(contrastRatio(fg, r.bg)).toBeGreaterThanOrEqual(AA_BODY);
    expect(contrastRatio(fg, r.surface)).toBeGreaterThanOrEqual(AA_BODY);
  });

  // The pairing that actually ships: a status pill paints its own soft ground
  // and puts the status colour on top. If that pair fails, the pill is
  // unreadable however good each colour looks against the page.
  it.each(statuses)('%s reads on its own soft ground', (_name, fg, soft) => {
    expect(contrastRatio(fg, soft)).toBeGreaterThanOrEqual(AA_BODY);
  });

  it.each(statuses)('%s soft ground is distinguishable from the page', (_name, _fg, soft) => {
    // Light's tints are famously faint (1.01–1.05 — see the quarantine block);
    // dark has no such excuse, because a tint that fails here is invisible
    // rather than merely subtle.
    expect(contrastRatio(soft, r.bg)).toBeGreaterThan(mode === 'dark' ? 1.05 : 1.0);
  });
});

describe.each(MODES)('%s ramp — hairlines', (mode) => {
  const r = ramps[mode];

  it('line is visible on a card without becoming a rule', () => {
    const ratio = contrastRatio(r.line, r.surface);
    expect(ratio).toBeGreaterThan(1.15);
    expect(ratio).toBeLessThan(4);
  });
});

describe.each(MODES)('%s module palettes', (mode) => {
  const r = ramps[mode];

  it.each(MODULES)('%s: accentSoft can carry ink', (name) => {
    const p = modulePalette(name, mode);
    expect(contrastRatio(r.ink, p.accentSoft)).toBeGreaterThanOrEqual(AA_BODY);
  });
});

describe('dark module palettes', () => {
  // Strict for dark, which this change owns end to end. The light palettes are
  // pre-existing and shopping's two values do not clear the bar (quarantined
  // below) — asserting AA across light would fail on colours that shipped long
  // before dark mode and cannot be changed without repainting live screens.
  it.each(MODULES)('%s: accentDeep is readable as text on a card', (name) => {
    const p = modulePalette(name, 'dark');
    expect(contrastRatio(p.accentDeep, DARK_C.surface)).toBeGreaterThanOrEqual(AA_BODY);
  });

  it.each(MODULES)('%s: accent is readable as an icon on a card', (name) => {
    const p = modulePalette(name, 'dark');
    expect(contrastRatio(p.accent, DARK_C.surface)).toBeGreaterThanOrEqual(AA_LARGE);
  });

  it.each(MODULES)('%s: label on an accent fill is readable', (name) => {
    const p = modulePalette(name, 'dark');
    expect(contrastRatio(p.onAccent, p.accent)).toBeGreaterThanOrEqual(AA_BODY);
  });

  it.each(MODULES)('%s: accent text is lighter than the fill, not darker', (name) => {
    // The inversion that makes dark palettes different in kind, not degree:
    // on a dark ground `accentDeep` has to be the LIGHTER of the two, or
    // accent-coloured text is less readable than the button beside it.
    const p = modulePalette(name, 'dark');
    expect(contrastRatio(p.accentDeep, DARK_C.surface)).toBeGreaterThanOrEqual(
      contrastRatio(p.accent, DARK_C.surface),
    );
  });
});

describe('light module palettes', () => {
  const LIGHT_OK: ModuleName[] = ['neutral', 'healthcare', 'homeservice'];

  it.each(LIGHT_OK)('%s: accentDeep is readable as text on white', (name) => {
    expect(contrastRatio(modulePalette(name, 'light').accentDeep, C.surface))
      .toBeGreaterThanOrEqual(AA_BODY);
  });
});

// ============================================================================
// AppBar's 'gradient' tone.
//
// The header runs a gradient behind a white title and a 90%-white subtitle, so
// the subtitle has to clear AA_BODY against BOTH stops — not just the dark one.
// This was got wrong once: the gradient ran accent -> accentDeep, and on the
// home-service accent the subtitle measured 3.35:1. The gradient is now
// accentDeep -> accentDeep mixed 22% toward ink, and this pins that.
//
// Nothing here can be checked by eye. A gradient degrades gracefully to the
// look of a slightly different green while quietly failing on half its area.
// ============================================================================

describe('module page header gradients', () => {
  // Every module that paints this header goes through headerGradientStops, so
  // this covers the home-service AppBar and shopping's ShoppingHeader from one
  // place — and would cover healthcare the day it adopts it.
  const HEADER_MODULES: ModuleName[] = ['homeservice', 'shopping'];

  it.each(HEADER_MODULES)(
    '%s: a 90%% white subtitle clears AA body on BOTH stops',
    (name) => {
      const deep = modulePalette(name, 'light').accentDeep;
      for (const stop of headerGradientStops(deep)) {
        expect(contrastRatio(softInkOn(stop), stop)).toBeGreaterThanOrEqual(AA_BODY);
      }
    }
  );

  it.each(HEADER_MODULES)('%s: a white title clears AA large on BOTH stops', (name) => {
    const deep = modulePalette(name, 'light').accentDeep;
    for (const stop of headerGradientStops(deep)) {
      expect(contrastRatio(C.inkInverse, stop)).toBeGreaterThanOrEqual(AA_LARGE);
    }
  });

  it('the two stops actually differ, or it is not a gradient', () => {
    for (const name of HEADER_MODULES) {
      const [a, b] = headerGradientStops(modulePalette(name, 'light').accentDeep);
      expect(a).not.toBe(b);
    }
  });

  // The two modules need DIFFERENT answers from the same rule, which is the
  // whole reason this is derived rather than written down.
  it('home services starts at accentDeep; shopping has to start darker', () => {
    const hsDeep = modulePalette('homeservice', 'light').accentDeep;
    const shDeep = modulePalette('shopping', 'light').accentDeep;

    expect(headerGradientStops(hsDeep)[0]).toBe(hsDeep);
    expect(headerGradientStops(shDeep)[0]).not.toBe(shDeep);
  });

  it('the regression it guards: starting at `accent` WOULD fail', () => {
    // Asserted rather than described, because this was shipped once.
    const accent = modulePalette('homeservice', 'light').accent;
    expect(contrastRatio(softInkOn(accent), accent)).toBeLessThan(AA_BODY);
  });

  it('measuring pure white instead of the 90% ink overstates it', () => {
    // Why softInkOn exists: an alpha colour has no ratio until it is
    // flattened, and the gap here is the difference between pass and fail.
    const deep = modulePalette('shopping', 'light').accentDeep;
    expect(contrastRatio(C.inkInverse, deep)).toBeGreaterThan(
      contrastRatio(softInkOn(deep), deep)
    );
    expect(contrastRatio(softInkOn(deep), deep)).toBeLessThan(AA_BODY);
  });
});

describe('brandPalette on dark', () => {
  // A vendor types their own hex. These are the shapes that actually break:
  // near-black (invisible), pure black, a mid saturated tone that is fine on
  // white and marginal on dark, and the shopping default (already fine).
  const brands = ['#E67E22', '#1A1A2E', '#000000', '#7C3AED', '#B91C1C', '#0F172A'];

  it.each(brands)('%s is lifted until it is legible', (hex) => {
    const p = brandPalette(hex, null, null, 'surface', 'dark')!;
    expect(p).not.toBeNull();
    expect(contrastRatio(p.accent, DARK_C.surface)).toBeGreaterThanOrEqual(AA_LARGE);
    expect(contrastRatio(p.accentDeep, DARK_C.surface)).toBeGreaterThanOrEqual(AA_BODY);
    expect(contrastRatio(p.onAccent, p.accent)).toBeGreaterThanOrEqual(AA_BODY);
  });

  it('leaves a brand that already works completely alone', () => {
    // The vendor picked this colour. If it is legible we have no business
    // altering it — a "dark mode" that quietly repaints every brand is a bug.
    const p = brandPalette('#E67E22', null, null, 'surface', 'dark')!;
    expect(p.accent).toBe('#E67E22');
  });

  it('returns tinted grounds as opaque hex, not alpha', () => {
    // `tint()` composites over whatever is behind it, so on dark it washes out
    // to nothing. The dark path must use `mix()` against a known ground.
    const p = brandPalette('#7C3AED', null, null, 'surface', 'dark')!;
    expect(p.accentSoft).toMatch(/^#[0-9a-f]{6}$/i);
    expect(p.accentLine).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('still returns null when a brand set no primary', () => {
    expect(brandPalette(null, null, null, 'surface', 'dark')).toBeNull();
  });
});

describe('constants/Colors — the 92-file palette', () => {
  const light = makeColors('light');
  const dark = makeColors('dark');

  it('light is the exact object it always was', () => {
    // 92 files read this at module scope. If dark mode changed any light value,
    // it would repaint screens nobody asked to change.
    expect(light).toBe(Colors);
    expect(light.primary).toBe('#10B981');
    expect(light.background).toBe('#F8FAFC');
    expect(light.text.primary).toBe('#1F2937');
  });

  it('dark carries the same keys', () => {
    expect(Object.keys(dark).sort()).toEqual(Object.keys(light).sort());
    expect(Object.keys(dark.text).sort()).toEqual(Object.keys(light.text).sort());
    expect(Object.keys(dark.categories).sort()).toEqual(Object.keys(light.categories).sort());
  });

  it.each(['primary', 'secondary', 'accent', 'success', 'warning', 'error', 'info'] as const)(
    'dark %s reads on the dark card',
    (key) => {
      expect(contrastRatio(dark[key], dark.surface)).toBeGreaterThanOrEqual(AA_BODY);
    },
  );

  it.each(['primary', 'secondary', 'tertiary'] as const)('dark text.%s reads on the page', (key) => {
    const bar = key === 'tertiary' ? AA_LARGE : AA_BODY;
    expect(contrastRatio(dark.text[key], dark.background)).toBeGreaterThanOrEqual(bar);
  });

  it.each(Object.keys(Colors.categories) as (keyof typeof Colors.categories)[])(
    'dark category %s stays legible on its own tinted ground',
    (key) => {
      const cat = dark.categories[key];
      expect(contrastRatio(cat.primary, dark.surface)).toBeGreaterThanOrEqual(AA_BODY);
      expect(contrastRatio(cat.primary, cat.light)).toBeGreaterThanOrEqual(AA_LARGE);
    },
  );

  it('leaves a hue that already works untouched', () => {
    // The emerald measures 6.61 against the dark card on its own. Lifting it
    // anyway would mean this app's brand green is a different green in dark.
    expect(dark.primary).toBe(Colors.primary);
    expect(dark.accent).toBe(Colors.accent);
  });

  it('dark grounds are actually dark', () => {
    expect(contrastRatio(dark.background, '#000000')).toBeLessThan(2);
    expect(contrastRatio(dark.surface, '#000000')).toBeLessThan(2.5);
    // The header gradient was white-to-off-white; on dark that was a pale band.
    expect(contrastRatio(dark.gradients.header[0], '#000000')).toBeLessThan(2.5);
  });
});

// ============================================================================
// Known LIGHT-mode gaps — pre-existing, out of scope for dark mode.
//
// These are asserted at their CURRENT values rather than against AA, so they
// are recorded rather than hidden, and so a future edit that makes them worse
// fails here instead of shipping. Fixing them means changing colours on live
// light screens, which is a separate, visible change.
// ============================================================================
describe('known light-mode contrast gaps', () => {
  it('inkFaint is below AA even at large sizes — icons and placeholders only', () => {
    // Documented in constants/theme.ts: "Never body copy — it fails contrast."
    expect(contrastRatio(C.inkFaint, C.surface)).toBeCloseTo(2.52, 1);
    expect(contrastRatio(DARK_C.inkFaint, DARK_C.surface)).toBeGreaterThan(
      contrastRatio(C.inkFaint, C.surface),
    );
  });

  it('star clears large-text AA only', () => {
    expect(contrastRatio(C.star, C.surface)).toBeGreaterThanOrEqual(AA_LARGE);
    expect(contrastRatio(C.star, C.surface)).toBeLessThan(AA_BODY);
  });

  it('light status tints are barely distinguishable from the page', () => {
    // 1.01–1.05 against #FAFAF9. Deliberate restraint in a light system, and
    // harmless there; the dark tints are held to a real floor instead.
    expect(contrastRatio(C.successSoft, C.bg)).toBeLessThan(1.05);
    expect(contrastRatio(C.warningSoft, C.bg)).toBeLessThan(1.05);
  });

  it('the shopping accent does not clear AA on white', () => {
    // `accent` #E67E22 measures 2.85 as an icon (AA large wants 3) and
    // `accentDeep` #D35400 measures 4.17 as text (AA body wants 4.5). Both
    // predate dark mode and are shipped brand colours — recorded here so the
    // next person does not rediscover them, and so they cannot get worse.
    expect(contrastRatio(modulePalette('shopping', 'light').accent, C.surface)).toBeCloseTo(2.85, 1);
    expect(contrastRatio(modulePalette('shopping', 'light').accentDeep, C.surface)).toBeCloseTo(4.17, 1);
  });

  it('white on the healthcare and homeservice accents measures ~3.8', () => {
    // Why AppBar paints `accentDeep` and not `accent` — see its header comment.
    expect(contrastRatio('#FFFFFF', modulePalette('healthcare', 'light').accent)).toBeCloseTo(3.76, 1);
    expect(contrastRatio('#FFFFFF', modulePalette('homeservice', 'light').accent)).toBeCloseTo(3.77, 1);
  });
});

// ============================================================================
// The status-bar decision.
//
// 61 StatusBars used to hardcode `barStyle="light-content"` next to a
// `backgroundColor` that only went dark in one of the two modes. `barStyleOn`
// derives the glyph style from the colour actually being painted, so the pair
// cannot drift apart again.
// ============================================================================
describe('barStyleOn', () => {
  it('puts light glyphs on the brand headers', () => {
    expect(barStyleOn('#2A7FFF')).toBe('light-content'); // healthcare
    expect(barStyleOn('#1E6AE1')).toBe('light-content'); // healthcare, deep
    expect(barStyleOn('#6366f1')).toBe('light-content'); // admin
  });

  it('puts dark glyphs on a light page', () => {
    expect(barStyleOn(C.bg)).toBe('dark-content');
    expect(barStyleOn(C.surface)).toBe('dark-content');
  });

  it('puts light glyphs on a dark page', () => {
    expect(barStyleOn(DARK_C.bg)).toBe('light-content');
    expect(barStyleOn(DARK_C.surface)).toBe('light-content');
  });

  it('flips when a header is lifted past the midpoint', () => {
    // The case the hardcoded value got wrong: `hue()` raises a saturated colour
    // until it clears AA against the dark card, and a header raised far enough
    // stops carrying white text.
    const lifted = lift('#2A7FFF', 7, DARK_C.surface);
    expect(contrastRatio('#FFFFFF', lifted)).toBeLessThan(AA_LARGE);
    expect(barStyleOn(lifted)).toBe('dark-content');
  });

  it('falls back to light glyphs for an unparseable colour', () => {
    // Same fallback as textOn — a `rgba(...)` or a bad hex must not throw
    // inside a render.
    expect(barStyleOn('rgba(0,0,0,0.5)')).toBe('light-content');
    expect(barStyleOn(undefined)).toBe('light-content');
  });
});
