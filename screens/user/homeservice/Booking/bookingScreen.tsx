// ============================================================================
// Book a visit
//
// A form, so it is quiet. The old version wrapped every section in a gradient
// icon chip in a different hue (pink calendar, green clock, amber notes, blue
// receipt) — four accent colours on one form, none of them meaning anything —
// plus a gradient hero, a gradient rating badge and a gradient CTA.
//
// The "Booking Summary" section used to be a heading with a `{/* Add your
// summary content here */}` comment under it. It now shows the actual summary,
// which is the whole point of a review step.
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
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
  Screen,
  SectionHeader,
  Skeleton,
} from '../../../../components/ui';
import { categoryAccent, HS } from '../../../../constants/HomeServiceTheme';
import { C, GUTTER, R, S, SECTION, T } from '../../../../constants/theme';
import { useBottomBarPadding } from '../../../../hooks/useBottomBarPadding';
import { AppDispatch, RootState } from '../../../../store/store';
import {
  formatBookingDate,
  formatRating,
  formatReviewCount,
} from '../../../../utils/homeservice/format';
import {
  fetchBookingData,
  SavedAddress,
  selectBookingSummary,
  selectIsFormValid,
  setInstructions,
  setSelectedAddress,
  setSelectedDate,
  setSelectedTime,
  submitBooking,
  TimeSlot,
} from './bookingScreenSlice';

type RouteParams = {
  providerId: string;
  category?: 'electricians' | 'plumbers' | 'ac-repairers';
};

const PERIODS: { key: TimeSlot['period']; label: string }[] = [
  { key: 'morning', label: 'Morning' },
  { key: 'afternoon', label: 'Afternoon' },
  { key: 'evening', label: 'Evening' },
];

const ADDRESS_ICON: Record<string, string> = {
  home: 'home-outline',
  building: 'business-outline',
};

export default function BookingScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const dispatch = useDispatch<AppDispatch>();
  const bottomPad = useBottomBarPadding(GUTTER);

  const { providerId, category = 'ac-repairers' } = route.params || {};
  const accent = categoryAccent(category);

  const provider = useSelector((state: RootState) => state.booking?.provider);
  const savedAddresses = useSelector((state: RootState) => state.booking?.savedAddresses) || [];
  const timeSlots = useSelector((state: RootState) => state.booking?.timeSlots) || [];
  const selectedDate = useSelector((state: RootState) => state.booking?.selectedDate) || '';
  const selectedTime = useSelector((state: RootState) => state.booking?.selectedTime) || '';
  const selectedAddress = useSelector((state: RootState) => state.booking?.selectedAddress);
  const instructions = useSelector((state: RootState) => state.booking?.instructions) || '';
  const isLoading = useSelector((state: RootState) => state.booking?.isLoading);
  const isSubmitting = useSelector((state: RootState) => state.booking?.isSubmitting);
  const isFormValid = useSelector(selectIsFormValid);
  const bookingSummary = useSelector(selectBookingSummary);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAddressSheet, setShowAddressSheet] = useState(false);
  const [date, setDate] = useState(new Date());
  const [submitError, setSubmitError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      const validCategory = ['electricians', 'plumbers', 'ac-repairers'].includes(category)
        ? category
        : 'ac-repairers';

      // A missing providerId is a caller bug, and 'default' only ever produced
      // GET /bookings/init/default → 404.
      if (!providerId) {
        if (__DEV__) {
          console.warn('[bookingScreen] no providerId in route params — skipping fetch.');
        }
        return;
      }

      dispatch(
        fetchBookingData({
          providerId,
          category: validCategory as 'electricians' | 'plumbers' | 'ac-repairers',
        })
      );
    }, [providerId, category, dispatch])
  );

  // The booking must exist on the server BEFORE we navigate: the confirmation
  // screen and everything it leads to (tracking, service status, chat) are
  // keyed by the real booking id. Firing this without awaiting is what left
  // the next screen with no id at all.
  const handleContinue = useCallback(async () => {
    if (!isFormValid || !bookingSummary || isSubmitting) return;
    setSubmitError(null);
    try {
      const result = await dispatch(submitBooking(bookingSummary)).unwrap();
      navigation.navigate('BookConfirmation', { category, bookingId: result.bookingId });
    } catch (e) {
      setSubmitError(
        typeof e === 'string' ? e : "We couldn't create your booking. Check your connection and try again."
      );
    }
  }, [dispatch, isFormValid, bookingSummary, isSubmitting, navigation, category]);

  const handleDateChange = useCallback(
    (event: DateTimePickerEvent, picked?: Date) => {
      setShowDatePicker(Platform.OS === 'ios');
      if (picked) {
        setDate(picked);
        dispatch(
          setSelectedDate(
            picked.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          )
        );
      }
    },
    [dispatch]
  );

  if (isLoading || !provider) {
    return (
      <Screen>
        <AppBar title="Book a visit" onBack={() => navigation.goBack()} />
        <View style={styles.loading} accessibilityLabel="Loading booking details">
          <Skeleton width="100%" height={112} radius={R.card} />
          <Skeleton width="45%" height={16} style={styles.loadingGap} />
          <Skeleton width="100%" height={60} radius={R.card} style={styles.loadingGapSm} />
          <Skeleton width="45%" height={16} style={styles.loadingGap} />
          <Skeleton width="100%" height={60} radius={R.card} style={styles.loadingGapSm} />
        </View>
      </Screen>
    );
  }

  const rating = formatRating(provider.rating);
  const reviews = formatReviewCount(provider.reviews);

  const renderTimeGroup = (period: TimeSlot['period'], label: string) => {
    const slots = timeSlots.filter((s) => s.period === period);
    if (!slots.length) return null;

    return (
      <View key={period} style={styles.timeGroup}>
        <Text style={styles.timeGroupLabel}>{label}</Text>
        <View style={styles.timeGrid}>
          {slots.map((slot) => {
            const isSelected = selectedTime === slot.time;
            const isDisabled = !slot.available;
            return (
              <TouchableOpacity
                key={slot.id}
                style={[
                  styles.timeSlot,
                  isSelected && styles.timeSlotSelected,
                  isDisabled && styles.timeSlotDisabled,
                ]}
                onPress={() => !isDisabled && dispatch(setSelectedTime(slot.time))}
                disabled={isDisabled}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected, disabled: isDisabled }}
              >
                <Text
                  style={[
                    styles.timeSlotText,
                    isSelected && styles.timeSlotTextSelected,
                    isDisabled && styles.timeSlotTextDisabled,
                  ]}
                >
                  {slot.time}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <Screen>
      <AppBar title="Book a visit" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card accentRule={accent.tint} elevation="raised">
          <View style={styles.providerRow}>
            <Avatar
              uri={provider.image}
              name={provider.name}
              size={52}
              tint={accent.tintSoft}
              color={accent.tint}
            />
            <View style={styles.providerInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.providerName} numberOfLines={1}>
                  {provider.name}
                </Text>
                {provider.verified && (
                  <Ionicons name="shield-checkmark" size={14} color={accent.tint} />
                )}
              </View>
              <Text style={styles.meta} numberOfLines={1}>
                {[provider.specialty, provider.experience].filter(Boolean).join(' · ')}
              </Text>
              <View style={styles.ratingRow}>
                {rating ? (
                  <>
                    <Ionicons name="star" size={12} color={C.star} />
                    <Text style={styles.ratingText}>{rating}</Text>
                    {!!reviews && <Text style={styles.meta}>· {reviews}</Text>}
                  </>
                ) : (
                  <Text style={styles.meta}>New provider</Text>
                )}
              </View>
            </View>
          </View>

          <View style={styles.highlights}>
            <View style={styles.highlight}>
              <Ionicons name="navigate-outline" size={15} color={C.inkFaint} />
              <Text style={styles.highlightText}>Visits your address</Text>
            </View>
            {!!provider.responseTime && (
              <View style={styles.highlight}>
                <Ionicons name="time-outline" size={15} color={C.inkFaint} />
                <Text style={styles.highlightText}>Replies in {provider.responseTime}</Text>
              </View>
            )}
          </View>
        </Card>

        <View style={styles.section}>
          <SectionHeader title="Where" />
          <Card onPress={() => setShowAddressSheet(true)} style={styles.selectorCard}>
            <View style={styles.selector}>
              <Ionicons name="location-outline" size={18} color={C.inkFaint} />
              <View style={styles.selectorText}>
                {!!selectedAddress && <Text style={styles.selectorLabel}>{selectedAddress.label}</Text>}
                <Text
                  style={selectedAddress ? styles.selectorValue : styles.selectorPlaceholder}
                  numberOfLines={1}
                >
                  {selectedAddress?.address || 'Choose a service address'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.inkFaint} />
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <SectionHeader title="When" />
          <Card onPress={() => setShowDatePicker(true)} style={styles.selectorCard}>
            <View style={styles.selector}>
              <Ionicons name="calendar-outline" size={18} color={C.inkFaint} />
              <View style={styles.selectorText}>
                <Text
                  style={selectedDate ? styles.selectorValue : styles.selectorPlaceholder}
                  numberOfLines={1}
                >
                  {selectedDate || 'Choose a date'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.inkFaint} />
            </View>
          </Card>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}

          {PERIODS.map((p) => renderTimeGroup(p.key, p.label))}
        </View>

        <View style={styles.section}>
          <SectionHeader title="Anything they should know?" subtitle="Optional" />
          <TextInput
            style={styles.instructions}
            placeholder="Describe the fault, access instructions, parking — anything that saves a trip."
            placeholderTextColor={C.inkFaint}
            value={instructions}
            onChangeText={(text) => dispatch(setInstructions(text))}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <SectionHeader title="Summary" />
          <Card style={styles.selectorCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Provider</Text>
              <Text style={styles.summaryValue} numberOfLines={1}>
                {provider.name}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Service</Text>
              <Text style={styles.summaryValue}>{accent.label}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Date</Text>
              <Text style={styles.summaryValue}>
                {formatBookingDate(selectedDate) ?? selectedDate ?? 'Not set'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Time</Text>
              <Text style={styles.summaryValue}>{selectedTime || 'Not set'}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Address</Text>
              <Text style={styles.summaryValue} numberOfLines={1}>
                {selectedAddress?.address || 'Not set'}
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={styles.summaryKey}>Price</Text>
              <Text style={styles.summaryValue}>Quoted after the visit</Text>
            </View>
          </Card>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: bottomPad }]}>
        {!!submitError && <Text style={styles.error}>{submitError}</Text>}
        {!isFormValid && !submitError && (
          <Text style={styles.footerHint}>
            {!selectedAddress
              ? 'Pick an address to continue.'
              : !selectedDate
                ? 'Pick a date to continue.'
                : 'Pick a time to continue.'}
          </Text>
        )}
        <Button
          label="Confirm booking"
          onPress={handleContinue}
          disabled={!isFormValid}
          loading={!!isSubmitting}
        />
      </View>

      <ActionSheet
        visible={showAddressSheet}
        title="Service address"
        onClose={() => setShowAddressSheet(false)}
        options={[
          ...savedAddresses.map((address: SavedAddress) => ({
            label: address.label,
            description: address.address,
            icon: ADDRESS_ICON[address.icon] ?? 'location-outline',
            onPress: () => dispatch(setSelectedAddress(address)),
          })),
          {
            label: 'Manage addresses',
            icon: 'add-circle-outline',
            onPress: () => navigation.navigate('AddressManagement'),
          },
        ]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: GUTTER,
    paddingBottom: 120,
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerName: {
    ...T.subhead,
    color: C.ink,
    marginRight: S.xs,
    flexShrink: 1,
  },
  meta: {
    ...T.caption,
    color: C.inkMuted,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  ratingText: {
    ...T.label,
    color: C.ink,
    marginHorizontal: 3,
  },
  highlights: {
    marginTop: S.lg,
    paddingTop: S.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.lineSoft,
  },
  highlight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: S.xs,
  },
  highlightText: {
    ...T.caption,
    color: C.inkMuted,
    marginLeft: S.sm,
  },

  section: {
    marginTop: SECTION,
  },
  selectorCard: {
    marginTop: S.md,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectorText: {
    flex: 1,
    marginHorizontal: S.md,
  },
  selectorLabel: {
    ...T.caption,
    color: C.inkFaint,
    marginBottom: 1,
  },
  selectorValue: {
    ...T.body,
    color: C.ink,
  },
  selectorPlaceholder: {
    ...T.body,
    color: C.inkFaint,
  },

  timeGroup: {
    marginTop: S.xl,
  },
  timeGroupLabel: {
    ...T.label,
    color: C.inkMuted,
    marginBottom: S.sm,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  timeSlot: {
    paddingHorizontal: S.lg,
    paddingVertical: S.sm,
    borderRadius: R.chip,
    backgroundColor: C.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    marginRight: S.sm,
    marginBottom: S.sm,
  },
  timeSlotSelected: {
    backgroundColor: HS.accentSoft,
    borderColor: HS.accent,
  },
  timeSlotDisabled: {
    backgroundColor: C.surfaceSunken,
    borderColor: 'transparent',
  },
  timeSlotText: {
    ...T.label,
    color: C.ink,
  },
  timeSlotTextSelected: {
    color: HS.accentDeep,
    fontWeight: '600',
  },
  timeSlotTextDisabled: {
    color: C.disabled,
    textDecorationLine: 'line-through',
  },

  instructions: {
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
  footerHint: {
    ...T.caption,
    color: C.inkMuted,
    textAlign: 'center',
    marginBottom: S.sm,
  },
  error: {
    ...T.caption,
    color: C.error,
    textAlign: 'center',
    marginBottom: S.sm,
  },
});
