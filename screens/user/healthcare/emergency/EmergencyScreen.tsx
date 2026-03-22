import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Linking,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

// ── Theme ───────────────────────────────────
const THEME = {
  emergency: '#EF4444',
  emergencyDark: '#DC2626',
  emergencyLight: '#FEF2F2',
  primary: '#2A7FFF',
  surface: '#FFFFFF',
  bg: '#F7F9FC',
  textPrimary: '#1A1A1A',
  textSecondary: '#64748B',
  border: '#E5E7EB',
};

// ── Emergency Contacts ──────────────────────
const EMERGENCY_CONTACTS = [
  {
    id: 'ambulance',
    name: 'Ambulance',
    number: '1122',
    icon: 'ambulance' as const,
    color: '#EF4444',
    bg: '#FEF2F2',
    description: 'Emergency medical services',
  },
  {
    id: 'edhi',
    name: 'Edhi Foundation',
    number: '115',
    icon: 'hospital-box' as const,
    color: '#F59E0B',
    bg: '#FFFBEB',
    description: 'Rescue & ambulance service',
  },
  {
    id: 'chippa',
    name: 'Chippa Rescue',
    number: '1020',
    icon: 'car-emergency' as const,
    color: '#EF4444',
    bg: '#FEF2F2',
    description: 'Emergency rescue service',
  },
  {
    id: 'police',
    name: 'Police Emergency',
    number: '15',
    icon: 'police-badge' as const,
    color: '#2A7FFF',
    bg: '#EFF6FF',
    description: 'Law enforcement emergency',
  },
  {
    id: 'fire',
    name: 'Fire Brigade',
    number: '16',
    icon: 'fire-truck' as const,
    color: '#F97316',
    bg: '#FFF7ED',
    description: 'Fire & rescue services',
  },
  {
    id: 'rescue',
    name: 'Rescue 1122',
    number: '1122',
    icon: 'helicopter' as const,
    color: '#10B981',
    bg: '#ECFDF5',
    description: 'Punjab emergency service',
  },
];

// ── First Aid Tips ──────────────────────────
const FIRST_AID_TIPS = [
  {
    id: 'cpr',
    title: 'CPR (Cardiopulmonary Resuscitation)',
    icon: 'heart-pulse',
    color: '#EF4444',
    steps: [
      'Call emergency services immediately (1122)',
      'Tilt head back, lift chin to open airway',
      'Give 2 rescue breaths lasting 1 second each',
      'Push hard and fast in center of chest — 100-120 pushes/min',
      'Continue until help arrives or person recovers',
    ],
  },
  {
    id: 'choking',
    title: 'Choking — Heimlich Maneuver',
    icon: 'lungs',
    color: '#F59E0B',
    steps: [
      'Confirm if person is choking (cannot cough/speak/breathe)',
      'Call for help or have someone call 1122',
      'Stand behind, wrap arms around waist',
      'Make a fist, place above navel below ribcage',
      'Give 5 abdominal thrusts until object is expelled',
    ],
  },
  {
    id: 'bleeding',
    title: 'Severe Bleeding',
    icon: 'water',
    color: '#DC2626',
    steps: [
      'Call 1122 for severe/uncontrolled bleeding',
      'Apply firm pressure with clean cloth or bandage',
      'Do not remove cloth — add more if soaked',
      'Elevate injured area above heart level if possible',
      'Keep person calm and warm until help arrives',
    ],
  },
  {
    id: 'burns',
    title: 'Burns',
    icon: 'fire',
    color: '#F97316',
    steps: [
      'Remove from source of burn immediately',
      'Cool burn under cool (not cold) running water — 20 minutes',
      'Do not apply ice, butter, or toothpaste',
      'Cover loosely with clean non-fluffy material',
      'Seek medical attention for serious burns',
    ],
  },
];

// ── Nearby Hospital Tip ─────────────────────
const IMPORTANT_NOTES = [
  { icon: 'map-marker-radius', text: 'Call 1122 for nearest emergency facility location' },
  { icon: 'information', text: 'Stay on the line with emergency dispatch — follow their instructions' },
  { icon: 'account-group', text: 'Keep emergency contacts saved in your phone contacts' },
  { icon: 'medical-bag', text: 'Keep a basic first aid kit at home and in your vehicle' },
];

// ── Component ───────────────────────────────
const EmergencyScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();

    // Pulse animation for the main emergency button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleCall = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.emergency} />

      {/* Header */}
      <LinearGradient
        colors={['#EF4444', '#DC2626']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emergency</Text>
        <View style={styles.headerRight} />
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Emergency CTA */}
        <Animated.View
          style={[
            styles.heroBannerWrapper,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <LinearGradient
            colors={['#FEF2F2', '#FEE2E2']}
            style={styles.heroBanner}
          >
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                style={styles.mainEmergencyButton}
                onPress={() => handleCall('1122')}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#EF4444', '#DC2626']}
                  style={styles.mainEmergencyGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="call" size={36} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            <Text style={styles.mainEmergencyTitle}>Call Emergency</Text>
            <Text style={styles.mainEmergencySubtitle}>
              Tap to immediately call{'\n'}Emergency Rescue (1122)
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* Emergency Contacts Grid */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text style={styles.sectionTitle}>Emergency Contacts</Text>
          <View style={styles.contactsGrid}>
            {EMERGENCY_CONTACTS.map((contact) => (
              <TouchableOpacity
                key={contact.id}
                style={styles.contactCard}
                onPress={() => handleCall(contact.number)}
                activeOpacity={0.8}
              >
                <View style={[styles.contactIconBg, { backgroundColor: contact.bg }]}>
                  <MaterialCommunityIcons
                    name={contact.icon}
                    size={26}
                    color={contact.color}
                  />
                </View>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactNumber}>{contact.number}</Text>
                <Text style={styles.contactDesc} numberOfLines={1}>
                  {contact.description}
                </Text>
                <View style={[styles.callChip, { backgroundColor: contact.bg }]}>
                  <Ionicons name="call-outline" size={12} color={contact.color} />
                  <Text style={[styles.callChipText, { color: contact.color }]}>Call</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Important Notes */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.sectionTitle}>Important Reminders</Text>
          <View style={styles.notesCard}>
            {IMPORTANT_NOTES.map((note, idx) => (
              <View key={idx} style={[styles.noteRow, idx < IMPORTANT_NOTES.length - 1 && styles.noteRowBorder]}>
                <View style={styles.noteIconBg}>
                  <MaterialCommunityIcons name={note.icon as any} size={18} color={THEME.emergency} />
                </View>
                <Text style={styles.noteText}>{note.text}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* First Aid Tips */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.sectionTitle}>Basic First Aid</Text>
          {FIRST_AID_TIPS.map((tip) => (
            <FirstAidCard key={tip.id} tip={tip} />
          ))}
        </Animated.View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ── First Aid Accordion Card ────────────────
const FirstAidCard: React.FC<{ tip: typeof FIRST_AID_TIPS[0] }> = ({ tip }) => {
  const [expanded, setExpanded] = React.useState(false);
  const expandAnim = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    setExpanded((prev) => !prev);
    Animated.spring(expandAnim, {
      toValue: expanded ? 0 : 1,
      tension: 100,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const rotate = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.firstAidCard}>
      <TouchableOpacity style={styles.firstAidHeader} onPress={toggle} activeOpacity={0.8}>
        <View style={[styles.firstAidIconBg, { backgroundColor: `${tip.color}18` }]}>
          <MaterialCommunityIcons name={tip.icon as any} size={20} color={tip.color} />
        </View>
        <Text style={styles.firstAidTitle}>{tip.title}</Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="chevron-down" size={18} color={THEME.textSecondary} />
        </Animated.View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.firstAidSteps}>
          {tip.steps.map((step, idx) => (
            <View key={idx} style={styles.stepRow}>
              <View style={[styles.stepNumber, { backgroundColor: `${tip.color}18` }]}>
                <Text style={[styles.stepNumberText, { color: tip.color }]}>{idx + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

// ── Styles ──────────────────────────────────
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 0;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: STATUS_BAR_HEIGHT + 12,
    paddingBottom: 16,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerRight: { width: 36 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },

  // Hero Banner
  heroBannerWrapper: { marginBottom: 24 },
  heroBanner: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  mainEmergencyButton: {
    marginBottom: 16,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  mainEmergencyGradient: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainEmergencyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.emergency,
    marginBottom: 6,
  },
  mainEmergencySubtitle: {
    fontSize: 14,
    color: THEME.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Section
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.textPrimary,
    marginBottom: 12,
    marginTop: 4,
  },

  // Contacts Grid
  contactsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 24,
  },
  contactCard: {
    width: '30%',
    marginHorizontal: '1.65%',
    marginBottom: 12,
    backgroundColor: THEME.surface,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  contactIconBg: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  contactName: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.textPrimary,
    textAlign: 'center',
    marginBottom: 2,
  },
  contactNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.emergency,
    textAlign: 'center',
    marginBottom: 2,
  },
  contactDesc: {
    fontSize: 10,
    color: THEME.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  callChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 3,
  },
  callChipText: { fontSize: 11, fontWeight: '600' },

  // Notes
  notesCard: {
    backgroundColor: THEME.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 12,
  },
  noteRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  noteIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: THEME.emergencyLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: THEME.textSecondary,
    lineHeight: 18,
  },

  // First Aid
  firstAidCard: {
    backgroundColor: THEME.surface,
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  firstAidHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  firstAidIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  firstAidTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: THEME.textPrimary,
  },
  firstAidSteps: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    gap: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingTop: 6,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: THEME.textSecondary,
    lineHeight: 18,
  },
});

export default EmergencyScreen;
