import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, MessageSquare, Star } from 'lucide-react-native';
import { Colors, BorderRadius, Shadows, Spacing } from '../../../../constants/Colors';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import {
  fetchBrandReviews,
  respondToReview,
  selectBrandReviews,
  setRatingFilter,
} from './brandReviewsSlice';

const ShopColors = { primary: '#E67E22', primaryLight: '#FFF3E6', star: '#F1C40F' };

const BrandReviewsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { reviews, ratingFilter, loading, responding, error } = useAppSelector(selectBrandReviews);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    dispatch(fetchBrandReviews(ratingFilter || undefined));
  }, [dispatch, ratingFilter]);

  const handleRespond = async (reviewId: string) => {
    const response = (drafts[reviewId] || '').trim();
    if (!response) return;
    const result = await dispatch(respondToReview({ reviewId, response }));
    if (respondToReview.fulfilled.match(result)) {
      setDrafts((d) => ({ ...d, [reviewId]: '' }));
    } else {
      Alert.alert('Could not respond', (result.payload as string) || 'Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={20} stroke={Colors.text.primary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.title}>Reviews</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, ratingFilter === null && styles.filterChipOn]}
          onPress={() => dispatch(setRatingFilter(null))}
        >
          <Text style={[styles.filterText, ratingFilter === null && styles.filterTextOn]}>All</Text>
        </TouchableOpacity>
        {[5, 4, 3, 2, 1].map((rating) => (
          <TouchableOpacity
            key={rating}
            style={[styles.filterChip, ratingFilter === rating && styles.filterChipOn]}
            onPress={() => dispatch(setRatingFilter(rating))}
          >
            <Star size={12} stroke={ShopColors.star} fill={ShopColors.star} strokeWidth={2} />
            <Text style={[styles.filterText, ratingFilter === rating && styles.filterTextOn]}>{rating}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {loading && reviews.length === 0 && (
          <ActivityIndicator color={ShopColors.primary} style={{ marginVertical: Spacing.xl }} />
        )}
        {error && (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => dispatch(fetchBrandReviews(ratingFilter || undefined))}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
        {!loading && !error && reviews.length === 0 && (
          <View style={styles.center}>
            <MessageSquare size={40} stroke={Colors.text.tertiary} strokeWidth={1.5} />
            <Text style={styles.emptyText}>No reviews yet</Text>
          </View>
        )}

        {reviews.map((review) => (
          <View key={review.reviewId} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.reviewer}>{review.userName || 'Customer'}</Text>
              <View style={styles.starsRow}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    stroke={ShopColors.star}
                    fill={i < review.rating ? ShopColors.star : 'transparent'}
                    strokeWidth={2}
                  />
                ))}
              </View>
            </View>
            {review.productName ? <Text style={styles.productName}>{review.productName}</Text> : null}
            {review.title ? <Text style={styles.reviewTitle}>{review.title}</Text> : null}
            <Text style={styles.comment}>{review.comment}</Text>
            <Text style={styles.date}>
              {new Date(review.createdAt).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })}
              {review.isVerifiedPurchase ? ' · Verified purchase' : ''}
            </Text>

            {review.vendorResponse ? (
              <View style={styles.responseBox}>
                <Text style={styles.responseLabel}>Your response</Text>
                <Text style={styles.responseText}>{review.vendorResponse}</Text>
              </View>
            ) : (
              <View style={styles.respondRow}>
                <TextInput
                  style={styles.respondInput}
                  placeholder="Write a response…"
                  placeholderTextColor={Colors.text.tertiary}
                  value={drafts[review.reviewId] || ''}
                  onChangeText={(value) => setDrafts((d) => ({ ...d, [review.reviewId]: value }))}
                />
                <TouchableOpacity
                  style={styles.respondBtn}
                  disabled={responding === review.reviewId}
                  onPress={() => handleRespond(review.reviewId)}
                >
                  <Text style={styles.respondBtnText}>
                    {responding === review.reviewId ? '…' : 'Send'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.md },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', ...Shadows.sm },
  title: { fontSize: 18, fontWeight: '700', color: Colors.text.primary },
  filterRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.full, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: Colors.surface },
  filterChipOn: { backgroundColor: ShopColors.primaryLight, borderColor: ShopColors.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: Colors.text.secondary },
  filterTextOn: { color: ShopColors.primary },
  scroll: { padding: Spacing.lg, paddingBottom: 40 },
  center: { alignItems: 'center', paddingVertical: Spacing.xl },
  errorText: { color: Colors.text.secondary, marginBottom: Spacing.md, textAlign: 'center' },
  retryBtn: { backgroundColor: ShopColors.primary, borderRadius: BorderRadius.md, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#FFF', fontWeight: '700' },
  emptyText: { color: Colors.text.secondary, marginTop: Spacing.sm },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewer: { fontSize: 14, fontWeight: '700', color: Colors.text.primary },
  starsRow: { flexDirection: 'row', gap: 2 },
  productName: { fontSize: 12, color: ShopColors.primary, fontWeight: '600', marginTop: 2 },
  reviewTitle: { fontSize: 14, fontWeight: '700', color: Colors.text.primary, marginTop: Spacing.xs },
  comment: { fontSize: 13, color: Colors.text.secondary, marginTop: 4, lineHeight: 19 },
  date: { fontSize: 11, color: Colors.text.tertiary, marginTop: Spacing.xs },
  responseBox: { backgroundColor: Colors.background, borderRadius: BorderRadius.md, padding: Spacing.md, marginTop: Spacing.sm },
  responseLabel: { fontSize: 11, fontWeight: '700', color: ShopColors.primary, marginBottom: 2 },
  responseText: { fontSize: 13, color: Colors.text.secondary },
  respondRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  respondInput: { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: Colors.text.primary },
  respondBtn: { backgroundColor: ShopColors.primary, borderRadius: BorderRadius.md, paddingHorizontal: 16, justifyContent: 'center' },
  respondBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
});

export default BrandReviewsScreen;
