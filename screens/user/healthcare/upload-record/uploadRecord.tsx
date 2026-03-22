import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ActivityIndicator,
  Image,
  Alert,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { Typography } from '../../../../constants/Fonts';
import {
  setRecordType,
  setTitle,
  setDate,
  addFiles,
  removeFile,
  uploadRecord,
  resetUploadRecord,
  RECORD_TYPE_OPTIONS,
  UploadRecordType,
  PickedFile,
} from './uploadRecordSlice';

// ── Theme ─────────────────────────────────────

const THEME = {
  primary: '#2A7FFF',
  primaryLight: '#EAF3FF',
  success: '#10B981',
  gradient: {
    primary: ['#2A7FFF', '#1857C0'] as [string, string],
  },
};

// ── Record type icon colors ───────────────────

const TYPE_COLORS: Record<UploadRecordType, { bg: string; color: string; gradient: [string, string] }> = {
  prescription: { bg: '#F0F7FF', color: '#1857C0', gradient: ['#2A7FFF', '#1E6AE1'] },
  report:       { bg: '#F0FDF4', color: '#16A34A', gradient: ['#10B981', '#059669'] },
  imaging:      { bg: '#EAF3FF', color: '#1E6AE1', gradient: ['#5A9FFF', '#1E6AE1'] },
  discharge:    { bg: '#ECFEFF', color: '#0891B2', gradient: ['#06B6D4', '#0891B2'] },
  other:        { bg: '#FFFBEB', color: '#D97706', gradient: ['#F59E0B', '#D97706'] },
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ── Component ─────────────────────────────────

const UploadRecordScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef([0, 1, 2, 3].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 9, useNativeDriver: true }),
      Animated.stagger(
        80,
        cardAnims.map((a) =>
          Animated.spring(a, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true })
        )
      ),
    ]).start();
  }, []);

  const { files, recordType, title, date, uploading, uploadProgress, error } = useAppSelector(
    (state) => state.uploadRecord,
  );

  // Animate progress bar
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: uploadProgress / 100,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [uploadProgress]);

  // ── Handlers ──────────────────────────────

  const handlePickFiles = useCallback(() => {
    const mockFile: PickedFile = {
      id: `file-${Date.now()}`,
      uri: 'file://mock-document.pdf',
      name: `Document_${files.length + 1}.pdf`,
      type: 'pdf',
      size: 245000,
    };
    dispatch(addFiles([mockFile]));
  }, [dispatch, files.length]);

  const handlePickImage = useCallback(() => {
    const mockImage: PickedFile = {
      id: `img-${Date.now()}`,
      uri: 'file://mock-image.jpg',
      name: `Photo_${files.length + 1}.jpg`,
      type: 'image',
      size: 1200000,
    };
    dispatch(addFiles([mockImage]));
  }, [dispatch, files.length]);

  const handleRemoveFile = useCallback(
    (fileId: string, fileName: string) => {
      Alert.alert('Remove File', `Remove "${fileName}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => dispatch(removeFile(fileId)) },
      ]);
    },
    [dispatch],
  );

  const handleUpload = useCallback(async () => {
    const result = await dispatch(uploadRecord());
    if (uploadRecord.fulfilled.match(result)) {
      Alert.alert('Uploaded!', 'Your health record has been saved successfully.', [
        {
          text: 'Done',
          onPress: () => {
            dispatch(resetUploadRecord());
            navigation.goBack();
          },
        },
      ]);
    }
  }, [dispatch, navigation]);

  const handleDateChange = useCallback(
    (text: string) => {
      const cleaned = text.replace(/[^0-9-]/g, '');
      dispatch(setDate(cleaned));
    },
    [dispatch],
  );

  const activeTypeConfig = TYPE_COLORS[recordType];
  const canUpload = !uploading && !!title.trim() && files.length > 0;

  // ── Render ────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />

      {/* ── Gradient Header ── */}
      <LinearGradient
        colors={THEME.gradient.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => { dispatch(resetUploadRecord()); navigation.goBack(); }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Upload Record</Text>
          <Text style={styles.headerSubtitle}>Add to your health portfolio</Text>
        </View>
        <View style={styles.backButton} />
      </LinearGradient>

      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >

        {/* ── Record Type ── */}
        <Animated.View style={[styles.cardAnim, {
          opacity: cardAnims[0],
          transform: [{ translateY: cardAnims[0].interpolate({ inputRange: [0,1], outputRange: [20,0] }) }],
        }]}>
          <View style={styles.card}>
            <View style={styles.cardLabelRow}>
              <View style={styles.cardLabelDot} />
              <Text style={styles.cardLabel}>Record Type</Text>
            </View>
            <View style={styles.typeGrid}>
              {RECORD_TYPE_OPTIONS.map((opt) => {
                const isActive = recordType === opt.value;
                const tc = TYPE_COLORS[opt.value];
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.typeChip, isActive && { borderColor: tc.color, backgroundColor: tc.bg }]}
                    onPress={() => dispatch(setRecordType(opt.value))}
                    activeOpacity={0.75}
                  >
                    {isActive ? (
                      <LinearGradient
                        colors={tc.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.typeChipIconWrap}
                      >
                        <Ionicons name={opt.icon as any} size={14} color="#FFFFFF" />
                      </LinearGradient>
                    ) : (
                      <View style={[styles.typeChipIconWrap, { backgroundColor: '#F1F5F9' }]}>
                        <Ionicons name={opt.icon as any} size={14} color="#94A3B8" />
                      </View>
                    )}
                    <Text style={[styles.typeChipText, isActive && { color: tc.color, fontWeight: '700' }]}>
                      {opt.label}
                    </Text>
                    {isActive && (
                      <View style={[styles.typeChipCheck, { backgroundColor: tc.color }]}>
                        <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Animated.View>

        {/* ── Title & Date ── */}
        <Animated.View style={[styles.cardAnim, {
          opacity: cardAnims[1],
          transform: [{ translateY: cardAnims[1].interpolate({ inputRange: [0,1], outputRange: [20,0] }) }],
        }]}>
          <View style={styles.card}>
            <View style={styles.cardLabelRow}>
              <View style={styles.cardLabelDot} />
              <Text style={styles.cardLabel}>Details</Text>
            </View>

            {/* Title */}
            <Text style={styles.fieldLabel}>Title</Text>
            <View style={styles.inputWrapper}>
              <View style={styles.inputIcon}>
                <Ionicons name="create-outline" size={16} color={THEME.primary} />
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Blood Test Results"
                placeholderTextColor="#CBD5E1"
                value={title}
                onChangeText={(t) => dispatch(setTitle(t))}
                editable={!uploading}
              />
            </View>

            {/* Date */}
            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Date</Text>
            <View style={styles.inputWrapper}>
              <View style={styles.inputIcon}>
                <Ionicons name="calendar-outline" size={16} color={THEME.primary} />
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#CBD5E1"
                value={date}
                onChangeText={handleDateChange}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
                editable={!uploading}
              />
            </View>
          </View>
        </Animated.View>

        {/* ── File Upload ── */}
        <Animated.View style={[styles.cardAnim, {
          opacity: cardAnims[2],
          transform: [{ translateY: cardAnims[2].interpolate({ inputRange: [0,1], outputRange: [20,0] }) }],
        }]}>
          <View style={styles.card}>
            <View style={styles.cardLabelRow}>
              <View style={styles.cardLabelDot} />
              <Text style={styles.cardLabel}>Files</Text>
              {files.length > 0 && (
                <View style={styles.fileCountBadge}>
                  <Text style={styles.fileCountText}>{files.length}</Text>
                </View>
              )}
            </View>

            {/* Picker buttons */}
            <View style={styles.pickerRow}>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={handlePickImage}
                disabled={uploading}
                activeOpacity={0.75}
              >
                <LinearGradient
                  colors={['#F0F7FF', '#EAF3FF']}
                  style={styles.pickerButtonInner}
                >
                  <View style={styles.pickerButtonIcon}>
                    <Ionicons name="camera-outline" size={22} color={THEME.primary} />
                  </View>
                  <Text style={styles.pickerButtonText}>Take Photo</Text>
                  <Text style={styles.pickerButtonSubtext}>Camera / Gallery</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.pickerButton}
                onPress={handlePickFiles}
                disabled={uploading}
                activeOpacity={0.75}
              >
                <LinearGradient
                  colors={['#EAF3FF', '#D6E8FF']}
                  style={styles.pickerButtonInner}
                >
                  <View style={[styles.pickerButtonIcon, { backgroundColor: '#D6E8FF' }]}>
                    <MaterialCommunityIcons name="file-document-outline" size={22} color="#5A9FFF" />
                  </View>
                  <Text style={[styles.pickerButtonText, { color: '#1E6AE1' }]}>Choose File</Text>
                  <Text style={[styles.pickerButtonSubtext, { color: '#A78BFA' }]}>PDF / DOC</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* File previews */}
            {files.length > 0 && (
              <View style={styles.filesContainer}>
                {files.map((file) => (
                  <View key={file.id} style={styles.fileCard}>
                    <View style={[
                      styles.fileThumbnail,
                      { backgroundColor: file.type === 'image' ? '#F0F7FF' : '#FEF2F2' },
                    ]}>
                      {file.type === 'image' ? (
                        file.uri.startsWith('file://mock') ? (
                          <Ionicons name="image" size={22} color={THEME.primary} />
                        ) : (
                          <Image source={{ uri: file.uri }} style={styles.thumbnailImage} />
                        )
                      ) : (
                        <MaterialCommunityIcons name="file-pdf-box" size={24} color="#EF4444" />
                      )}
                    </View>
                    <View style={styles.fileInfo}>
                      <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                      <Text style={styles.fileSize}>{formatFileSize(file.size)}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveFile(file.id, file.name)}
                      disabled={uploading}
                      style={styles.fileRemoveBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name="close-circle"
                        size={20}
                        color={uploading ? '#CBD5E1' : '#EF4444'}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        </Animated.View>

        {/* ── Progress / Error ── */}
        {uploading && (
          <Animated.View style={[styles.cardAnim, {
            opacity: cardAnims[3],
            transform: [{ translateY: cardAnims[3].interpolate({ inputRange: [0,1], outputRange: [16,0] }) }],
          }]}>
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <ActivityIndicator size="small" color={THEME.primary} />
                <Text style={styles.progressLabel}>Uploading… {uploadProgress}%</Text>
                <Text style={styles.progressPercent}>{uploadProgress}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                >
                  <LinearGradient
                    colors={THEME.gradient.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                </Animated.View>
              </View>
            </View>
          </Animated.View>
        )}

        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={{ height: 120 }} />
      </Animated.ScrollView>

      {/* ── Bottom Upload Button ── */}
      <View style={styles.bottomBar}>
        {/* Summary */}
        <View style={styles.bottomSummary}>
          <View style={[styles.bottomTypeChip, { backgroundColor: activeTypeConfig.bg }]}>
            <Text style={[styles.bottomTypeText, { color: activeTypeConfig.color }]}>
              {RECORD_TYPE_OPTIONS.find((o) => o.value === recordType)?.label}
            </Text>
          </View>
          <Text style={styles.bottomFilesText}>
            {files.length === 0 ? 'No files added' : `${files.length} file${files.length > 1 ? 's' : ''} ready`}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.uploadButton, !canUpload && styles.uploadButtonDisabled]}
          onPress={handleUpload}
          disabled={!canUpload}
          activeOpacity={0.85}
        >
          {canUpload ? (
            <LinearGradient
              colors={THEME.gradient.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.uploadButtonGradient}
            >
              <MaterialCommunityIcons name="cloud-upload-outline" size={20} color="#FFFFFF" />
              <Text style={styles.uploadButtonText}>Upload Record</Text>
            </LinearGradient>
          ) : (
            <View style={styles.uploadButtonGradient}>
              {uploading ? (
                <ActivityIndicator size="small" color="#94A3B8" />
              ) : (
                <MaterialCommunityIcons name="cloud-upload-outline" size={20} color="#94A3B8" />
              )}
              <Text style={[styles.uploadButtonText, { color: '#94A3B8' }]}>
                {uploading ? 'Uploading…' : title.trim() ? 'Add at least one file' : 'Enter a title first'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// ── Styles ─────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FBFF',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingTop: Platform.OS === 'android'
      ? (StatusBar.currentHeight ?? 24) + 10
      : 14,
  },
  backButton: {
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

  // Scroll
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  cardAnim: {
    marginBottom: 14,
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
    }),
  },
  cardLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  cardLabelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.primary,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    flex: 1,
  },
  fileCountBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: THEME.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.primary,
  },

  // Record type chips
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#F8FBFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  typeChipIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  typeChipCheck: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 2,
  },

  // Input
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FBFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    gap: 10,
  },
  inputIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: THEME.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    paddingVertical: 13,
  },

  // File pickers
  pickerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pickerButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    ...Platform.select({
      ios: {
        shadowColor: THEME.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: { elevation: 1 },
    }),
  },
  pickerButtonInner: {
    paddingVertical: 16,
    alignItems: 'center',
    gap: 6,
  },
  pickerButtonIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: THEME.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.primary,
  },
  pickerButtonSubtext: {
    fontSize: 11,
    fontWeight: '500',
    color: '#93C5FD',
  },

  // Files list
  filesContainer: {
    marginTop: 14,
    gap: 8,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FBFF',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  fileThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailImage: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
  },
  fileRemoveBtn: {
    padding: 2,
  },

  // Progress
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#B8D4FF',
    gap: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.primary,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EAF3FF',
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },

  // Error
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
    flex: 1,
  },

  // Bottom bar
  bottomBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  bottomSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bottomTypeChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  bottomTypeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  bottomFilesText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94A3B8',
  },
  uploadButton: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  uploadButtonDisabled: {
    backgroundColor: '#F1F5F9',
  },
  uploadButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
});

export default UploadRecordScreen;