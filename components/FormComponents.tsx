import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Fonts } from '../constants/Fonts';

// Input Field Component
interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  icon: keyof typeof Ionicons.glyphMap;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  editable?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  editable = true,
  multiline = false,
  numberOfLines = 1,
}) => {
  return (
    <View style={styles.inputContainer}>
      <View style={styles.labelContainer}>
        <Ionicons name={icon} size={16} color="#6366f1" />
        <Text style={styles.label}>{label}</Text>
      </View>
      <TextInput
        style={[
          styles.input,
          multiline && styles.multilineInput,
          !editable && styles.disabledInput,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        editable={editable}
        multiline={multiline}
        numberOfLines={numberOfLines}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
};

// Dropdown/Picker Component
interface PickerFieldProps {
  label: string;
  value: string;
  onPress: () => void;
  placeholder: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export const PickerField: React.FC<PickerFieldProps> = ({
  label,
  value,
  onPress,
  placeholder,
  icon,
}) => {
  return (
    <View style={styles.inputContainer}>
      <View style={styles.labelContainer}>
        <Ionicons name={icon} size={16} color="#6366f1" />
        <Text style={styles.label}>{label}</Text>
      </View>
      <TouchableOpacity style={styles.pickerButton} onPress={onPress} activeOpacity={0.7}>
        <Text style={[styles.pickerText, !value && styles.placeholderText]}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#64748b" />
      </TouchableOpacity>
    </View>
  );
};

// Progress Indicator Component
interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  color?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
  color = '#10b981',
}) => {
  return (
    <View style={styles.progressContainer}>
      {Array.from({ length: totalSteps }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.progressDot,
            index < currentStep && { backgroundColor: color },
            index === currentStep - 1 && styles.progressDotActive,
          ]}
        />
      ))}
    </View>
  );
};

// File Upload Component
interface FileUploadProps {
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
  fileName?: string;
  hasFile: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  label,
  icon,
  onPress,
  fileName,
  hasFile,
}) => {
  return (
    <View style={styles.uploadContainer}>
      <View style={styles.uploadHeader}>
        <MaterialCommunityIcons name={icon} size={20} color="#6366f1" />
        <Text style={styles.uploadLabel}>{label}</Text>
      </View>
      <TouchableOpacity
        style={[styles.uploadBox, hasFile && styles.uploadBoxSuccess]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.uploadContent}>
          <Ionicons
            name={hasFile ? 'checkmark-circle' : 'cloud-upload-outline'}
            size={32}
            color={hasFile ? '#10b981' : '#94a3b8'}
          />
          <Text style={styles.uploadText}>
            {hasFile && fileName
              ? fileName
              : 'Click to upload or drag and drop'}
          </Text>
          <Text style={styles.uploadSubtext}>
            PDF, JPG, PNG (Max 5MB)
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

// Info Box Component
interface InfoBoxProps {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export const InfoBox: React.FC<InfoBoxProps> = ({ message, type = 'info' }) => {
  const getColors = () => {
    switch (type) {
      case 'success':
        return { bg: '#dcfce7', border: '#10b981', text: '#166534' };
      case 'warning':
        return { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' };
      case 'error':
        return { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' };
      default:
        return { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' };
    }
  };

  const colors = getColors();

  return (
    <View
      style={[
        styles.infoBox,
        { backgroundColor: colors.bg, borderColor: colors.border },
      ]}
    >
      <Ionicons name="information-circle" size={20} color={colors.border} />
      <Text style={[styles.infoText, { color: colors.text }]}>{message}</Text>
    </View>
  );
};

// Social Login Button
interface SocialButtonProps {
  provider: 'google' | 'facebook';
  onPress: () => void;
}

export const SocialButton: React.FC<SocialButtonProps> = ({ provider, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.socialButton}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons
        name={provider === 'google' ? 'logo-google' : 'logo-facebook'}
        size={20}
        color="#64748b"
      />
      <Text style={styles.socialButtonText}>
        {provider === 'google' ? 'Google' : 'Facebook'}
      </Text>
    </TouchableOpacity>
  );
};

// Primary Action Button
interface ActionButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  icon,
  color,
}) => {
  const isPrimary = variant === 'primary';
  const buttonColor = color || '#10b981';

  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
        isPrimary && { backgroundColor: buttonColor },
        !isPrimary && styles.secondaryButton,
        disabled && styles.disabledButton,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      <Text
        style={[
          styles.actionButtonText,
          !isPrimary && styles.secondaryButtonText,
        ]}
      >
        {loading ? 'Loading...' : title}
      </Text>
      {icon && !loading && (
        <Ionicons name={icon} size={20} color={isPrimary ? '#ffffff' : buttonColor} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Input Field Styles
  inputContainer: {
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
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '400',
    color: '#1A1A1A',
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
  multilineInput: {
    minHeight: 100,
    paddingTop: 14,
  },
  disabledInput: {
    backgroundColor: '#f8fafc',
    color: '#94a3b8',
  },

  // Picker Field Styles
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

  // Progress Indicator Styles
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginVertical: 16,
  },
  progressDot: {
    width: 32,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
  },
  progressDotActive: {
    width: 48,
  },

  // File Upload Styles
  uploadContainer: {
    marginBottom: 16,
  },
  uploadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  uploadLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  uploadBox: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  uploadBoxSuccess: {
    borderColor: '#10b981',
    borderStyle: 'solid',
    backgroundColor: '#f0fdf4',
  },
  uploadContent: {
    alignItems: 'center',
  },
  uploadText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
    marginTop: 8,
    textAlign: 'center',
  },
  uploadSubtext: {
    fontSize: 12,
    fontWeight: '400',
    color: '#94a3b8',
    marginTop: 4,
  },

  // Info Box Styles
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginVertical: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },

  // Social Button Styles
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
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
  socialButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#475569',
  },

  // Action Button Styles
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#10b981',
  },
  disabledButton: {
    backgroundColor: '#cbd5e1',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.1,
      },
    }),
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  secondaryButtonText: {
    color: '#10b981',
  },
});