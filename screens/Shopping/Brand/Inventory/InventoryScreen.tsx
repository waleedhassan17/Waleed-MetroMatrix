import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { ChevronLeft, Minus, Plus, Warehouse } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors, BorderRadius, Shadows, Spacing } from '../../../../constants/Colors';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { selectInventory, updateStock } from './inventorySlice';

const InventoryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { rows } = useAppSelector(selectInventory);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={20} stroke={Colors.text.primary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.title}>Inventory</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {rows.map((row) => (
          <View key={row.variantId} style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{row.productName}</Text>
              <Text style={styles.rowSubtitle}>{row.sku}</Text>
            </View>
            <View style={styles.stockBox}>
              <Text style={styles.stockValue}>{row.stockQuantity}</Text>
              <Text style={styles.stockLabel}>stock</Text>
            </View>
            <View style={styles.adjustRow}>
              <TouchableOpacity style={styles.adjustBtn} onPress={() => dispatch(updateStock({ variantId: row.variantId, stockQuantity: Math.max(0, row.stockQuantity - 1) }))}>
                <Minus size={14} stroke={Colors.primary} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.adjustBtn} onPress={() => dispatch(updateStock({ variantId: row.variantId, stockQuantity: row.stockQuantity + 1 }))}>
                <Plus size={14} stroke={Colors.primary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={styles.notice}>
          <Warehouse size={18} stroke={Colors.primary} strokeWidth={2} />
          <Text style={styles.noticeText}>Adjusting stock updates the brand inventory instantly in this demo state.</Text>
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
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.xl, backgroundColor: Colors.surface, ...Shadows.sm },
  rowTitle: { fontSize: 14, fontWeight: '800', color: Colors.text.primary },
  rowSubtitle: { marginTop: 2, fontSize: 12, color: Colors.text.secondary },
  stockBox: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: BorderRadius.lg, backgroundColor: Colors.primaryMuted },
  stockValue: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  stockLabel: { fontSize: 11, color: Colors.primary },
  adjustRow: { flexDirection: 'row', gap: 8 },
  adjustBtn: { width: 36, height: 36, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.backgroundAlt },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.lg, padding: Spacing.md, borderRadius: BorderRadius.lg, backgroundColor: Colors.primaryMuted },
  noticeText: { flex: 1, fontSize: 12, color: Colors.text.secondary },
});

export default InventoryScreen;