// ============================================================================
// Location picker — pin a place on purpose.
//
// "Near you" is only as good as the point it is measured from. Saved
// addresses used to be text only, so the server filled in the centre of
// Lahore and every customer was "near" the same spot. This control produces a
// real point three ways, and says which one it is:
//   - gps     "Use my current location" (asks for permission on the tap)
//   - geocode "Find from the address" — the typed address, geocoded on the phone
//   - pin     a tap on the map moves the pin wherever the customer means
//
// MapLibre is loaded through loadMapLibre(): an old binary without the native
// module still gets the two buttons, just no map.
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { MAP_STYLE_URL } from '../../config/env';
import { R, S, T } from '../../constants/theme';
import { ThemeColors, useTheme } from '../../theme';
import { loadMapLibre } from './mapLibreSafe';
import { LatLng, toLngLat } from '../../utils/homeservice/maplibre';

export type PointSource = 'gps' | 'pin' | 'geocode';

export interface PickedPoint {
  point: LatLng;
  source: PointSource;
  /** Filled from reverse geocoding when the customer used GPS. */
  suggestedAddress?: string;
  suggestedCity?: string;
}

export interface LocationPickerProps {
  value: LatLng | null;
  source: PointSource | null;
  /** The typed address, used by "Find from the address". */
  addressText: string;
  onChange: (picked: PickedPoint) => void;
}

const SOURCE_LABEL: Record<PointSource, string> = {
  gps: 'from your phone’s location',
  geocode: 'found from the address',
  pin: 'placed on the map',
};

export default function LocationPicker({ value, source, addressText, onChange }: LocationPickerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [busy, setBusy] = useState<'gps' | 'geocode' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const ML = loadMapLibre();

  const useGps = async () => {
    setMessage(null);
    setBusy('gps');
    try {
      const Location = require('expo-location');
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm?.status !== 'granted') {
        setMessage('Location permission is off. You can still find the address or tap the map.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy?.Balanced ?? 3 });
      const point = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      let suggestedAddress: string | undefined;
      let suggestedCity: string | undefined;
      try {
        const [place] = await Location.reverseGeocodeAsync(point);
        if (place) {
          suggestedAddress = [place.name, place.street, place.district].filter(Boolean).join(', ') || undefined;
          suggestedCity = place.city || place.subregion || undefined;
        }
      } catch {
        // reverse geocoding is a convenience only
      }
      onChange({ point, source: 'gps', suggestedAddress, suggestedCity });
    } catch {
      setMessage("We couldn't get a fix. Try again outdoors, or tap the map.");
    } finally {
      setBusy(null);
    }
  };

  const useGeocode = async () => {
    setMessage(null);
    if (addressText.trim().length < 4) {
      setMessage('Type the address first, then find it.');
      return;
    }
    setBusy('geocode');
    try {
      const Location = require('expo-location');
      const results = await Location.geocodeAsync(addressText.trim());
      const hit = results && results[0];
      if (!hit) {
        setMessage("We couldn't find that address. Tap the map to place the pin instead.");
        return;
      }
      onChange({ point: { latitude: hit.latitude, longitude: hit.longitude }, source: 'geocode' });
    } catch {
      setMessage("Address lookup isn't available on this phone. Tap the map to place the pin.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <View>
      <View style={styles.status}>
        <Ionicons
          name={value ? 'location' : 'location-outline'}
          size={16}
          color={value ? colors.success : colors.warning}
        />
        <Text style={styles.statusText}>
          {value && source
            ? `Location pinned — ${SOURCE_LABEL[source]}`
            : 'Not pinned yet — providers can’t tell how far away you are'}
        </Text>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity style={styles.button} onPress={useGps} disabled={!!busy} accessibilityRole="button">
          {busy === 'gps' ? (
            <ActivityIndicator size="small" color={colors.accentDeep} />
          ) : (
            <Ionicons name="navigate-outline" size={16} color={colors.accentDeep} />
          )}
          <Text style={styles.buttonText}>Use my location</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={useGeocode} disabled={!!busy} accessibilityRole="button">
          {busy === 'geocode' ? (
            <ActivityIndicator size="small" color={colors.accentDeep} />
          ) : (
            <Ionicons name="search-outline" size={16} color={colors.accentDeep} />
          )}
          <Text style={styles.buttonText}>Find from address</Text>
        </TouchableOpacity>
      </View>

      {!!message && <Text style={styles.message}>{message}</Text>}

      {ML ? (
        <View style={styles.mapWrap}>
          <ML.Map
            style={StyleSheet.absoluteFill}
            mapStyle={MAP_STYLE_URL}
            attribution
            logo={false}
            onPress={(e: any) => {
              const lngLat = e?.nativeEvent?.lngLat;
              if (Array.isArray(lngLat) && lngLat.length === 2) {
                onChange({ point: { latitude: lngLat[1], longitude: lngLat[0] }, source: 'pin' });
              }
            }}
          >
            <ML.Camera
              key={value ? `${value.latitude.toFixed(4)},${value.longitude.toFixed(4)}` : 'none'}
              initialViewState={{
                center: toLngLat(value || { latitude: 31.5204, longitude: 74.3587 }),
                zoom: value ? 15 : 10,
              }}
            />
            {value && (
              <ML.Marker id="picked" lngLat={toLngLat(value)} anchor="bottom">
                <Ionicons name="location" size={34} color={colors.accent} />
              </ML.Marker>
            )}
          </ML.Map>
          <View style={styles.mapHint} pointerEvents="none">
            <Text style={styles.mapHintText}>Tap the map to move the pin</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    status: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statusText: {
      ...T.caption,
      color: c.inkMuted,
      marginLeft: S.xs,
      flex: 1,
    },
    buttons: {
      flexDirection: 'row',
      marginTop: S.sm,
    },
    button: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: S.sm,
      marginRight: S.sm,
      borderRadius: R.control,
      backgroundColor: c.accentSoft,
    },
    buttonText: {
      ...T.label,
      color: c.accentDeep,
      marginLeft: S.xs,
    },
    message: {
      ...T.caption,
      color: c.warning,
      marginTop: S.sm,
    },
    mapWrap: {
      height: 170,
      marginTop: S.md,
      borderRadius: R.control,
      overflow: 'hidden',
      backgroundColor: c.surfaceSunken,
    },
    mapHint: {
      position: 'absolute',
      left: S.sm,
      bottom: S.sm,
      paddingHorizontal: S.sm,
      paddingVertical: 2,
      borderRadius: R.chip,
      backgroundColor: c.surface,
    },
    mapHintText: {
      ...T.micro,
      color: c.inkMuted,
    },
  });
