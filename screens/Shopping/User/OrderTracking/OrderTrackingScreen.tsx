import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ChevronLeft, Truck, Package, CheckCircle2, Circle, Clock, Copy, Phone } from 'lucide-react-native';
import { Colors, BorderRadius, Shadows, Spacing } from '../../../../constants/Colors';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { setCurrentOrderId, selectOrderTracking, type TrackingStep } from './orderTrackingSlice';

const ShopColors = { primary: '#E67E22', primaryLight: '#FFF3E6', success: '#27AE60', successLight: '#E8F8F0' };

const OrderTrackingScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const orderId = route.params?.orderId as string | undefined;
  const { currentOrderId, estimatedDelivery, courierName, trackingNumber, steps } = useAppSelector(selectOrderTracking);

  useEffect(() => {
    if (orderId) dispatch(setCurrentOrderId(orderId));
  }, [dispatch, orderId]);

  const formatTime = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })} · ${d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const renderStep = (step: TrackingStep, index: number) => {
    const isLast = index === steps.length - 1;
    const dotColor = step.completed ? ShopColors.success : step.current ? ShopColors.primary : Colors.borderDark;
    const lineColor = step.completed ? ShopColors.success : Colors.borderLight;
    return (
      <View key={step.key} style={styles.stepRow}>
        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, { backgroundColor: dotColor }]}>
            {step.completed ? (
              <CheckCircle2 size={14} stroke="#FFF" strokeWidth={2.5} />
            ) : step.current ? (
              <Circle size={10} stroke="#FFF" fill="#FFF" />
            ) : null}
          </View>
          {!isLast && <View style={[styles.stepLine, { backgroundColor: lineColor }]} />}
        </View>
        <View style={styles.stepContent}>
          <Text style={[styles.stepTitle, (step.completed || step.current) && styles.stepTitleActive]}>
            {step.title}
          </Text>
          <Text style={styles.stepSubtitle}>{step.subtitle}</Text>
          {step.timestamp && (
            <Text style={styles.stepTime}>{formatTime(step.timestamp)}</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={20} stroke={Colors.text.primary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.title}>Track Order</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Order ID Card */}
        <View style={styles.orderCard}>
          <View style={styles.orderCardRow}>
            <View>
              <Text style={styles.orderLabel}>Order ID</Text>
              <Text style={styles.orderValue}>{currentOrderId || orderId || '—'}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: ShopColors.primaryLight }]}>
              <Truck size={14} stroke={ShopColors.primary} strokeWidth={2} />
              <Text style={[styles.statusText, { color: ShopColors.primary }]}>In Transit</Text>
            </View>
          </View>
        </View>

        {/* Estimated Delivery */}
        <View style={styles.deliveryCard}>
          <View style={[styles.deliveryIcon, { backgroundColor: ShopColors.successLight }]}>
            <Clock size={20} stroke={ShopColors.success} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.deliveryLabel}>Estimated Delivery</Text>
            <Text style={styles.deliveryDate}>{estimatedDelivery}</Text>
          </View>
        </View>

        {/* Courier Info */}
        <View style={styles.courierCard}>
          <View style={styles.courierIcon}>
            <Package size={20} stroke={Colors.text.primary} strokeWidth={1.75} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.courierName}>{courierName}</Text>
            <Text style={styles.trackingNum}>{trackingNumber}</Text>
          </View>
          <TouchableOpacity style={styles.copyBtn}>
            <Copy size={16} stroke={ShopColors.primary} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.callBtn}>
            <Phone size={16} stroke="#FFF" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Timeline */}
        <View style={styles.timelineCard}>
          <Text style={styles.timelineTitle}>Tracking Timeline</Text>
          {steps.map(renderStep)}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: (StatusBar.currentHeight || 0) + 12, paddingBottom: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  iconBtn: { width: 40, height: 40, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  title: { fontSize: 18, fontWeight: '700', color: Colors.text.primary },
  scrollContent: { padding: Spacing.lg },

  // Order Card
  orderCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.small },
  orderCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderLabel: { fontSize: 12, color: Colors.text.secondary, marginBottom: 4 },
  orderValue: { fontSize: 16, fontWeight: '700', color: Colors.text.primary },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full },
  statusText: { fontSize: 12, fontWeight: '700' },

  // Delivery
  deliveryCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.small },
  deliveryIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  deliveryLabel: { fontSize: 12, color: Colors.text.secondary },
  deliveryDate: { fontSize: 16, fontWeight: '700', color: Colors.text.primary, marginTop: 2 },

  // Courier
  courierCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.lg, ...Shadows.small },
  courierIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.backgroundAlt, justifyContent: 'center', alignItems: 'center' },
  courierName: { fontSize: 14, fontWeight: '700', color: Colors.text.primary },
  trackingNum: { fontSize: 12, color: Colors.text.secondary, marginTop: 2 },
  copyBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: ShopColors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  callBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: ShopColors.primary, justifyContent: 'center', alignItems: 'center' },

  // Timeline
  timelineCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, ...Shadows.small },
  timelineTitle: { fontSize: 16, fontWeight: '700', color: Colors.text.primary, marginBottom: Spacing.lg },
  stepRow: { flexDirection: 'row', minHeight: 70 },
  stepIndicator: { width: 30, alignItems: 'center' },
  stepDot: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  stepLine: { width: 2, flex: 1, marginTop: -2 },
  stepContent: { flex: 1, paddingLeft: Spacing.md, paddingBottom: Spacing.lg },
  stepTitle: { fontSize: 14, fontWeight: '600', color: Colors.text.tertiary },
  stepTitleActive: { color: Colors.text.primary },
  stepSubtitle: { fontSize: 12, color: Colors.text.secondary, marginTop: 2 },
  stepTime: { fontSize: 11, color: Colors.text.tertiary, marginTop: 4 },
});

export default OrderTrackingScreen;