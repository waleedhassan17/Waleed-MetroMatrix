import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, RotateCcw } from 'lucide-react-native';
import { Colors, BorderRadius, Shadows, Spacing } from '../../../../constants/Colors';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { resetReturnRequest, selectReturnRequest, setDetails, setReason, setSubmitting } from './returnRequestSlice';

const reasons = ['Size issue', 'Damaged item', 'Wrong item', 'Late delivery'] as const;

const ReturnRequestScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { reason, details, submitting } = useAppSelector(selectReturnRequest);

  const handleSubmit = () => {
    dispatch(setSubmitting(true));
    setTimeout(() => {
      dispatch(setSubmitting(false));
      dispatch(resetReturnRequest());
      Alert.alert('Request submitted', 'We received your return request.');
      navigation.goBack();
    }, 500);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}><ChevronLeft size={20} stroke={Colors.text.primary} strokeWidth={2} /></TouchableOpacity>
        <Text style={styles.title}>Return Request</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Reason</Text>
        <View style={styles.chips}>
          {reasons.map((item) => {
            const active = reason === item;
            return <TouchableOpacity key={item} style={[styles.chip, active && styles.chipActive]} onPress={() => dispatch(setReason(item))}><Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text></TouchableOpacity>;
          })}
        </View>
        <Text style={styles.label}>Details</Text>
        <TextInput style={styles.input} placeholder="Tell us more" placeholderTextColor={Colors.text.tertiary} multiline value={details} onChangeText={(text) => dispatch(setDetails(text))} />
        <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.7 }]} disabled={submitting} onPress={handleSubmit}>
          <RotateCcw size={16} stroke="#FFF" strokeWidth={2} />
          <Text style={styles.submitText}>{submitting ? 'Submitting...' : 'Submit Request'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Spacing.xl, paddingBottom: Spacing.md },
  iconBtn: { width: 40, height: 40, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, ...Shadows.sm },
  title: { fontSize: 20, fontWeight: '800', color: Colors.text.primary },
  card: { marginTop: Spacing.lg, padding: Spacing.md, borderRadius: BorderRadius.xl, backgroundColor: Colors.surface, ...Shadows.sm },
  label: { fontSize: 12, fontWeight: '700', color: Colors.text.secondary, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: 10, borderRadius: BorderRadius.full, backgroundColor: Colors.backgroundAlt },
  chipActive: { backgroundColor: Colors.primary },
  chipText: { fontSize: 12, fontWeight: '700', color: Colors.text.secondary },
  chipTextActive: { color: '#FFF' },
  input: { height: 120, borderRadius: BorderRadius.lg, padding: Spacing.md, backgroundColor: Colors.backgroundAlt, color: Colors.text.primary, textAlignVertical: 'top' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: Spacing.lg, paddingVertical: 14, borderRadius: BorderRadius.lg, backgroundColor: Colors.primary },
  submitText: { color: '#FFF', fontWeight: '800' },
});

export default ReturnRequestScreen;