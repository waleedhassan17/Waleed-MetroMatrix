import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ActionSheet from '../../../../components/ui/ActionSheet';
import {
  AppBar,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Screen,
  SkeletonCard,
  TextField,
  showToast,
} from '../../../../components/ui';
import { E, GUTTER, S, SECTION, T } from '../../../../constants/theme';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import { useUnsavedChangesGuard } from '../../../../hooks/useUnsavedChangesGuard';
import { DoctorRouteNames } from '../../../../navigation-maps/Healthcare';
import { ThemeColors, useTheme } from '../../../../theme';
import { formatDateLabel } from '../../../../utils/healthcare/doctorFormat';
import { dateKeyOf, todayDateKey } from '../../../../utils/healthcare/timeRanges';
import { clearNotes, deleteNote, fetchPatientNotes, MedicalNote, saveNote } from './medicalNotesSlice';

// ============================================================================
// Consultation notes — the doctor's private notes about a patient.
//
// The editor asked "discard changes?" only from its own close button, so
// Android back and the iOS swipe silently threw a half-written note away. New
// notes were also saved without the patient they belong to, which the server
// rejects. The attach button reported uploads that never happened.
// ============================================================================

interface Draft {
  noteId: string;
  appointmentId: string;
  title: string;
  content: string;
  tags: string[];
}

const toDraft = (note: MedicalNote): Draft => ({
  noteId: note.noteId,
  appointmentId: note.appointmentId,
  title: note.title,
  content: note.content,
  tags: [...note.tags],
});

const ConsultationNotesScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();

  const patientId: string = route.params?.patientId;
  const appointmentId: string = route.params?.appointmentId || '';
  const patientName: string | undefined = route.params?.patientName;

  const { patient, notes, loading, saving, error } = useAppSelector((s) => s.medicalNotes);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [original, setOriginal] = useState<Draft | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [menuFor, setMenuFor] = useState<MedicalNote | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MedicalNote | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const load = useCallback(() => {
    if (patientId) dispatch(fetchPatientNotes(patientId));
  }, [dispatch, patientId]);

  useEffect(() => {
    load();
    return () => {
      dispatch(clearNotes());
    };
  }, [dispatch, load]);

  const dirty = !!draft && !!original && JSON.stringify(draft) !== JSON.stringify(original);
  // Leaving the SCREEN with an open, edited note.
  const { sheet, allowLeave } = useUnsavedChangesGuard(dirty, { message: 'This note has changes that have not been saved.' });

  const closeEditor = useCallback(() => {
    setDraft(null);
    setOriginal(null);
    setTagInput('');
    setSubmitted(false);
  }, []);

  const requestCloseEditor = useCallback(() => {
    if (dirty) setConfirmDiscard(true);
    else closeEditor();
  }, [dirty, closeEditor]);

  // Android back closes the editor first, not the screen.
  useFocusEffect(
    useCallback(() => {
      if (!draft) return undefined;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        requestCloseEditor();
        return true;
      });
      return () => sub.remove();
    }, [draft, requestCloseEditor])
  );

  const startNew = () => {
    const fresh: Draft = { noteId: '', appointmentId, title: '', content: '', tags: [] };
    setDraft(fresh);
    setOriginal(fresh);
  };

  const startEdit = (note: MedicalNote) => {
    setDraft(toDraft(note));
    setOriginal(toDraft(note));
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (!draft || !tag) return;
    if (!draft.tags.includes(tag)) setDraft({ ...draft, tags: [...draft.tags, tag] });
    setTagInput('');
  };

  const contentError = submitted && draft && !draft.content.trim() ? 'Write the note before saving' : null;

  const save = async () => {
    if (!draft) return;
    setSubmitted(true);
    if (!draft.content.trim()) return;
    const existing = notes.find((n) => n.noteId === draft.noteId);
    const note = {
      noteId: draft.noteId,
      appointmentId: draft.appointmentId,
      date: existing?.date || todayDateKey(),
      title: draft.title.trim() || 'Consultation note',
      content: draft.content.trim(),
      attachments: existing?.attachments || [],
      tags: draft.tags,
      createdAt: existing?.createdAt || '',
      updatedAt: existing?.updatedAt || '',
      // The server files a note under its patient; without this it refuses.
      patientId,
    } as MedicalNote & { patientId: string };
    try {
      await dispatch(saveNote(note)).unwrap();
      allowLeave();
      closeEditor();
      showToast({ message: 'Note saved', tone: 'success' });
    } catch (e) {
      showToast({ message: typeof e === 'string' ? e : "We couldn't save this note", tone: 'error' });
    }
  };

  const remove = async (note: MedicalNote) => {
    try {
      await dispatch(deleteNote(note.noteId)).unwrap();
      showToast({ message: 'Note deleted', tone: 'success' });
    } catch (e) {
      showToast({ message: typeof e === 'string' ? e : "We couldn't delete this note", tone: 'error' });
    }
  };

  const name = patient?.patientName || patientName || 'Patient';

  // ── Editor ──
  if (draft) {
    return (
      <Screen>
        <AppBar title={draft.noteId ? 'Edit note' : 'New note'} subtitle={name} onBack={requestCloseEditor} />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TextField
            label="Title"
            value={draft.title}
            onChangeText={(title) => setDraft({ ...draft, title })}
            placeholder="Consultation note"
            maxLength={120}
          />
          <TextField
            label="Note"
            value={draft.content}
            onChangeText={(content) => setDraft({ ...draft, content })}
            placeholder="Findings, assessment, plan"
            multiline
            maxLength={5000}
            error={contentError}
            inputStyle={styles.noteInput}
          />
          <Text style={styles.label}>Tags</Text>
          <View style={styles.tags}>
            {draft.tags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                icon="close"
                selected
                onPress={() => setDraft({ ...draft, tags: draft.tags.filter((t) => t !== tag) })}
                style={styles.chip}
              />
            ))}
          </View>
          <TextField
            value={tagInput}
            onChangeText={setTagInput}
            placeholder="Add a tag, e.g. follow-up"
            returnKeyType="done"
            onSubmitEditing={addTag}
            maxLength={40}
            right={
              tagInput.trim() ? (
                <TouchableOpacity onPress={addTag} accessibilityRole="button" accessibilityLabel="Add tag">
                  <Ionicons name="add-circle" size={22} color={colors.accentDeep} />
                </TouchableOpacity>
              ) : undefined
            }
          />
          <Text style={styles.caption}>File attachments aren't available yet.</Text>
          <View style={styles.bottomSpace} />
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: insets.bottom + S.md }]}>
          <Button label="Save note" onPress={save} loading={saving} disabled={!dirty && !!draft.noteId} />
        </View>
        <ActionSheet
          visible={confirmDiscard}
          title="Discard changes?"
          message="This note has changes that have not been saved."
          cancelLabel="Keep editing"
          options={[{ label: 'Discard changes', icon: 'trash-outline', tone: 'destructive', onPress: closeEditor }]}
          onClose={() => setConfirmDiscard(false)}
        />
        {sheet}
      </Screen>
    );
  }

  // ── List ──
  return (
    <Screen>
      <AppBar title="Consultation notes" subtitle={name} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading && !!patient} onRefresh={load} tintColor={colors.accent} colors={[colors.accent]} />
        }
      >
        <View style={styles.actions}>
          <Button label="New note" icon="add" onPress={startNew} fullWidth={false} style={styles.flex} />
          {!!appointmentId && (
            <Button
              label="Prescription"
              icon="create-outline"
              variant="secondary"
              fullWidth={false}
              onPress={() =>
                navigation.navigate(DoctorRouteNames.PrescriptionWriter, {
                  patientId,
                  patientName: name,
                  appointmentId,
                  type: route.params?.type === 'video' ? 'video' : 'in-clinic',
                })
              }
              style={styles.secondaryAction}
            />
          )}
        </View>

        {!patient && loading ? (
          <SkeletonCard lines={3} />
        ) : error && !patient ? (
          <ErrorState message={error} onRetry={load} />
        ) : notes.length === 0 ? (
          <Card style={styles.section}>
            <EmptyState icon="clipboard-outline" title="No notes yet" message="Notes are private to you and visible only on this app." />
          </Card>
        ) : (
          notes.map((note) => (
            <Card key={note.noteId} style={styles.section} onPress={() => startEdit(note)}>
              <View style={styles.noteHeader}>
                <View style={styles.flex}>
                  <Text style={styles.strong} numberOfLines={1}>
                    {note.title || 'Consultation note'}
                  </Text>
                  <Text style={styles.caption}>
                    {formatDateLabel(
                      note.createdAt ? dateKeyOf(new Date(note.createdAt)) : note.date || todayDateKey(),
                      { weekday: false, year: true }
                    )}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setMenuFor(note)}
                  style={styles.iconButton}
                  accessibilityRole="button"
                  accessibilityLabel="Note options"
                >
                  <Ionicons name="ellipsis-horizontal" size={20} color={colors.inkMuted} />
                </TouchableOpacity>
              </View>
              {!!note.content && (
                <Text style={styles.body} numberOfLines={4}>
                  {note.content}
                </Text>
              )}
              {note.tags.length > 0 && (
                <View style={styles.tags}>
                  {note.tags.map((tag) => (
                    <Chip key={tag} label={tag} style={styles.chip} />
                  ))}
                </View>
              )}
            </Card>
          ))
        )}
        <View style={styles.bottomSpace} />
      </ScrollView>

      <ActionSheet
        visible={!!menuFor}
        title={menuFor?.title || 'Consultation note'}
        options={
          menuFor
            ? [
                { label: 'Edit', icon: 'create-outline', onPress: () => startEdit(menuFor) },
                { label: 'Delete', icon: 'trash-outline', tone: 'destructive', onPress: () => setConfirmDelete(menuFor) },
              ]
            : []
        }
        onClose={() => setMenuFor(null)}
      />
      <ActionSheet
        visible={!!confirmDelete}
        title="Delete this note?"
        message="It can't be recovered."
        options={[
          {
            label: 'Delete note',
            icon: 'trash-outline',
            tone: 'destructive',
            onPress: () => confirmDelete && remove(confirmDelete),
          },
        ]}
        onClose={() => setConfirmDelete(null)}
      />
      {sheet}
    </Screen>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    content: { paddingHorizontal: GUTTER, paddingTop: S.lg },
    section: { marginTop: S.md },
    actions: { flexDirection: 'row', marginBottom: S.sm },
    secondaryAction: { marginLeft: S.sm },
    label: { ...T.label, color: c.inkMuted, marginBottom: S.sm },
    caption: { ...T.caption, color: c.inkMuted, marginTop: 2 },
    body: { ...T.body, color: c.ink, marginTop: S.sm },
    strong: { ...T.bodyStrong, color: c.ink },
    noteInput: { minHeight: 200 },
    tags: { flexDirection: 'row', flexWrap: 'wrap', marginTop: S.sm },
    chip: { marginRight: S.sm, marginBottom: S.sm },
    noteHeader: { flexDirection: 'row', alignItems: 'center' },
    iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    footer: {
      paddingHorizontal: GUTTER,
      paddingTop: S.md,
      backgroundColor: c.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.line,
      ...E.overlay,
    },
    bottomSpace: { height: SECTION * 2 },
  });

export default ConsultationNotesScreen;
