import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppSelector, useAppDispatch } from '../hooks/useReduxHooks';
import {
  selectDateOfBirth,
  selectGender,
  selectFormattedDateOfBirth,
  selectStatus,
  setDateOfBirth,
  setGender,
} from '../screens/authentication-screens/profile-info/completeProfileSlice';

const Step1PersonalInfo = () => {
  const dispatch = useAppDispatch();
  
  const dateOfBirth = useAppSelector(selectDateOfBirth);
  const gender = useAppSelector(selectGender);
  const formattedDate = useAppSelector(selectFormattedDateOfBirth);
  const status = useAppSelector(selectStatus);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const isLoading = status === 'loading';

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      dispatch(setDateOfBirth(selectedDate.toISOString()));
    }
  };

  return (
    <View style={styles.formContainer}>
      {/* Date of Birth */}
      <Text style={styles.label}>Date of Birth</Text>
      <TouchableOpacity
        style={styles.datePickerButton}
        onPress={() => setShowDatePicker(true)}
        disabled={isLoading}
      >
        <Ionicons name="calendar-outline" size={20} color="#666666" />
        <Text
          style={[
            styles.datePickerText,
            dateOfBirth && styles.datePickerTextSelected,
          ]}
        >
          {dateOfBirth ? formattedDate : 'mm/dd/yyyy'}
        </Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={dateOfBirth ? new Date(dateOfBirth) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={new Date()}
          minimumDate={new Date(1900, 0, 1)}
        />
      )}

      {/* Gender */}
      <Text style={styles.label}>Gender</Text>
      <View style={styles.genderContainer}>
        <TouchableOpacity
          style={[
            styles.genderButton,
            gender === 'male' && styles.genderButtonActive,
          ]}
          onPress={() => dispatch(setGender('male'))}
          disabled={isLoading}
        >
          <Text
            style={[
              styles.genderButtonText,
              gender === 'male' && styles.genderButtonTextActive,
            ]}
          >
            Male
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.genderButton,
            gender === 'female' && styles.genderButtonActive,
          ]}
          onPress={() => dispatch(setGender('female'))}
          disabled={isLoading}
        >
          <Text
            style={[
              styles.genderButtonText,
              gender === 'female' && styles.genderButtonTextActive,
            ]}
          >
            Female
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.genderButton,
            gender === 'other' && styles.genderButtonActive,
          ]}
          onPress={() => dispatch(setGender('other'))}
          disabled={isLoading}
        >
          <Text
            style={[
              styles.genderButtonText,
              gender === 'other' && styles.genderButtonTextActive,
            ]}
          >
            Other
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  formContainer: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 8,
    marginTop: 16,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    gap: 12,
  },
  datePickerText: {
    fontSize: 15,
    color: '#999999',
  },
  datePickerTextSelected: {
    color: '#1A1A1A',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderButtonActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  genderButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666666',
  },
  genderButtonTextActive: {
    color: '#FFFFFF',
  },
});

export default Step1PersonalInfo;
