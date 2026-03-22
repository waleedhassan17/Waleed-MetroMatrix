import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/Colors';
import { Typography } from '../../constants/Fonts';
import type { Doctor } from '../../models/healthcare/types';
import RatingStars from './RatingStars';
import VerifiedBadge from './VerifiedBadge';
import ConsultationTypeBadge from './ConsultationTypeBadge';

interface DoctorCardProps {
  doctor: Doctor;
  onPress?: (doctor: Doctor) => void;
  onBook?: (doctor: Doctor) => void;
}

const DoctorCard: React.FC<DoctorCardProps> = ({ doctor, onPress, onBook }) => {
  const consultType =
    doctor.videoConsultationFee > 0 ? 'both' : 'in-clinic';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(doctor)}
      activeOpacity={0.8}
    >
      {/* Top Row: Avatar + Info */}
      <View style={styles.topRow}>
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <LinearGradient
            colors={[Colors.categories.medical.light, Colors.categories.medical.primary + '30']}
            style={styles.avatar}
          >
            <Ionicons name="person" size={28} color={Colors.categories.medical.primary} />
          </LinearGradient>
          {doctor.isAvailable && <View style={styles.onlineDot} />}
        </View>

        {/* Info */}
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              Dr. {doctor.bio.split(' ')[1] || 'Doctor'}
            </Text>
            {doctor.isVerified && <VerifiedBadge size="small" />}
          </View>

          <Text style={styles.qualifications} numberOfLines={1}>
            {doctor.qualifications.join(', ')}
          </Text>

          <Text style={styles.specialty} numberOfLines={1}>
            {doctor.subspecialties.join(' · ') || 'General Practice'}
          </Text>

          {/* Rating + Experience */}
          <View style={styles.metaRow}>
            <RatingStars rating={doctor.rating} size={11} totalReviews={doctor.totalReviews} />
            <View style={styles.expChip}>
              <Ionicons name="time-outline" size={11} color={Colors.text.secondary} />
              <Text style={styles.expText}>{doctor.experience} yrs</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Available Today indicator */}
      {doctor.isAvailable && (
        <View style={styles.availableRow}>
          <View style={styles.availableDot} />
          <Text style={styles.availableText}>Available Today</Text>
        </View>
      )}

      {/* Bottom Row: Fee + Badges + Book */}
      <View style={styles.bottomRow}>
        <View style={styles.bottomLeft}>
          <View>
            <Text style={styles.feeLabel}>Consultation Fee</Text>
            <Text style={styles.feeAmount}>Rs. {doctor.consultationFee}</Text>
          </View>
          <ConsultationTypeBadge type={consultType} compact />
        </View>

        {onBook && (
          <TouchableOpacity
            style={styles.bookBtn}
            onPress={() => onBook(doctor)}
            activeOpacity={0.8}
          >
            <Text style={styles.bookBtnText}>Book</Text>
          </TouchableOpacity>
        )}
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
  topRow: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  avatarWrap: {
    position: 'relative',
    marginRight: Spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 2,
  },
  name: {
    ...Typography.title.medium,
    color: Colors.text.primary,
    flexShrink: 1,
  },
  qualifications: {
    ...Typography.caption.large,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  specialty: {
    ...Typography.caption.medium,
    color: Colors.categories.medical.primary,
    marginBottom: Spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  expChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.backgroundAlt,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  expText: {
    ...Typography.caption.medium,
    color: Colors.text.secondary,
  },

  // Available
  availableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  availableDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  availableText: {
    ...Typography.caption.large,
    color: Colors.success,
    fontWeight: '600',
  },

  // Bottom
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.md,
  },
  bottomLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  feeLabel: {
    ...Typography.caption.medium,
    color: Colors.text.tertiary,
  },
  feeAmount: {
    ...Typography.title.medium,
    color: Colors.text.primary,
  },
  bookBtn: {
    backgroundColor: Colors.categories.medical.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  bookBtnText: {
    ...Typography.button?.small ?? Typography.label.medium,
    color: Colors.text.inverse,
  },
});

export default DoctorCard;
