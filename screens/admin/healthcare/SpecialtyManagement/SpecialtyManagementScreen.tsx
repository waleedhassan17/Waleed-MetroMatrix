import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  StatusBar,
  Animated,
  Dimensions,
  Platform,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  Switch,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import {
  fetchSpecialties,
  saveSpecialty,
  toggleSpecialtyStatus,
  deleteSpecialty,
  setEditingSpecialty,
  setSearchQuery,
  setFilterActive,
  selectFilteredSpecialties,
  selectEditingSpecialty,
  selectSpecialtyLoading,
  selectSpecialtySaving,
  selectSearchQuery,
  selectFilterActive,
  selectTotalDoctorCount,
} from './specialtyManagementSlice';
import type { Specialty, EditingSpecialty } from './specialtyManagementSlice';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = 16;
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 44;

// ============================================
// THEME COLORS
// ============================================

const COLORS = {
  primary: '#6366f1',
  primaryLight: '#818cf8',
  primaryDark: '#4f46e5',
  background: '#f1f5f9',
  surface: '#ffffff',
  text: {
    primary: '#1e293b',
    secondary: '#64748b',
    tertiary: '#94a3b8',
    inverse: '#ffffff',
  },
  border: '#e2e8f0',
  success: '#10b981',
  successLight: '#d1fae5',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  error: '#ef4444',
  errorLight: '#fee2e2',
  info: '#3b82f6',
  infoLight: '#dbeafe',
  shadow: 'rgba(15, 23, 42, 0.08)',
};

// ============================================
// AVAILABLE ICONS
// ============================================

const AVAILABLE_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  'medkit', 'heart', 'body', 'happy', 'fitness', 'pulse', 'eye',
  'woman', 'man', 'ear', 'hand-left', 'nutrition', 'leaf',
  'flask', 'thermometer', 'bandage', 'medical', 'skull',
];

const AVAILABLE_COLORS = [
  '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444',
  '#6366F1', '#14B8A6', '#EC4899', '#F97316', '#06B6D4',
];

// ============================================
// FILTER CHIPS
// ============================================

const FILTER_OPTIONS: { key: 'all' | 'active' | 'inactive'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'inactive', label: 'Inactive' },
];

// ============================================
// SPECIALTY CARD COMPONENT
// ============================================

interface SpecialtyCardProps {
  specialty: Specialty;
  index: number;
  onEdit: (specialty: Specialty) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const SpecialtyCard: React.FC<SpecialtyCardProps> = ({
  specialty,
  index,
  onEdit,
  onToggle,
  onDelete,
}) => {
  const slideAnim = useRef(new Animated.Value(50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 350,
        delay: index * 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Specialty',
      `Are you sure you want to delete "${specialty.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(specialty.id) },
      ]
    );
  };

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        {
          opacity: opacityAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.card}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <View style={[styles.iconBg, { backgroundColor: specialty.color + '15' }]}>
              <Ionicons
                name={specialty.icon as keyof typeof Ionicons.glyphMap}
                size={22}
                color={specialty.color}
              />
            </View>
            <View style={styles.cardTitleInfo}>
              <Text style={styles.cardTitle}>{specialty.name}</Text>
              <View style={styles.doctorCountRow}>
                <Ionicons name="people-outline" size={14} color={COLORS.text.tertiary} />
                <Text style={styles.doctorCountText}>
                  {specialty.doctorCount} {specialty.doctorCount === 1 ? 'doctor' : 'doctors'}
                </Text>
              </View>
            </View>
          </View>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: specialty.isActive ? COLORS.successLight : COLORS.errorLight,
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: specialty.isActive ? COLORS.success : COLORS.error },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: specialty.isActive ? COLORS.success : COLORS.error },
              ]}
            >
              {specialty.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        {/* Description */}
        <Text style={styles.cardDescription} numberOfLines={2}>
          {specialty.description}
        </Text>

        {/* Common Conditions */}
        <View style={styles.conditionsContainer}>
          {specialty.commonConditions.slice(0, 4).map((condition) => (
            <View key={condition.id} style={styles.conditionChip}>
              <Text style={styles.conditionText}>{condition.name}</Text>
            </View>
          ))}
          {specialty.commonConditions.length > 4 && (
            <View style={[styles.conditionChip, styles.conditionChipMore]}>
              <Text style={styles.conditionTextMore}>
                +{specialty.commonConditions.length - 4}
              </Text>
            </View>
          )}
        </View>

        {/* Action Row */}
        <View style={styles.cardActions}>
          <View style={styles.cardActionsLeft}>
            <Text style={styles.toggleLabel}>
              {specialty.isActive ? 'Active' : 'Inactive'}
            </Text>
            <Switch
              value={specialty.isActive}
              onValueChange={() => onToggle(specialty.id)}
              trackColor={{ false: '#e2e8f0', true: COLORS.success + '40' }}
              thumbColor={specialty.isActive ? COLORS.success : '#94a3b8'}
            />
          </View>
          <View style={styles.cardActionsRight}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onEdit(specialty)}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={20} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnDelete]}
              onPress={handleDelete}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={20} color={COLORS.error} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

// ============================================
// EDIT MODAL COMPONENT
// ============================================

interface EditModalProps {
  visible: boolean;
  specialty: EditingSpecialty | null;
  saving: boolean;
  onClose: () => void;
  onSave: (specialty: EditingSpecialty) => void;
}

const EditModal: React.FC<EditModalProps> = ({
  visible,
  specialty,
  saving,
  onClose,
  onSave,
}) => {
  const [form, setForm] = useState<EditingSpecialty>({
    name: '',
    icon: 'medkit',
    description: '',
    commonConditions: [],
    color: '#3B82F6',
  });
  const [newCondition, setNewCondition] = useState('');

  useEffect(() => {
    if (specialty) {
      setForm(specialty);
    } else {
      setForm({
        name: '',
        icon: 'medkit',
        description: '',
        commonConditions: [],
        color: '#3B82F6',
      });
    }
    setNewCondition('');
  }, [specialty, visible]);

  const handleAddCondition = () => {
    const trimmed = newCondition.trim();
    if (!trimmed) return;
    setForm(prev => ({
      ...prev,
      commonConditions: [
        ...prev.commonConditions,
        { id: Date.now().toString(), name: trimmed },
      ],
    }));
    setNewCondition('');
  };

  const handleRemoveCondition = (id: string) => {
    setForm(prev => ({
      ...prev,
      commonConditions: prev.commonConditions.filter(c => c.id !== id),
    }));
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      Alert.alert('Validation', 'Specialty name is required.');
      return;
    }
    if (!form.description.trim()) {
      Alert.alert('Validation', 'Description is required.');
      return;
    }
    onSave(form);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color={COLORS.text.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {form.id ? 'Edit Specialty' : 'New Specialty'}
            </Text>
            <TouchableOpacity
              onPress={handleSave}
              activeOpacity={0.7}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Text style={styles.modalSaveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            contentContainerStyle={styles.modalBodyContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Name */}
            <Text style={styles.fieldLabel}>Specialty Name</Text>
            <TextInput
              style={styles.textInput}
              value={form.name}
              onChangeText={(text) => setForm(prev => ({ ...prev, name: text }))}
              placeholder="e.g. General Medicine"
              placeholderTextColor={COLORS.text.tertiary}
            />

            {/* Description */}
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={form.description}
              onChangeText={(text) => setForm(prev => ({ ...prev, description: text }))}
              placeholder="Brief description of the specialty"
              placeholderTextColor={COLORS.text.tertiary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Icon Picker */}
            <Text style={styles.fieldLabel}>Icon</Text>
            <View style={styles.iconGrid}>
              {AVAILABLE_ICONS.map((iconName) => (
                <TouchableOpacity
                  key={iconName}
                  style={[
                    styles.iconOption,
                    form.icon === iconName && {
                      backgroundColor: form.color + '20',
                      borderColor: form.color,
                    },
                  ]}
                  onPress={() => setForm(prev => ({ ...prev, icon: iconName }))}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={iconName}
                    size={22}
                    color={form.icon === iconName ? form.color : COLORS.text.tertiary}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Color Picker */}
            <Text style={styles.fieldLabel}>Color</Text>
            <View style={styles.colorGrid}>
              {AVAILABLE_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    form.color === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setForm(prev => ({ ...prev, color }))}
                  activeOpacity={0.7}
                >
                  {form.color === color && (
                    <Ionicons name="checkmark" size={16} color="#ffffff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Common Conditions */}
            <Text style={styles.fieldLabel}>Common Conditions</Text>
            <View style={styles.conditionInputRow}>
              <TextInput
                style={[styles.textInput, styles.conditionInput]}
                value={newCondition}
                onChangeText={setNewCondition}
                placeholder="Add a condition"
                placeholderTextColor={COLORS.text.tertiary}
                onSubmitEditing={handleAddCondition}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={styles.addConditionBtn}
                onPress={handleAddCondition}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={22} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <View style={styles.conditionsEditList}>
              {form.commonConditions.map((condition) => (
                <View key={condition.id} style={styles.conditionEditChip}>
                  <Text style={styles.conditionEditText}>{condition.name}</Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveCondition(condition.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={18} color={COLORS.text.tertiary} />
                  </TouchableOpacity>
                </View>
              ))}
              {form.commonConditions.length === 0 && (
                <Text style={styles.noConditionsText}>No conditions added yet</Text>
              )}
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

// ============================================
// MAIN SCREEN COMPONENT
// ============================================

const SpecialtyManagementScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const specialties = useAppSelector(selectFilteredSpecialties);
  const editingSpecialty = useAppSelector(selectEditingSpecialty);
  const loading = useAppSelector(selectSpecialtyLoading);
  const saving = useAppSelector(selectSpecialtySaving);
  const searchQuery = useAppSelector(selectSearchQuery);
  const filterActive = useAppSelector(selectFilterActive);
  const totalDoctors = useAppSelector(selectTotalDoctorCount);

  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    dispatch(fetchSpecialties());
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchSpecialties());
    setRefreshing(false);
  }, []);

  const handleEdit = (specialty: Specialty) => {
    dispatch(
      setEditingSpecialty({
        id: specialty.id,
        name: specialty.name,
        icon: specialty.icon,
        description: specialty.description,
        commonConditions: specialty.commonConditions,
        color: specialty.color,
      })
    );
    setModalVisible(true);
  };

  const handleAddNew = () => {
    dispatch(setEditingSpecialty(null));
    setModalVisible(true);
  };

  const handleSave = async (specialty: EditingSpecialty) => {
    const result = await dispatch(saveSpecialty(specialty));
    if (saveSpecialty.fulfilled.match(result)) {
      setModalVisible(false);
    }
  };

  const handleToggle = (id: string) => {
    dispatch(toggleSpecialtyStatus(id));
  };

  const handleDelete = (id: string) => {
    dispatch(deleteSpecialty(id));
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    dispatch(setEditingSpecialty(null));
  };

  const renderSpecialtyCard = ({ item, index }: { item: Specialty; index: number }) => (
    <SpecialtyCard
      specialty={item}
      index={index}
      onEdit={handleEdit}
      onToggle={handleToggle}
      onDelete={handleDelete}
    />
  );

  const activeCount = specialties.filter(s => s.isActive).length;
  const inactiveCount = specialties.filter(s => !s.isActive).length;

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading specialties...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />

      {/* Header */}
      <LinearGradient
        colors={['#6366f1', '#8b5cf6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Specialty Management</Text>
            <Text style={styles.headerSubtitle}>
              {specialties.length} specialties · {totalDoctors} doctors
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleAddNew}
            style={styles.addButton}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="rgba(255,255,255,0.5)" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={(text) => dispatch(setSearchQuery(text))}
            placeholder="Search specialties..."
            placeholderTextColor="rgba(255,255,255,0.5)"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => dispatch(setSearchQuery(''))}>
              <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          {FILTER_OPTIONS.map((option) => {
            const count =
              option.key === 'all'
                ? specialties.length
                : option.key === 'active'
                ? activeCount
                : inactiveCount;
            return (
              <TouchableOpacity
                key={option.key}
                onPress={() => dispatch(setFilterActive(option.key))}
                style={[
                  styles.filterChip,
                  filterActive === option.key && styles.filterChipActive,
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filterActive === option.key && styles.filterChipTextActive,
                  ]}
                >
                  {option.label}
                </Text>
                <View
                  style={[
                    styles.filterBadge,
                    filterActive === option.key && styles.filterBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterBadgeText,
                      filterActive === option.key && styles.filterBadgeTextActive,
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </LinearGradient>

      {/* List */}
      <FlatList
        data={specialties}
        renderItem={renderSpecialtyCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="medical-outline" size={64} color={COLORS.text.tertiary} />
            <Text style={styles.emptyTitle}>No Specialties Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Try a different search term' : 'Tap + to add your first specialty'}
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddNew}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#6366f1', '#8b5cf6']}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={28} color="#ffffff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Edit Modal */}
      <EditModal
        visible={modalVisible}
        specialty={editingSpecialty}
        saving={saving}
        onClose={handleCloseModal}
        onSave={handleSave}
      />
    </SafeAreaView>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.text.secondary,
  },

  // Header
  header: {
    paddingTop: Platform.OS === 'android' ? STATUS_BAR_HEIGHT + 8 : 8,
    paddingBottom: 16,
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#ffffff',
  },

  // Filters
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: '#ffffff',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
  filterChipTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  filterBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  filterBadgeActive: {
    backgroundColor: COLORS.primary + '15',
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  filterBadgeTextActive: {
    color: COLORS.primary,
  },

  // List
  listContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 16,
    paddingBottom: 100,
  },

  // Card
  cardContainer: {
    marginBottom: 12,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitleInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  doctorCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  doctorCountText: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginLeft: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardDescription: {
    fontSize: 13,
    color: COLORS.text.secondary,
    lineHeight: 19,
    marginBottom: 12,
  },

  // Conditions
  conditionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  conditionChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  conditionChipMore: {
    backgroundColor: COLORS.primary + '10',
  },
  conditionText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  conditionTextMore: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Card Actions
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  cardActionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  cardActionsRight: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnDelete: {
    backgroundColor: COLORS.error + '10',
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 6,
    textAlign: 'center',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 16,
  },

  // Form Fields
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text.primary,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // Icon Grid
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },

  // Color Grid
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },

  // Condition Input
  conditionInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  conditionInput: {
    flex: 1,
  },
  addConditionBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conditionsEditList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  conditionEditChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  conditionEditText: {
    fontSize: 13,
    color: COLORS.text.primary,
  },
  noConditionsText: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    fontStyle: 'italic',
  },
});

export default SpecialtyManagementScreen;
