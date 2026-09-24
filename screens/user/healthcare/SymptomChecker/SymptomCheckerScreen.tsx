import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { darkShift, type DarkShift } from '../../../../constants/darkShift';
import { useTheme } from '../../../../theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BackButton } from '../../../../components/ui';
import { useNavigation } from '@react-navigation/native';
import { HealthcareRouteNames } from '../../../../navigation-maps/Healthcare';
import { useBottomBarPadding } from '../../../../hooks/useBottomBarPadding';
import {
  chatSymptomCheckApi,
  type SymptomChatMessage,
  type SymptomChatReply,
} from '../../../../networks/healthcare/appointmentApi';

const C = {
  primary: '#2A7FFF',
  primaryDark: '#1857C0',
  primaryLight: '#EAF3FF',
  warn: '#F59E0B',
  warnBg: '#FEF3C7',
  bg: '#F7F9FC',
  surface: '#FFFFFF',
  border: '#E5EAF2',
  text: '#1A1A1A',
  textSec: '#64748B',
};

// Same convention as the healthcare home header ("Find Your Doctor"): a
// gradient hero with rounded bottom corners, padded for the status bar. RN's
// core SafeAreaView is a no-op on Android, so the header pads for the status
// bar itself instead of trusting a wrapper to do it.
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0;

const GREETING =
  "Hi, I'm your AI triage assistant. Tell me what's going on and I'll help figure out which kind of specialist to see — this is guidance only, never a diagnosis.";

// One chat bubble. `synthetic` greetings and error bubbles never leave the
// device — only real user/bot turns are sent back to the API as history.
interface Bubble {
  id: string;
  role: 'user' | 'bot';
  text: string;
  synthetic?: boolean;
  isError?: boolean;
  recommendation?: SymptomChatReply['recommendation'];
  disclaimer?: string;
}

let bubbleSeq = 0;
const nextId = () => `b${Date.now()}-${bubbleSeq++}`;

const SymptomCheckerScreen: React.FC = () => {
  const { mode } = useTheme();
  const sh = useMemo(() => darkShift(mode), [mode]);
  const styles = useMemo(() => makeStyles(sh), [sh]);
  const navigation = useNavigation<any>();
  const scrollRef = useRef<ScrollView>(null);
  // Same hook the booking screens use for a bar pinned near the bottom: RN's
  // core SafeAreaView applies no inset on Android, so without this the input
  // bar (and the keyboard sitting on top of it) ends up under the gesture-nav
  // bar instead of above it.
  const bottomPad = useBottomBarPadding(12);

  const [bubbles, setBubbles] = useState<Bubble[]>([
    { id: nextId(), role: 'bot', text: GREETING, synthetic: true },
  ]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const scrollToEnd = () => {
    // A frame late so the just-added bubble has actually laid out.
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;

    const userBubble: Bubble = { id: nextId(), role: 'user', text };
    const nextBubbles = [...bubbles, userBubble];
    setBubbles(nextBubbles);
    setDraft('');
    setSending(true);
    scrollToEnd();

    // The transcript the API sees: every real turn so far (never the static
    // greeting), oldest first, ending on this message.
    const transcript: SymptomChatMessage[] = nextBubbles
      .filter((b) => !b.synthetic && !b.isError)
      .map((b) => ({ role: b.role, text: b.text }));

    const res = await chatSymptomCheckApi(transcript);
    setSending(false);

    if (res.success && res.data) {
      setBubbles((prev) => [
        ...prev,
        {
          id: nextId(),
          role: 'bot',
          text: res.data.reply,
          recommendation: res.data.done ? res.data.recommendation : undefined,
          disclaimer: res.data.done ? res.data.disclaimer : undefined,
        },
      ]);
    } else {
      setBubbles((prev) => [
        ...prev,
        {
          id: nextId(),
          role: 'bot',
          isError: true,
          text: res.message || "Something went wrong on our end — please try that again.",
        },
      ]);
    }
    scrollToEnd();
  };

  const handleFindDoctor = (recommendation: NonNullable<SymptomChatReply['recommendation']>) => {
    navigation.navigate(HealthcareRouteNames.DoctorList, {
      specialtyId: recommendation.recommendedSpecialty.specialtyId || '',
      specialtyName: recommendation.recommendedSpecialty.name,
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} translucent />

      <LinearGradient
        colors={sh.grad(['#2A7FFF', '#1857C0'])}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <BackButton tone="onAccent" onPress={() => navigation.goBack()} />
          <View style={styles.headerTextGroup}>
            <Text style={styles.headerTitle}>Symptom Checker</Text>
            <Text style={styles.headerSubtitle}>Chat with your AI triage assistant</Text>
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={scrollToEnd}
        >
          <View style={styles.introCard}>
            <MaterialCommunityIcons name="stethoscope" size={22} color={C.primary} />
            <Text style={styles.introText}>
              This is guidance only — it is never a diagnosis. If this is an emergency, call your
              local emergency number.
            </Text>
          </View>

          {bubbles.map((b) => (
            <View
              key={b.id}
              style={[
                styles.bubbleRow,
                b.role === 'user' ? styles.bubbleRowUser : styles.bubbleRowBot,
              ]}
            >
              <View
                style={[
                  styles.bubble,
                  b.role === 'user' ? styles.bubbleUser : styles.bubbleBot,
                  b.isError && styles.bubbleError,
                ]}
              >
                <Text style={b.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextBot}>
                  {b.text}
                </Text>
              </View>

              {b.recommendation && (
                <View style={styles.recommendationWrap}>
                  {!!b.disclaimer && (
                    <View style={styles.disclaimerBox}>
                      <Ionicons name="warning-outline" size={16} color={C.warn} />
                      <Text style={styles.disclaimerText}>{b.disclaimer}</Text>
                    </View>
                  )}

                  {b.recommendation.conditions.map((condition, index) => (
                    <View key={index} style={styles.conditionCard}>
                      <View style={styles.conditionHeader}>
                        <Text style={styles.conditionName}>{condition.condition}</Text>
                        <Text style={styles.confidence}>{condition.confidence}%</Text>
                      </View>
                      <View style={styles.confidenceTrack}>
                        <View style={[styles.confidenceFill, { width: `${condition.confidence}%` }]} />
                      </View>
                    </View>
                  ))}

                  <View style={styles.recommendCard}>
                    <Text style={styles.recommendLabel}>Recommended specialist</Text>
                    <Text style={styles.recommendName}>
                      {b.recommendation.recommendedSpecialty.name}
                    </Text>
                    <TouchableOpacity
                      style={styles.findBtn}
                      onPress={() => handleFindDoctor(b.recommendation!)}
                    >
                      <Ionicons name="search" size={16} color="#FFF" />
                      <Text style={styles.findText}>
                        Find a {b.recommendation.recommendedSpecialty.name} doctor
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ))}

          {sending && (
            <View style={[styles.bubbleRow, styles.bubbleRowBot]}>
              <View style={[styles.bubble, styles.bubbleBot, styles.bubbleTyping]}>
                <ActivityIndicator size="small" color={C.primary} />
              </View>
            </View>
          )}
        </ScrollView>

        <View style={[styles.inputBar, { paddingBottom: bottomPad }]}>
          <TextInput
            style={styles.input}
            placeholder="Describe how you're feeling…"
            placeholderTextColor={C.textSec}
            value={draft}
            onChangeText={setDraft}
            multiline
            editable={!sending}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnDisabled]}
            disabled={!draft.trim() || sending}
            onPress={handleSend}
          >
            <Ionicons name="send" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const makeStyles = (sh: DarkShift) => StyleSheet.create({
  container: { flex: 1, backgroundColor: sh.n('#F7F9FC', 'bg') },
  flex: { flex: 1 },

  headerGradient: {
    paddingHorizontal: 20,
    paddingTop: STATUS_BAR_HEIGHT + 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTextGroup: { flex: 1 },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    marginBottom: 3,
  },
  headerSubtitle: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.75)' },

  scroll: { padding: 16, paddingBottom: 24 },
  introCard: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: sh.n(C.primaryLight, 'surfaceSunken'), borderRadius: 14, padding: 12, marginBottom: 14 },
  introText: { flex: 1, fontSize: 12, color: sh.n(C.text, 'ink'), lineHeight: 17 },

  bubbleRow: { marginBottom: 12, maxWidth: '88%' },
  bubbleRowUser: { alignSelf: 'flex-end' },
  bubbleRowBot: { alignSelf: 'flex-start' },
  bubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser: { backgroundColor: C.primary, borderBottomRightRadius: 4 },
  bubbleBot: { backgroundColor: sh.n(C.surface, 'surface'), borderWidth: 1, borderColor: sh.n(C.border, 'line'), borderBottomLeftRadius: 4 },
  bubbleError: { borderColor: sh.hue('#EF4444'), backgroundColor: sh.hue('#FEF2F2') },
  bubbleTyping: { paddingVertical: 12, paddingHorizontal: 16 },
  bubbleTextUser: { color: '#FFF', fontSize: 14, lineHeight: 20 },
  bubbleTextBot: { color: sh.n(C.text, 'ink'), fontSize: 14, lineHeight: 20 },

  recommendationWrap: { marginTop: 8, width: '100%' },
  disclaimerBox: { flexDirection: 'row', gap: 8, backgroundColor: sh.n(C.warnBg, 'surfaceSunken'), borderRadius: 12, padding: 12, marginBottom: 10, alignItems: 'flex-start' },
  disclaimerText: { flex: 1, fontSize: 12, color: sh.hue('#92400E'), lineHeight: 17 },
  conditionCard: { backgroundColor: sh.n(C.surface, 'surface'), borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: sh.n(C.border, 'line') },
  conditionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  conditionName: { fontSize: 13, fontWeight: '600', color: sh.n(C.text, 'ink'), flex: 1, marginRight: 8 },
  confidence: { fontSize: 13, fontWeight: '800', color: C.primary },
  confidenceTrack: { height: 6, borderRadius: 3, backgroundColor: sh.n(C.border, 'line'), overflow: 'hidden' },
  confidenceFill: { height: 6, borderRadius: 3, backgroundColor: C.primary },
  recommendCard: { backgroundColor: sh.n(C.surface, 'surface'), borderRadius: 14, padding: 16, marginTop: 4, borderWidth: 1, borderColor: C.primary, alignItems: 'center' },
  recommendLabel: { fontSize: 12, color: sh.n(C.textSec, 'inkMuted') },
  recommendName: { fontSize: 17, fontWeight: '800', color: sh.n(C.text, 'ink'), marginVertical: 6 },
  findBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 11, marginTop: 6 },
  findText: { color: '#FFF', fontWeight: '700', fontSize: 13 },

  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 12, paddingTop: 12, backgroundColor: sh.n(C.surface, 'surface'), borderTopWidth: 1, borderTopColor: sh.n(C.border, 'line') },
  input: { flex: 1, maxHeight: 100, backgroundColor: sh.n(C.bg, 'surfaceSunken'), borderWidth: 1, borderColor: sh.n(C.border, 'line'), borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: sh.n(C.text, 'ink') },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
});

export default SymptomCheckerScreen;
