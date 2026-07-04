import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { HC, HCRadius, HCShadow } from '../../constants/HealthcareTheme';
import type { Doctor } from '../../models/healthcare/types';
import DoctorAvatar from './DoctorAvatar';
import {
  getDoctorDisplayName,
  getDoctorSpecialty,
  getQualificationsLine,
  getConsultationFee,
  getExperienceLabel,
  getRating,
  getConsultationModes,
} from '../../utils/healthcare/doctorDisplay';

interface DoctorCardProps {
  doctor: Doctor;
  onPress?: (doctor: Doctor) => void;
  onBook?: (doctor: Doctor) => void;
}

const DoctorCard: React.FC<DoctorCardProps> = ({ doctor, onPress, onBook }) => {
  const rating = getRating(doctor);
  const modes = getConsultationModes(doctor);
  const experience = getExperienceLabel(doctor);
  const quals = getQualificationsLine(doctor);

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress?.(doctor)} activeOpacity={0.85}>
      <View style={styles.topRow}>
        <DoctorAvatar doctor={doctor} size={60} showOnlineDot showVerified />

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {getDoctorDisplayName(doctor)}
          </Text>
          <Text style={styles.specialty} numberOfLines={1}>
            {getDoctorSpecialty(doctor)}
          </Text>
          {!!quals && (
            <Text style={styles.quals} numberOfLines={1}>
              {quals}
            </Text>
          )}

          <View style={styles.metaRow}>
            <View style={styles.ratingChip}>
              <Ionicons name="star" size={11} color={HC.star} />
              <Text style={styles.ratingText}>{rating.value}</Text>
              {rating.hasRating && <Text style={styles.ratingCount}>({rating.count})</Text>}
            </View>
            {experience && (
              <>
                <View style={styles.dot} />
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons name="briefcase-outline" size={12} color={HC.textLight} />
                  <Text style={styles.metaText}>{experience}</Text>
                </View>
              </>
            )}
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.bottomRow}>
        <View style={styles.bottomLeft}>
          <View style={styles.modeChips}>
            {modes.inClinic && (
              <View style={styles.modeChip}>
                <Ionicons name="business-outline" size={11} color={HC.primaryDark} />
                <Text style={styles.modeText}>In-clinic</Text>
              </View>
            )}
            {modes.video && (
              <View style={[styles.modeChip, { backgroundColor: HC.successLight }]}>
                <Ionicons name="videocam-outline" size={11} color={HC.successDark} />
                <Text style={[styles.modeText, { color: HC.successDark }]}>Video</Text>
              </View>
            )}
          </View>
          <Text style={styles.fee}>{getConsultationFee(doctor)}</Text>
        </View>

        {onBook && (
          <TouchableOpacity style={styles.bookBtn} onPress={() => onBook(doctor)} activeOpacity={0.85}>
            <Text style={styles.bookText}>Book</Text>
            <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: HC.card,
    borderRadius: HCRadius.lg,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: HC.borderLight,
    ...HCShadow.sm,
  },
  topRow: { flexDirection: 'row', gap: 14 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '800', color: HC.textHeading, letterSpacing: -0.3 },
  specialty: { fontSize: 13, fontWeight: '600', color: HC.primary, marginTop: 2 },
  quals: { fontSize: 12, fontWeight: '500', color: HC.textLight, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: HC.warningLight,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  ratingText: { fontSize: 11, fontWeight: '800', color: HC.warningDark },
  ratingCount: { fontSize: 10, fontWeight: '600', color: HC.warningDark, opacity: 0.8 },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: HC.textMuted },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11, fontWeight: '600', color: HC.textLight },
  divider: { height: 1, backgroundColor: HC.divider, marginVertical: 12 },
  bottomRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  bottomLeft: { flex: 1 },
  modeChips: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: HC.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  modeText: { fontSize: 10, fontWeight: '700', color: HC.primaryDark },
  fee: { fontSize: 15, fontWeight: '800', color: HC.textHeading },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: HC.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: HCRadius.sm,
    ...HCShadow.brand,
  },
  bookText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
});

export default DoctorCard;
