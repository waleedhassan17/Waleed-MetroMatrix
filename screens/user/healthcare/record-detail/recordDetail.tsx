import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
  Image,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BackButton } from '../../../../components/ui';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import {
  fetchRecords,
  deleteRecord,
  selectRecordById,
} from '../health-records/healthRecordsSlice';
import {
  getRecordConfig,
  formatRecordDate,
  getRecordFileExtension,
  isImageRecord,
} from '../../../../utils/healthcare/recordDisplay';
import { HealthcareRouteNames } from '../../../../navigation-maps/Healthcare';
import { Colors } from '../../../../constants/Colors';
import type { HealthcareStackParamList } from '../../../../models/healthcare/types';
import { useBottomBarPadding } from '../../../../hooks/useBottomBarPadding';

type RecordDetailRoute = RouteProp<HealthcareStackParamList, 'RecordDetail'>;

// ── Theme (matches health-records / prescription-view) ─

const THEME = {
  primary: '#2A7FFF',
  primaryDark: '#1E6AE1',
  primaryLight: '#EAF3FF',
  accent: '#5A9FFF',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  gradient: {
    primary: ['#2A7FFF', '#1857C0'] as [string, string],
    header: ['#1857C0', '#1E6AE1'] as [string, string],
  },
};

// ── Section Header ──────────────────────────

const SectionHeader: React.FC<{
  icon: string;
  title: string;
  iconBg: string;
  iconColor: string;
}> = ({ icon, title, iconBg, iconColor }) => (
  <View style={styles.sectionHeader}>
    <View style={[styles.sectionIconBg, { backgroundColor: iconBg }]}>
      <Ionicons name={icon as any} size={16} color={iconColor} />
    </View>
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

// ── Detail Row ──────────────────────────────

const DetailRow: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue} numberOfLines={2}>
      {value}
    </Text>
  </View>
);

// ── Component ───────────────────────────────

const RecordDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const bottomBarPadding = useBottomBarPadding();
  const route = useRoute<RecordDetailRoute>();
  const dispatch = useAppDispatch();

  const recordId = route.params?.recordId ?? '';

  const record = useAppSelector(selectRecordById(recordId));
  const { loading, deleting, records } = useAppSelector((s) => s.healthRecords);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  // The list is the usual entry point, but a deep link can land here with an
  // empty store — fetch once in that case.
  useEffect(() => {
    if (!record && records.length === 0 && !loading) {
      dispatch(fetchRecords());
    }
  }, [dispatch, record, records.length, loading]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleBack = () => navigation.goBack();

  const handleOpenFile = useCallback(async () => {
    if (!record?.fileUrl) return;
    try {
      await WebBrowser.openBrowserAsync(record.fileUrl);
    } catch {
      Alert.alert('Unable to open', 'This file could not be opened.');
    }
  }, [record?.fileUrl]);

  const handleShare = useCallback(async () => {
    if (!record) return;
    try {
      await Share.share({
        title: record.title,
        message: record.fileUrl
          ? `${record.title}\n${record.fileUrl}`
          : record.title,
      });
    } catch {
      // User dismissed the sheet — nothing to report.
    }
  }, [record]);

  const handleDelete = useCallback(() => {
    if (!record) return;
    Alert.alert(
      'Delete Record',
      `Delete "${record.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await dispatch(deleteRecord(record.recordId));
            if (deleteRecord.fulfilled.match(result)) navigation.goBack();
            else Alert.alert('Delete failed', 'Please try again.');
          },
        },
      ]
    );
  }, [dispatch, navigation, record]);

  // ── Loading ───────────────────────────────

  if (!record && loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FBFF" />
        <View style={styles.spinnerWrap}>
          <ActivityIndicator size="large" color={THEME.primary} />
        </View>
        <Text style={styles.centeredTitle}>Loading record</Text>
        <Text style={styles.centeredSubtitle}>Please wait a moment</Text>
      </SafeAreaView>
    );
  }

  // ── Not found ─────────────────────────────

  if (!record) {
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FBFF" />
        <LinearGradient
          colors={['#FEE2E2', '#FECACA']}
          style={styles.notFoundIcon}
        >
          <Ionicons name="document-outline" size={40} color={THEME.error} />
        </LinearGradient>
        <Text style={styles.centeredTitle}>Record not found</Text>
        <Text style={styles.centeredSubtitle}>
          This record may have been deleted.
        </Text>
        <TouchableOpacity style={styles.notFoundBtn} onPress={handleBack}>
          <LinearGradient
            colors={THEME.gradient.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.notFoundBtnGradient}
          >
            <Ionicons name="arrow-back" size={16} color="#FFFFFF" />
            <Text style={styles.notFoundBtnText}>Back to Records</Text>
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const config = getRecordConfig(record.type);
  const extension = getRecordFileExtension(record);
  const isImage = isImageRecord(record);
  const uploadedAt = formatRecordDate(record.uploadedAt);
  const isDeleting = deleting === record.recordId;

  // ── Render ────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E6AE1" />

      <LinearGradient
        colors={THEME.gradient.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <BackButton tone="onAccent" onPress={handleBack} />
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {record.title}
            </Text>
            <Text style={styles.headerSubtitle}>{config.label}</Text>
          </View>
          <TouchableOpacity onPress={handleShare} style={styles.backButton}>
            <Ionicons name="share-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <Animated.View
        style={[
          styles.body,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Overview ── */}
          <View style={styles.card}>
            <View style={styles.overviewRow}>
              <View
                style={[
                  styles.typeIconBg,
                  { backgroundColor: config.color + '15' },
                ]}
              >
                <MaterialCommunityIcons
                  name={config.icon as any}
                  size={26}
                  color={config.color}
                />
              </View>
              <View style={styles.overviewInfo}>
                <Text style={styles.overviewTitle} numberOfLines={2}>
                  {record.title}
                </Text>
                <View
                  style={[
                    styles.typeBadge,
                    { backgroundColor: config.color + '15' },
                  ]}
                >
                  <Text style={[styles.typeBadgeText, { color: config.color }]}>
                    {config.label}
                  </Text>
                </View>
              </View>
            </View>

            {!!record.description && (
              <Text style={styles.description}>{record.description}</Text>
            )}
          </View>

          {/* ── Details ── */}
          <View style={styles.card}>
            <SectionHeader
              icon="information-circle-outline"
              title="Details"
              iconBg={THEME.primaryLight}
              iconColor={THEME.primary}
            />
            {!!uploadedAt && <DetailRow label="Uploaded" value={uploadedAt} />}
            {!!record.fileSize && (
              <DetailRow label="File size" value={record.fileSize} />
            )}
            {!!extension && (
              <DetailRow label="Format" value={extension.toUpperCase()} />
            )}
            {!!record.linkedAppointmentId && (
              <DetailRow label="Linked appointment" value="Yes" />
            )}
          </View>

          {/* ── Attachment ── */}
          {!!record.fileUrl && (
            <View style={styles.card}>
              <SectionHeader
                icon="document-attach-outline"
                title="Attachment"
                iconBg="#ECFDF5"
                iconColor={THEME.success}
              />

              {isImage ? (
                <TouchableOpacity onPress={handleOpenFile} activeOpacity={0.9}>
                  <Image
                    source={{ uri: record.fileUrl }}
                    style={styles.preview}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.fileRow}
                  onPress={handleOpenFile}
                  activeOpacity={0.7}
                >
                  <View style={styles.fileIconBg}>
                    <MaterialCommunityIcons
                      name="file-document-outline"
                      size={22}
                      color={THEME.primary}
                    />
                  </View>
                  <View style={styles.fileInfo}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {record.title}
                      {extension ? `.${extension}` : ''}
                    </Text>
                    <Text style={styles.fileHint}>Tap to open</Text>
                  </View>
                  <Ionicons
                    name="open-outline"
                    size={18}
                    color={Colors.text.tertiary}
                  />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ── Linked appointment ── */}
          {!!record.linkedAppointmentId && (
            <TouchableOpacity
              style={styles.linkCard}
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate(HealthcareRouteNames.AppointmentDetail, {
                  appointmentId: record.linkedAppointmentId!,
                })
              }
            >
              <View style={styles.linkIconBg}>
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={THEME.primary}
                />
              </View>
              <Text style={styles.linkText}>View linked appointment</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={Colors.text.tertiary}
              />
            </TouchableOpacity>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>
      </Animated.View>

      {/* ── Bottom actions ── */}
      <View style={[styles.bottomBar, { paddingBottom: bottomBarPadding }]}>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={handleDelete}
          disabled={isDeleting}
          activeOpacity={0.8}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color={THEME.error} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={18} color={THEME.error} />
              <Text style={styles.deleteBtnText}>Delete</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.openBtn}
          onPress={handleOpenFile}
          disabled={!record.fileUrl}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={THEME.gradient.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.openBtnGradient,
              !record.fileUrl && { opacity: 0.5 },
            ]}
          >
            <Ionicons name="eye-outline" size={18} color="#FFFFFF" />
            <Text style={styles.openBtnText}>Open File</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// ── Styles ──────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FBFF' },

  centered: {
    flex: 1,
    backgroundColor: '#F8FBFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  spinnerWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  notFoundIcon: {
    width: 84,
    height: 84,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  centeredTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 6,
    textAlign: 'center',
  },
  centeredSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  notFoundBtn: { borderRadius: 14, overflow: 'hidden' },
  notFoundBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 24,
  },
  notFoundBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  header: {
    paddingTop:
      Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 10 : 14,
    paddingBottom: 18,
    paddingHorizontal: 16,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },

  body: { flex: 1 },
  scrollContent: { padding: 16 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },

  overviewRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  typeIconBg: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewInfo: { flex: 1, gap: 6 },
  overviewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },
  description: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.secondary,
    lineHeight: 20,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sectionIconBg: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 16,
  },
  detailLabel: { fontSize: 13, fontWeight: '500', color: Colors.text.secondary },
  detailValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'right',
  },

  preview: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8FBFF',
  },
  fileIconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: THEME.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '600', color: Colors.text.primary },
  fileHint: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text.tertiary,
    marginTop: 2,
  },

  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  linkIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: THEME.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  deleteBtnText: { fontSize: 14, fontWeight: '700', color: THEME.error },
  openBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  openBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  openBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});

export default RecordDetailScreen;
