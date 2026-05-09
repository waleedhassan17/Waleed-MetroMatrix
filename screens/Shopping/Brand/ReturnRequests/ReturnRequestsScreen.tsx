import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CheckCircle2, ChevronLeft, RotateCcw, XCircle } from 'lucide-react-native';
import { Colors, BorderRadius, Shadows, Spacing } from '../../../../constants/Colors';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { selectReturnRequests, updateReturnStatus } from './returnRequestsSlice';

const ReturnRequestsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { requests } = useAppSelector(selectReturnRequests);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={20} stroke={Colors.text.primary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.title}>Return Requests</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {requests.map((request) => (
          <View key={request.requestId} style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.requestId}>{request.requestId}</Text>
              <Text style={styles.statusTag}>{request.status}</Text>
            </View>
            <Text style={styles.customer}>{request.customerName}</Text>
            <Text style={styles.meta}>Order: {request.orderId}</Text>
            <Text style={styles.reason}>{request.reason}</Text>
            <Text style={styles.meta}>Refund: PKR {request.refundAmount.toLocaleString()}</Text>
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => dispatch(updateReturnStatus({ requestId: request.requestId, status: 'approved' }))}>
                <CheckCircle2 size={14} stroke="#FFF" strokeWidth={2} />
                <Text style={styles.actionText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => dispatch(updateReturnStatus({ requestId: request.requestId, status: 'rejected' }))}>
                <XCircle size={14} stroke="#FFF" strokeWidth={2} />
                <Text style={styles.actionText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.reviewBtn]} onPress={() => dispatch(updateReturnStatus({ requestId: request.requestId, status: 'pending' }))}>
                <RotateCcw size={14} stroke={Colors.primary} strokeWidth={2} />
                <Text style={[styles.actionText, { color: Colors.primary }]}>Reset</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.md },
  iconBtn: { width: 40, height: 40, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, ...Shadows.sm },
  title: { fontSize: 20, fontWeight: '800', color: Colors.text.primary },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  card: { marginBottom: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.xl, backgroundColor: Colors.surface, ...Shadows.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  requestId: { fontSize: 15, fontWeight: '800', color: Colors.text.primary },
  statusTag: { fontSize: 11, fontWeight: '700', color: Colors.primary, backgroundColor: Colors.primaryMuted, paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.full, textTransform: 'capitalize' },
  customer: { marginTop: 4, fontSize: 13, fontWeight: '700', color: Colors.text.secondary },
  meta: { marginTop: 4, fontSize: 12, color: Colors.text.tertiary },
  reason: { marginTop: Spacing.sm, fontSize: 13, color: Colors.text.primary, lineHeight: 18 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: BorderRadius.lg },
  approveBtn: { backgroundColor: Colors.success },
  rejectBtn: { backgroundColor: Colors.error },
  reviewBtn: { backgroundColor: Colors.primaryMuted },
  actionText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
});

export default ReturnRequestsScreen;