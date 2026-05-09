import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, PackageCheck, XCircle } from 'lucide-react-native';
import { Colors, BorderRadius, Shadows, Spacing } from '../../../../constants/Colors';
import { BrandRouteNames } from '../../../../navigation-maps/Shopping';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { selectBrandOrderById, updateOrderStatus } from '../BrandOrders/brandOrdersSlice';
import { resetProcessOrder, selectProcessOrder, setCarrier, setNotes, setSaving, setTrackingNumber } from './processOrderSlice';

const ProcessOrderScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const orderId = route.params?.orderId as string;
  const order = useAppSelector(selectBrandOrderById(orderId));
  const { carrier, notes, saving, trackingNumber } = useAppSelector(selectProcessOrder);

  useEffect(() => {
    return () => {
      dispatch(resetProcessOrder());
    };
  }, [dispatch]);

  const handleUpdate = (nextStatus: 'processing' | 'shipped' | 'delivered' | 'cancelled') => {
    dispatch(setSaving(true));
    setTimeout(() => {
      dispatch(updateOrderStatus({ orderId, orderStatus: nextStatus, trackingNumber: trackingNumber || undefined }));
      dispatch(setSaving(false));
      Alert.alert('Order updated', `Order moved to ${nextStatus.replace('_', ' ')}.`);
      navigation.navigate(BrandRouteNames.BrandOrders);
    }, 500);
  };

  if (!order) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>Order not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} stroke={Colors.text.primary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.title}>Process Order</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <Text style={styles.orderId}>{order.orderId}</Text>
          <Text style={styles.customer}>{order.shippingAddress.fullName}</Text>
          <Text style={styles.meta}>Status: {order.orderStatus}</Text>
          <Text style={styles.meta}>Payment: {order.paymentMethod} · {order.paymentStatus}</Text>
          <Text style={styles.meta}>Total: PKR {order.total.toLocaleString()}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tracking</Text>
          <TextInput style={styles.input} placeholder="Tracking number" placeholderTextColor={Colors.text.tertiary} value={trackingNumber} onChangeText={(text) => dispatch(setTrackingNumber(text))} />
          <TextInput style={styles.input} placeholder="Carrier" placeholderTextColor={Colors.text.tertiary} value={carrier} onChangeText={(text) => dispatch(setCarrier(text))} />
          <TextInput style={[styles.input, styles.multiline]} placeholder="Internal notes" placeholderTextColor={Colors.text.tertiary} value={notes} onChangeText={(text) => dispatch(setNotes(text))} multiline />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          {order.items.map((item) => (
            <View key={item.itemId} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.productName}</Text>
              <Text style={styles.itemMeta}>{item.quantity} × PKR {item.unitPrice.toLocaleString()}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, styles.processingBtn]} disabled={saving} onPress={() => handleUpdate('processing')}>
            <PackageCheck size={16} stroke="#FFF" strokeWidth={2} />
            <Text style={styles.actionText}>Mark Processing</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.shipBtn]} disabled={saving} onPress={() => handleUpdate('shipped')}>
            <PackageCheck size={16} stroke="#FFF" strokeWidth={2} />
            <Text style={styles.actionText}>Mark Shipped</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} disabled={saving} onPress={() => handleUpdate('cancelled')}>
            <XCircle size={16} stroke="#FFF" strokeWidth={2} />
            <Text style={styles.actionText}>Cancel</Text>
          </TouchableOpacity>
        </View>
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
  summaryCard: { padding: Spacing.md, borderRadius: BorderRadius.xl, backgroundColor: Colors.surface, ...Shadows.sm },
  orderId: { fontSize: 18, fontWeight: '800', color: Colors.text.primary },
  customer: { marginTop: 4, fontSize: 14, fontWeight: '700', color: Colors.text.secondary },
  meta: { marginTop: 4, fontSize: 12, color: Colors.text.secondary },
  section: { marginTop: Spacing.lg, padding: Spacing.md, borderRadius: BorderRadius.xl, backgroundColor: Colors.surface, ...Shadows.sm },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.text.primary, marginBottom: Spacing.sm },
  input: { marginBottom: Spacing.md, paddingHorizontal: Spacing.md, height: 48, borderRadius: BorderRadius.lg, backgroundColor: Colors.backgroundAlt, color: Colors.text.primary },
  multiline: { height: 100, textAlignVertical: 'top', paddingTop: Spacing.md },
  itemRow: { paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  itemName: { fontSize: 14, fontWeight: '700', color: Colors.text.primary },
  itemMeta: { marginTop: 2, fontSize: 12, color: Colors.text.secondary },
  actionRow: { marginTop: Spacing.lg, gap: Spacing.sm },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: BorderRadius.lg },
  processingBtn: { backgroundColor: Colors.primary },
  shipBtn: { backgroundColor: Colors.info },
  cancelBtn: { backgroundColor: Colors.error },
  actionText: { color: '#FFF', fontWeight: '800' },
  empty: { flex: 1, textAlign: 'center', textAlignVertical: 'center', fontSize: 16, color: Colors.text.secondary },
});

export default ProcessOrderScreen;