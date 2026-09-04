// ============================================================================
// Rate the service
//
// The stars are the one expressive element on this screen, so everything else
// steps back. What went:
//   • the five-emoji confetti row and the "Thank You!" celebration state
//   • the reactive rating copy ("Amazing! Thank you for the wonderful review!")
//     and its face emoji — see the note in ratingSlice
//   • four gradient section-icon chips, a gradient hero rule, a gradient avatar
//     ring, a gradient loading tile and a gradient submit button
//   • the entrance fade/slide/scale on every section
//
// What stayed: the star bounce, which answers a tap, and a confirmation that
// says the thing plainly.
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import {
  ActionSheet,
  AppBar,
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Screen,
  SectionHeader,
  Skeleton,
} from '../../../../components/ui';
import { categoryAccent, HS } from '../../../../constants/HomeServiceTheme';
import { C, GUTTER, PROSE_WIDTH, R, S, SECTION, T } from '../../../../constants/theme';
import { useBottomBarPadding } from '../../../../hooks/useBottomBarPadding';
import { useReducedMotion } from '../../../../hooks/useReducedMotion';
import { AppDispatch, RootState } from '../../../../store/store';
import { formatAmount, formatInstant } from '../../../../utils/homeservice/format';
import {
  initializeReview,
  resetReviewState,
  ServiceCategory,
  selectIsReviewValid,
  selectRatingMessage,
  selectReviewCompleteness,
  selectSelectedTags,
  setFeedback,
  setRating,
  setWouldRecommend,
  submitReview,
  toggleTag,
} from './ratingSlice';

type ReviewRouteParams = {
  bookingId?: string;
  category?: ServiceCategory;
};

export default function ReviewRatingScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: ReviewRouteParams }, 'params'>>();
  const dispatch = useDispatch<AppDispatch>();
  const bottomPad = useBottomBarPadding(GUTTER);
  const reducedMotion = useReducedMotion();

  const { bookingId = 'default', category = 'ac-repairers' } = route.params || {};
  const accent = categoryAccent(category);

  const provider = useSelector((state: RootState) => state.reviewRating?.provider);
  const serviceDetails = useSelector((state: RootState) => state.reviewRating?.serviceDetails);
  const review = useSelector((state: RootState) => state.reviewRating?.review);
  const isLoading = useSelector((state: RootState) => state.reviewRating?.isLoading);
  const isSubmitting = useSelector((state: RootState) => state.reviewRating?.isSubmitting);
  const submissionStatus = useSelector((state: RootState) => state.reviewRating?.submissionStatus);
  const submissionResult = useSelector((state: RootState) => state.reviewRating?.submissionResult);
  const availableTags = useSelector((state: RootState) => state.reviewRating?.availableTags || []);
  const error = useSelector((state: RootState) => state.reviewRating?.error);
  const ratingMessage = useSelector(selectRatingMessage);
  const isReviewValid = useSelector(selectIsReviewValid);
  const reviewCompleteness = useSelector(selectReviewCompleteness);
  const selectedTags = useSelector(selectSelectedTags);

  // Null when the booking carries no completion instant, in which case the
  // line is dropped rather than reading "Completed " with nothing after it.
  const completedAtLabel = useMemo(
    () => formatInstant(serviceDetails?.completedAt),
    [serviceDetails?.completedAt]
  );

  const [localFeedback, setLocalFeedback] = useState('');
  const [showDiscardSheet, setShowDiscardSheet] = useState(false);

  // Post-submit navigation timer, cancelled on unmount.
  const thankYouTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The one animation left on this screen.
  const starAnimations = useRef([1, 2, 3, 4, 5].map(() => new Animated.Value(1))).current;

  useFocusEffect(
    useCallback(() => {
      setLocalFeedback('');

      // Wipe the previous review before loading this one. initializeReview only
      // replaces provider and serviceDetails — the `review` object itself
      // survives, so without this a half-filled rating from the last booking
      // showed up pre-populated on the next one.
      dispatch(resetReviewState());
      dispatch(initializeReview({ bookingId, category }));

      return () => {
        // Any pending post-submit navigation belongs to the screen being left,
        // not to whatever comes next.
        if (thankYouTimer.current) {
          clearTimeout(thankYouTimer.current);
          thankYouTimer.current = null;
        }
      };
    }, [bookingId, category, dispatch])
  );

  // Leave the confirmation on screen briefly, then go home. The handle is kept
  // so unmount can cancel it: left dangling, this fired 3.5s later against
  // whatever screen existed by then.
  useEffect(() => {
    if (submissionStatus !== 'submitted') return;
    thankYouTimer.current = setTimeout(() => {
      dispatch(resetReviewState());
      navigation.navigate('Home');
    }, 2500);
  }, [submissionStatus, dispatch, navigation]);

  const handleBackPress = useCallback(() => {
    if (isSubmitting) return;
    if (review?.rating > 0 || review?.feedback) {
      setShowDiscardSheet(true);
      return;
    }
    dispatch(resetReviewState());
    navigation.goBack();
  }, [dispatch, navigation, isSubmitting, review]);

  const handleRatingSelect = useCallback(
    (selectedRating: number) => {
      dispatch(setRating(selectedRating));
      if (reducedMotion) return;

      Animated.sequence([
        Animated.timing(starAnimations[selectedRating - 1], {
          toValue: 1.35,
          duration: 130,
          useNativeDriver: true,
        }),
        Animated.spring(starAnimations[selectedRating - 1], {
          toValue: 1,
          tension: 300,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [dispatch, starAnimations, reducedMotion]
  );

  const handleSubmit = useCallback(() => {
    if (!isReviewValid) return;
    dispatch(
      submitReview({ bookingId, providerId: provider?.id || '', review: review! })
    );
  }, [isReviewValid, dispatch, bookingId, provider, review]);

  // Failed to load. Must come BEFORE the loading branch: a rejection leaves
  // provider null and isLoading false, which otherwise fell through to the
  // spinner and span there forever with no way out and nothing explaining why.
  if (error && !provider) {
    return (
      <Screen>
        <AppBar title="Rate service" onBack={() => navigation.goBack()} />
        <ErrorState
          title="We couldn't load this review"
          message={error}
          onRetry={() => dispatch(initializeReview({ bookingId, category }))}
        />
      </Screen>
    );
  }

  if (isLoading || !provider) {
    return (
      <Screen>
        <AppBar title="Rate service" onBack={() => navigation.goBack()} />
        <View style={styles.loading} accessibilityLabel="Loading review">
          <Skeleton width="100%" height={120} radius={R.card} />
          <Skeleton width="50%" height={16} style={styles.loadingGap} />
          <Skeleton width="100%" height={90} radius={R.card} style={styles.loadingGapSm} />
        </View>
      </Screen>
    );
  }

  if (submissionStatus === 'submitted') {
    return (
      <Screen>
        <AppBar title="Rate service" hideBack />
        <EmptyState
          icon="checkmark-circle-outline"
          title="Review submitted"
          message={
            submissionResult?.rewardPoints
              ? `Thanks — that's ${submissionResult.rewardPoints} points added to your account.`
              : 'Thanks. It helps the next person choose.'
          }
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppBar title="Rate service" onBack={handleBackPress} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Card accentRule={accent.tint}>
            <View style={styles.providerRow}>
              <Avatar
                uri={provider.image}
                name={provider.name}
                size={48}
                tint={accent.tintSoft}
                color={accent.tint}
              />
              <View style={styles.providerInfo}>
                <Text style={styles.providerName} numberOfLines={1}>
                  {provider.name}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {provider.service}
                </Text>
                {/* The review endpoint sends `completedAt` as a raw ISO
                    instant, which this rendered verbatim. */}
                {!!completedAtLabel && (
                  <Text style={styles.metaFaint}>Completed {completedAtLabel}</Text>
                )}
              </View>
            </View>
          </Card>

          <View style={styles.section}>
            <SectionHeader title="How was it?" />
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((star) => {
                const isSelected = star <= (review?.rating || 0);
                return (
                  <TouchableOpacity
                    key={star}
                    style={styles.starButton}
                    onPress={() => handleRatingSelect(star)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`${star} ${star === 1 ? 'star' : 'stars'}`}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Animated.View style={{ transform: [{ scale: starAnimations[star - 1] }] }}>
                      <Ionicons
                        name={isSelected ? 'star' : 'star-outline'}
                        size={38}
                        color={isSelected ? C.star : C.disabled}
                      />
                    </Animated.View>
                  </TouchableOpacity>
                );
              })}
            </View>
            {!!ratingMessage && <Text style={styles.ratingLabel}>{ratingMessage.title}</Text>}
          </View>

          {availableTags.length > 0 && (
            <View style={styles.section}>
              <SectionHeader title="What stood out?" subtitle="Optional, pick any" />
              <View style={styles.tags}>
                {availableTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[styles.tag, isSelected && styles.tagSelected]}
                      onPress={() => dispatch(toggleTag(tag))}
                      activeOpacity={0.75}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                    >
                      {isSelected && (
                        <Ionicons
                          name="checkmark"
                          size={13}
                          color={HS.accentDeep}
                          style={styles.tagCheck}
                        />
                      )}
                      <Text style={[styles.tagText, isSelected && styles.tagTextSelected]}>
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <SectionHeader title="Write a review" subtitle="Optional" />
            <TextInput
              style={styles.feedback}
              placeholder="What went well, what didn't — whatever would help the next person."
              placeholderTextColor={C.inkFaint}
              value={localFeedback}
              onChangeText={(text) => {
                setLocalFeedback(text);
                dispatch(setFeedback(text));
              }}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.charCount}>{localFeedback.length}/500</Text>
          </View>

          <View style={styles.section}>
            <SectionHeader title="Would you book them again?" />
            <View style={styles.recommendRow}>
              <TouchableOpacity
                style={[styles.recommend, review?.wouldRecommend === true && styles.recommendYes]}
                onPress={() => dispatch(setWouldRecommend(true))}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ selected: review?.wouldRecommend === true }}
              >
                <Ionicons
                  name={review?.wouldRecommend === true ? 'thumbs-up' : 'thumbs-up-outline'}
                  size={20}
                  color={review?.wouldRecommend === true ? C.success : C.inkMuted}
                />
                <Text
                  style={[
                    styles.recommendText,
                    review?.wouldRecommend === true && { color: C.success, fontWeight: '600' },
                  ]}
                >
                  Yes
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.recommend, review?.wouldRecommend === false && styles.recommendNo]}
                onPress={() => dispatch(setWouldRecommend(false))}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ selected: review?.wouldRecommend === false }}
              >
                <Ionicons
                  name={review?.wouldRecommend === false ? 'thumbs-down' : 'thumbs-down-outline'}
                  size={20}
                  color={review?.wouldRecommend === false ? C.error : C.inkMuted}
                />
                <Text
                  style={[
                    styles.recommendText,
                    review?.wouldRecommend === false && { color: C.error, fontWeight: '600' },
                  ]}
                >
                  No
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <SectionHeader title="The job" />
            <Card style={styles.summaryCard}>
              {!!serviceDetails?.description && (
                <Text style={styles.description}>{serviceDetails.description}</Text>
              )}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Service</Text>
                <Text style={styles.summaryValue}>{provider.service}</Text>
              </View>
              {!!serviceDetails?.duration && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Duration</Text>
                  <Text style={styles.summaryValue}>{serviceDetails.duration}</Text>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Payment</Text>
                <Text
                  style={[
                    styles.summaryValue,
                    { color: serviceDetails?.paymentStatus === 'paid' ? C.success : C.warning },
                  ]}
                >
                  {serviceDetails?.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                </Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryTotal]}>
                <Text style={styles.summaryKey}>Total</Text>
                {/* The optional chain stopped one level short: a present
                    serviceDetails with a missing totalAmount threw and blanked
                    the screen. */}
                <Text style={styles.summaryValue}>
                  {typeof serviceDetails?.totalAmount === 'number'
                    ? formatAmount(serviceDetails.totalAmount)
                    : '—'}
                </Text>
              </View>
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: bottomPad }]}>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${reviewCompleteness}%` }]} />
        </View>
        <Button
          label="Submit review"
          onPress={handleSubmit}
          disabled={!isReviewValid}
          loading={!!isSubmitting}
        />
        {!isReviewValid && <Text style={styles.footerHint}>Pick a star rating to submit.</Text>}
      </View>

      <ActionSheet
        visible={showDiscardSheet}
        title="Discard this review?"
        message="What you've written so far won't be saved."
        cancelLabel="Keep writing"
        onClose={() => setShowDiscardSheet(false)}
        options={[
          {
            label: 'Discard',
            icon: 'trash-outline',
            tone: 'destructive',
            onPress: () => {
              dispatch(resetReviewState());
              navigation.goBack();
            },
          },
        ]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: GUTTER,
    paddingBottom: S.huge,
  },
  loading: {
    padding: GUTTER,
  },
  loadingGap: { marginTop: SECTION },
  loadingGapSm: { marginTop: S.md },

  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerInfo: {
    flex: 1,
    marginLeft: S.md,
  },
  providerName: {
    ...T.subhead,
    color: C.ink,
  },
  meta: {
    ...T.caption,
    color: C.inkMuted,
    marginTop: 2,
  },
  metaFaint: {
    ...T.caption,
    color: C.inkFaint,
    marginTop: 2,
  },

  section: {
    marginTop: SECTION,
  },

  stars: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: S.lg,
  },
  starButton: {
    paddingHorizontal: S.sm,
  },
  ratingLabel: {
    ...T.subhead,
    color: C.ink,
    textAlign: 'center',
    marginTop: S.md,
  },

  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: S.md,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: S.md,
    paddingVertical: 7,
    borderRadius: R.chip,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    backgroundColor: C.surface,
    marginRight: S.sm,
    marginBottom: S.sm,
  },
  tagSelected: {
    backgroundColor: HS.accentSoft,
    borderColor: HS.accentLine,
  },
  tagCheck: {
    marginRight: 4,
  },
  tagText: {
    ...T.label,
    color: C.inkMuted,
  },
  tagTextSelected: {
    color: HS.accentDeep,
    fontWeight: '600',
  },

  feedback: {
    marginTop: S.md,
    minHeight: 108,
    padding: S.md,
    borderRadius: R.control,
    backgroundColor: C.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    ...T.body,
    color: C.ink,
  },
  charCount: {
    ...T.caption,
    color: C.inkFaint,
    textAlign: 'right',
    marginTop: S.xs,
  },

  recommendRow: {
    flexDirection: 'row',
    marginTop: S.md,
  },
  recommend: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: R.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    backgroundColor: C.surface,
    marginHorizontal: S.xs,
  },
  recommendYes: {
    backgroundColor: C.successSoft,
    borderColor: C.success,
  },
  recommendNo: {
    backgroundColor: C.errorSoft,
    borderColor: C.error,
  },
  recommendText: {
    ...T.body,
    color: C.inkMuted,
    marginLeft: S.sm,
  },

  summaryCard: {
    marginTop: S.md,
  },
  description: {
    ...T.body,
    color: C.inkMuted,
    marginBottom: S.md,
    maxWidth: PROSE_WIDTH,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  summaryTotal: {
    marginTop: S.sm,
    paddingTop: S.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.lineSoft,
  },
  summaryKey: {
    ...T.body,
    color: C.inkMuted,
  },
  summaryValue: {
    ...T.bodyStrong,
    color: C.ink,
    marginLeft: S.lg,
    flexShrink: 1,
    textAlign: 'right',
  },

  footer: {
    paddingHorizontal: GUTTER,
    paddingTop: S.md,
    backgroundColor: C.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.line,
  },
  track: {
    height: 3,
    borderRadius: 2,
    backgroundColor: C.surfaceSunken,
    marginBottom: S.md,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: HS.accent,
  },
  footerHint: {
    ...T.caption,
    color: C.inkMuted,
    textAlign: 'center',
    marginTop: S.sm,
  },
});
