import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppSelector, useAppDispatch } from '../hooks/useReduxHooks';
import {
  selectStreetAddress,
  selectCity,
  selectPostalCode,
  selectStatus,
  setStreetAddress,
  setCity,
  setPostalCode,
} from '../screens/authentication-screens/profile-info/completeProfileSlice';
import CustomInput from './CustomInput';

const Step2LocationInfo = () => {
  const dispatch = useAppDispatch();
  
  const streetAddress = useAppSelector(selectStreetAddress);
  const city = useAppSelector(selectCity);
  const postalCode = useAppSelector(selectPostalCode);
  const status = useAppSelector(selectStatus);

  const isLoading = status === 'loading';

  return (
    <View style={styles.formContainer}>
      {/* Street Address */}
      <Text style={styles.label}>Street Address</Text>
      <CustomInput
        placeholder="Enter your street address"
        value={streetAddress}
        onChangeText={(value) => dispatch(setStreetAddress(value))}
        autoCapitalize="words"
        style={styles.input}
        editable={!isLoading}
      />

      {/* City and Postal Code Row */}
      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.label}>City</Text>
          <CustomInput
            placeholder="Select city"
            value={city}
            onChangeText={(value) => dispatch(setCity(value))}
            autoCapitalize="words"
            style={styles.input}
            editable={!isLoading}
          />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.label}>Postal Code</Text>
          <CustomInput
            placeholder="54000"
            value={postalCode}
            onChangeText={(value) => dispatch(setPostalCode(value))}
            keyboardType="number-pad"
            maxLength={5}
            style={styles.input}
            editable={!isLoading}
          />
        </View>
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
  input: {
    marginBottom: 0,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
});

export default Step2LocationInfo;
