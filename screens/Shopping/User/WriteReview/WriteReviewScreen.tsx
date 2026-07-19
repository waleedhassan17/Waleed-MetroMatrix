import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ChevronLeft, Star } from 'lucide-react-native';
import { Colors, BorderRadius, Shadows, Spacing } from '../../../../constants/Colors';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { resetReview, selectWriteReview, setComment, setRating, setTitle, submitReview } from './writeReviewSlice';

const WriteReviewScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const { rating, title, comment, submitting } = useAppSelector(selectWriteReview);
  const productId = route.params?.productId as string | undefined;

  const handleSubmit = async () => {
    if (!productId) {
      Alert.alert('Missing product', 'Open this screen from a product to review it.');
      return;
    }
    const result = await dispatch(submitReview({ productId }));
    if (submitReview.fulfilled.match(result)) {
      dispatch(resetReview());
      Alert.alert('Review submitted', 'Thanks for sharing your feedback.');
      navigation.goBack();
    } else {
      Alert.alert('Could not submit', (result.payload as string) || 'Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}><ChevronLeft size={20} stroke={Colors.text.primary} strokeWidth={2} /></TouchableOpacity>
        <Text style={styles.title}>Write Review</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Rating</Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((value) => (
            <TouchableOpacity key={value} onPress={() => dispatch(setRating(value))}>
              <Star size={28} fill={value <= rating ? Colors.accent : 'transparent'} stroke={value <= rating ? Colors.accent : Colors.borderDark} strokeWidth={2} />
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>Title</Text>
        <TextInput style={styles.input} value={title} onChangeText={(text) => dispatch(setTitle(text))} placeholder="Short review title" placeholderTextColor={Colors.text.tertiary} />
        <Text style={styles.label}>Comment</Text>
        <TextInput style={[styles.input, styles.multiline]} value={comment} onChangeText={(text) => dispatch(setComment(text))} multiline placeholder="Tell others what you think" placeholderTextColor={Colors.text.tertiary} />
        <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.7 }]} disabled={submitting} onPress={handleSubmit}>
          <Text style={styles.submitText}>{submitting ? 'Submitting...' : 'Submit Review'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Spacing.xl, paddingBottom: Spacing.md },
  iconBtn: { width: 40, height: 40, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, ...Shadows.sm },
  title: { fontSize: 20, fontWeight: '800', color: Colors.text.primary },
  card: { marginTop: Spacing.lg, padding: Spacing.md, borderRadius: BorderRadius.xl, backgroundColor: Colors.surface, ...Shadows.sm },
  label: { fontSize: 12, fontWeight: '700', color: Colors.text.secondary, marginBottom: 6 },
  stars: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
  input: { marginBottom: Spacing.md, paddingHorizontal: Spacing.md, height: 48, borderRadius: BorderRadius.lg, backgroundColor: Colors.backgroundAlt, color: Colors.text.primary },
  multiline: { height: 120, textAlignVertical: 'top', paddingTop: Spacing.md },
  submitBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: BorderRadius.lg, backgroundColor: Colors.primary },
  submitText: { color: '#FFF', fontWeight: '800' },
});

export default WriteReviewScreen;