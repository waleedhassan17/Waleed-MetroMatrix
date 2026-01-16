import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  Alert,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NavigationProp, RouteProp } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '../../../store/store';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Fonts } from '../../../constants/Fonts';
import * as DocumentPicker from 'expo-document-picker';
import {
  setProviderInfo,
  updateFormData,
  nextStep,
  previousStep,
  submitPersonalInfo,
  setDocumentLocal, // ✅ FIX: Use local storage instead of upload
  removeDocument,
  selectCurrentStep,
  selectTotalSteps,
  selectProviderType,
  selectProviderSubType,
  selectFormData,
  selectPersonalInfoLoading,
  selectPersonalInfoError,
  selectIsLastStep,
  selectIsFirstStep,
  selectPendingApproval,
  clearError,
} from './personalInfoSlice';
import type { PersonalInfoData } from './personalInfoSlice';
import {
  selectProviderType as selectSelectedProviderType,
  selectProviderSubType as selectSelectedSubType,
} from '../../provider-selection/providerSlice';
import { retrieveData, KeyForStorage } from '../../../utils/storage_utils/storageUtils';
import {
  InputField,
  PickerField,
  ProgressIndicator,
  FileUpload,
  InfoBox,
  ActionButton,
} from '../../../components/FormComponents';

const { width } = Dimensions.get('window');
const isAndroid = Platform.OS === 'android';

// Vendor Categories
const VENDOR_CATEGORIES = [
  {
    id: 'clothing_fashion',
    label: 'Clothing & Fashion',
    icon: 'shopping' as const,
  },
];

// Doctor Specialties
const DOCTOR_SPECIALTIES = [
  { id: 'general', label: 'General Practitioner', icon: 'stethoscope' as const },
  { id: 'cardiology', label: 'Cardiology', icon: 'heart' as const },
  { id: 'dermatology', label: 'Dermatology', icon: 'medical-bag' as const },
  { id: 'orthopedics', label: 'Orthopedics', icon: 'bone' as const },
  { id: 'pediatrics', label: 'Pediatrics', icon: 'baby-face' as const },
  { id: 'neurology', label: 'Neurology', icon: 'brain' as const },
  { id: 'psychiatry', label: 'Psychiatry', icon: 'head-heart' as const },
  { id: 'surgery', label: 'Surgery', icon: 'hospital-box' as const },
];

// Cities
const CITIES = [
  { id: 'karachi', label: 'Karachi', icon: 'city' as const },
  { id: 'lahore', label: 'Lahore', icon: 'city' as const },
  { id: 'islamabad', label: 'Islamabad', icon: 'city' as const },
  { id: 'peshawar', label: 'Peshawar', icon: 'city' as const },
  { id: 'quetta', label: 'Quetta', icon: 'city' as const },
  { id: 'faisalabad', label: 'Faisalabad', icon: 'city' as const },
  { id: 'multan', label: 'Multan', icon: 'city' as const },
  { id: 'hyderabad', label: 'Hyderabad', icon: 'city' as const },
  { id: 'rawalpindi', label: 'Rawalpindi', icon: 'city' as const },
  { id: 'gujranwala', label: 'Gujranwala', icon: 'city' as const },
];

// Home Service Professions
const HOME_SERVICE_PROFESSIONS = [
  { id: 'electrician', label: 'Electrician', icon: 'lightning-bolt' as const, color: '#f59e0b' },
  { id: 'plumber', label: 'Plumber', icon: 'pipe-wrench' as const, color: '#3b82f6' },
  { id: 'ac_repairer', label: 'AC Repairer', icon: 'air-conditioner' as const, color: '#06b6d4' },
];

// Provider configurations
const PROVIDER_CONFIGS = {
  doctor: {
    title: 'Doctor Registration',
    subtitle: 'Join our healthcare network',
    icon: 'stethoscope' as const,
    color: '#ec4899',
    iconBg: '#fef2f8',
  },
  electrician: {
    title: 'Electrician Registration',
    subtitle: 'Provide electrical services',
    icon: 'lightning-bolt' as const,
    color: '#f59e0b',
    iconBg: '#fef3c7',
  },
  plumber: {
    title: 'Plumber Registration',
    subtitle: 'Provide plumbing services',
    icon: 'pipe-wrench' as const,
    color: '#3b82f6',
    iconBg: '#dbeafe',
  },
  ac_repairer: {
    title: 'AC Repairer Registration',
    subtitle: 'Provide AC repair services',
    icon: 'air-conditioner' as const,
    color: '#06b6d4',
    iconBg: '#cffafe',
  },
  vendor: {
    title: 'Vendor Registration',
    subtitle: 'Start selling your products',
    icon: 'store' as const,
    color: '#8b5cf6',
    iconBg: '#f5f3ff',
  },
};

type RootStackParamList = {
  Dashboard: undefined;
  ProviderSelection: undefined;
  ProviderWaiting: undefined;
  ProviderApprovalPending: { providerId?: string };
};

type PersonalInfoRouteProp = RouteProp<{ PersonalInfo: undefined }, 'PersonalInfo'>;

export default function PersonalInfoScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<PersonalInfoRouteProp>();
  const dispatch = useDispatch<AppDispatch>();

  // Local state for modals
  const [specialtyModalVisible, setSpecialtyModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [professionModalVisible, setProfessionModalVisible] = useState(false);
  const [specialtySearch, setSpecialtySearch] = useState('');
  const [citySearch, setCitySearch] = useState('');

  // Redux state
  const currentStep = useSelector(selectCurrentStep);
  const totalSteps = useSelector(selectTotalSteps);
  const providerType = useSelector(selectProviderType);
  const providerSubType = useSelector(selectProviderSubType);
  const formData = useSelector(selectFormData);
  const isLoading = useSelector(selectPersonalInfoLoading);
  const error = useSelector(selectPersonalInfoError);
  const isLastStep = useSelector(selectIsLastStep);
  const isFirstStep = useSelector(selectIsFirstStep);
  const pendingApproval = useSelector(selectPendingApproval);

  // Get provider selection from provider slice
  const selectedProviderType = useSelector(selectSelectedProviderType);
  const selectedSubType = useSelector(selectSelectedSubType);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Set provider info on mount
  useEffect(() => {
    if (selectedProviderType) {
      dispatch(
        setProviderInfo({
          type: selectedProviderType,
          subType: selectedSubType || undefined,
        })
      );
    }
  }, [selectedProviderType, selectedSubType]);

  // Load provider email from AsyncStorage (saved during email verification)
  useEffect(() => {
    const loadProviderEmail = async () => {
      try {
        const storedEmail = await retrieveData(KeyForStorage.providerTempEmail);
        if (storedEmail && !formData.email) {
          dispatch(updateFormData({ email: String(storedEmail) }));
          console.log('📧 Pre-filled email from storage:', storedEmail);
        }
      } catch (error) {
        console.log('⚠️ Could not load provider email from storage:', error);
      }
    };
    loadProviderEmail();
  }, []);

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [
        { text: 'OK', onPress: () => dispatch(clearError()) },
      ]);
    }
  }, [error]);

  // Get provider configuration
  const getProviderConfig = () => {
    if (providerType === 'home_service' && providerSubType) {
      return PROVIDER_CONFIGS[providerSubType as keyof typeof PROVIDER_CONFIGS];
    }
    return providerType ? PROVIDER_CONFIGS[providerType as keyof typeof PROVIDER_CONFIGS] : PROVIDER_CONFIGS.doctor;
  };

  const config = getProviderConfig();

  const handleBack = () => {
    if (!isFirstStep) {
      dispatch(previousStep());
    } else {
      navigation.goBack();
    }
  };

  const handleContinue = async () => {
    if (!validateCurrentStep()) return;

    if (isLastStep) {
      // Submit form
      try {
        const result = await dispatch(submitPersonalInfo()).unwrap();
        
        // Extract email for checking approval status
        const userEmail = formData.email;
        
        Alert.alert(
          'Success',
          'Your profile has been submitted for approval. Please wait for admin review.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate to ProviderWaitingScreen
                (navigation as any).reset({
                  index: 0,
                  routes: [{ name: 'ProviderWaitingScreen' }],
                });
              },
            },
          ]
        );
      } catch (error) {
        console.error('❌ Submission error:', error);
      }
    } else {
      dispatch(nextStep());
    }
  };

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 1:
        return validateStep1();
      case 2:
        return validateStep2();
      case 3:
        return validateStep3();
      default:
        return false;
    }
  };

  const validateStep1 = (): boolean => {
    if (!formData.fullName.trim()) {
      Alert.alert('Validation Error', 'Please enter your full name');
      return false;
    }
    if (!formData.email.trim()) {
      Alert.alert('Validation Error', 'Please enter your email');
      return false;
    }
    if (!formData.phoneNumber.trim()) {
      Alert.alert('Validation Error', 'Please enter your phone number');
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (providerType === 'doctor' && !formData.specialty) {
      Alert.alert('Validation Error', 'Please select your specialty');
      return false;
    }
    if (providerType === 'home_service' && !formData.profession) {
      Alert.alert('Validation Error', 'Please select your profession');
      return false;
    }
    if (providerType === 'vendor' && !formData.category) {
      Alert.alert('Validation Error', 'Please select a category');
      return false;
    }
    if (!formData.experience.trim()) {
      Alert.alert('Validation Error', 'Please enter your experience');
      return false;
    }
    if (!formData.briefDescription.trim()) {
      Alert.alert('Validation Error', 'Please enter a brief description');
      return false;
    }
    if (!formData.city.trim()) {
      Alert.alert('Validation Error', 'Please select your city');
      return false;
    }
    if (!formData.idNumber.trim()) {
      Alert.alert('Validation Error', 'Please enter your ID number');
      return false;
    }
    return true;
  };

  const validateStep3 = (): boolean => {
    if (providerType === 'doctor') {
      if (!formData.medicalLicense) {
        Alert.alert('Validation Error', 'Please upload your medical license');
        return false;
      }
      if (!formData.degreeCertificate) {
        Alert.alert('Validation Error', 'Please upload your degree certificate');
        return false;
      }
    }
    
    if (providerType === 'home_service' && !formData.professionalCertificate) {
      Alert.alert('Validation Error', 'Please upload your professional certificate');
      return false;
    }

    if (providerType === 'vendor' && !formData.businessLicense) {
      Alert.alert('Validation Error', 'Please upload your business license');
      return false;
    }

    if (!formData.nationalIdCard) {
      Alert.alert('Validation Error', 'Please upload your national ID card');
      return false;
    }

    return true;
  };

  /**
   * ✅ FIX: Store documents locally instead of uploading immediately
   * Documents will be uploaded when the form is submitted (in submitPersonalInfo)
   * This fixes the "This route is for providers only" error because
   * the user is not authenticated yet during form filling
   */
  const handleDocumentPick = async (field: keyof typeof formData) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
      });

      if (result.canceled === false && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const document = {
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || 'application/octet-stream',
          size: asset.size || 0,
        };

        // ✅ FIX: Use setDocumentLocal instead of uploadDocument
        // This stores the document locally and uploads it when form is submitted
        dispatch(setDocumentLocal({ field: field as keyof PersonalInfoData, document }));
        
        console.log(`✅ Document stored locally: ${field} - ${document.name}`);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    }
  };

  /**
   * ✅ Handle document removal
   */
  const handleRemoveDocument = (field: keyof typeof formData) => {
    dispatch(removeDocument(field as keyof PersonalInfoData));
    console.log(`🗑️ Document removed: ${field}`);
  };

  const handleSelectSpecialty = (specialty: typeof DOCTOR_SPECIALTIES[0]) => {
    dispatch(updateFormData({ specialty: specialty.label }));
    setSpecialtyModalVisible(false);
    setSpecialtySearch('');
  };

  const handleSelectCategory = (category: typeof VENDOR_CATEGORIES[0]) => {
    dispatch(updateFormData({ category: category.label }));
    setCategoryModalVisible(false);
  };

  const handleSelectCity = (city: typeof CITIES[0]) => {
    dispatch(updateFormData({ city: city.label }));
    setCityModalVisible(false);
    setCitySearch('');
  };

  const handleSelectProfession = (profession: typeof HOME_SERVICE_PROFESSIONS[0]) => {
    dispatch(updateFormData({ profession: profession.label }));
    setProfessionModalVisible(false);
  };

  const getFilteredSpecialties = () => {
    if (!specialtySearch) return DOCTOR_SPECIALTIES;
    return DOCTOR_SPECIALTIES.filter(item =>
      item.label.toLowerCase().includes(specialtySearch.toLowerCase())
    );
  };

  const getFilteredCities = () => {
    if (!citySearch) return CITIES;
    return CITIES.filter(item =>
      item.label.toLowerCase().includes(citySearch.toLowerCase())
    );
  };

  const renderHeader = () => (
    <Animated.View
      style={[
        styles.header,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor={isAndroid ? '#F8FAFC' : 'transparent'}
        translucent={!isAndroid}
      />

      <View style={styles.headerTop}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <View style={styles.headerContent}>
        <View style={[styles.iconContainer, { backgroundColor: config.iconBg }]}>
          <MaterialCommunityIcons name={config.icon} size={32} color={config.color} />
        </View>
        <Text style={styles.appTitle}>MetroMatrix</Text>
        <Text style={styles.headerSubtitle}>{config.title}</Text>
        <Text style={styles.headerDescription}>{config.subtitle}</Text>
      </View>

      <ProgressIndicator
        currentStep={currentStep}
        totalSteps={totalSteps}
        color={config.color}
      />
    </Animated.View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Personal Information</Text>
      <Text style={styles.stepSubtitle}>Tell us about yourself</Text>

      <InputField
        label="Full Name"
        value={formData.fullName}
        onChangeText={(text) => dispatch(updateFormData({ fullName: text }))}
        placeholder="Enter your full name"
        icon="person-outline"
        autoCapitalize="words"
      />

      <InputField
        label="Email Address"
        value={formData.email}
        onChangeText={(text) => dispatch(updateFormData({ email: text }))}
        placeholder="your.email@example.com"
        icon="mail-outline"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <InputField
        label="Phone Number"
        value={formData.phoneNumber}
        onChangeText={(text) => dispatch(updateFormData({ phoneNumber: text }))}
        placeholder="+92 300 1234567"
        icon="call-outline"
        keyboardType="phone-pad"
      />
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Professional Details</Text>
      <Text style={styles.stepSubtitle}>Your expertise and credentials</Text>

      {providerType === 'doctor' && (
        <>
          <TouchableOpacity
            style={styles.customPickerContainer}
            onPress={() => setSpecialtyModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.labelContainer}>
              <Ionicons name="medical-outline" size={16} color="#6366f1" />
              <Text style={styles.label}>Specialty</Text>
            </View>
            <View style={styles.pickerButton}>
              <Text style={[styles.pickerText, !formData.specialty && styles.placeholderText]}>
                {formData.specialty || 'Select specialty'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#64748b" />
            </View>
          </TouchableOpacity>

          <InputField
            label="Professional/Clinic Name"
            value={formData.professionalName || ''}
            onChangeText={(text) => dispatch(updateFormData({ professionalName: text }))}
            placeholder="Your practice name"
            icon="business-outline"
          />
        </>
      )}

      {providerType === 'home_service' && (
        <TouchableOpacity
          style={styles.customPickerContainer}
          onPress={() => setProfessionModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={styles.labelContainer}>
            <Ionicons name="briefcase-outline" size={16} color="#6366f1" />
            <Text style={styles.label}>Profession</Text>
          </View>
          <View style={styles.pickerButton}>
            <Text style={[styles.pickerText, !formData.profession && styles.placeholderText]}>
              {formData.profession || 'Select profession'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#64748b" />
          </View>
        </TouchableOpacity>
      )}

      {providerType === 'vendor' && (
        <>
          <TouchableOpacity
            style={styles.customPickerContainer}
            onPress={() => setCategoryModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.labelContainer}>
              <Ionicons name="apps-outline" size={16} color="#6366f1" />
              <Text style={styles.label}>Category</Text>
            </View>
            <View style={styles.pickerButton}>
              <Text style={[styles.pickerText, !formData.category && styles.placeholderText]}>
                {formData.category || 'Select category'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#64748b" />
            </View>
          </TouchableOpacity>

          <InputField
            label="Business Name"
            value={formData.businessName || ''}
            onChangeText={(text) => dispatch(updateFormData({ businessName: text }))}
            placeholder="Your store name"
            icon="storefront-outline"
          />
        </>
      )}

      <View style={styles.rowContainer}>
        <View style={styles.halfWidth}>
          <InputField
            label="Experience"
            value={formData.experience}
            onChangeText={(text) => dispatch(updateFormData({ experience: text }))}
            placeholder="5 years"
            icon="time-outline"
          />
        </View>
        {(providerType === 'doctor' || providerType === 'home_service') && (
          <View style={styles.halfWidth}>
            <InputField
              label="Rate"
              value={formData.rate || ''}
              onChangeText={(text) => dispatch(updateFormData({ rate: text }))}
              placeholder="PKR/hour"
              icon="cash-outline"
              keyboardType="numeric"
            />
          </View>
        )}
      </View>

      <InputField
        label="Brief Description"
        value={formData.briefDescription}
        onChangeText={(text) => dispatch(updateFormData({ briefDescription: text }))}
        placeholder="Tell us about your services..."
        icon="document-text-outline"
        multiline
        numberOfLines={4}
      />

      <View style={styles.rowContainer}>
        <View style={styles.halfWidth}>
          <TouchableOpacity
            style={styles.customPickerContainer}
            onPress={() => setCityModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.labelContainer}>
              <Ionicons name="location-outline" size={16} color="#6366f1" />
              <Text style={styles.label}>City</Text>
            </View>
            <View style={styles.pickerButton}>
              <Text style={[styles.pickerText, !formData.city && styles.placeholderText]}>
                {formData.city || 'Select'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#64748b" />
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.halfWidth}>
          <InputField
            label="ID"
            value={formData.idNumber}
            onChangeText={(text) => dispatch(updateFormData({ idNumber: text }))}
            placeholder="Number"
            icon="card-outline"
          />
        </View>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Upload Documents</Text>
      <Text style={styles.stepSubtitle}>Verify your credentials</Text>

      {/* ✅ Info about local storage */}
      <InfoBox
        message="Documents will be stored locally and uploaded when you submit the form."
        type="info"
      />

      {providerType === 'doctor' && (
        <>
          <FileUpload
            label="Medical License"
            icon="file-document"
            onPress={() => handleDocumentPick('medicalLicense')}
            fileName={formData.medicalLicense?.name}
            hasFile={!!formData.medicalLicense}
          />
          <FileUpload
            label="Degree Certificate"
            icon="certificate"
            onPress={() => handleDocumentPick('degreeCertificate')}
            fileName={formData.degreeCertificate?.name}
            hasFile={!!formData.degreeCertificate}
          />
        </>
      )}

      {providerType === 'home_service' && (
        <FileUpload
          label="Professional Certificate"
          icon="certificate"
          onPress={() => handleDocumentPick('professionalCertificate')}
          fileName={formData.professionalCertificate?.name}
          hasFile={!!formData.professionalCertificate}
        />
      )}

      {providerType === 'vendor' && (
        <FileUpload
          label="Business License"
          icon="file-document"
          onPress={() => handleDocumentPick('businessLicense')}
          fileName={formData.businessLicense?.name}
          hasFile={!!formData.businessLicense}
        />
      )}

      <FileUpload
        label="National ID Card (CNIC)"
        icon="card-account-details"
        onPress={() => handleDocumentPick('nationalIdCard')}
        fileName={formData.nationalIdCard?.name}
        hasFile={!!formData.nationalIdCard}
      />

      <InfoBox
        message="Your documents will be reviewed within 24-48 hours. You'll receive a notification once approved."
        type="info"
      />
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      default:
        return null;
    }
  };

  const renderSpecialtyModal = () => (
    <Modal
      visible={specialtyModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => {
        setSpecialtyModalVisible(false);
        setSpecialtySearch('');
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Specialty</Text>
            <TouchableOpacity
              onPress={() => {
                setSpecialtyModalVisible(false);
                setSpecialtySearch('');
              }}
            >
              <Ionicons name="close" size={24} color="#0f172a" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search specialties..."
              value={specialtySearch}
              onChangeText={setSpecialtySearch}
              placeholderTextColor="#94a3b8"
            />
          </View>

          <FlatList
            data={getFilteredSpecialties()}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  formData.specialty === item.label && styles.modalItemSelected,
                ]}
                onPress={() => handleSelectSpecialty(item)}
              >
                <MaterialCommunityIcons
                  name={item.icon}
                  size={24}
                  color={formData.specialty === item.label ? '#ec4899' : '#64748b'}
                />
                <Text
                  style={[
                    styles.modalItemText,
                    formData.specialty === item.label && styles.modalItemTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
                {formData.specialty === item.label && (
                  <Ionicons name="checkmark-circle" size={24} color="#ec4899" />
                )}
              </TouchableOpacity>
            )}
            scrollEnabled={true}
            nestedScrollEnabled={true}
          />
        </View>
      </View>
    </Modal>
  );

  const renderCategoryModal = () => (
    <Modal
      visible={categoryModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setCategoryModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
              <Ionicons name="close" size={24} color="#0f172a" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={VENDOR_CATEGORIES}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  formData.category === item.label && styles.modalItemSelected,
                ]}
                onPress={() => handleSelectCategory(item)}
              >
                <MaterialCommunityIcons
                  name={item.icon}
                  size={24}
                  color={formData.category === item.label ? '#8b5cf6' : '#64748b'}
                />
                <Text
                  style={[
                    styles.modalItemText,
                    formData.category === item.label && styles.modalItemTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
                {formData.category === item.label && (
                  <Ionicons name="checkmark-circle" size={24} color="#8b5cf6" />
                )}
              </TouchableOpacity>
            )}
            scrollEnabled={false}
          />
        </View>
      </View>
    </Modal>
  );

  const renderCityModal = () => (
    <Modal
      visible={cityModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => {
        setCityModalVisible(false);
        setCitySearch('');
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select City</Text>
            <TouchableOpacity
              onPress={() => {
                setCityModalVisible(false);
                setCitySearch('');
              }}
            >
              <Ionicons name="close" size={24} color="#0f172a" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search cities..."
              value={citySearch}
              onChangeText={setCitySearch}
              placeholderTextColor="#94a3b8"
            />
          </View>

          <FlatList
            data={getFilteredCities()}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  formData.city === item.label && styles.modalItemSelected,
                ]}
                onPress={() => handleSelectCity(item)}
              >
                <MaterialCommunityIcons
                  name={item.icon}
                  size={24}
                  color={formData.city === item.label ? '#3b82f6' : '#64748b'}
                />
                <Text
                  style={[
                    styles.modalItemText,
                    formData.city === item.label && styles.modalItemTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
                {formData.city === item.label && (
                  <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
                )}
              </TouchableOpacity>
            )}
            scrollEnabled={true}
            nestedScrollEnabled={true}
          />
        </View>
      </View>
    </Modal>
  );

  const renderProfessionModal = () => (
    <Modal
      visible={professionModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setProfessionModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Profession</Text>
            <TouchableOpacity onPress={() => setProfessionModalVisible(false)}>
              <Ionicons name="close" size={24} color="#0f172a" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={HOME_SERVICE_PROFESSIONS}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  formData.profession === item.label && styles.modalItemSelected,
                ]}
                onPress={() => handleSelectProfession(item)}
              >
                <MaterialCommunityIcons
                  name={item.icon}
                  size={24}
                  color={formData.profession === item.label ? item.color : '#64748b'}
                />
                <Text
                  style={[
                    styles.modalItemText,
                    formData.profession === item.label && styles.modalItemTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
                {formData.profession === item.label && (
                  <Ionicons name="checkmark-circle" size={24} color={item.color} />
                )}
              </TouchableOpacity>
            )}
            scrollEnabled={false}
          />
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Background elements */}
      <View style={styles.backgroundElements}>
        <View style={[styles.backgroundCircle, styles.circle1]} />
        <View style={[styles.backgroundCircle, styles.circle2]} />
      </View>

      {renderHeader()}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.contentContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {renderCurrentStep()}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Button */}
      <View style={styles.bottomContainer}>
        <ActionButton
          title={isLastStep ? 'Submit for Review' : 'Continue'}
          onPress={handleContinue}
          loading={isLoading}
          icon={isLastStep ? 'checkmark-circle' : 'arrow-forward'}
          color={config.color}
        />
      </View>

      {/* Modals */}
      {renderSpecialtyModal()}
      {renderCategoryModal()}
      {renderCityModal()}
      {renderProfessionModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  backgroundElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  backgroundCircle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'rgba(99, 102, 241, 0.03)',
  },

  circle1: {
    width: 200,
    height: 200,
    top: -50,
    right: -50,
  },

  circle2: {
    width: 150,
    height: 150,
    bottom: 100,
    left: -75,
  },

  header: {
    backgroundColor: 'transparent',
    paddingTop: isAndroid ? 20 : 8,
    paddingBottom: 8,
    paddingHorizontal: 24,
    zIndex: 1000,
  },

  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },

  headerContent: {
    alignItems: 'center',
    marginBottom: 8,
  },

  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.1)',
  },

  appTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#8B5CF6',
    letterSpacing: -0.5,
    marginBottom: 4,
  },

  headerSubtitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 4,
  },

  headerDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },

  keyboardView: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 120,
  },

  contentContainer: {
    flex: 1,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
    paddingTop: 8,
  },

  stepContainer: {
    marginBottom: 24,
  },

  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },

  stepSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#666666',
    marginBottom: 24,
  },

  rowContainer: {
    flexDirection: 'row',
    gap: 12,
  },

  halfWidth: {
    flex: 1,
  },

  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
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

  // Custom Picker Styles
  customPickerContainer: {
    marginBottom: 16,
  },

  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },

  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },

  pickerButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },

  pickerText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#1A1A1A',
  },

  placeholderText: {
    color: '#94a3b8',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    maxHeight: '85%',
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    gap: 8,
  },

  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '400',
    color: '#1A1A1A',
  },

  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f8fafc',
    gap: 12,
  },

  modalItemSelected: {
    backgroundColor: '#f5f3ff',
    borderWidth: 1.5,
    borderColor: '#8b5cf6',
  },

  modalItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
    color: '#666666',
  },

  modalItemTextSelected: {
    color: '#8b5cf6',
    fontWeight: '500',
  },
});