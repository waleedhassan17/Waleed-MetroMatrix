// ============================================================================
// Demand chart: what happened, and what the forecast expects.
//
// ONE measure on ONE axis. Actuals are a solid 2px line; the forecast is the
// same hue, dashed (the convention for a projection), with its 95% range as a
// 10% wash. A hairline marks "today". Identity never rests on colour alone: a
// legend with line keys sits above the plot. Press and drag to read any day —
// the crosshair snaps to dates, and the readout lists actual, forecast and
// range together. Every value is also in the table view underneath.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { CHART, R, S, T } from '../../../constants/theme';
import { ThemeColors, useTheme } from '../../../theme';
import { bandPath, compact, Frame, linePath, nearestIndex, shortDay, ticks, xAt, yAt } from './geometry';

export interface ForecastChartProps {
  history: { date: string; actual: number }[];
  forecast: { date: string; yhat: number; lo?: number | null; hi?: number | null }[];
  /** What is being counted, for the readout and screen readers: "bookings", "orders". */
  unit: string;
  height?: number;
}

type Row = { date: string; actual: number | null; yhat: number | null; lo: number | null; hi: number | null };

const PLOT_PAD = { padLeft: 36, padRight: 12, padTop: 12, padBottom: 8 };

export default function ForecastChart({ history, forecast, unit, height = 180 }: ForecastChartProps) {
  const { colors, mode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const series = CHART[mode === 'dark' ? 'dark' : 'light'].series[0];
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  // One row per day: history then forecast; a forecast for a day that also has
  // an actual (today) shares the row.
  const rows: Row[] = useMemo(() => {
    const byDate = new Map<string, Row>();
    for (const h of history) byDate.set(h.date, { date: h.date, actual: h.actual, yhat: null, lo: null, hi: null });
    for (const p of forecast) {
      const r = byDate.get(p.date) || { date: p.date, actual: null, yhat: null, lo: null, hi: null };
      r.yhat = p.yhat;
      r.lo = p.lo ?? null;
      r.hi = p.hi ?? null;
      byDate.set(p.date, r);
    }
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [history, forecast]);

  const max = useMemo(
    () => Math.max(1, ...rows.map((r) => Math.max(r.actual ?? 0, r.hi ?? r.yhat ?? 0))),
    [rows]
  );
  const yTicks = useMemo(() => ticks(max), [max]);
  const top = yTicks[yTicks.length - 1];
  const frame: Frame = { width, height, ...PLOT_PAD };
  const n = rows.length;
  const firstForecast = rows.findIndex((r) => r.yhat !== null);
  const lastActual = rows.reduce((acc, r, i) => (r.actual !== null ? i : acc), -1);

  const geometry = useMemo(() => {
    if (!width || !n) return null;
    const pt = (i: number, v: number) => ({ x: xAt(i, n, frame), y: yAt(v, top, frame) });
    const actual = rows.map((r, i) => (r.actual !== null ? pt(i, r.actual) : null));
    // The forecast line starts at the last actual so the two read as one story.
    const fc: ({ x: number; y: number } | null)[] = rows.map((r, i) => (r.yhat !== null ? pt(i, r.yhat) : null));
    if (lastActual >= 0 && firstForecast > lastActual) fc[lastActual] = actual[lastActual];
    const banded = rows.map((r, i) => ({ r, i })).filter(({ r }) => r.yhat !== null && r.lo !== null && r.hi !== null);
    return {
      actualPath: linePath(actual),
      forecastPath: linePath(fc),
      band: bandPath(
        banded.map(({ r, i }) => pt(i, r.hi as number)),
        banded.map(({ r, i }) => pt(i, r.lo as number))
      ),
      todayX: firstForecast >= 0 ? xAt(firstForecast, n, frame) : null,
      endDot: lastActual >= 0 ? actual[lastActual] : null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, rows, top]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));
  const pick = (x: number) => setActive(nearestIndex(x, n, frame));
  const activeRow = active !== null ? rows[active] : null;

  const totalPast = history.reduce((s, h) => s + h.actual, 0);
  const totalNext = forecast.slice(0, 7).reduce((s, p) => s + p.yhat, 0);
  const summary = `${compact(totalPast)} ${unit} in the last ${history.length} days; about ${compact(Math.round(totalNext))} expected in the next ${Math.min(7, forecast.length)} days.`;

  if (!n) return <Text style={styles.empty}>No data yet.</Text>;

  return (
    <View>
      {/* Legend — always present for two series; line keys mirror the marks. */}
      <View style={styles.legend} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={styles.legendItem}>
          <View style={[styles.keySolid, { backgroundColor: series }]} />
          <Text style={styles.legendText}>Actual</Text>
        </View>
        {forecast.length > 0 && (
          <>
            <View style={styles.legendItem}>
              <View style={styles.keyDashed}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={[styles.dash, { backgroundColor: series }]} />
                ))}
              </View>
              <Text style={styles.legendText}>Forecast</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.keyBand, { backgroundColor: series, opacity: CHART.bandOpacity * 2.5 }]} />
              <Text style={styles.legendText}>Likely range</Text>
            </View>
          </>
        )}
      </View>

      <View
        style={{ height }}
        onLayout={onLayout}
        accessible
        accessibilityRole="image"
        accessibilityLabel={summary}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => pick(e.nativeEvent.locationX)}
        onResponderMove={(e) => pick(e.nativeEvent.locationX)}
        onResponderRelease={() => setActive(null)}
        onResponderTerminate={() => setActive(null)}
      >
        {geometry && (
          <Svg width={width} height={height}>
            {/* Recessive hairline grid at the clean ticks. */}
            {yTicks.map((t) => (
              <Line
                key={`g${t}`}
                x1={PLOT_PAD.padLeft}
                x2={width - PLOT_PAD.padRight}
                y1={yAt(t, top, frame)}
                y2={yAt(t, top, frame)}
                stroke={colors.lineSoft}
                strokeWidth={1}
              />
            ))}
            {!!geometry.band && <Path d={geometry.band} fill={series} opacity={CHART.bandOpacity} />}
            {geometry.todayX !== null && (
              <Line
                x1={geometry.todayX}
                x2={geometry.todayX}
                y1={PLOT_PAD.padTop}
                y2={height - PLOT_PAD.padBottom}
                stroke={colors.line}
                strokeWidth={1}
              />
            )}
            <Path d={geometry.actualPath} stroke={series} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            {!!geometry.forecastPath && (
              <Path
                d={geometry.forecastPath}
                stroke={series}
                strokeWidth={2}
                strokeDasharray="5 4"
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
            {geometry.endDot && (
              <Circle cx={geometry.endDot.x} cy={geometry.endDot.y} r={4} fill={series} stroke={colors.surface} strokeWidth={2} />
            )}
            {active !== null && (
              <>
                <Line
                  x1={xAt(active, n, frame)}
                  x2={xAt(active, n, frame)}
                  y1={PLOT_PAD.padTop}
                  y2={height - PLOT_PAD.padBottom}
                  stroke={colors.inkMuted}
                  strokeWidth={1}
                />
                {activeRow && (activeRow.actual ?? activeRow.yhat) !== null && (
                  <Circle
                    cx={xAt(active, n, frame)}
                    cy={yAt((activeRow.actual ?? activeRow.yhat) as number, top, frame)}
                    r={5}
                    fill={series}
                    stroke={colors.surface}
                    strokeWidth={2}
                  />
                )}
              </>
            )}
          </Svg>
        )}

        {/* Y tick labels: ink tokens, never the series colour. */}
        {width > 0 &&
          yTicks.map((t) => (
            <Text key={`t${t}`} style={[styles.tick, { top: yAt(t, top, frame) - 7 }]}>
              {compact(t)}
            </Text>
          ))}
        {geometry?.todayX != null && (
          <Text style={[styles.todayLabel, { left: Math.min(geometry.todayX + 4, width - 44) }]}>Today</Text>
        )}

        {activeRow && width > 0 && (
          <View
            pointerEvents="none"
            style={[styles.tooltip, { left: Math.min(Math.max(xAt(active as number, n, frame) - 70, 0), width - 140) }]}
          >
            <Text style={styles.tooltipDate}>{shortDay(activeRow.date)}</Text>
            {activeRow.actual !== null && (
              <Text style={styles.tooltipRow}>
                <Text style={styles.tooltipValue}>{compact(activeRow.actual)}</Text> {unit}
              </Text>
            )}
            {activeRow.yhat !== null && (
              <Text style={styles.tooltipRow}>
                <Text style={styles.tooltipValue}>~{compact(Math.round(activeRow.yhat * 10) / 10)}</Text> expected
                {activeRow.lo !== null && activeRow.hi !== null
                  ? ` (${compact(Math.round(activeRow.lo))}–${compact(Math.round(activeRow.hi))})`
                  : ''}
              </Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.xAxis}>
        <Text style={styles.axisText}>{shortDay(rows[0].date)}</Text>
        <Text style={styles.axisText}>{shortDay(rows[n - 1].date)}</Text>
      </View>

      <TouchableOpacity
        onPress={() => setShowTable((v) => !v)}
        accessibilityRole="button"
        style={styles.tableToggle}
      >
        <Text style={styles.tableToggleText}>{showTable ? 'Hide table' : 'Show as table'}</Text>
      </TouchableOpacity>
      {showTable && (
        <View style={styles.table}>
          <View style={[styles.tr, styles.trHead]}>
            <Text style={[styles.td, styles.th]}>Day</Text>
            <Text style={[styles.td, styles.th, styles.num]}>Actual</Text>
            <Text style={[styles.td, styles.th, styles.num]}>Forecast</Text>
          </View>
          {rows.map((r) => (
            <View key={r.date} style={styles.tr}>
              <Text style={styles.td}>{shortDay(r.date)}</Text>
              <Text style={[styles.td, styles.num]}>{r.actual !== null ? r.actual : '—'}</Text>
              <Text style={[styles.td, styles.num]}>
                {r.yhat !== null
                  ? `${Math.round(r.yhat * 10) / 10}${r.lo !== null && r.hi !== null ? ` (${Math.round(r.lo)}–${Math.round(r.hi)})` : ''}`
                  : '—'}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    empty: { ...T.body, color: c.inkMuted },
    legend: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: S.sm },
    legendItem: { flexDirection: 'row', alignItems: 'center', marginRight: S.lg, marginBottom: S.xs },
    legendText: { ...T.caption, color: c.inkMuted, marginLeft: S.xs },
    keySolid: { width: 16, height: 2, borderRadius: 1 },
    keyDashed: { flexDirection: 'row', width: 16, justifyContent: 'space-between' },
    dash: { width: 4, height: 2, borderRadius: 1 },
    keyBand: { width: 14, height: 10, borderRadius: 2 },
    tick: { ...T.micro, color: c.inkFaint, position: 'absolute', left: 0, width: 30, textAlign: 'right' },
    todayLabel: { ...T.micro, color: c.inkMuted, position: 'absolute', top: 0 },
    xAxis: { flexDirection: 'row', justifyContent: 'space-between', paddingLeft: PLOT_PAD.padLeft, paddingRight: PLOT_PAD.padRight, marginTop: S.xs },
    axisText: { ...T.micro, color: c.inkFaint },
    tooltip: {
      position: 'absolute',
      top: 0,
      width: 140,
      padding: S.sm,
      borderRadius: R.control,
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.line,
    },
    tooltipDate: { ...T.micro, color: c.inkMuted },
    tooltipRow: { ...T.caption, color: c.inkMuted, marginTop: 2 },
    tooltipValue: { ...T.label, color: c.ink },
    tableToggle: { alignSelf: 'flex-start', marginTop: S.sm, paddingVertical: S.xs },
    tableToggleText: { ...T.label, color: c.accentDeep },
    table: { marginTop: S.xs, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },
    tr: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.lineSoft },
    trHead: { paddingVertical: S.xs },
    td: { ...T.caption, color: c.ink, flex: 1 },
    th: { color: c.inkMuted },
    num: { textAlign: 'right', fontVariant: ['tabular-nums'] },
  });
