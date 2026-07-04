import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { HC } from '../../constants/HealthcareTheme';
import { getDoctorInitials } from '../../utils/healthcare/doctorDisplay';
import type { Doctor } from '../../models/healthcare/types';

interface DoctorAvatarProps {
  doctor?: Partial<Pick<Doctor, 'name' | 'profileImage' | 'isAvailable' | 'isVerified'>> | null;
  size?: number;
  showOnlineDot?: boolean;
  showVerified?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Doctor avatar with graceful fallbacks:
 * real photo → coloured initials (never a broken/empty circle).
 */
const DoctorAvatar: React.FC<DoctorAvatarProps> = ({
  doctor,
  size = 56,
  showOnlineDot = false,
  showVerified = false,
  style,
}) => {
  const [imgError, setImgError] = useState(false);
  const radius = size * 0.32;
  const hasImage = !!doctor?.profileImage && !imgError;
  const initials = getDoctorInitials(doctor);
  const dot = Math.max(10, size * 0.22);

  return (
    <View style={[{ width: size, height: size }, style]}>
      {hasImage ? (
        <Image
          source={{ uri: doctor!.profileImage }}
          style={{ width: size, height: size, borderRadius: radius, backgroundColor: HC.primaryLight }}
          onError={() => setImgError(true)}
        />
      ) : (
        <LinearGradient
          colors={[HC.primaryLight, HC.accentLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.fallback, { width: size, height: size, borderRadius: radius }]}
        >
          <Text style={[styles.initials, { fontSize: size * 0.34, color: HC.primaryDark }]}>
            {initials}
          </Text>
        </LinearGradient>
      )}

      {showOnlineDot && doctor?.isAvailable && (
        <View
          style={[
            styles.onlineDot,
            { width: dot, height: dot, borderRadius: dot / 2 },
          ]}
        />
      )}

      {showVerified && doctor?.isVerified && (
        <View style={styles.verified}>
          <Ionicons name="checkmark-circle" size={size * 0.3} color={HC.primary} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fallback: { justifyContent: 'center', alignItems: 'center' },
  initials: { fontWeight: '800', letterSpacing: 0.5 },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: HC.success,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  verified: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
  },
});

export default DoctorAvatar;
