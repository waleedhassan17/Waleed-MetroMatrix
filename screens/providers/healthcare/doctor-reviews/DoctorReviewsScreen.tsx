import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { fetchMyReviewsApi } from '../../../../networks/healthcare/providerApi';

const C = {
  primary: '#2A7FFF',
  primaryLight: '#EAF3FF',
  star: '#F59E0B',
  bg: '#F7F9FC',
  surface: '#FFFFFF',
  border: '#E5EAF2',
  text: '#1A1A1A',
  textSec: '#64748B',
};

type ReviewRow = {
  id: string;
  patientName: string;
  rating: number;
  comment: string;
  createdAt: string;
};

const DoctorReviewsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [summary, setSummary] = useState<{ average: number; total: number; breakdown: Record<string, number> }>({
    average: 0,
    total: 0,
    breakdown: {},
  });
  const [filter, setFilter] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchMyReviewsApi();
    if (res.success) {
      const d: any = res.data || {};
      const list = d.reviews || (Array.isArray(d) ? d : []);
      setReviews(
        list.map((r: any) => ({
          id: String(r._id || r.id || r.reviewId),
          patientName: r.patientId?.fullName || r.patientName || 'Patient',
          rating: r.rating || 0,
          comment: r.comment || '',
          createdAt: r.createdAt || '',
        }))
      );
      setSummary({
        average: d.stats?.average ?? d.average ?? 0,
        total: d.stats?.total ?? list.length,
        breakdown: d.stats?.breakdown || {},
      });
    } else {
      setError(res.message || 'Something went wrong');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = filter ? reviews.filter((r) => r.rating === filter) : reviews;

  const renderStars = (rating: number, size = 14) => (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons key={i} name={i <= rating ? 'star' : 'star-outline'} size={size} color={C.star} />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.title}>My Reviews</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryLeft}>
          <Text style={styles.avg}>{(summary.average || 0).toFixed(1)}</Text>
          {renderStars(Math.round(summary.average), 16)}
          <Text style={styles.total}>{summary.total} review{summary.total === 1 ? '' : 's'}</Text>
        </View>
        <View style={styles.filterCol}>
          <TouchableOpacity
            style={[styles.filterChip, filter === null && styles.filterChipOn]}
            onPress={() => setFilter(null)}
          >
            <Text style={[styles.filterText, filter === null && styles.filterTextOn]}>All</Text>
          </TouchableOpacity>
          <View style={styles.filterRow}>
            {[5, 4, 3, 2, 1].map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.filterChip, filter === r && styles.filterChipOn]}
                onPress={() => setFilter(filter === r ? null : r)}
              >
                <Text style={[styles.filterText, filter === r && styles.filterTextOn]}>{r}★</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={load}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.patient}>{item.patientName}</Text>
              {renderStars(item.rating)}
            </View>
            {item.comment ? <Text style={styles.comment}>{item.comment}</Text> : null}
            <Text style={styles.date}>
              {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
          ) : error ? (
            <View style={styles.center}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={load}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.center}>
              <Ionicons name="star-outline" size={44} color={C.textSec} />
              <Text style={styles.emptyText}>No reviews {filter ? `with ${filter} stars` : 'yet'}</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  title: { fontSize: 17, fontWeight: '700', color: C.text },
  summaryCard: { flexDirection: 'row', backgroundColor: C.surface, marginHorizontal: 16, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border, gap: 16 },
  summaryLeft: { alignItems: 'center', gap: 4 },
  avg: { fontSize: 32, fontWeight: '800', color: C.text },
  total: { fontSize: 12, color: C.textSec },
  filterCol: { flex: 1, justifyContent: 'center', gap: 8 },
  filterRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  filterChip: { borderWidth: 1, borderColor: C.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start' },
  filterChipOn: { backgroundColor: C.primaryLight, borderColor: C.primary },
  filterText: { fontSize: 12, fontWeight: '600', color: C.textSec },
  filterTextOn: { color: C.primary },
  list: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: C.surface, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  patient: { fontSize: 14, fontWeight: '700', color: C.text },
  comment: { fontSize: 13, color: C.textSec, lineHeight: 19 },
  date: { fontSize: 11, color: C.textSec, marginTop: 6 },
  center: { alignItems: 'center', marginTop: 40 },
  errorText: { color: C.textSec, textAlign: 'center', marginBottom: 12 },
  retryBtn: { backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#FFF', fontWeight: '700' },
  emptyText: { color: C.textSec, marginTop: 10 },
});

export default DoctorReviewsScreen;
