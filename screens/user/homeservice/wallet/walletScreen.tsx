import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  Plus,
  Clock,
  ChevronRight,
  ShieldCheck,
  Banknote,
  Receipt,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');
const isAndroid = Platform.OS === 'android';

// Mock wallet data
const walletData = {
  balance: 4250,
  currency: 'Rs',
  lastUpdated: '2 min ago',
  cards: [
    { id: '1', type: 'visa', last4: '4532', isDefault: true },
    { id: '2', type: 'mastercard', last4: '8721', isDefault: false },
  ],
};

// Mock transactions
const transactions = [
  {
    id: '1',
    title: 'Electrician Service',
    provider: 'Ahmed Khan',
    amount: -1500,
    date: 'Today, 2:30 PM',
    status: 'completed',
    icon: 'flash',
    color: '#F59E0B',
  },
  {
    id: '2',
    title: 'Wallet Top-up',
    provider: 'Bank Transfer',
    amount: 5000,
    date: 'Yesterday, 10:00 AM',
    status: 'completed',
    icon: 'add-circle',
    color: '#10B981',
  },
  {
    id: '3',
    title: 'Plumber Service',
    provider: 'Hassan Ali',
    amount: -2500,
    date: 'Feb 8, 11:45 AM',
    status: 'completed',
    icon: 'water',
    color: '#3B82F6',
  },
  {
    id: '4',
    title: 'Cashback Reward',
    provider: 'MetroMatrix Bonus',
    amount: 250,
    date: 'Feb 7, 5:00 PM',
    status: 'completed',
    icon: 'gift',
    color: '#8B5CF6',
  },
  {
    id: '5',
    title: 'AC Repair Service',
    provider: 'Usman Tariq',
    amount: -3000,
    date: 'Feb 5, 3:15 PM',
    status: 'completed',
    icon: 'snow',
    color: '#06B6D4',
  },
];

const quickActions = [
  { id: 'topup', label: 'Top Up', icon: Plus, color: '#10B981', bgColor: '#D1FAE5' },
  { id: 'send', label: 'Send', icon: ArrowUpRight, color: '#3B82F6', bgColor: '#DBEAFE' },
  { id: 'request', label: 'Request', icon: ArrowDownLeft, color: '#8B5CF6', bgColor: '#EDE9FE' },
  { id: 'bills', label: 'Bills', icon: Receipt, color: '#F59E0B', bgColor: '#FEF3C7' },
];

export default function UserWalletScreen() {
  const navigation = useNavigation();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const balanceScaleAnim = useRef(new Animated.Value(0.9)).current;
  const [showBalance, setShowBalance] = useState(true);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.spring(balanceScaleAnim, {
        toValue: 1,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#10B981" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        style={styles.scrollView}
      >
        {/* Header + Balance Card */}
        <LinearGradient
          colors={['#10B981', '#059669', '#047857']}
          style={styles.headerGradient}
        >
          {/* Decorative circles */}
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />

          {/* Top Bar */}
          <SafeAreaView>
            <View style={styles.topBar}>
              <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>My Wallet</Text>
              <TouchableOpacity style={styles.historyButton}>
                <Clock size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          {/* Balance Card */}
          <Animated.View
            style={[
              styles.balanceCard,
              {
                opacity: fadeAnim,
                transform: [{ scale: balanceScaleAnim }],
              },
            ]}
          >
            <View style={styles.balanceHeader}>
              <View style={styles.balanceLabelRow}>
                <Wallet size={18} color="rgba(255,255,255,0.8)" />
                <Text style={styles.balanceLabel}>Available Balance</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowBalance(!showBalance)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showBalance ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="rgba(255,255,255,0.8)"
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.balanceAmount}>
              {showBalance
                ? `${walletData.currency} ${walletData.balance.toLocaleString()}`
                : '••••••'}
            </Text>

            <View style={styles.balanceFooter}>
              <View style={styles.lastUpdated}>
                <View style={styles.liveIndicator} />
                <Text style={styles.lastUpdatedText}>
                  Updated {walletData.lastUpdated}
                </Text>
              </View>
              <View style={styles.securityBadge}>
                <ShieldCheck size={14} color="#10B981" />
                <Text style={styles.securityText}>Secured</Text>
              </View>
            </View>
          </Animated.View>
        </LinearGradient>

        {/* Quick Actions */}
        <Animated.View
          style={[
            styles.quickActionsContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.quickActionsRow}>
            {quickActions.map((action) => {
              const ActionIcon = action.icon;
              return (
                <TouchableOpacity
                  key={action.id}
                  style={styles.quickActionItem}
                  activeOpacity={0.7}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: action.bgColor }]}>
                    <ActionIcon size={22} color={action.color} />
                  </View>
                  <Text style={styles.quickActionLabel}>{action.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* Payment Methods */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Payment Methods</Text>
            <TouchableOpacity style={styles.addButton}>
              <Plus size={16} color="#10B981" />
              <Text style={styles.addButtonText}>Add New</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cardsContainer}>
            {walletData.cards.map((card) => (
              <TouchableOpacity key={card.id} style={styles.cardItem} activeOpacity={0.7}>
                <View style={styles.cardIconContainer}>
                  <LinearGradient
                    colors={card.type === 'visa' ? ['#1A1F71', '#2557D6'] : ['#EB001B', '#F79E1B']}
                    style={styles.cardIcon}
                  >
                    <CreditCard size={18} color="#FFFFFF" />
                  </LinearGradient>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardType}>
                    {card.type === 'visa' ? 'Visa' : 'Mastercard'} •••• {card.last4}
                  </Text>
                  {card.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultText}>Default</Text>
                    </View>
                  )}
                </View>
                <ChevronRight size={18} color="#D1D5DB" />
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Recent Transactions */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.transactionsContainer}>
            {transactions.map((transaction, index) => (
              <TouchableOpacity
                key={transaction.id}
                style={[
                  styles.transactionItem,
                  index < transactions.length - 1 && styles.transactionBorder,
                ]}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.transactionIcon,
                    { backgroundColor: `${transaction.color}15` },
                  ]}
                >
                  <Ionicons
                    name={transaction.icon as any}
                    size={20}
                    color={transaction.color}
                  />
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionTitle}>{transaction.title}</Text>
                  <Text style={styles.transactionProvider}>{transaction.provider}</Text>
                </View>
                <View style={styles.transactionAmountContainer}>
                  <Text
                    style={[
                      styles.transactionAmount,
                      { color: transaction.amount > 0 ? '#10B981' : '#1F2937' },
                    ]}
                  >
                    {transaction.amount > 0 ? '+' : ''}
                    {walletData.currency} {Math.abs(transaction.amount).toLocaleString()}
                  </Text>
                  <Text style={styles.transactionDate}>{transaction.date}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },

  // Header
  headerGradient: {
    paddingBottom: 30,
    position: 'relative',
    overflow: 'hidden',
  },
  decorCircle1: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -20,
    left: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: isAndroid ? (StatusBar.currentHeight || 0) + 10 : 10,
    paddingBottom: 10,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  historyButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Balance Card
  balanceCard: {
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  eyeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceAmount: {
    fontSize: 38,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: 16,
  },
  balanceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastUpdated: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34D399',
  },
  lastUpdatedText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  securityText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },

  // Quick Actions
  quickActionsContainer: {
    marginHorizontal: 20,
    marginTop: -15,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickActionItem: {
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },

  // Sections
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },

  // Cards
  cardsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cardIconContainer: {
    marginRight: 14,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardType: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  defaultBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  defaultText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },

  // Transactions
  transactionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  transactionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  transactionProvider: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  transactionDate: {
    fontSize: 11,
    color: '#D1D5DB',
    marginTop: 2,
  },
});
