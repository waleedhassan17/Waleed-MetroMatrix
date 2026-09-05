// ============================================================================
// MapLibre geometry helpers
//
// Two things change when moving off react-native-maps, and both fail silently
// rather than throwing. They live here so the conversion is written once.
//
//  1. Coordinate ORDER. react-native-maps takes { latitude, longitude };
//     MapLibre follows GeoJSON and takes [longitude, latitude]. A flipped pair
//     is still a valid coordinate, so nothing errors — the marker just lands in
//     the Indian Ocean instead of Lahore. Never write the array literal inline;
//     always go through toLngLat().
//
//  2. Circle UNITS. <Circle radius={100}/> in react-native-maps means 100
//     metres on the ground. MapLibre's `circle-radius` paint property is in
//     SCREEN PIXELS, so a proximity ring drawn that way silently grows and
//     shrinks as you zoom. metresCircle() builds a real polygon instead, so
//     100 m stays 100 m.
// ============================================================================

import type { Feature, LineString, Point, Polygon } from 'geojson';

export interface LatLng {
  latitude: number;
  longitude: number;
}

/** GeoJSON position: [longitude, latitude] — the opposite order to LatLng. */
export type LngLat = [number, number];

const EARTH_RADIUS_M = 6_371_000;

export const toLngLat = (c: LatLng): LngLat => [c.longitude, c.latitude];

export const pointFeature = (c: LatLng): Feature<Point> => ({
  type: 'Feature',
  properties: {},
  geometry: { type: 'Point', coordinates: toLngLat(c) },
});

export const lineFeature = (coords: LatLng[]): Feature<LineString> => ({
  type: 'Feature',
  properties: {},
  geometry: { type: 'LineString', coordinates: coords.map(toLngLat) },
});

/**
 * A circle of `radiusM` metres around `centre`, as a polygon.
 *
 * Longitude degrees shrink towards the poles, so the east–west radius is
 * divided by cos(latitude); skipping that gives a visible ellipse away from the
 * equator. 64 segments is smooth at every zoom this app uses.
 */
export const metresCircle = (
  centre: LatLng,
  radiusM: number,
  segments = 64
): Feature<Polygon> => {
  const latRad = (centre.latitude * Math.PI) / 180;
  const dLat = (radiusM / EARTH_RADIUS_M) * (180 / Math.PI);
  const dLng = dLat / Math.max(Math.cos(latRad), 1e-6);

  const ring: LngLat[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const theta = (i / segments) * 2 * Math.PI;
    ring.push([
      centre.longitude + dLng * Math.cos(theta),
      centre.latitude + dLat * Math.sin(theta),
    ]);
  }
  // GeoJSON rings must close: last position repeats the first.
  ring[ring.length - 1] = ring[0];

  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [ring] },
  };
};

/**
 * Bounds enclosing every point, padded so markers near the edge are not
 * clipped. Feeds Camera.fitBounds, which replaces react-native-maps'
 * mapRef.fitToCoordinates.
 *
 * MapLibre's LngLatBounds is a FLAT four-tuple in GeoJSON order —
 * [west, south, east, north] — not a pair of corner objects.
 */
export type LngLatBounds = [west: number, south: number, east: number, north: number];

export const boundsOf = (coords: LatLng[], padDegrees = 0.004): LngLatBounds => {
  const lats = coords.map((c) => c.latitude);
  const lngs = coords.map((c) => c.longitude);
  return [
    Math.min(...lngs) - padDegrees,
    Math.min(...lats) - padDegrees,
    Math.max(...lngs) + padDegrees,
    Math.max(...lats) + padDegrees,
  ];
};

/**
 * Great-circle distance in kilometres.
 *
 * Mirrors the calculation already inside liveTrackingSlice.fetchRouteInfo so
 * the customer's tracking screen and the provider's navigation screen quote the
 * same number for the same pair of points.
 */
export const distanceKm = (a: LatLng, b: LatLng): number => {
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.latitude * Math.PI) / 180) *
      Math.cos((b.latitude * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return (EARTH_RADIUS_M / 1000) * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

/**
 * Straight-line distance and a time estimate at 25 km/h — the same city-traffic
 * assumption fetchRouteInfo uses. Labelled as an estimate because it is not a
 * road-following route.
 */
export const estimateRoute = (origin: LatLng, destination: LatLng) => {
  const km = distanceKm(origin, destination);
  const minutes = Math.max(1, Math.round((km / 25) * 60));
  return {
    distance: `${km.toFixed(1)} km`,
    duration: `${minutes} min${minutes > 1 ? 's' : ''}`,
  };
};
