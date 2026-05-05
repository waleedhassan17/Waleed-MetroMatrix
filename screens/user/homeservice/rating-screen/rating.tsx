import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
  SafeAreaView,
  Platform,
  ScrollView,
  TextInput,
  Alert,
  Image,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';

import {
  initializeReview,
  submitReview,
  setRating,
  setFeedback,
  toggleTag,
  setWouldRecommend,
  resetReviewState,
  selectRatingMessage,
  selectIsReviewValid,
  selectReviewCompleteness,
  selectSelectedTags,
  ServiceCategory,
  RATING_MESSAGES,
} from './ratingSlice';
import { RootState, AppDispatch } from '../../../../store/store';

const { width, height } = Dimensions.get('window');

// Service type configurations - matching ServiceStatusScreen
const SERVICE_CONFIG: Record<
  ServiceCategory,
  {
    gradient: [string, string];
    lightGradient: [string, string];
    accentColor: string;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  electricians: {
    gradient: ['#F59E0B', '#D97706'],
    lightGradient: ['#FEF3C7', '#FDE68A'],
    accentColor: '#F59E0B',
    icon: 'flash',
  },
  plumbers: {
    gradient: ['#3B82F6', '#2563EB'],
    lightGradient: ['#DBEAFE', '#BFDBFE'],
    accentColor: '#3B82F6',
    icon: 'water',
  },
  'ac-repairers': {
    gradient: ['#06B6D4', '#0891B2'],
    lightGradient: ['#CFFAFE', '#A5F3FC'],
    accentColor: '#06B6D4',
    icon: 'snow',
  },
};

type ReviewRouteParams = {
  bookingId: string;
  category?: ServiceCategory;
  serviceData?: {
    provider: string;
    providerImage: string;
    service: string;
    serviceCost: number;
    description: string;
    duration: string;
    completedAt: string;
  };
};

export default function ReviewRatingScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: ReviewRouteParams }, 'params'>>();
  const dispatch = useDispatch<AppDispatch>();

  const { bookingId = 'default', category = 'ac-repairers' } = route.params || {};

  // Redux state
  const provider = useSelector((state: RootState) => state.reviewRating?.provider);
  const serviceDetails = useSelector((state: RootState) => state.reviewRating?.serviceDetails);
  const review = useSelector((state: RootState) => state.reviewRating?.review);
  const isLoading = useSelector((state: RootState) => state.reviewRating?.isLoading);
  const isSubmitting = useSelector((state: RootState) => state.reviewRating?.isSubmitting);
  const submissionStatus = useSelector((state: RootState) => state.reviewRating?.submissionStatus);
  const submissionResult = useSelector((state: RootState) => state.reviewRating?.submissionResult);
  const availableTags = useSelector((state: RootState) => state.reviewRating?.availableTags || []);
  const ratingMessage = useSelector(selectRatingMessage);
  const isReviewValid = useSelector(selectIsReviewValid);
  const reviewCompleteness = useSelector(selectReviewCompleteness);
  const selectedTags = useSelector(selectSelectedTags);

  // Local state
  const [isReady, setIsReady] = useState(false);
  const [localFeedback, setLocalFeedback] = useState('');

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const starAnimations = useRef([1, 2, 3, 4, 5].map(() => new Animated.Value(1))).current;
  const thankYouScale = useRef(new Animated.Value(0)).current;
  const thankYouOpacity = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;

  const serviceConfig = SERVICE_CONFIG[category] || SERVICE_CONFIG['ac-repairers'];

  // Initialize review data
  useFocusEffect(
    useCallback(() => {
      setIsReady(false);
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      scaleAnim.setValue(0.95);

      dispatch(
        initializeReview({
          bookingId,
          category,
        })
      );

      return () => {
        // Cleanup if needed
      };
    }, [bookingId, category, dispatch])
  );

  // Run entrance animations when data is loaded
  useEffect(() => {
    if (!isLoading && provider && !isReady) {
      setIsReady(true);
      runEntranceAnimations();
    }
  }, [isLoading, provider, isReady]);

  // Handle submission completion
  useEffect(() => {
    if (submissionStatus === 'submitted') {
      runThankYouAnimation();
    }
  }, [submissionStatus]);

  const runEntranceAnimations = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, scaleAnim]);

  const runThankYouAnimation = useCallback(() => {
    Animated.parallel([
      Animated.spring(thankYouScale, {
        toValue: 1,
        tension: 60,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(thankYouOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(confettiAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate to home after delay
    setTimeout(() => {
      dispatch(resetReviewState());
      // @ts-ignore
      navigation.navigate('Home');
    }, 3500);
  }, [thankYouScale, thankYouOpacity, confettiAnim, dispatch, navigation]);

  const handleBackPress = useCallback(() => {
    if (isSubmitting) {
      Alert.alert('Please Wait', 'Your review is being submitted.');
      return;
    }

    if (review?.rating > 0 || review?.feedback) {
      Alert.alert(
        'Discard Review?',
        'You have unsaved changes. Are you sure you want to leave?',
        [
          { text: 'Stay', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              dispatch(resetReviewState());
              navigation.goBack();
            },
          },
        ]
      );
    } else {
      dispatch(resetReviewState());
      navigation.goBack();
    }
  }, [dispatch, navigation, isSubmitting, review]);

  const handleRatingSelect = useCallback(
    (selectedRating: number) => {
      dispatch(setRating(selectedRating));

      // Animate the selected star
      Animated.sequence([
        Animated.timing(starAnimations[selectedRating - 1], {
          toValue: 1.4,
          duration: 150,
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
    [dispatch, starAnimations]
  );

  const handleFeedbackChange = useCallback(
    (text: string) => {
      setLocalFeedback(text);
      dispatch(setFeedback(text));
    },
    [dispatch]
  );

  const handleTagToggle = useCallback(
    (tag: string) => {
      dispatch(toggleTag(tag));
    },
    [dispatch]
  );

  const handleRecommendToggle = useCallback(
    (value: boolean) => {
      dispatch(setWouldRecommend(value));
    },
    [dispatch]
  );

  const handleSubmit = useCallback(() => {
    if (!isReviewValid) {
      Alert.alert('Rating Required', 'Please select a rating before submitting.');
      return;
    }

    dispatch(
      submitReview({
        bookingId,
        providerId: provider?.id || '',
        review: review!,
      })
    );
  }, [isReviewValid, dispatch, bookingId, provider, review]);

  // Loading state
  if (isLoading || !provider) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.loadingContainer}>
          <LinearGradient colors={serviceConfig.gradient} style={styles.loadingIcon}>
            <Ionicons name="star-outline" size={32} color="#FFFFFF" />
          </LinearGradient>
          <Text style={styles.loadingText}>Loading review...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Thank you state
  if (submissionStatus === 'submitted') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <Animated.View
          style={[
            styles.thankYouContainer,
            {
              opacity: thankYouOpacity,
              transform: [{ scale: thankYouScale }],
            },
          ]}
        >
          <View style={styles.thankYouContent}>
            {/* Confetti Effect */}
            <Animated.View
              style={[
                styles.confettiContainer,
                {
                  opacity: confettiAnim,
                  transform: [
                    {
                      translateY: confettiAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-50, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              {['🎉', '⭐', '🎊', '✨', '💫'].map((emoji, index) => (
                <Text
                  key={index}
                  style={[
                    styles.confettiEmoji,
                    { left: `${15 + index * 18}%` },
                  ]}
                >
                  {emoji}
                </Text>
              ))}
            </Animated.View>

            <LinearGradient
              colors={['#D1FAE5', '#A7F3D0']}
              style={styles.thankYouIconBg}
            >
              <Ionicons name="heart" size={56} color="#10B981" />
            </LinearGradient>

            <Text style={styles.thankYouTitle}>Thank You! 🎉</Text>
            <Text style={styles.thankYouText}>
              Your feedback helps us improve our services and helps other users make better choices.
            </Text>

            {submissionResult?.rewardPoints && (
              <View style={styles.rewardBadge}>
                <Ionicons name="gift-outline" size={18} color="#F59E0B" />
                <Text style={styles.rewardText}>
                  +{submissionResult.rewardPoints} points earned!
                </Text>
              </View>
            )}

            <Text style={styles.redirectText}>Redirecting to home...</Text>
          </View>
        </Animated.View>
      </SafeAreaView>
    );
  }

  const renderHeader = () => (
    <Animated.View
      style={[
        styles.header,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <LinearGradient colors={['#FFFFFF', '#F8FAFC']} style={styles.headerGradient}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
            activeOpacity={0.8}
            disabled={isSubmitting}
          >
            <Ionicons name="chevron-back" size={22} color="#1E293B" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Rate Service</Text>

          <View style={[styles.completeBadge, { backgroundColor: '#10B98115' }]}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.completeText}>Complete</Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const renderProviderCard = () => (
    <Animated.View
      style={[
        styles.providerCard,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={serviceConfig.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.cardAccent}
      />

      <View style={styles.providerContent}>
        <View style={styles.providerImageWrapper}>
          <LinearGradient colors={serviceConfig.lightGradient} style={styles.imageRing}>
            <Image source={{ uri: provider.image }} style={styles.providerImage} />
          </LinearGradient>
          <View
            style={[styles.serviceIconBadge, { backgroundColor: serviceConfig.accentColor }]}
          >
            <Ionicons name={serviceConfig.icon} size={12} color="#FFFFFF" />
          </View>
        </View>

        <Text style={styles.providerName}>{provider.name}</Text>
        <Text style={styles.providerService}>{provider.service}</Text>

        <View style={styles.completionInfo}>
          <Ionicons name="checkmark-done" size={14} color="#10B981" />
          <Text style={styles.completionText}>
            Completed {serviceDetails?.completedAt}
          </Text>
        </View>
      </View>
    </Animated.View>
  );

  const renderRatingSection = () => (
    <Animated.View
      style={[
        styles.sectionCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.sectionHeader}>
        <LinearGradient colors={serviceConfig.lightGradient} style={styles.sectionIconBg}>
          <Ionicons name="star-outline" size={18} color={serviceConfig.accentColor} />
        </LinearGradient>
        <Text style={styles.sectionTitle}>How was your experience?</Text>
      </View>

      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => {
          const isSelected = star <= (review?.rating || 0);
          return (
            <TouchableOpacity
              key={star}
              style={styles.starButton}
              onPress={() => handleRatingSelect(star)}
              activeOpacity={0.7}
            >
              <Animated.View style={{ transform: [{ scale: starAnimations[star - 1] }] }}>
                <Ionicons
                  name={isSelected ? 'star' : 'star-outline'}
                  size={40}
                  color={isSelected ? '#FBBF24' : '#CBD5E1'}
                />
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>

      {ratingMessage && (
        <Animated.View style={[styles.ratingFeedback, { opacity: fadeAnim }]}>
          <Text style={styles.ratingEmoji}>{ratingMessage.emoji}</Text>
          <Text style={styles.ratingTitle}>{ratingMessage.title}</Text>
          <Text style={styles.ratingSubtitle}>{ratingMessage.subtitle}</Text>
        </Animated.View>
      )}
    </Animated.View>
  );

  const renderTagsSection = () => (
    <Animated.View
      style={[
        styles.sectionCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.sectionHeader}>
        <LinearGradient colors={serviceConfig.lightGradient} style={styles.sectionIconBg}>
          <Ionicons name="pricetags-outline" size={18} color={serviceConfig.accentColor} />
        </LinearGradient>
        <View>
          <Text style={styles.sectionTitle}>What stood out?</Text>
          <Text style={styles.sectionSubtitle}>Select all that apply</Text>
        </View>
      </View>

      <View style={styles.tagsContainer}>
        {availableTags.map((tag) => {
          const isSelected = selectedTags.includes(tag);
          return (
            <TouchableOpacity
              key={tag}
              style={[
                styles.tagChip,
                isSelected && {
                  backgroundColor: `${serviceConfig.accentColor}15`,
                  borderColor: serviceConfig.accentColor,
                },
              ]}
              onPress={() => handleTagToggle(tag)}
              activeOpacity={0.7}
            >
              {isSelected && (
                <Ionicons name="checkmark" size={14} color={serviceConfig.accentColor} />
              )}
              <Text
                style={[
                  styles.tagText,
                  isSelected && { color: serviceConfig.accentColor, fontWeight: '600' },
                ]}
              >
                {tag}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );

  const renderFeedbackSection = () => (
    <Animated.View
      style={[
        styles.sectionCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.sectionHeader}>
        <LinearGradient colors={serviceConfig.lightGradient} style={styles.sectionIconBg}>
          <Ionicons name="chatbubble-outline" size={18} color={serviceConfig.accentColor} />
        </LinearGradient>
        <View>
          <Text style={styles.sectionTitle}>Write a review</Text>
          <Text style={styles.sectionSubtitle}>Share your experience (optional)</Text>
        </View>
      </View>

      <View style={styles.feedbackInputContainer}>
        <TextInput
          style={styles.feedbackInput}
          placeholder="Tell us about your experience with this service provider..."
          placeholderTextColor="#94A3B8"
          value={localFeedback}
          onChangeText={handleFeedbackChange}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          maxLength={500}
        />
        <Text style={styles.charCount}>{localFeedback.length}/500</Text>
      </View>
    </Animated.View>
  );

  const renderRecommendSection = () => (
    <Animated.View
      style={[
        styles.sectionCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.sectionHeader}>
        <LinearGradient colors={serviceConfig.lightGradient} style={styles.sectionIconBg}>
          <Ionicons name="people-outline" size={18} color={serviceConfig.accentColor} />
        </LinearGradient>
        <Text style={styles.sectionTitle}>Would you recommend?</Text>
      </View>

      <View style={styles.recommendOptions}>
        <TouchableOpacity
          style={[
            styles.recommendButton,
            review?.wouldRecommend === true && {
              backgroundColor: '#10B98115',
              borderColor: '#10B981',
            },
          ]}
          onPress={() => handleRecommendToggle(true)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={review?.wouldRecommend === true ? 'thumbs-up' : 'thumbs-up-outline'}
            size={24}
            color={review?.wouldRecommend === true ? '#10B981' : '#64748B'}
          />
          <Text
            style={[
              styles.recommendText,
              review?.wouldRecommend === true && { color: '#10B981', fontWeight: '600' },
            ]}
          >
            Yes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.recommendButton,
            review?.wouldRecommend === false && {
              backgroundColor: '#FEE2E2',
              borderColor: '#EF4444',
            },
          ]}
          onPress={() => handleRecommendToggle(false)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={review?.wouldRecommend === false ? 'thumbs-down' : 'thumbs-down-outline'}
            size={24}
            color={review?.wouldRecommend === false ? '#EF4444' : '#64748B'}
          />
          <Text
            style={[
              styles.recommendText,
              review?.wouldRecommend === false && { color: '#EF4444', fontWeight: '600' },
            ]}
          >
            No
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderServiceSummary = () => (
    <Animated.View
      style={[
        styles.summaryCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.summaryHeader}>
        <Text style={styles.summaryTitle}>Service Summary</Text>
        <View style={[styles.paidBadge, { backgroundColor: '#10B98115' }]}>
          <Ionicons name="checkmark-circle" size={14} color="#10B981" />
          <Text style={styles.paidText}>
            {serviceDetails?.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
          </Text>
        </View>
      </View>

      <View style={styles.descriptionBox}>
        <Text style={styles.descriptionText}>{serviceDetails?.description}</Text>
      </View>

      <View style={styles.summaryRows}>
        <View style={styles.summaryRow}>
          <View style={styles.rowLeft}>
            <Ionicons name="construct-outline" size={16} color="#64748B" />
            <Text style={styles.rowLabel}>Service</Text>
          </View>
          <Text style={styles.rowValue}>{provider.service}</Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.rowLeft}>
            <Ionicons name="person-outline" size={16} color="#64748B" />
            <Text style={styles.rowLabel}>Provider</Text>
          </View>
          <Text style={styles.rowValue}>{provider.name}</Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.rowLeft}>
            <Ionicons name="time-outline" size={16} color="#64748B" />
            <Text style={styles.rowLabel}>Duration</Text>
          </View>
          <Text style={styles.rowValue}>{serviceDetails?.duration}</Text>
        </View>

        <View style={styles.totalRow}>
          <View style={styles.rowLeft}>
            <Ionicons name="cash-outline" size={16} color="#64748B" />
            <Text style={styles.totalLabel}>Total Amount</Text>
          </View>
          <Text style={[styles.totalValue, { color: serviceConfig.accentColor }]}>
            Rs {serviceDetails?.totalAmount.toLocaleString()}
          </Text>
        </View>
      </View>
    </Animated.View>
  );

  const renderSubmitButton = () => (
    <Animated.View
      style={[
        styles.submitContainer,
        {
          opacity: fadeAnim,
        },
      ]}
    >
      {/* Completeness indicator */}
      <View style={styles.completenessContainer}>
        <View style={styles.completenessBar}>
          <View
            style={[
              styles.completenessProgress,
              {
                width: `${reviewCompleteness}%`,
                backgroundColor: serviceConfig.accentColor,
              },
            ]}
          />
        </View>
        <Text style={styles.completenessText}>{reviewCompleteness}% complete</Text>
      </View>

      <TouchableOpacity
        style={[styles.submitButton, !isReviewValid && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        activeOpacity={0.9}
        disabled={!isReviewValid || isSubmitting}
      >
        <LinearGradient
          colors={
            isReviewValid && !isSubmitting
              ? serviceConfig.gradient
              : ['#CBD5E1', '#94A3B8']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.submitButtonGradient}
        >
          {isSubmitting ? (
            <>
              <MaterialCommunityIcons name="loading" size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Submitting...</Text>
            </>
          ) : (
            <>
              <Ionicons name="send" size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Submit Review</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {renderHeader()}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderProviderCard()}
          {renderRatingSection()}
          {renderTagsSection()}
          {renderFeedbackSection()}
          {renderRecommendSection()}
          {renderServiceSummary()}
          <View style={{ height: 140 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {renderSubmitButton()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
  },
  header: {
    zIndex: 10,
  },
  headerGradient: {
    paddingTop: (StatusBar.currentHeight || 0) + 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  completeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  completeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  providerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardAccent: {
    height: 4,
  },
  providerContent: {
    padding: 20,
    alignItems: 'center',
  },
  providerImageWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  imageRing: {
    width: 80,
    height: 80,
    borderRadius: 24,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerImage: {
    width: 74,
    height: 74,
    borderRadius: 21,
    backgroundColor: '#F1F5F9',
  },
  serviceIconBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 26,
    height: 26,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  providerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  providerService: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  completionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  completionText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  starButton: {
    padding: 4,
  },
  ratingFeedback: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 16,
  },
  ratingEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  ratingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  ratingSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  tagText: {
    fontSize: 13,
    color: '#64748B',
  },
  feedbackInputContainer: {
    position: 'relative',
  },
  feedbackInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: '#1E293B',
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  charCount: {
    position: 'absolute',
    bottom: 10,
    right: 14,
    fontSize: 11,
    color: '#94A3B8',
  },
  recommendOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  recommendButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  recommendText: {
    fontSize: 15,
    color: '#64748B',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  paidText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  descriptionBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  descriptionText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20,
  },
  summaryRows: {
    gap: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  submitContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  completenessContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  completenessBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  completenessProgress: {
    height: '100%',
    borderRadius: 2,
  },
  completenessText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  thankYouContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  thankYouContent: {
    alignItems: 'center',
  },
  confettiContainer: {
    position: 'absolute',
    top: -80,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  confettiEmoji: {
    fontSize: 28,
    position: 'absolute',
  },
  thankYouIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  thankYouTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  thankYouText: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    marginBottom: 20,
  },
  rewardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
  redirectText: {
    fontSize: 13,
    color: '#94A3B8',
  },
});