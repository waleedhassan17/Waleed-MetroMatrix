// ============================================================================
// Raise a dispute — reason, description and photo evidence against a booking.
//
// Someone reaching this screen has already had a bad experience, so the tone
// matters more here than anywhere: plain, unhurried, no exclamation marks, and
// a clear statement of what happens next. The four native alerts (permission,
// missing reason, failure, success) become inline validation and a real
// confirmation state.
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import React, { useState, useMemo } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { AppBar, Button, EmptyState, Screen, SectionHeader } from '../../../../components/ui';
import { HS } from '../../../../constants/HomeServiceTheme';
import { C, GUTTER, PROSE_WIDTH, R, S, SECTION, T } from '../../../../constants/theme';
import { ThemeColors, useTheme } from '../../../../theme';
import { raiseDispute } from '../../../../networks/serviceProviders/adminHomeServiceApi';

type Params = { bookingId: string };

const REASONS = [
  'Work not completed',
  'Poor quality of work',
  'Overcharged',
  'Provider behaviour',
  'Damage to property',
  'Other',
];

const MAX_PHOTOS = 4;

export default function RaiseDisputeScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: Params }, 'params'>>();
  const { bookingId } = route.params || ({} as Params);

  const [reason, setReason] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filed, setFiled] = useState(false);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('We need access to your photos to attach evidence.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setError(null);
      setPhotos((prev) => [...prev, result.assets[0].uri].slice(0, MAX_PHOTOS));
    }
  };

  const submit = async () => {
    if (!reason) return;
    setSubmitting(true);
    setError(null);
    const res = await raiseDispute(bookingId, {
      reason,
      description: description.trim(),
      evidence: photos,
    });
    setSubmitting(false);
    if (res.success) setFiled(true);
    else setError(res.message || "We couldn't file this dispute. Try again in a moment.");
  };

  if (filed) {
    return (
      <Screen>
        <AppBar title="Raise a dispute" hideBack />
        <EmptyState
          icon="checkmark-circle-outline"
          title="Dispute filed"
          message="Someone on the team will look into it and message you here with what they find. Nothing else is needed from you right now."
          actionLabel="Done"
          onAction={() => navigation.goBack()}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppBar title="Raise a dispute" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionHeader title="What went wrong?" />
        <View style={styles.reasons}>
          {REASONS.map((r) => {
            const selected = reason === r;
            return (
              <TouchableOpacity
                key={r}
                style={[styles.reason, selected && styles.reasonSelected]}
                onPress={() => setReason(r)}
                activeOpacity={0.75}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.reasonText, selected && styles.reasonTextSelected]}>{r}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <SectionHeader title="What happened?" subtitle="Optional, but it helps" style={styles.section} />
        <TextInput
          style={styles.textArea}
          placeholder="Dates, what was agreed, what was actually done."
          placeholderTextColor={colors.inkFaint}
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={2000}
          textAlignVertical="top"
        />

        <SectionHeader
          title="Photos"
          subtitle={`Optional, up to ${MAX_PHOTOS}`}
          style={styles.section}
        />
        <View style={styles.photos}>
          {photos.map((uri) => (
            <View key={uri} style={styles.photoWrap}>
              <Image source={{ uri }} style={styles.photo} />
              <TouchableOpacity
                style={styles.photoRemove}
                onPress={() => setPhotos((prev) => prev.filter((p) => p !== uri))}
                accessibilityLabel="Remove photo"
              >
                <Ionicons name="close" size={12} color={colors.inkInverse} />
              </TouchableOpacity>
            </View>
          ))}
          {photos.length < MAX_PHOTOS && (
            <TouchableOpacity style={styles.photoAdd} onPress={pickPhoto} activeOpacity={0.7}>
              <Ionicons name="camera-outline" size={20} color={colors.inkFaint} />
              <Text style={styles.photoAddText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={17} color={colors.inkMuted} />
          <Text style={styles.noteText}>
            A person on the MetroMatrix team reads every dispute. Outcomes range from a wallet
            refund to action against the provider.
          </Text>
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Button
          label="Submit dispute"
          onPress={submit}
          disabled={!reason}
          loading={submitting}
          style={styles.submit}
        />
        {!reason && <Text style={styles.hint}>Pick a reason to submit.</Text>}
      </ScrollView>

    </Screen>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  content: {
    padding: GUTTER,
    paddingBottom: S.huge,
  },
  section: {
    marginTop: SECTION,
  },

  reasons: {
    marginTop: S.md,
  },
  reason: {
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
    borderRadius: R.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.line,
    backgroundColor: c.surface,
    marginBottom: S.sm,
  },
  reasonSelected: {
    borderColor: c.accent,
    backgroundColor: c.accentSoft,
  },
  reasonText: {
    ...T.body,
    color: c.ink,
  },
  reasonTextSelected: {
    ...T.bodyStrong,
    color: c.accentDeep,
  },

  textArea: {
    marginTop: S.md,
    minHeight: 132,
    padding: S.md,
    borderRadius: R.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.line,
    backgroundColor: c.surface,
    ...T.body,
    color: c.ink,
  },

  photos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: S.md,
  },
  photoWrap: {
    width: 76,
    height: 76,
    marginRight: S.sm,
    marginBottom: S.sm,
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: R.chip,
    backgroundColor: c.surfaceSunken,
  },
  photoRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAdd: {
    width: 76,
    height: 76,
    borderRadius: R.chip,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: c.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAddText: {
    ...T.caption,
    color: c.inkFaint,
    marginTop: 3,
  },

  note: {
    flexDirection: 'row',
    marginTop: SECTION,
    padding: S.lg,
    borderRadius: R.card,
    backgroundColor: c.surfaceSunken,
  },
  noteText: {
    ...T.caption,
    color: c.inkMuted,
    flex: 1,
    marginLeft: S.sm,
    maxWidth: PROSE_WIDTH,
  },
  error: {
    ...T.caption,
    color: c.error,
    marginTop: S.lg,
  },
  submit: {
    marginTop: SECTION,
  },
  hint: {
    ...T.caption,
    color: c.inkMuted,
    textAlign: 'center',
    marginTop: S.sm,
  },
});
