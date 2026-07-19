import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  fetchAdminHealthcareReviewsApi,
  deleteHealthcareReviewApi,
} from '../../../../networks/healthcare/adminApi';

const COLORS = {
  primary: '#2A7FFF',
  primaryLight: '#EAF3FF',
  star: '#F59E0B',
  danger: '#E74C3C',
  bg: '#F8F9FA',
  card: '#FFFFFF',
  text: '#1A1A2E',
  textLight: '#6C757D',
  border: '#E9ECEF',
};

const AdminReviewModerationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [reviews, setReviews] = useState<any[]>([]);
  const [lowOnly, setLowOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchAdminHealthcareReviewsApi(lowOnly ? { maxRating: 2 } : {});
    if (res.success) setReviews(res.data);
    else setError(res.message || 'Failed to load reviews');
    setLoading(false);
  }, [lowOnly]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = (review: any) => {
    const id = String(review.id || review._id);
    Alert.prompt?.(
      'Remove review',
      "Reason (audited). The doctor's rating is recalculated after removal:",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async (reason?: string) => {
            const res = await deleteHealthcareReviewApi(id, reason || 'Removed by admin');
            if (res.success) setReviews((r) => r.filter((x) => String(x.id || x._id) !== id));
            else Alert.alert('Failed', res.message || 'Could not remove review');
          },
        },
      ],
      'plain-text'
    ) ??
      Alert.alert('Remove review', "Remove this review? The doctor's rating is recalculated. This is audited.", [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const res = await deleteHealthcareReviewApi(id, 'Removed by admin');
            if (res.success) setReviews((r) => r.filter((x) => String(x.id || x._id) !== id));
            else Alert.alert('Failed', res.message || 'Could not remove review');
          },
        },
      ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Review Moderation</Text>
        <View style={{ width: 40 }} />
      </View>

      <TouchableOpacity style={[styles.flagChip, lowOnly && styles.flagChipOn]} onPress={() => setLowOnly(!lowOnly)}>
        <Ionicons name="flag-outline" size={14} color={lowOnly ? '#FFF' : COLORS.danger} />
        <Text style={[styles.flagText, lowOnly && { color: '#FFF' }]}>
          {lowOnly ? 'Showing ≤2★ reviews' : 'Flag low-rated (≤2★)'}
        </Text>
      </TouchableOpacity>

      <FlatList
        data={reviews}
        keyExtractor={(item) => String(item.id || item._id)}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={load}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.who} numberOfLines={1}>
                {item.patientId?.fullName || 'Patient'} → Dr. {item.doctorId?.providerId?.fullName || '—'}
              </Text>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Ionicons key={i} name={i <= (item.rating || 0) ? 'star' : 'star-outline'} size={13} color={COLORS.star} />
                ))}
              </View>
            </View>
            {item.comment ? <Text style={styles.comment}>{item.comment}</Text> : null}
            <View style={styles.cardBottom}>
              <Text style={styles.date}>
                {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
              </Text>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                <Ionicons name="trash-outline" size={14} color={COLORS.danger} />
                <Text style={styles.deleteText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.center}>
              <Ionicons name="star-half-outline" size={40} color={COLORS.textLight} />
              <Text style={styles.emptyText}>{error || 'No reviews to moderate'}</Text>
              {error && (
                <TouchableOpacity style={styles.retryBtn} onPress={load}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  flagChip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginHorizontal: 16, marginBottom: 4, borderWidth: 1, borderColor: COLORS.danger, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  flagChipOn: { backgroundColor: COLORS.danger },
  flagText: { fontSize: 12, fontWeight: '700', color: COLORS.danger },
  list: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  who: { flex: 1, fontSize: 13, fontWeight: '700', color: COLORS.text, marginRight: 8 },
  stars: { flexDirection: 'row', gap: 1 },
  comment: { fontSize: 13, color: COLORS.textLight, marginTop: 6, lineHeight: 18 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  date: { fontSize: 11, color: COLORS.textLight },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: COLORS.danger, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  deleteText: { fontSize: 12, fontWeight: '700', color: COLORS.danger },
  center: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: COLORS.textLight, marginTop: 10, textAlign: 'center' },
  retryBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10, marginTop: 10 },
  retryText: { color: '#FFF', fontWeight: '700' },
});

export default AdminReviewModerationScreen;
