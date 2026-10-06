// ============================================================================
// One shopping order: who bought what from which brand, the money, its status
// history, the other orders from the same checkout, and the two audited admin
// actions.
//
//  - Change status (reason required). The moves offered are the server's own
//    (orderService ALLOWED_TRANSITIONS); its refusal is shown as it is.
//  - Refund (needs Finance). A paid order, in full, to the customer's wallet;
//    the brand's payout for it is taken back.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { AdminScreen, ConfirmSheet, DetailRow, EntityRow, FilterChips, PermissionGate, QueryState, Section, StatusBadge } from '../../../../components/admin';
import { Button, ListRow, ToneBadge, showToast } from '../../../../components/ui';
import { formatMoney } from '../../../../constants/Currency';
import { presentStatus, useAdminMeta } from '../../../../hooks/useAdminMeta';
import { adminErrorOf } from '../../../../networks/admin/adminApi';
import { useForceShopOrderStatusMutation, useGetShopOrderQuery, useRefundShopOrderMutation } from '../../../../networks/admin/shoppingApi';
import { AdminShoppingRouteNames } from '../../../../navigation-maps/Shopping';
import { formatDateTime } from '../../../../utils/admin/format';
import { S, T, useTheme, type ThemeColors } from '../../../../theme';
import { openProvider } from '../../people/openProvider';
import { NEXT_ORDER_STATUSES, humanise, paymentLabel } from '../shared/orders';

export default function AdminShoppingOrderDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const { orderId } = (useRoute().params ?? {}) as { orderId: string };
  const { data: meta } = useAdminMeta();
  const query = useGetShopOrderQuery(orderId);
  const o = query.data;
  const [forceStatus, forceState] = useForceShopOrderStatusMutation();
  const [refund, refundState] = useRefundShopOrderMutation();

  const [sheet, setSheet] = useState<null | 'status' | 'refund'>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const next = o ? NEXT_ORDER_STATUSES[o.orderStatus] ?? [] : [];
  const paid = o?.paymentStatus === 'paid';
  const siblings = (o?.group?.orders ?? []).filter((s) => s.orderId !== o?.orderId);

  const close = () => {
    setSheet(null);
    setTarget(null);
    setError(null);
  };

  const confirm = async (reason: string) => {
    if (!o) return;
    if (sheet === 'status') {
      if (!target) return setError('Choose the new status.');
      const res = await forceStatus({ id: o.id, status: target, reason });
      if ('error' in res) return setError(adminErrorOf(res.error)?.message || 'The status could not be changed.');
      close();
      showToast({ tone: 'success', message: `Status changed to ${presentStatus(meta, 'orderStatuses', target).label}.` });
    } else if (sheet === 'refund') {
      const res = await refund({ id: o.id, reason });
      if ('error' in res) return setError(adminErrorOf(res.error)?.message || 'The refund did not go through.');
      close();
      showToast({ tone: 'success', message: `${formatMoney(o.total)} refunded to the customer's wallet.` });
    }
  };

  return (
    <AdminScreen
      title={o?.odexId ?? 'Order'}
      subtitle="Shopping"
      refreshing={query.isFetching && !query.isLoading}
      onRefresh={query.refetch}
      footer={
        o && (next.length || paid) ? (
          <PermissionGate all={['canManageShopping']} fallback={null}>
            <View style={styles.footer}>
              {next.length > 0 && <Button label="Change status" variant="secondary" onPress={() => setSheet('status')} style={styles.footerButton} />}
              {paid && (
                <PermissionGate all={['canManageFinance']} fallback={null}>
                  <Button label="Refund" variant="secondary" onPress={() => setSheet('refund')} style={styles.footerButton} />
                </PermissionGate>
              )}
            </View>
          </PermissionGate>
        ) : undefined
      }
    >
      <PermissionGate all={['canManageShopping']} action="see this order">
        <QueryState isLoading={query.isLoading} error={query.error} onRetry={query.refetch} skeleton="detail" action="see this order">
          {o && (
            <>
              <View style={styles.header}>
                <Text style={styles.title}>{formatMoney(o.total)}</Text>
                <Text style={styles.sub}>Placed {formatDateTime(o.createdAt)}</Text>
                <View style={styles.badges}>
                  <StatusBadge group="orderStatuses" value={o.orderStatus} />
                  <ToneBadge label={`${paymentLabel(o.paymentStatus)}${o.paymentMethod ? ` · ${humanise(o.paymentMethod)}` : ''}`} tone={paid ? 'success' : o.paymentStatus === 'refunded' ? 'neutral' : 'warning'} />
                </View>
              </View>

              <Section title="People" card>
                <EntityRow
                  avatar={{ name: o.customerName || 'Customer' }}
                  title={o.customerName || 'Customer'}
                  subtitle={['Customer', o.customerEmail].filter(Boolean).join(' · ')}
                  onPress={o.userId ? () => navigation.navigate('AdminUserDetail', { userId: o.userId }) : undefined}
                />
                <EntityRow
                  icon="storefront-outline"
                  title={o.brandName || 'Brand'}
                  subtitle={o.brandOwnerId ? 'Brand · opens its vendor' : 'Brand run by the platform'}
                  onPress={o.brandOwnerId ? () => openProvider(navigation, o.brandOwnerId) : undefined}
                  divider={false}
                />
              </Section>

              <Section title="Items" card>
                {o.items.map((item, i) => (
                  <DetailRow
                    key={item.itemId || `${item.productName}-${i}`}
                    label={`${item.productName}${item.variantLabel ? ` (${item.variantLabel})` : ''} × ${item.quantity}`}
                    value={formatMoney(item.totalPrice)}
                    last={i === o.items.length - 1}
                  />
                ))}
              </Section>

              <Section title="Money" card>
                <DetailRow label="Items" value={formatMoney(o.subtotal)} />
                <DetailRow label="Shipping" value={formatMoney(o.shippingFee)} />
                {!!o.discount && <DetailRow label="Discount" value={formatMoney(-o.discount)} />}
                <DetailRow label="Total" value={formatMoney(o.total)} last />
              </Section>

              {!!o.shippingAddress && (
                <Section title="Delivery" card>
                  <DetailRow label="To" value={o.shippingAddress.fullName} />
                  <DetailRow label="Address" value={[o.shippingAddress.addressLine1, o.shippingAddress.city].filter(Boolean).join(', ')} />
                  <DetailRow label="Phone" value={o.shippingAddress.phone} last />
                </Section>
              )}

              <Section title="Status history" card>
                {(o.statusHistory ?? []).length === 0 ? (
                  <Text style={styles.muted}>No changes recorded.</Text>
                ) : (
                  [...(o.statusHistory ?? [])].reverse().map((h, i, all) => (
                    <View key={`${h.status}-${h.changedAt}-${i}`} style={[styles.history, i < all.length - 1 && styles.divider]}>
                      <Text style={styles.historyStatus}>{presentStatus(meta, 'orderStatuses', h.status).label}</Text>
                      <Text style={styles.historyMeta}>
                        {formatDateTime(h.changedAt)}
                        {h.changedBy?.role ? ` · by ${h.changedBy.role}` : ''}
                        {h.note ? ` — ${h.note}` : ''}
                      </Text>
                    </View>
                  ))
                )}
              </Section>

              {siblings.length > 0 && (
                <Section title="Same checkout" caption="The customer paid for these together." card>
                  {siblings.map((s, i) => (
                    <ListRow
                      key={s.orderId}
                      title={s.odexId}
                      subtitle={`${presentStatus(meta, 'orderStatuses', s.orderStatus).label} · ${formatMoney(s.total)}`}
                      icon="receipt-outline"
                      onPress={() => navigation.push(AdminShoppingRouteNames.AdminShoppingOrderDetail, { orderId: s.orderId })}
                      divider={i < siblings.length - 1}
                    />
                  ))}
                </Section>
              )}
            </>
          )}
        </QueryState>
      </PermissionGate>

      <ConfirmSheet
        visible={sheet !== null}
        title={sheet === 'status' ? 'Change order status' : "Refund to the customer's wallet"}
        message={
          sheet === 'status'
            ? 'For when the order is stuck. The customer and the brand see the new status.'
            : `${formatMoney(o?.total)} goes back to the customer's wallet, and the brand's payout for this order is taken back.`
        }
        confirmLabel={sheet === 'status' ? 'Change status' : 'Refund'}
        destructive={sheet === 'refund'}
        requireReason
        busy={forceState.isLoading || refundState.isLoading}
        error={error}
        onConfirm={confirm}
        onClose={close}
      >
        {sheet === 'status' && (
          <FilterChips options={next.map((s) => ({ value: s, label: presentStatus(meta, 'orderStatuses', s).label }))} value={target ?? ''} onChange={setTarget} />
        )}
      </ConfirmSheet>
    </AdminScreen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    header: { marginBottom: S.xl },
    title: { ...T.heading, color: c.ink },
    sub: { ...T.body, color: c.inkMuted, marginTop: 2 },
    badges: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, marginTop: S.sm },
    muted: { ...T.body, color: c.inkMuted, paddingVertical: S.md },
    history: { paddingVertical: S.md },
    divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
    historyStatus: { ...T.bodyStrong, color: c.ink },
    historyMeta: { ...T.caption, color: c.inkMuted, marginTop: 2 },
    footer: { flexDirection: 'row', gap: S.sm },
    footerButton: { flex: 1 },
  });
