// ============================================================================
// Provider discovery map
//
// The same search results as the list, placed on a map around the customer:
// their position, the search radius as a real metre-accurate ring, and each
// provider's SERVICE AREA. A base is an area (~500 m, stored coarsened by the
// server), never a live position — so markers are drawn as soft area dots, and
// a provider whose distance is only approximate (their city's centre) is not
// drawn at all rather than stacked on a city centroid as if they lived there.
//
// MapLibre is loaded through loadMapLibre(): an old binary without the native
// module degrades to a message here instead of crashing the app.
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Avatar, Button, Card, EmptyState } from '../ui';
import { MAP_STYLE_URL } from '../../config/env';
import { R, S, T } from '../../constants/theme';
import { ThemeColors, useTheme } from '../../theme';
import { Provider } from '../../models/serviceProviders';
import { loadMapLibre } from './mapLibreSafe';
import { boundsOf, LatLng, metresCircle, toLngLat } from '../../utils/homeservice/maplibre';
import { formatPrice, formatRating } from '../../utils/homeservice/format';

export interface ProviderDiscoveryMapProps {
  providers: Provider[];
  origin: LatLng | null;
  radiusKm: number | null;
  tint: string;
  tintSoft: string;
  onOpenProvider: (id: string) => void;
  onBook: (id: string) => void;
}

const LAHORE: LatLng = { latitude: 31.5204, longitude: 74.3587 };

export default function ProviderDiscoveryMap({
  providers,
  origin,
  radiusKm,
  tint,
  tintSoft,
  onOpenProvider,
  onBook,
}: ProviderDiscoveryMapProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const ML = loadMapLibre();

  // Only providers whose base is pinned (distance known) get a marker.
  const placed = useMemo(
    () => providers.filter((p) => p.coordinates && !p.distanceApprox),
    [providers]
  );
  const selected = placed.find((p) => p.id === selectedId) || null;

  const initialView = useMemo(() => {
    const points: LatLng[] = [
      ...(origin ? [origin] : []),
      ...placed.map((p) => p.coordinates as LatLng),
    ];
    if (points.length >= 2) return { bounds: boundsOf(points, 0.01), padding: { top: 48, right: 48, bottom: 160, left: 48 } };
    return { center: toLngLat(points[0] || LAHORE), zoom: points.length ? 13 : 11 };
  }, [origin, placed]);

  if (!ML) {
    return (
      <EmptyState
        icon="map-outline"
        title="Map needs the latest app"
        message="This build of the app can't show maps. The list has the same providers."
      />
    );
  }

  const { Camera, GeoJSONSource, Layer, Map, Marker } = ML;

  return (
    <View style={styles.wrap}>
      <Map style={StyleSheet.absoluteFill} mapStyle={MAP_STYLE_URL} attribution logo={false}>
        <Camera initialViewState={initialView as any} />

        {origin && radiusKm ? (
          <GeoJSONSource id="search-radius" data={metresCircle(origin, radiusKm * 1000)}>
            <Layer id="search-radius-fill" type="fill" style={{ fillColor: tint, fillOpacity: 0.06 }} />
            <Layer id="search-radius-line" type="line" style={{ lineColor: tint, lineOpacity: 0.35, lineWidth: 1.5 }} />
          </GeoJSONSource>
        ) : null}

        {origin && (
          <Marker id="you" lngLat={toLngLat(origin)} anchor="center">
            <View style={[styles.you, { backgroundColor: colors.accent }]}>
              <Ionicons name="home" size={12} color={colors.inkInverse} />
            </View>
          </Marker>
        )}

        {placed.map((p) => (
          <Marker
            key={p.id}
            id={`provider-${p.id}`}
            lngLat={toLngLat(p.coordinates as LatLng)}
            anchor="center"
            onPress={() => setSelectedId(p.id)}
          >
            <TouchableOpacity
              onPress={() => setSelectedId(p.id)}
              accessibilityRole="button"
              accessibilityLabel={`${p.name}${typeof p.distanceKm === 'number' ? `, ${p.distanceKm} km away` : ''}`}
              style={[
                styles.pin,
                { borderColor: tint, backgroundColor: p.id === selectedId ? tint : tintSoft },
              ]}
            >
              <Text style={[styles.pinText, { color: p.id === selectedId ? colors.inkInverse : tint }]}>
                {(p.name || '?').trim().charAt(0).toUpperCase()}
              </Text>
              {p.availableNow && <View style={[styles.liveDot, { backgroundColor: colors.success }]} />}
            </TouchableOpacity>
          </Marker>
        ))}
      </Map>

      {placed.length < providers.length && !selected && (
        <View style={styles.note} pointerEvents="none">
          <Text style={styles.noteText}>
            {providers.length - placed.length} provider{providers.length - placed.length === 1 ? '' : 's'} without a
            pinned area {providers.length - placed.length === 1 ? 'is' : 'are'} in the list only
          </Text>
        </View>
      )}

      {selected && (
        <Card style={styles.preview}>
          <View style={styles.previewRow}>
            <Avatar uri={selected.image} name={selected.name} size={44} tint={tintSoft} color={tint} />
            <View style={styles.previewInfo}>
              <Text style={styles.previewName} numberOfLines={1}>
                {selected.name}
              </Text>
              <Text style={styles.previewMeta} numberOfLines={1}>
                {[
                  formatRating(selected.rating) ? `★ ${formatRating(selected.rating)}` : 'New provider',
                  typeof selected.distanceKm === 'number' ? `${selected.distanceKm} km` : null,
                  selected.availableNow ? 'Available now' : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              <Text style={styles.previewMeta}>From {formatPrice(selected.price, 'On request')}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setSelectedId(null)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Close preview"
            >
              <Ionicons name="close" size={20} color={colors.inkFaint} />
            </TouchableOpacity>
          </View>
          <View style={styles.previewActions}>
            <Button
              label="View profile"
              variant="secondary"
              size="sm"
              fullWidth={false}
              onPress={() => onOpenProvider(selected.id)}
              style={styles.previewButton}
            />
            <Button
              label="Book"
              size="sm"
              fullWidth={false}
              onPress={() => onBook(selected.id)}
              style={styles.previewButton}
            />
          </View>
        </Card>
      )}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    wrap: {
      flex: 1,
      minHeight: 420,
      borderRadius: R.card,
      overflow: 'hidden',
      backgroundColor: c.surfaceSunken,
    },
    you: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: c.surface,
    },
    pin: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pinText: {
      ...T.label,
    },
    liveDot: {
      position: 'absolute',
      right: -1,
      top: -1,
      width: 9,
      height: 9,
      borderRadius: 5,
      borderWidth: 1.5,
      borderColor: c.surface,
    },
    note: {
      position: 'absolute',
      left: S.md,
      right: S.md,
      bottom: S.md,
      padding: S.sm,
      borderRadius: R.control,
      backgroundColor: c.surface,
    },
    noteText: {
      ...T.caption,
      color: c.inkMuted,
      textAlign: 'center',
    },
    preview: {
      position: 'absolute',
      left: S.md,
      right: S.md,
      bottom: S.md,
    },
    previewRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    previewInfo: {
      flex: 1,
      marginHorizontal: S.md,
    },
    previewName: {
      ...T.subhead,
      color: c.ink,
    },
    previewMeta: {
      ...T.caption,
      color: c.inkMuted,
      marginTop: 2,
    },
    previewActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: S.md,
    },
    previewButton: {
      marginLeft: S.sm,
      paddingHorizontal: S.lg,
    },
  });
