import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { CircleCheckBig, ClipboardList, MapPinned } from 'lucide-react-native';
import { Colors, BorderRadius, Shadows, Spacing } from '../../../../constants/Colors';
import { ShoppingRouteNames } from '../../../../navigation-maps/Shopping';
import { useAppDispatch } from '../../../../store/hooks';
import { setLastOrderId } from './orderConfirmationSlice';

const OrderConfirmationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const orderId = route.params?.orderId as string | undefined;

  useEffect(() => {
    if (orderId) {
      dispatch(setLastOrderId(orderId));
    }
  }, [dispatch, orderId]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <View style={styles.card}>
        <CircleCheckBig size={56} stroke={Colors.primary} strokeWidth={1.75} />
        <Text style={styles.title}>Order confirmed</Text>
        <Text style={styles.subtitle}>Your order {orderId ?? ''} has been placed successfully.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate(ShoppingRouteNames.MyOrders)}>
          <ClipboardList size={16} stroke="#FFF" strokeWidth={2} />
          <Text style={styles.primaryText}>View Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate(ShoppingRouteNames.OrderTracking, { orderId })}>
          <MapPinned size={16} stroke={Colors.primary} strokeWidth={2} />
          <Text style={styles.secondaryText}>Track Order</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, padding: Spacing.lg },
  card: { width: '100%', alignItems: 'center', padding: Spacing.xl, borderRadius: BorderRadius.xl, backgroundColor: Colors.surface, ...Shadows.sm },
  title: { marginTop: Spacing.md, fontSize: 24, fontWeight: '800', color: Colors.text.primary },
  subtitle: { marginTop: Spacing.sm, fontSize: 14, textAlign: 'center', color: Colors.text.secondary, lineHeight: 20 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.lg, paddingHorizontal: 18, paddingVertical: 14, borderRadius: BorderRadius.lg, backgroundColor: Colors.primary },
  primaryText: { color: '#FFF', fontWeight: '800' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.sm, paddingHorizontal: 18, paddingVertical: 14, borderRadius: BorderRadius.lg, backgroundColor: Colors.primaryMuted },
  secondaryText: { color: Colors.primary, fontWeight: '800' },
});

export default OrderConfirmationScreen;