import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { useAppSelector, useAppDispatch } from '../../hooks/useReduxHooks';
import {
  selectBalance,
  selectCurrency,
  fetchWallet,
} from '../../screens/user/wallet/walletSlice';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/Colors';
import { Eye, EyeOff, ArrowUpRight } from 'lucide-react-native';

interface MiniWalletCardProps {
  onPress?: () => void;
}

const getCurrencySymbol = (code: string): string => {
  const map: Record<string, string> = {
    usd: '$', eur: '€', gbp: '£', pkr: '₨', inr: '₹', aed: 'د.إ', sar: '﷼',
  };
  return map[(code || '').toLowerCase()] || code.toUpperCase();
};

const splitMoney = (amount: number) => {
  const fixed = Math.abs(amount).toFixed(2);
  const [whole, cents] = fixed.split('.');
  return {
    whole: parseInt(whole, 10).toLocaleString(),
    cents,
  };
};

const MiniWalletCard: React.FC<MiniWalletCardProps> = ({ onPress }) => {
  const dispatch = useAppDispatch();
  const balance = useAppSelector(selectBalance) as number;
  const currency = useAppSelector(selectCurrency) as string;
  const [showBalance, setShowBalance] = useState(true);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const dotOpacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => { dispatch(fetchWallet()); }, [dispatch]);

  // Subtle live-state breathing animation on the status dot
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotOpacity, {
          toValue: 1, duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(dotOpacity, {
          toValue: 0.5, duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [dotOpacity]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98, tension: 300, friction: 10, useNativeDriver: true,
    }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1, tension: 300, friction: 10, useNativeDriver: true,
    }).start();
  };

  const handleToggleBalance = () => setShowBalance((v) => !v);

  const symbol = getCurrencySymbol(currency);
  const parts = splitMoney(balance);

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.92}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {/* Top row: label + eye toggle */}
        <View style={styles.topRow}>
          <View style={styles.labelGroup}>
            <Animated.View style={[styles.liveDot, { opacity: dotOpacity }]} />
            <Text style={styles.label}>Wallet balance</Text>
          </View>
          <TouchableOpacity
            onPress={handleToggleBalance}
            style={styles.eyeBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            {showBalance
              ? <Eye size={14} color="rgba(255,255,255,0.55)" strokeWidth={1.75} />
              : <EyeOff size={14} color="rgba(255,255,255,0.55)" strokeWidth={1.75} />}
          </TouchableOpacity>
        </View>

        {/* Balance line */}
        {showBalance ? (
          <View style={styles.balanceLine}>
            <Text style={styles.balanceSymbol}>{symbol}</Text>
            <Text style={styles.balanceWhole}>{parts.whole}</Text>
            <Text style={styles.balanceCents}>.{parts.cents}</Text>
          </View>
        ) : (
          <Text style={styles.balanceWhole}>••••••</Text>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.currency}>{currency.toUpperCase()}</Text>
          <View style={styles.cta}>
            <Text style={styles.ctaText}>Open wallet</Text>
            <ArrowUpRight size={13} color="#FFFFFF" strokeWidth={2.25} />
          </View>
        </View>

        {/* Hairline accent at the bottom — Stripe-ish thin pop of color */}
        <View style={styles.accentLine} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  card: {
    backgroundColor: '#0B0B0F', // near-black, more refined than gradient
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 16,
    overflow: 'hidden',
    // Very subtle shadow — fintech, not flashy
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  liveDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#34D399',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  eyeBtn: {
    width: 24, height: 24,
    alignItems: 'center', justifyContent: 'center',
  },

  balanceLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 14,
  },
  balanceSymbol: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    marginRight: 1,
    letterSpacing: -0.3,
  },
  balanceWhole: {
    fontSize: 30,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
    lineHeight: 34,
  },
  balanceCents: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.2,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currency: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.6,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },

  accentLine: {
    position: 'absolute',
    bottom: 0,
    left: 18,
    right: 18,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
});

export default MiniWalletCard;