import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import {
  setSelectedDoctorId,
  setAppointmentType,
  setSymptoms,
  setNotes,
  resetBooking,
  selectAppointmentType,
  selectSymptoms,
  selectNotes,
} from './healthcareBookingSlice';
import { HealthcareRouteNames } from '../../../../navigation-maps/Healthcare';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { Typography } from '../../../../constants/Fonts';
import type { HealthcareStackParamList, Doctor, Clinic } from '../../../../models/healthcare/types';
import type { RouteProp } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type BookAppointmentRoute = RouteProp<HealthcareStackParamList, 'BookAppointment'>;

// ── Theme Colors (Consistent) ───────────────

const THEME = {
  primary: '#2A7FFF',
  primaryDark: '#1E6AE1',
  primaryLight: '#EAF3FF',
  accent: '#5A9FFF',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  star: '#FBBF24',
  gradient: {
    primary: ['#2A7FFF', '#1857C0'],
    header: ['#1857C0', '#1E6AE1'],
    accent: ['#5A9FFF', '#2A7FFF'],
    success: ['#10B981', '#059669'],
    video: ['#5A9FFF', '#2A7FFF'],
    clinic: ['#2A7FFF', '#1857C0'],
  },
};

// ── Consultation Type Config ────────────────

const CONSULTATION_TYPES = [
  {
    key: 'in-clinic' as const,
    label: 'In-Clinic Visit',
    description: 'Visit the doctor at their clinic',
    icon: 'hospital-building',
    gradient: THEME.gradient.clinic,
    iconBg: '#EAF3FF',
    iconColor: THEME.primary,
  },
  {
    key: 'video' as const,
    label: 'Video Consultation',
    description: 'Connect with doctor via video call',
    icon: 'video-outline',
    gradient: THEME.gradient.video,
    iconBg: '#EAF3FF',
    iconColor: THEME.accent,
  },
];

// ── Quick Symptom Tags ──────────────────────

const QUICK_SYMPTOMS = [
  { label: 'Fever', icon: 'thermometer-outline' },
  { label: 'Headache', icon: 'head-outline' },
  { label: 'Cough', icon: 'medical-bag' },
  { label: 'Body Pain', icon: 'body-outline' },
  { label: 'Fatigue', icon: 'battery-low' },
  { label: 'Nausea', icon: 'medical' },
];

// ── Step Config ─────────────────────────────

const STEPS = [
  { key: 'type', label: 'Type', icon: 'medical-outline' },
  { key: 'details', label: 'Details', icon: 'clipboard-outline' },
  { key: 'review', label: 'Review', icon: 'checkmark-circle-outline' },
];

// ── Component ───────────────────────────────

const BookAppointmentScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<BookAppointmentRoute>();
  const dispatch = useAppDispatch();
  const { doctorId } = route.params;

  const appointmentType = useAppSelector(selectAppointmentType);
  const symptoms = useAppSelector(selectSymptoms);
  const notes = useAppSelector(selectNotes);
  
  const doctor = useAppSelector((state) =>
    state.doctorDetail?.doctor as Doctor | null
  );

  const [currentStep, setCurrentStep] = useState(0);
  const [symptomsText, setSymptomsText] = useState(symptoms);
  const [notesText, setNotesText] = useState(notes);
  const [symptomsFocused, setSymptomsFocused] = useState(false);
  const [notesFocused, setNotesFocused] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const stepAnimations = useRef(STEPS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    dispatch(setSelectedDoctorId(doctorId));
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate steps
    stepAnimations.forEach((anim, index) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 300,
        delay: index * 100,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      dispatch(resetBooking());
    };
  }, [dispatch, doctorId]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  }, [currentStep, navigation]);

  const handleSelectType = useCallback(
    (type: 'in-clinic' | 'video') => {
      dispatch(setAppointmentType(type));
      setTimeout(() => setCurrentStep(1), 200);
    },
    [dispatch]
  );

  const handleContinue = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      dispatch(setSymptoms(symptomsText));
      dispatch(setNotes(notesText));
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, symptomsText, notesText, dispatch]);

  const handleConfirm = useCallback(() => {
    dispatch(setSymptoms(symptomsText));
    dispatch(setNotes(notesText));
    
    if (appointmentType === 'in-clinic') {
      navigation.navigate(HealthcareRouteNames.ClinicSelection, { doctorId });
    } else {
      navigation.navigate(HealthcareRouteNames.SlotSelection, { doctorId });
    }
  }, [navigation, symptomsText, notesText, appointmentType, doctorId, dispatch]);

  const toggleSymptomTag = useCallback((tag: string) => {
    const has = symptomsText.toLowerCase().includes(tag.toLowerCase());
    if (has) {
      setSymptomsText(
        symptomsText
          .replace(new RegExp(tag, 'gi'), '')
          .replace(/,\s*,/g, ',')
          .replace(/^,\s*|,\s*$/g, '')
          .trim()
      );
    } else {
      setSymptomsText(symptomsText ? `${symptomsText}, ${tag}` : tag);
    }
  }, [symptomsText]);

  const doctorName = doctor?.bio?.split(' ')[1] || 'Doctor';
  const consultationFee = appointmentType === 'video'
    ? doctor?.videoConsultationFee
    : doctor?.consultationFee;

  // ── Step Indicator ────────────────────────

  const renderStepIndicator = () => (
    <View style={styles.stepContainer}>
      {STEPS.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        
        return (
          <React.Fragment key={step.key}>
            <Animated.View
              style={[
                styles.stepItem,
                {
                  opacity: stepAnimations[index],
                  transform: [{
                    translateY: stepAnimations[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [10, 0],
                    }),
                  }],
                },
              ]}
            >
              <View
                style={[
                  styles.stepDot,
                  isCurrent && styles.stepDotCurrent,
                  isCompleted && styles.stepDotCompleted,
                ]}
              >
                {isCompleted ? (
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                ) : (
                  <Ionicons
                    name={step.icon as any}
                    size={14}
                    color={isCurrent ? '#FFFFFF' : Colors.text.tertiary}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  isCurrent && styles.stepLabelCurrent,
                  isCompleted && styles.stepLabelCompleted,
                ]}
              >
                {step.label}
              </Text>
            </Animated.View>
            
            {index < STEPS.length - 1 && (
              <View
                style={[
                  styles.stepLine,
                  isCompleted && styles.stepLineCompleted,
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );

  // ── Step 1: Consultation Type ─────────────

  const renderTypeStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Choose Consultation Type</Text>
      <Text style={styles.stepSubtitle}>
        How would you like to consult with Dr. {doctorName}?
      </Text>

      {CONSULTATION_TYPES.map((type) => {
        const isSelected = appointmentType === type.key;
        return (
          <TouchableOpacity
            key={type.key}
            style={[styles.typeCard, isSelected && styles.typeCardSelected]}
            onPress={() => handleSelectType(type.key)}
            activeOpacity={0.8}
          >
            <View style={[styles.typeIconContainer, { backgroundColor: type.iconBg }]}>
              <MaterialCommunityIcons
                name={type.icon as any}
                size={24}
                color={type.iconColor}
              />
            </View>
            
            <View style={styles.typeInfo}>
              <Text style={styles.typeLabel}>{type.label}</Text>
              <Text style={styles.typeDescription}>{type.description}</Text>
            </View>
            
            <View style={[styles.typeRadio, isSelected && styles.typeRadioSelected]}>
              {isSelected && (
                <View style={styles.typeRadioInner}>
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}

      {/* Clinic Preview */}
      {appointmentType === 'in-clinic' && doctor?.clinics && doctor.clinics.length > 0 && (
        <View style={styles.clinicPreview}>
          <View style={styles.clinicPreviewHeader}>
            <View style={styles.clinicPreviewIconBg}>
              <Ionicons name="location" size={16} color={THEME.primary} />
            </View>
            <Text style={styles.clinicPreviewTitle}>Available Clinics</Text>
            <View style={styles.clinicCountBadge}>
              <Text style={styles.clinicCountText}>{doctor.clinics.length}</Text>
            </View>
          </View>
          
          {doctor.clinics.slice(0, 2).map((clinic: Clinic, index: number) => (
            <View
              key={clinic.clinicId}
              style={[
                styles.clinicPreviewItem,
                index === 0 && { borderTopWidth: 0 },
              ]}
            >
              <Text style={styles.clinicPreviewName}>{clinic.name}</Text>
              <Text style={styles.clinicPreviewAddress}>{clinic.address}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Fee Info Card */}
      <View style={styles.feeInfoCard}>
        <LinearGradient
          colors={appointmentType === 'video' ? THEME.gradient.video as any : THEME.gradient.clinic as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.feeGradient}
        >
          <View style={styles.feeIconBg}>
            <Ionicons name="wallet-outline" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.feeInfoContent}>
            <Text style={styles.feeInfoLabel}>Consultation Fee</Text>
            <Text style={styles.feeInfoAmount}>
              PKR {consultationFee || '—'}
            </Text>
          </View>
          <View style={styles.feeTypeBadge}>
            <Text style={styles.feeTypeText}>
              {appointmentType === 'video' ? 'Video' : 'In-Clinic'}
            </Text>
          </View>
        </LinearGradient>
      </View>
    </View>
  );

  // ── Step 2: Patient Details ───────────────

  const renderDetailsStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Patient Details</Text>
      <Text style={styles.stepSubtitle}>
        Help Dr. {doctorName} prepare for your consultation
      </Text>

      {/* Symptoms Input */}
      <View style={styles.inputGroup}>
        <View style={styles.inputLabelRow}>
          <Ionicons name="medical-outline" size={16} color={THEME.primary} />
          <Text style={styles.inputLabel}>Symptoms / Reason for Visit</Text>
        </View>
        <View
          style={[
            styles.textAreaContainer,
            symptomsFocused && styles.textAreaContainerFocused,
          ]}
        >
          <TextInput
            style={styles.textArea}
            placeholder="Describe your symptoms or reason for visiting..."
            placeholderTextColor={Colors.text.tertiary}
            value={symptomsText}
            onChangeText={setSymptomsText}
            onFocus={() => setSymptomsFocused(true)}
            onBlur={() => setSymptomsFocused(false)}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
        <View style={styles.inputHint}>
          <Ionicons name="information-circle-outline" size={14} color={Colors.text.tertiary} />
          <Text style={styles.inputHintText}>
            This helps the doctor prepare for your consultation
          </Text>
        </View>
      </View>

      {/* Quick Symptom Tags */}
      <View style={styles.quickTagsSection}>
        <Text style={styles.quickTagsTitle}>Common Symptoms</Text>
        <View style={styles.quickTagsRow}>
          {QUICK_SYMPTOMS.map((tag) => {
            const isActive = symptomsText.toLowerCase().includes(tag.label.toLowerCase());
            return (
              <TouchableOpacity
                key={tag.label}
                style={[styles.quickTag, isActive && styles.quickTagActive]}
                onPress={() => toggleSymptomTag(tag.label)}
              >
                <MaterialCommunityIcons
                  name={tag.icon as any}
                  size={14}
                  color={isActive ? THEME.primary : Colors.text.tertiary}
                />
                <Text style={[styles.quickTagText, isActive && styles.quickTagTextActive]}>
                  {tag.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Notes Input */}
      <View style={styles.inputGroup}>
        <View style={styles.inputLabelRow}>
          <Ionicons name="document-text-outline" size={16} color={THEME.accent} />
          <Text style={styles.inputLabel}>Additional Notes (Optional)</Text>
        </View>
        <View
          style={[
            styles.textAreaContainer,
            notesFocused && styles.textAreaContainerFocused,
          ]}
        >
          <TextInput
            style={[styles.textArea, { minHeight: 80 }]}
            placeholder="Any allergies, medications, or other relevant info..."
            placeholderTextColor={Colors.text.tertiary}
            value={notesText}
            onChangeText={setNotesText}
            onFocus={() => setNotesFocused(true)}
            onBlur={() => setNotesFocused(false)}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      </View>
    </View>
  );

  // ── Step 3: Review ────────────────────────

  const renderReviewStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Review Your Booking</Text>
      <Text style={styles.stepSubtitle}>
        Please confirm the details before proceeding
      </Text>

      {/* Doctor Info Card */}
      <View style={styles.reviewCard}>
        <View style={styles.reviewCardHeader}>
          <View style={styles.reviewDoctorAvatar}>
            <MaterialCommunityIcons name="doctor" size={28} color={THEME.primary} />
          </View>
          <View style={styles.reviewDoctorInfo}>
            <View style={styles.reviewDoctorNameRow}>
              <Text style={styles.reviewDoctorName}>Dr. {doctorName}</Text>
              {doctor?.isVerified && (
                <Ionicons name="checkmark-circle" size={16} color={THEME.primary} />
              )}
            </View>
            <Text style={styles.reviewDoctorSpecialty}>
              {doctor?.subspecialties?.[0] || doctor?.qualifications?.join(', ') || 'Specialist'}
            </Text>
            {doctor?.rating && (
              <View style={styles.reviewRatingRow}>
                <Ionicons name="star" size={12} color={THEME.star} />
                <Text style={styles.reviewRatingText}>
                  {doctor.rating.toFixed(1)} ({doctor.totalReviews || 0} reviews)
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Booking Summary Card */}
      <View style={styles.reviewCard}>
        <View style={styles.reviewCardTitleRow}>
          <View style={[styles.reviewCardIconBg, { backgroundColor: '#EAF3FF' }]}>
            <Ionicons name="clipboard-outline" size={16} color={THEME.primary} />
          </View>
          <Text style={styles.reviewCardTitle}>Booking Summary</Text>
        </View>

        <View style={styles.reviewRow}>
          <View style={[styles.reviewRowIconBg, { backgroundColor: '#EAF3FF' }]}>
            <MaterialCommunityIcons name="stethoscope" size={16} color={THEME.accent} />
          </View>
          <View style={styles.reviewRowContent}>
            <Text style={styles.reviewRowLabel}>Consultation Type</Text>
            <Text style={styles.reviewRowValue}>
              {appointmentType === 'video' ? 'Video Consultation' : 'In-Clinic Visit'}
            </Text>
          </View>
        </View>

        <View style={styles.reviewDivider} />

        <View style={styles.reviewRow}>
          <View style={[styles.reviewRowIconBg, { backgroundColor: '#FEF3C7' }]}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={16} color={THEME.warning} />
          </View>
          <View style={styles.reviewRowContent}>
            <Text style={styles.reviewRowLabel}>Symptoms</Text>
            <Text style={styles.reviewRowValue}>
              {symptomsText || 'Not specified'}
            </Text>
          </View>
        </View>

        <View style={styles.reviewDivider} />

        <View style={styles.reviewRow}>
          <View style={[styles.reviewRowIconBg, { backgroundColor: '#DCFCE7' }]}>
            <Ionicons name="wallet-outline" size={16} color={THEME.success} />
          </View>
          <View style={styles.reviewRowContent}>
            <Text style={styles.reviewRowLabel}>Consultation Fee</Text>
            <Text style={[styles.reviewRowValue, { color: THEME.primary, fontWeight: '700' }]}>
              PKR {consultationFee || '—'}
            </Text>
          </View>
        </View>
      </View>

      {/* Disclaimer Card */}
      <View style={styles.disclaimerCard}>
        <View style={styles.disclaimerIconBg}>
          <MaterialCommunityIcons name="shield-check" size={18} color={THEME.primary} />
        </View>
        <Text style={styles.disclaimerText}>
          {appointmentType === 'in-clinic'
            ? "Next, you'll select a clinic and available time slot."
            : "Next, you'll select an available time slot for your video consultation."}
        </Text>
      </View>
    </View>
  );

  // ── Main Render ───────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E6AE1" />

      {/* Header */}
      <LinearGradient
        colors={THEME.gradient.header as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >

        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Book Appointment</Text>
          <Text style={styles.headerSubtitle}>
            {currentStep === 0
              ? 'Choose how to consult'
              : currentStep === 1
              ? 'Add your details'
              : 'Confirm and proceed'}
          </Text>
        </View>
      </LinearGradient>

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Content */}
      <Animated.ScrollView
        style={[
          styles.scrollView,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {currentStep === 0 && renderTypeStep()}
        {currentStep === 1 && renderDetailsStep()}
        {currentStep === 2 && renderReviewStep()}
      </Animated.ScrollView>

      {/* Footer */}
      {currentStep > 0 && (
        <View style={styles.footer}>
          <View style={styles.footerContent}>
            {currentStep === 2 && (
              <View style={styles.footerFeeInfo}>
                <Text style={styles.footerFeeLabel}>Total Fee</Text>
                <Text style={styles.footerFeeAmount}>PKR {consultationFee || '—'}</Text>
              </View>
            )}
            
            <TouchableOpacity
              style={[styles.continueButton, currentStep === 2 && { flex: 1 }]}
              onPress={currentStep === 2 ? handleConfirm : handleContinue}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={currentStep === 2 ? THEME.gradient.success as any : THEME.gradient.primary as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.continueGradient}
              >
                <Text style={styles.continueButtonText}>
                  {currentStep === 2 ? 'Continue to Scheduling' : 'Continue'}
                </Text>
                <Ionicons
                  name={currentStep === 2 ? 'calendar-outline' : 'arrow-forward'}
                  size={18}
                  color="#FFFFFF"
                />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

// ── Styles ──────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FBFF',
  },

  // Header
  header: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 8 : 8,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerContent: {},
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },

  // Steps
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 30,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  stepItem: {
    alignItems: 'center',
  },
  stepDot: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepDotCurrent: {
    backgroundColor: THEME.primary,
  },
  stepDotCompleted: {
    backgroundColor: THEME.success,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  stepLabelCurrent: {
    color: THEME.primary,
  },
  stepLabelCompleted: {
    color: THEME.success,
  },
  stepLine: {
    width: 50,
    height: 3,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 8,
    marginBottom: 20,
    borderRadius: 2,
  },
  stepLineCompleted: {
    backgroundColor: THEME.success,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },

  // Step Content
  stepContent: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.secondary,
    marginBottom: 24,
  },

  // Type Selection
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  typeCardSelected: {
    borderColor: THEME.primary,
    backgroundColor: '#FAFCFF',
  },
  typeIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  typeInfo: {
    flex: 1,
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  typeDescription: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  typeRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeRadioSelected: {
    borderColor: THEME.primary,
    backgroundColor: THEME.primary,
  },
  typeRadioInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: THEME.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Clinic Preview
  clinicPreview: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  clinicPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  clinicPreviewIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EAF3FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  clinicPreviewTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  clinicCountBadge: {
    backgroundColor: THEME.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  clinicCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.primary,
  },
  clinicPreviewItem: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  clinicPreviewName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  clinicPreviewAddress: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text.secondary,
  },

  // Fee Info
  feeInfoCard: {
    marginTop: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  feeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
  },
  feeIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  feeInfoContent: {
    flex: 1,
  },
  feeInfoLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
  feeInfoAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  feeTypeBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  feeTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Input Groups
  inputGroup: {
    marginBottom: 20,
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  textAreaContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  textAreaContainerFocused: {
    borderColor: THEME.primary,
  },
  textArea: {
    padding: 16,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
    minHeight: 120,
  },
  inputHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  inputHintText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },

  // Quick Tags
  quickTagsSection: {
    marginBottom: 20,
  },
  quickTagsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 10,
  },
  quickTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  quickTagActive: {
    backgroundColor: THEME.primaryLight,
    borderColor: THEME.primary,
  },
  quickTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  quickTagTextActive: {
    color: THEME.primary,
  },

  // Review Card
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  reviewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewDoctorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: THEME.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  reviewDoctorInfo: {
    flex: 1,
  },
  reviewDoctorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reviewDoctorName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  reviewDoctorSpecialty: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text.secondary,
    marginTop: 2,
  },
  reviewRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  reviewRatingText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  reviewCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  reviewCardIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  reviewRowIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reviewRowContent: {
    flex: 1,
  },
  reviewRowLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text.tertiary,
    marginBottom: 2,
  },
  reviewRowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  reviewDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },

  // Disclaimer
  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: THEME.primaryLight,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  disclaimerIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text.secondary,
    lineHeight: 20,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerFeeInfo: {
    marginRight: 16,
  },
  footerFeeLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },
  footerFeeAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.primary,
    marginTop: 2,
  },
  continueButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  continueGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  continueButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default BookAppointmentScreen;