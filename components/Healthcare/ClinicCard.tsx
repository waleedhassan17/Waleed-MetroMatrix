import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/Colors';
import { Typography } from '../../constants/Fonts';
import type { Clinic } from '../../models/healthcare/types';

interface ClinicCardProps {
  clinic: Clinic;
  onPress?: (clinic: Clinic) => void;
}

const ClinicCard: React.FC<ClinicCardProps> = ({ clinic, onPress }) => {
  const openDays = clinic.timings.filter((t) => t.isOpen);

  const handleCall = () => Linking.openURL(`tel:${clinic.phone}`);

  const handleDirections = () => {
    const url = Platform.select({
      ios: `maps:0,0?q=${clinic.coordinates.lat},${clinic.coordinates.lng}`,
      android: `geo:${clinic.coordinates.lat},${clinic.coordinates.lng}?q=${clinic.coordinates.lat},${clinic.coordinates.lng}`,
    });
    if (url) Linking.openURL(url);
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(clinic)}
      activeOpacity={onPress ? 0.8 : 1}
    >
      {/* Name + City */}
      <Text style={styles.name}>{clinic.name}</Text>
      <View style={styles.addressRow}>
        <Ionicons name="location-outline" size={14} color={Colors.text.secondary} />
        <Text style={styles.address} numberOfLines={2}>
          {clinic.address}, {clinic.city}
        </Text>
      </View>

      {/* Timings (first 3 open days) */}
      {openDays.length > 0 && (
        <View style={styles.timingsBox}>
          {openDays.slice(0, 3).map((t) => (
            <View key={t.day} style={styles.timingRow}>
              <Text style={styles.timingDay}>{t.day}</Text>
              <Text style={styles.timingTime}>{t.openTime} – {t.closeTime}</Text>
            </View>
          ))}
          {openDays.length > 3 && (
            <Text style={styles.moreText}>+{openDays.length - 3} more days</Text>
          )}
        </View>
      )}

      {/* Amenities */}
      {clinic.amenities.length > 0 && (
        <View style={styles.amenitiesRow}>
          {clinic.amenities.slice(0, 4).map((a) => (
            <View key={a} style={styles.amenityChip}>
              <Text style={styles.amenityText}>{a}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleCall}>
          <Ionicons name="call-outline" size={15} color={Colors.categories.medical.primary} />
          <Text style={styles.actionText}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleDirections}>
          <Ionicons name="navigate-outline" size={15} color={Colors.categories.medical.primary} />
          <Text style={styles.actionText}>Directions</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.small,
  },
  name: {
    ...Typography.title.medium,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  addressRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  address: {
    ...Typography.body.small,
    color: Colors.text.secondary,
    flex: 1,
  },
  timingsBox: {
    marginBottom: Spacing.md,
  },
  timingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  timingDay: {
    ...Typography.body.small,
    color: Colors.text.secondary,
    width: 80,
  },
  timingTime: {
    ...Typography.body.small,
    color: Colors.text.primary,
  },
  moreText: {
    ...Typography.caption.medium,
    color: Colors.categories.medical.primary,
    marginTop: 2,
  },
  amenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  amenityChip: {
    backgroundColor: Colors.backgroundAlt,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  amenityText: {
    ...Typography.caption.medium,
    color: Colors.text.secondary,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.categories.medical.primary,
  },
  actionText: {
    ...Typography.label.medium,
    color: Colors.categories.medical.primary,
  },
});

export default ClinicCard;
