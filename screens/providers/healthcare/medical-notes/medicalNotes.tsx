import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { DoctorRouteNames } from '../../../../navigation-maps/Healthcare';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { Typography } from '../../../../constants/Fonts';
import {
  fetchPatientNotes,
  saveNote,
  deleteNote,
  attachFile,
  setCurrentNote,
  updateCurrentNoteContent,
  updateCurrentNoteTitle,
  addTagToCurrentNote,
  removeTagFromCurrentNote,
  removeAttachmentFromCurrentNote,
  createNewNote,
  clearNotes,
  MedicalNote,
  NoteAttachment,
} from './medicalNotesSlice';

// ── Theme ─────────────────────────────────────
import { DOCTOR_THEME as THEME } from '../../../../constants/DoctorTheme';

// ── Helpers ───────────────────────────────────

const formatDate = (iso: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

// Note card accent colors cycling through gradient themes
const NOTE_ACCENTS: [string, string][] = [
  THEME.gradient.primary,
  THEME.gradient.secondary,
  THEME.gradient.success,
  THEME.gradient.warm,
];

// ── Note Card ─────────────────────────────────

const NoteCard: React.FC<{
  note: MedicalNote;
  index: number;
  onPress: () => void;
  onDelete: () => void;
}> = ({ note, index, onPress, onDelete }) => {
  const gradient = NOTE_ACCENTS[index % NOTE_ACCENTS.length];
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      delay: index * 60,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
      }}
    >
      <TouchableOpacity style={styles.noteCard} onPress={onPress} activeOpacity={0.8}>
        {/* Left gradient stripe */}
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.noteStripe}
        />

        <View style={styles.noteCardBody}>
          {/* Header */}
          <View style={styles.noteCardHeader}>
            <View style={styles.noteDateChip}>
              <Ionicons name="calendar-outline" size={12} color={gradient[0]} />
              <Text style={[styles.noteDateText, { color: gradient[0] }]}>
                {formatDate(note.date)}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.noteDeleteBtn}
              onPress={onDelete}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={16} color={THEME.error} />
            </TouchableOpacity>
          </View>

          {/* Title */}
          <Text style={styles.noteCardTitle} numberOfLines={1}>
            {note.title || 'Untitled Note'}
          </Text>

          {/* Preview */}
          <Text style={styles.noteCardPreview} numberOfLines={2}>
            {note.content || 'No content yet…'}
          </Text>

          {/* Footer */}
          {(note.tags.length > 0 || note.attachments.length > 0) && (
            <View style={styles.noteCardFooter}>
              <View style={styles.noteTagsRow}>
                {note.tags.slice(0, 3).map((tag) => (
                  <View key={tag} style={[styles.miniTag, { backgroundColor: `${gradient[0]}15` }]}>
                    <Text style={[styles.miniTagText, { color: gradient[0] }]}>{tag}</Text>
                  </View>
                ))}
                {note.tags.length > 3 && (
                  <Text style={styles.moreTagsText}>+{note.tags.length - 3}</Text>
                )}
              </View>
              {note.attachments.length > 0 && (
                <View style={styles.attachCountChip}>
                  <Ionicons name="attach" size={11} color="#64748B" />
                  <Text style={styles.attachCountText}>{note.attachments.length}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ── Main Component ────────────────────────────

const MedicalNotesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const routePatientId: string | undefined = route.params?.patientId;
  const routeAppointmentId: string | undefined = route.params?.appointmentId;
  const { patient, notes, currentNote, saving, loading, error } = useAppSelector(
    (s) => s.medicalNotes,
  );

  const [tagInput, setTagInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const listFadeAnim = useRef(new Animated.Value(0)).current;
  const listSlideAnim = useRef(new Animated.Value(16)).current;
  const editorFadeAnim = useRef(new Animated.Value(0)).current;
  const editorSlideAnim = useRef(new Animated.Value(20)).current;
  const recordingPulse = useRef(new Animated.Value(1)).current;

  const hasAnimated = useRef(false);

  useEffect(() => {
    if (routePatientId) {
      dispatch(fetchPatientNotes(routePatientId));
    }
    return () => { dispatch(clearNotes()); };
  }, [dispatch, routePatientId]);

  useEffect(() => {
    if (!loading && !hasAnimated.current) {
      hasAnimated.current = true;
      listFadeAnim.setValue(0);
      listSlideAnim.setValue(16);
      Animated.parallel([
        Animated.timing(listFadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(listSlideAnim, { toValue: 0, tension: 80, friction: 9, useNativeDriver: true }),
      ]).start();
    }
  }, [loading]);

  // Editor enter animation
  useEffect(() => {
    if (currentNote) {
      editorFadeAnim.setValue(0);
      editorSlideAnim.setValue(20);
      Animated.parallel([
        Animated.timing(editorFadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(editorSlideAnim, { toValue: 0, tension: 80, friction: 9, useNativeDriver: true }),
      ]).start();
    }
  }, [!!currentNote]);

  // Recording pulse
  useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(recordingPulse, { toValue: 1.25, duration: 500, useNativeDriver: true }),
          Animated.timing(recordingPulse, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isRecording]);

  // ── Handlers ────────────────────────────────

  const handleNewNote = useCallback(() => dispatch(createNewNote()), [dispatch]);

  const handleSelectNote = useCallback(
    (note: MedicalNote) => dispatch(setCurrentNote({ ...note })),
    [dispatch],
  );

  const handleDeleteNote = useCallback(
    (noteId: string) => {
      Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => dispatch(deleteNote(noteId)) },
      ]);
    },
    [dispatch],
  );

  const handleSaveNote = useCallback(() => {
    if (!currentNote) return;
    if (!currentNote.title.trim()) {
      Alert.alert('Required', 'Please enter a note title');
      return;
    }
    if (!currentNote.content.trim()) {
      Alert.alert('Required', 'Please enter note content');
      return;
    }
    dispatch(saveNote(currentNote));
  }, [currentNote, dispatch]);

  const handleAddTag = useCallback(() => {
    if (tagInput.trim()) {
      dispatch(addTagToCurrentNote(tagInput.trim()));
      setTagInput('');
    }
  }, [tagInput, dispatch]);

  const handleAttachFile = useCallback(() => {
    const dummy: NoteAttachment = {
      id: `att-${Date.now()}`,
      name: `Document_${Date.now()}.pdf`,
      type: 'file',
      uri: '',
      size: 156000,
    };
    if (currentNote) dispatch(attachFile({ noteId: currentNote.noteId, attachment: dummy }));
  }, [currentNote, dispatch]);

  const handleAttachImage = useCallback(() => {
    const dummy: NoteAttachment = {
      id: `att-${Date.now()}`,
      name: `Photo_${Date.now()}.jpg`,
      type: 'image',
      uri: '',
      size: 480000,
    };
    if (currentNote) dispatch(attachFile({ noteId: currentNote.noteId, attachment: dummy }));
  }, [currentNote, dispatch]);

  const handleVoiceToText = useCallback(() => {
    setIsRecording((prev) => !prev);
    if (isRecording && currentNote) {
      dispatch(
        updateCurrentNoteContent(
          currentNote.content +
            (currentNote.content ? '\n\n' : '') +
            'Patient reports feeling better overall. Headaches reduced in frequency. Blood pressure readings at home averaging 128/82.',
        ),
      );
    }
  }, [isRecording, currentNote, dispatch]);

  const handleCloseEditor = useCallback(() => {
    if (currentNote && (currentNote.title.trim() || currentNote.content.trim())) {
      Alert.alert('Discard Changes?', 'You have unsaved changes. Discard them?', [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => dispatch(setCurrentNote(null)) },
      ]);
    } else {
      dispatch(setCurrentNote(null));
    }
  }, [currentNote, dispatch]);

  const handleConvertToPrescription = useCallback(() => {
    if (!currentNote) return;
    navigation.navigate(DoctorRouteNames.PrescriptionWriter, {
      patient,
      patientId: routePatientId,
      appointmentId: routeAppointmentId,
      notes: currentNote.content,
    });
  }, [currentNote, patient, routePatientId, routeAppointmentId, navigation]);

  // ── Loading ───────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBarPlaceholder />
        <LinearGradient colors={THEME.gradient.primary} style={styles.headerGradient}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Medical Notes</Text>
          <View style={styles.headerIconBtn} />
        </LinearGradient>
        <View style={styles.centered}>
          <View style={styles.loadingIconWrap}>
            <ActivityIndicator size="large" color={THEME.primary} />
          </View>
          <Text style={styles.loadingText}>Loading patient notes…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Note Editor ───────────────────────────────

  if (currentNote) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBarPlaceholder light />
        <LinearGradient
          colors={THEME.gradient.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.editorHeader}
        >
          <TouchableOpacity style={styles.headerIconBtn} onPress={handleCloseEditor}>
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>
              {currentNote.noteId ? 'Edit Note' : 'New Note'}
            </Text>
            <Text style={styles.headerSubtitle}>{formatDate(currentNote.date)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.saveHeaderBtn, saving && { opacity: 0.6 }]}
            onPress={handleSaveNote}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                <Text style={styles.saveHeaderBtnText}>Save</Text>
              </>
            )}
          </TouchableOpacity>
        </LinearGradient>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Animated.ScrollView
            style={[styles.flex, { opacity: editorFadeAnim, transform: [{ translateY: editorSlideAnim }] }]}
            contentContainerStyle={styles.editorScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Title */}
            <TextInput
              style={styles.titleInput}
              placeholder="Note title…"
              placeholderTextColor="#CBD5E1"
              value={currentNote.title}
              onChangeText={(t) => dispatch(updateCurrentNoteTitle(t))}
            />

            {/* ── Editor Toolbar ── */}
            <View style={styles.toolbarCard}>
              <View style={styles.toolbarRow}>
                <TouchableOpacity style={styles.toolbarBtn}>
                  <Ionicons name="text" size={17} color="#64748B" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolbarBtn}>
                  <Ionicons name="list" size={17} color="#64748B" />
                </TouchableOpacity>

                {/* Mic button */}
                <TouchableOpacity
                  style={[styles.toolbarBtn, isRecording && styles.toolbarBtnRecording]}
                  onPress={handleVoiceToText}
                >
                  <Animated.View style={isRecording ? { transform: [{ scale: recordingPulse }] } : undefined}>
                    <Ionicons
                      name={isRecording ? 'mic' : 'mic-outline'}
                      size={17}
                      color={isRecording ? '#FFFFFF' : '#64748B'}
                    />
                  </Animated.View>
                </TouchableOpacity>

                <View style={styles.toolbarDivider} />

                <TouchableOpacity style={styles.toolbarBtn} onPress={handleAttachImage}>
                  <Ionicons name="image-outline" size={17} color="#64748B" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolbarBtn} onPress={handleAttachFile}>
                  <Ionicons name="attach" size={17} color="#64748B" />
                </TouchableOpacity>

                <View style={styles.toolbarDivider} />

                <TouchableOpacity style={styles.toolbarBtn} onPress={handleConvertToPrescription}>
                  <MaterialCommunityIcons name="prescription" size={17} color={THEME.primary} />
                </TouchableOpacity>
              </View>

              {/* Recording banner */}
              {isRecording && (
                <View style={styles.recordingBanner}>
                  <Animated.View
                    style={[styles.recordingDot, { transform: [{ scale: recordingPulse }] }]}
                  />
                  <Text style={styles.recordingText}>Recording… Tap mic to stop & transcribe</Text>
                </View>
              )}
            </View>

            {/* Note text area */}
            <TextInput
              style={styles.noteTextArea}
              placeholder="Start writing your consultation notes here…"
              placeholderTextColor="#CBD5E1"
              multiline
              textAlignVertical="top"
              value={currentNote.content}
              onChangeText={(t) => dispatch(updateCurrentNoteContent(t))}
            />

            {/* ── Attachments ── */}
            {currentNote.attachments.length > 0 && (
              <View style={styles.editorSection}>
                <View style={styles.editorSectionHeader}>
                  <View style={[styles.editorSectionDot, { backgroundColor: THEME.accent }]} />
                  <Text style={styles.editorSectionTitle}>
                    Attachments
                  </Text>
                  <View style={styles.editorSectionBadge}>
                    <Text style={styles.editorSectionBadgeText}>{currentNote.attachments.length}</Text>
                  </View>
                </View>
                {currentNote.attachments.map((att) => (
                  <View key={att.id} style={styles.attachmentRow}>
                    <View style={[
                      styles.attachmentIconWrap,
                      { backgroundColor: att.type === 'image' ? '#F0F7FF' : '#FEF2F2' },
                    ]}>
                      {att.type === 'image' ? (
                        <Ionicons name="image" size={18} color={THEME.primary} />
                      ) : (
                        <MaterialCommunityIcons name="file-pdf-box" size={20} color={THEME.error} />
                      )}
                    </View>
                    <View style={styles.attachmentInfo}>
                      <Text style={styles.attachmentName} numberOfLines={1}>{att.name}</Text>
                      <Text style={styles.attachmentSize}>{formatFileSize(att.size)}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.attachmentRemoveBtn}
                      onPress={() => dispatch(removeAttachmentFromCurrentNote(att.id))}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* ── Tags ── */}
            <View style={styles.editorSection}>
              <View style={styles.editorSectionHeader}>
                <View style={[styles.editorSectionDot, { backgroundColor: THEME.warning }]} />
                <Text style={styles.editorSectionTitle}>Tags</Text>
              </View>
              <View style={styles.tagInputRow}>
                <View style={styles.tagInputWrapper}>
                  <Ionicons name="pricetag-outline" size={15} color={THEME.primary} />
                  <TextInput
                    style={styles.tagTextInput}
                    placeholder="Add tag…"
                    placeholderTextColor="#CBD5E1"
                    value={tagInput}
                    onChangeText={setTagInput}
                    onSubmitEditing={handleAddTag}
                    returnKeyType="done"
                  />
                </View>
                <TouchableOpacity style={styles.tagAddBtn} onPress={handleAddTag} activeOpacity={0.85}>
                  <LinearGradient
                    colors={THEME.gradient.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.tagAddBtnGradient}
                  >
                    <Ionicons name="add" size={18} color="#FFFFFF" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
              {currentNote.tags.length > 0 && (
                <View style={styles.tagsWrap}>
                  {currentNote.tags.map((tag) => (
                    <View key={tag} style={styles.tagChip}>
                      <Text style={styles.tagChipText}>{tag}</Text>
                      <TouchableOpacity
                        onPress={() => dispatch(removeTagFromCurrentNote(tag))}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons name="close-circle" size={14} color={THEME.primary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Error */}
            {error && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={15} color={THEME.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={{ height: 48 }} />
          </Animated.ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Notes List ────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <StatusBarPlaceholder light />

      {/* ── Gradient Header ── */}
      <LinearGradient
        colors={THEME.gradient.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerNav}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Medical Notes</Text>
            <Text style={styles.headerSubtitle}>{notes.length} note{notes.length !== 1 ? 's' : ''}</Text>
          </View>
          <TouchableOpacity style={styles.newNoteBtn} onPress={handleNewNote} activeOpacity={0.85}>
            <Ionicons name="add" size={20} color={THEME.primary} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <Animated.ScrollView
        style={[styles.flex, { opacity: listFadeAnim, transform: [{ translateY: listSlideAnim }] }]}
        contentContainerStyle={styles.listScrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Patient Card ── */}
        {patient && (
          <View style={styles.patientCard}>
            <View style={styles.patientRow}>
              <LinearGradient colors={THEME.gradient.primary} style={styles.patientAvatar}>
                <MaterialCommunityIcons name="account" size={24} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.patientInfo}>
                <Text style={styles.patientName}>{patient.patientName}</Text>
                <Text style={styles.patientMeta}>
                  {patient.age} yrs  ·  {patient.gender}  ·  {patient.bloodGroup}
                </Text>
              </View>
              <View style={styles.patientBadge}>
                <Text style={styles.patientBadgeText}>Active</Text>
              </View>
            </View>

            {/* Allergy / Chronic row */}
            {(patient.allergies.length > 0 || patient.chronicConditions.length > 0) && (
              <View style={styles.patientAlerts}>
                {patient.allergies.length > 0 && (
                  <View style={styles.alertChip}>
                    <Ionicons name="warning" size={12} color={THEME.error} />
                    <Text style={[styles.alertChipText, { color: THEME.error }]}>
                      {patient.allergies.join(', ')}
                    </Text>
                  </View>
                )}
                {patient.chronicConditions.length > 0 && (
                  <View style={[styles.alertChip, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                    <Ionicons name="fitness-outline" size={12} color={THEME.warning} />
                    <Text style={[styles.alertChipText, { color: THEME.warning }]}>
                      {patient.chronicConditions.join(', ')}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* ── Notes Section Header ── */}
        <View style={styles.notesSectionHeader}>
          <View style={styles.notesSectionDot} />
          <Text style={styles.notesSectionTitle}>Consultation Notes</Text>
          {notes.length > 0 && (
            <View style={styles.notesCountBadge}>
              <Text style={styles.notesCountText}>{notes.length}</Text>
            </View>
          )}
        </View>

        {/* ── Notes ── */}
        {notes.length === 0 ? (
          <View style={styles.emptyCard}>
            <LinearGradient colors={['#F0F7FF', '#D6E8FF']} style={styles.emptyIconWrap}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={36} color={THEME.primary} />
            </LinearGradient>
            <Text style={styles.emptyTitle}>No Notes Yet</Text>
            <Text style={styles.emptySubtitle}>Tap the + button to create a new consultation note</Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={handleNewNote} activeOpacity={0.85}>
              <LinearGradient
                colors={THEME.gradient.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.emptyAddBtnGradient}
              >
                <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.emptyAddBtnText}>New Note</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.notesList}>
            {notes.map((note, i) => (
              <NoteCard
                key={note.noteId}
                note={note}
                index={i}
                onPress={() => handleSelectNote(note)}
                onDelete={() => handleDeleteNote(note.noteId)}
              />
            ))}
          </View>
        )}

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={15} color={THEME.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

// ── StatusBar placeholder (avoids importing StatusBar just for barStyle) ──

const StatusBarPlaceholder: React.FC<{ light?: boolean }> = ({ light = false }) => {
  const { StatusBar } = require('react-native');
  return <StatusBar barStyle={light ? 'light-content' : 'dark-content'} backgroundColor={light ? THEME.primary : '#F8FBFF'} />;
};

export default MedicalNotesScreen;

// ── Styles ─────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FBFF',
  },
  flex: { flex: 1 },

  // Loading
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },

  // Header (list)
  headerGradient: {
    paddingTop: Platform.OS === 'android' ? 24 : 0,
    paddingBottom: 14,
  },
  headerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
    marginTop: 1,
  },
  newNoteBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6 },
      android: { elevation: 3 },
    }),
  },

  // Editor header
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingTop: Platform.OS === 'android' ? 34 : 14,
  },
  saveHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 64,
    justifyContent: 'center',
  },
  saveHeaderBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Scroll content
  listScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  editorScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Patient card
  patientCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12 },
      android: { elevation: 3 },
    }),
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  patientAvatar: {
    width: 52,
    height: 52,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientInfo: { flex: 1 },
  patientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  patientMeta: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 3,
  },
  patientBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  patientBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
  patientAlerts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  alertChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  alertChipText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Notes section
  notesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  notesSectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.primary,
  },
  notesSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
    flex: 1,
  },
  notesCountBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: THEME.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notesCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.primary,
  },

  // Note cards
  notesList: {
    gap: 10,
  },
  noteCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },
  noteStripe: {
    width: 5,
    alignSelf: 'stretch',
  },
  noteCardBody: {
    flex: 1,
    padding: 14,
  },
  noteCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  noteDateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  noteDateText: {
    fontSize: 11,
    fontWeight: '700',
  },
  noteDeleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 5,
  },
  noteCardPreview: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    lineHeight: 18,
  },
  noteCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  noteTagsRow: {
    flexDirection: 'row',
    gap: 5,
    flex: 1,
    alignItems: 'center',
  },
  miniTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  miniTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  moreTagsText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  attachCountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F8FBFF',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  attachCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },

  // Empty
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 36,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#374151',
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyAddBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 6,
  },
  emptyAddBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyAddBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── Editor styles ─────────────────────────────

  // Title
  titleInput: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
    paddingVertical: 4,
    borderBottomWidth: 2,
    borderBottomColor: '#E2E8F0',
    marginBottom: 16,
  },

  // Toolbar
  toolbarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 2,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 2,
  },
  toolbarBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarBtnRecording: {
    backgroundColor: THEME.error,
  },
  toolbarDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 4,
  },
  recordingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#FECACA',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.error,
  },
  recordingText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.error,
  },

  // Note textarea
  noteTextArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderTopWidth: 0,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '400',
    color: '#0F172A',
    minHeight: 220,
    textAlignVertical: 'top',
    marginBottom: 20,
    lineHeight: 22,
  },

  // Editor sections
  editorSection: {
    marginBottom: 20,
  },
  editorSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  editorSectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  editorSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    flex: 1,
  },
  editorSectionBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EAF3FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editorSectionBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.accent,
  },

  // Attachments
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FBFF',
    borderRadius: 13,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 12,
  },
  attachmentIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentInfo: { flex: 1 },
  attachmentName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  attachmentSize: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 2,
  },
  attachmentRemoveBtn: {
    padding: 2,
  },

  // Tags
  tagInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  tagInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FBFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    gap: 8,
  },
  tagTextInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    paddingVertical: 11,
  },
  tagAddBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  tagAddBtnGradient: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: THEME.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.primary,
  },

  // Error
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.error,
    flex: 1,
  },
});