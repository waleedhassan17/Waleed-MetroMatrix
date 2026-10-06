jest.mock('react-native-svg', () => ({ __esModule: true, default: 'Svg', Circle: 'Circle', G: 'G' }));

import React from 'react';
import { Text } from 'react-native';

import { C, CHART } from '../../../constants/theme';
import { modulePalette, ThemeProvider, type ThemeColors } from '../../../theme';
import { barInk } from '../../ui/AppBar';
import { providerTypeColor, seriesColor, toneColor } from '../chartColors';
import DonutChart, { donutArcs } from '../DonutChart';
import SplitBar, { sharePercent } from '../SplitBar';

// react-test-renderer ships no types; this is the little of it these tests use.
interface TestNode {
  type: unknown;
  props: Record<string, any>;
  findAll: (match: (node: TestNode) => boolean) => TestNode[];
  findAllByType: (type: unknown) => TestNode[];
}
interface Rendered {
  root: TestNode;
}
const TestRenderer: { create: (node: React.ReactElement) => Rendered; act: (fn: () => void) => void } = require('react-test-renderer');

const lightAdmin = { ...C, ...modulePalette('admin', 'light') } as unknown as ThemeColors;

const texts = (tree: Rendered): string[] =>
  tree.root.findAllByType(Text).map((t) => [t.props.children].flat().filter((c) => typeof c === 'string' || typeof c === 'number').join(''));

const render = (node: React.ReactElement): Rendered => {
  let tree!: Rendered;
  TestRenderer.act(() => {
    tree = TestRenderer.create(<ThemeProvider module="admin" mode="light">{node}</ThemeProvider>);
  });
  return tree;
};

describe('chart colours', () => {
  it('takes the series slots in their fixed order, never by rank', () => {
    expect(seriesColor(0, 'light')).toBe(CHART.light.series[0]);
    expect(seriesColor(2, 'dark')).toBe(CHART.dark.series[2]);
    expect(seriesColor(3, 'light')).toBe(CHART.light.series[0]);
  });

  it('gives each provider type its service colour, and "not chosen yet" the neutral', () => {
    expect(providerTypeColor('doctor', 'light', lightAdmin)).toBe(CHART.light.series[0]);
    expect(providerTypeColor('vendor', 'light', lightAdmin)).toBe(CHART.light.series[1]);
    expect(providerTypeColor('home_service', 'light', lightAdmin)).toBe(CHART.light.series[2]);
    expect(providerTypeColor('pending', 'light', lightAdmin)).toBe(lightAdmin.inkFaint);
  });

  it('paints a tone in its status colour', () => {
    expect(toneColor('success', lightAdmin)).toBe(lightAdmin.success);
    expect(toneColor('error', lightAdmin)).toBe(lightAdmin.error);
    expect(toneColor('neutral', lightAdmin)).toBe(lightAdmin.inkFaint);
  });
});

describe('the admin header ink', () => {
  it('is white on the gradient, so header icons stay visible', () => {
    expect(barInk(lightAdmin, false)).toBe(C.inkInverse);
  });

  it('is the ordinary ink on a plain bar', () => {
    expect(barInk(lightAdmin, false, 'surface')).toBe(lightAdmin.ink);
  });
});

describe('donut arcs', () => {
  it('runs every part round the ring in turn, with a gap between neighbours', () => {
    const arcs = donutArcs([3, 1], 400, 2);
    expect(arcs[0]).toEqual({ start: 0, length: 298 });
    expect(arcs[1]).toEqual({ start: 300, length: 98 });
  });

  it('closes the ring for a single part, and draws nothing for an empty whole', () => {
    expect(donutArcs([5, 0], 400, 2)[0]).toEqual({ start: 0, length: 400 });
    expect(donutArcs([5, 0], 400, 2)[1].length).toBe(0);
    expect(donutArcs([0, 0], 400)).toEqual([]);
  });

  it('rounds shares to whole percent, and calls an empty whole 0 %', () => {
    expect(sharePercent(1, 3)).toBe(33);
    expect(sharePercent(0, 0)).toBe(0);
  });
});

describe('the charts as rendered', () => {
  const segments = [
    { key: 'doctor', label: 'Doctors', value: 3, color: CHART.light.series[0] },
    { key: 'vendor', label: 'Shopping vendors', value: 1, color: CHART.light.series[1] },
  ];

  it('the donut writes the total and every part out, and tells a screen reader the same', () => {
    const tree = render(<DonutChart segments={segments} caption="providers" />);
    const shown = texts(tree);
    expect(shown).toEqual(expect.arrayContaining(['4', 'providers', 'Doctors', 'Shopping vendors']));
    const image = tree.root.findAll((n) => n.props.accessibilityRole === 'image')[0];
    expect(image.props.accessibilityLabel).toBe('4 providers: Doctors 3 (75%), Shopping vendors 1 (25%).');
    expect(tree.root.findAll((n) => (n.type as unknown) === 'Circle')).toHaveLength(3);
  });

  it('the split bar says so when there is nothing to split', () => {
    const tree = render(<SplitBar segments={segments.map((s) => ({ ...s, value: 0 }))} emptyText="Nobody yet." />);
    expect(texts(tree)).toEqual(['Nobody yet.']);
  });
});
