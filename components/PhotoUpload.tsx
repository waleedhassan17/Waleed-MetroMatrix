import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useAppSelector, useAppDispatch } from '../hooks/useReduxHooks';
import {
  selectProfilePhoto,
  selectPhotoFileSize,
  selectUploadProgress,
  setProfilePhoto,
  setPhotoMetadata,
  clearProfilePhoto,
} from '../screens/authentication-screens/profile-info/completeProfileSlice';

// Allowed file types (matching backend)
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB (updated to match backend)

// Error codes from backend
const UPLOAD_ERROR_CODES = {
  FILE_SIZE_EXCEEDED: 'FILE_SIZE_EXCEEDED',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  UPLOAD_ERROR: 'UPLOAD_ERROR',
  NO_FILE: 'NO_FILE',
};

const Step3PhotoUpload = () => {
  const dispatch = useAppDispatch();
  const profilePhoto = useAppSelector(selectProfilePhoto);
  const photoFileSize = useAppSelector(selectPhotoFileSize);
  const uploadProgress = useAppSelector(selectUploadProgress);
  const [isProcessing, setIsProcessing] = useState(false);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Please grant camera roll permissions to upload a photo.'
          );
          return false;
        }
      } catch (error) {
        console.error('Permission request error:', error);
        return false;
      }
    }
    return true;
  };

  const getFileInfo = async (uri: string) => {
    try {
      if (Platform.OS === 'web') {
        return null;
      }
      const fileInfo = await FileSystem.getInfoAsync(uri);
      return fileInfo;
    } catch (error) {
      console.log('Error getting file info:', error);
      return null;
    }
  };

  const getMimeType = (uri: string): string => {
    const extension = uri.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      default:
        return 'image/jpeg';
    }
  };

  const validateFileType = (mimeType: string): boolean => {
    return ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase());
  };

  const calculateFileSize = async (asset: ImagePicker.ImagePickerAsset, fileUri: string) => {
    try {
      if (asset.fileSize && asset.fileSize > 0) {
        console.log('File size from asset:', asset.fileSize);
        return asset.fileSize;
      }

      if (Platform.OS !== 'web') {
        const fileInfo = await getFileInfo(fileUri);
        if (fileInfo && 'size' in fileInfo && fileInfo.size) {
          console.log('File size from FileSystem:', fileInfo.size);
          return fileInfo.size;
        }
      }

      const width = asset.width || 1024;
      const height = asset.height || 1024;
      const estimatedSize = Math.floor(width * height * 0.3);
      console.log('Estimated file size:', estimatedSize);
      return estimatedSize;
    } catch (error) {
      console.error('Error calculating file size:', error);
      return 1024 * 1024;
    }
  };

  const getErrorMessage = (code: string | undefined, defaultMessage: string): string => {
    switch (code) {
      case UPLOAD_ERROR_CODES.FILE_SIZE_EXCEEDED:
        return 'File size exceeds 5MB limit. Please select a smaller image.';
      case UPLOAD_ERROR_CODES.INVALID_FILE_TYPE:
        return 'Invalid file type. Please select a JPEG, PNG, GIF, or WebP image.';
      case UPLOAD_ERROR_CODES.NO_FILE:
        return 'No file selected. Please choose an image.';
      case UPLOAD_ERROR_CODES.UPLOAD_ERROR:
        return 'Failed to upload image. Please try again.';
      default:
        return defaultMessage;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleImageSelection = useCallback(async (asset: ImagePicker.ImagePickerAsset) => {
    try {
      if (!asset || !asset.uri) {
        throw new Error('Invalid asset returned');
      }

      const fileUri = asset.uri;
      const fileName = asset.uri.split('/').pop() || `profile-${Date.now()}.jpg`;
      const fileType = getMimeType(fileUri);

      console.log('Image asset:', {
        uri: fileUri,
        fileName: fileName,
        width: asset.width,
        height: asset.height,
        assetFileSize: asset.fileSize,
        fileType: fileType,
      });

      // Validate file type
      if (!validateFileType(fileType)) {
        Alert.alert(
          'Invalid File Type',
          'Please select a JPEG, PNG, GIF, or WebP image.',
          [{ text: 'OK' }]
        );
        return false;
      }

      const fileSize = await calculateFileSize(asset, fileUri);
      console.log('Final calculated file size:', fileSize, 'bytes');

      // Validate file size
      if (fileSize > MAX_SIZE) {
        Alert.alert(
          'File Too Large',
          `The selected image is ${formatFileSize(fileSize)}. Please select an image smaller than 5MB.`,
          [{ text: 'OK' }]
        );
        return false;
      }

      dispatch(setProfilePhoto(fileUri));
      dispatch(setPhotoMetadata({
        fileName,
        fileType,
        fileSize,
      }));

      console.log('✅ Photo metadata set:', {
        uri: fileUri,
        fileName,
        fileType,
        fileSize,
      });

      return true;
    } catch (error: any) {
      console.error('Error handling image selection:', error);
      Alert.alert(
        'Error', 
        getErrorMessage(error.code, 'Failed to process image. Please try again.')
      );
      return false;
    }
  }, [dispatch]);

  const pickImage = useCallback(async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsProcessing(true);
        await handleImageSelection(result.assets[0]);
        setIsProcessing(false);
      }
    } catch (error: any) {
      console.error('❌ Image picker error:', error);
      setIsProcessing(false);
      Alert.alert(
        'Error', 
        getErrorMessage(error.code, 'Failed to pick image. Please try again.')
      );
    }
  }, [handleImageSelection]);

  const takePhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant camera permissions to take a photo.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsProcessing(true);
        await handleImageSelection(result.assets[0]);
        setIsProcessing(false);
      }
    } catch (error: any) {
      console.error('❌ Camera error:', error);
      setIsProcessing(false);
      Alert.alert(
        'Error', 
        getErrorMessage(error.code, 'Failed to take photo. Please try again.')
      );
    }
  }, [handleImageSelection]);

  const handleRemovePhoto = useCallback(() => {
    dispatch(clearProfilePhoto());
    console.log('📸 Photo removed');
  }, [dispatch]);

  const confirmRemovePhoto = useCallback(() => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove this photo?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: handleRemovePhoto,
        },
      ]
    );
  }, [handleRemovePhoto]);

  const showImageOptions = useCallback(() => {
    const options: Array<{
      text: string;
      onPress?: () => void;
      style?: 'default' | 'cancel' | 'destructive';
    }> = [
      {
        text: 'Take Photo',
        onPress: () => { takePhoto(); },
      },
      {
        text: 'Choose from Library',
        onPress: () => { pickImage(); },
      },
    ];

    // Add remove option if photo exists
    if (profilePhoto) {
      options.push({
        text: 'Remove Photo',
        onPress: confirmRemovePhoto,
        style: 'destructive',
      });
    }

    options.push({
      text: 'Cancel',
      style: 'cancel',
    });

    Alert.alert('Profile Photo', 'Choose an option', options);
  }, [takePhoto, pickImage, confirmRemovePhoto, profilePhoto]);

  const getFileSizeColor = (bytes: number) => {
    if (bytes === 0) return '#10B981';
    if (bytes > MAX_SIZE) return '#F44336';
    if (bytes > MAX_SIZE * 0.8) return '#FF9800'; // Warning at 80%
    return '#4CAF50';
  };

  if (isProcessing) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Processing image...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.photoSection}>
        {/* Photo Container with Camera Badge */}
        <View style={styles.photoWrapper}>
          <TouchableOpacity
            style={styles.photoContainer}
            onPress={showImageOptions}
            activeOpacity={0.7}
          >
            {profilePhoto ? (
              <Image 
                source={{ uri: profilePhoto }} 
                style={styles.photo}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.placeholderContainer}>
                <Ionicons name="person-outline" size={60} color="#A0A0A0" />
              </View>
            )}
          </TouchableOpacity>
          
          {/* Clickable Camera Icon Badge */}
          <TouchableOpacity
            style={styles.cameraIconBadge}
            onPress={showImageOptions}
            activeOpacity={0.8}
          >
            <Ionicons name="camera" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Remove Button (shown when photo exists) */}
          {profilePhoto && (
            <TouchableOpacity
              style={styles.removeIconBadge}
              onPress={confirmRemovePhoto}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Title and Description */}
        <Text style={styles.title}>Profile Photo (Optional)</Text>
        <Text style={styles.description}>Upload your photo</Text>
        <Text style={styles.subtitle}>JPEG, PNG, GIF, WebP (Max 5MB)</Text>

        {/* File Size Display */}
        {photoFileSize > 0 && (
          <View style={styles.fileSizeContainer}>
            <Ionicons 
              name={photoFileSize <= MAX_SIZE ? "checkmark-circle" : "alert-circle"} 
              size={14} 
              color={getFileSizeColor(photoFileSize)} 
            />
            <Text style={[styles.fileSize, { color: getFileSizeColor(photoFileSize) }]}>
              Photo size: {formatFileSize(photoFileSize)}
            </Text>
          </View>
        )}

        {/* Upload Progress (if uploading) */}
        {uploadProgress > 0 && uploadProgress < 100 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${uploadProgress}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>{uploadProgress}%</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  photoSection: {
    alignItems: 'center',
    width: '100%',
  },
  photoWrapper: {
    width: 160,
    height: 160,
    marginBottom: 28,
    position: 'relative',
  },
  photoContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E8E8E8',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  removeIconBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F44336',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 3,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 6,
  },
  fileSizeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  fileSize: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    width: '60%',
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  progressText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
});

export default Step3PhotoUpload;