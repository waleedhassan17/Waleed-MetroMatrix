import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ChevronLeft, RotateCcw } from 'lucide-react-native';
import { BorderRadius, Shadows, Spacing, makeColors, type ColorType } from '../../../../constants/Colors';
import { useTheme } from '../../../../theme';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { resetReturnRequest, selectReturnRequest, setDetails, setReason, submitReturnRequest } from './returnRequestSlice';
import { ShoppingHeader } from '../../../../components/Shopping/ShoppingHeader';

const reasons = ['Size issue', 'Damaged item', 'Wrong item', 'Late delivery'] as const;

const ReturnRequestScreen: React.FC = () => {
  const { mode } = useTheme();
  const Colors = useMemo(() => makeColors(mode), [mode]);
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const { reason, details, submitting } = useAppSelector(selectReturnRequest);
  const orderId = route.params?.orderId as string | undefined;

  const handleSubmit = async () => {
    if (!orderId) {
      Alert.alert('Missing order', 'Open this screen from a delivered order to request a return.');
      return;
    }
    const result = await dispatch(submitReturnRequest({ orderId }));
    if (submitReturnRequest.fulfilled.match(result)) {
      dispatch(resetReturnRequest());
      Alert.alert('Request submitted', 'We received your return request.');
      navigation.goBack();
    } else {
      Alert.alert('Could not submit', (result.payload as string) || 'Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <ShoppingHeader
        tone="gradient"
        title="Return Request"
        showBack
      />
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

const makeStyles = (Colors: ColorType) => StyleSheet.create({
  // No padding here: the gradient header runs edge to edge; the card carries the gutter.
  container: { flex: 1, backgroundColor: Colors.background },
  card: { marginTop: Spacing.lg, marginHorizontal: Spacing.lg, padding: Spacing.md, borderRadius: BorderRadius.xl, backgroundColor: Colors.surface, ...Shadows.sm },
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