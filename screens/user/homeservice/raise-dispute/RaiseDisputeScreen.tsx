// ============================================
// Raise dispute (HS8) — file a dispute against a booking with reason,
// description and photo evidence. Hits POST /bookings/:id/dispute (HS5).
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { raiseDispute } from '../../../../networks/serviceProviders/adminHomeServiceApi';

type Params = { bookingId: string };

const REASONS = [
  'Work not completed',
  'Poor quality of work',
  'Overcharged',
  'Provider behaviour',
  'Damage to property',
  'Other',
];

export default function RaiseDisputeScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: Params }, 'params'>>();
  const { bookingId } = route.params || ({} as Params);

  const [reason, setReason] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Photo library access is required to attach evidence.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhotos((prev) => [...prev, result.assets[0].uri].slice(0, 4));
    }
  };

  const submit = async () => {
    if (!reason) {
      Alert.alert('Reason required', 'Please pick what went wrong.');
      return;
    }
    setSubmitting(true);
    const res = await raiseDispute(bookingId, {
      reason,
      description: description.trim(),
      evidence: photos,
    });
    setSubmitting(false);
    if (res.success) {
      Alert.alert(
        'Dispute filed',
        'Our admin team will review your dispute and get back to you.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } else {
      Alert.alert('Error', res.message || 'Could not file the dispute');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#F97316" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Raise a Dispute</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={styles.sectionTitle}>What went wrong?</Text>
        <View style={styles.reasonWrap}>
          {REASONS.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.reasonChip, reason === r && styles.reasonChipActive]}
              onPress={() => setReason(r)}
            >
              <Text style={[styles.reasonText, reason === r && styles.reasonTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Describe the issue</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Tell us what happened in detail…"
          placeholderTextColor="#9CA3AF"
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={2000}
        />

        <Text style={styles.sectionTitle}>Photo evidence (optional)</Text>
        <View style={styles.photoRow}>
          {photos.map((uri) => (
            <View key={uri} style={styles.photoWrap}>
              <Image source={{ uri }} style={styles.photo} />
              <TouchableOpacity
                style={styles.photoRemove}
                onPress={() => setPhotos((prev) => prev.filter((p) => p !== uri))}
              >
                <Ionicons name="close" size={12} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
          {photos.length < 4 && (
            <TouchableOpacity style={styles.photoAdd} onPress={pickPhoto}>
              <Ionicons name="camera-outline" size={22} color="#9CA3AF" />
              <Text style={styles.photoAddText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.noteBox}>
          <Ionicons name="information-circle-outline" size={16} color="#92400E" />
          <Text style={styles.noteText}>
            Disputes are reviewed by the MetroMatrix admin team. Outcomes can include a
            wallet refund or action against the provider.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, (!reason || submitting) && styles.submitDisabled]}
          onPress={submit}
          disabled={!reason || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitText}>Submit dispute</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F97316',
    paddingHorizontal: 12,
    paddingVertical: 14,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 14 : 14,
  },
  headerBtn: { width: 36, alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 10, marginTop: 12 },
  reasonWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  reasonChip: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  reasonChipActive: { backgroundColor: '#F97316', borderColor: '#F97316' },
  reasonText: { color: '#374151', fontSize: 13, fontWeight: '600' },
  reasonTextActive: { color: '#fff' },
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    minHeight: 110,
    textAlignVertical: 'top',
    fontSize: 14,
    color: '#111827',
  },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap' },
  photoWrap: { marginRight: 10, marginBottom: 10 },
  photo: { width: 70, height: 70, borderRadius: 10 },
  photoRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAdd: {
    width: 70,
    height: 70,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAddText: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  noteText: { color: '#92400E', fontSize: 12, marginLeft: 8, flex: 1, lineHeight: 17 },
  submitBtn: {
    backgroundColor: '#F97316',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
