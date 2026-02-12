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
  TrendingUp,
  Clock,
  ChevronRight,
  ShieldCheck,
  Banknote,
  DollarSign,
  PiggyBank,
  BarChart3,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');
const isAndroid = Platform.OS === 'android';

// Mock wallet data for provider
const walletData = {
  balance: 28750,
  pendingBalance: 3500,
  thisMonthEarnings: 45200,
  currency: 'Rs',
  lastPayout: 'Feb 10, 2025',
};

// Mock earning stats
const earningStats = [
  { label: 'Today', value: 3500, change: '+12%', positive: true },
  { label: 'This Week', value: 18900, change: '+8%', positive: true },
  { label: 'This Month', value: 45200, change: '+15%', positive: true },
];

// Mock transactions for provider
const transactions = [
  {
    id: '1',
    title: 'Electrical Repair',
    client: 'Zain Ahmad',
    amount: 3500,
    date: 'Today, 4:15 PM',
    status: 'completed',
    icon: 'flash',
    color: '#F59E0B',
  },
  {
    id: '2',
    title: 'Withdrawal to Bank',
    client: 'HBL •••• 6721',
    amount: -15000,
    date: 'Yesterday, 2:00 PM',
    status: 'completed',
    icon: 'arrow-up-circle',
    color: '#EF4444',
  },
  {
    id: '3',
    title: 'Plumbing Service',
    client: 'Fatima Shah',
    amount: 4200,
    date: 'Feb 8, 1:30 PM',
    status: 'completed',
    icon: 'water',
    color: '#3B82F6',
  },
  {
    id: '4',
    title: 'Weekly Bonus',
    client: 'MetroMatrix Incentive',
    amount: 1500,
    date: 'Feb 7, 12:00 PM',
    status: 'completed',
    icon: 'star',
    color: '#8B5CF6',
  },
  {
    id: '5',
    title: 'AC Installation',
    client: 'Bilal Raza',
    amount: 8000,
    date: 'Feb 6, 11:00 AM',
    status: 'completed',
    icon: 'snow',
    color: '#06B6D4',
  },
  {
    id: '6',
    title: 'Withdrawal to Bank',
    client: 'HBL •••• 6721',
    amount: -10000,
    date: 'Feb 3, 3:00 PM',
    status: 'completed',
    icon: 'arrow-up-circle',
    color: '#EF4444',
  },
];

const quickActions = [
  { id: 'withdraw', label: 'Withdraw', icon: ArrowUpRight, color: '#10B981', bgColor: '#D1FAE5' },
  { id: 'earnings', label: 'Earnings', icon: BarChart3, color: '#3B82F6', bgColor: '#DBEAFE' },
  { id: 'pending', label: 'Pending', icon: Clock, color: '#F59E0B', bgColor: '#FEF3C7' },
  { id: 'savings', label: 'Savings', icon: PiggyBank, color: '#8B5CF6', bgColor: '#EDE9FE' },
];

export default function ProviderWalletScreen() {
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

          <SafeAreaView>
            <View style={styles.topBar}>
              <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Wallet & Earnings</Text>
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

            {/* Pending + Earnings Row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Pending</Text>
                <Text style={styles.statValue}>
                  {showBalance
                    ? `${walletData.currency} ${walletData.pendingBalance.toLocaleString()}`
                    : '••••'}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>This Month</Text>
                <Text style={styles.statValue}>
                  {showBalance
                    ? `${walletData.currency} ${walletData.thisMonthEarnings.toLocaleString()}`
                    : '••••'}
                </Text>
              </View>
            </View>

            <View style={styles.balanceFooter}>
              <View style={styles.lastUpdated}>
                <View style={styles.liveIndicator} />
                <Text style={styles.lastUpdatedText}>
                  Last payout: {walletData.lastPayout}
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

        {/* Earnings Overview */}
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
            <Text style={styles.sectionTitle}>Earnings Overview</Text>
          </View>

          <View style={styles.earningsRow}>
            {earningStats.map((stat, index) => (
              <View
                key={stat.label}
                style={[
                  styles.earningCard,
                  index < earningStats.length - 1 && { marginRight: 10 },
                ]}
              >
                <Text style={styles.earningLabel}>{stat.label}</Text>
                <Text style={styles.earningValue}>
                  {walletData.currency} {stat.value >= 1000 ? `${(stat.value / 1000).toFixed(1)}k` : stat.value}
                </Text>
                <View
                  style={[
                    styles.changeBadge,
                    { backgroundColor: stat.positive ? '#D1FAE5' : '#FEE2E2' },
                  ]}
                >
                  <TrendingUp
                    size={10}
                    color={stat.positive ? '#10B981' : '#EF4444'}
                  />
                  <Text
                    style={[
                      styles.changeText,
                      { color: stat.positive ? '#059669' : '#DC2626' },
                    ]}
                  >
                    {stat.change}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Withdraw Button */}
        <View style={styles.section}>
          <TouchableOpacity activeOpacity={0.8}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.withdrawButton}
            >
              <Banknote size={20} color="#FFFFFF" />
              <Text style={styles.withdrawButtonText}>Withdraw to Bank Account</Text>
              <ChevronRight size={18} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

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
            <Text style={styles.sectionTitle}>Transaction History</Text>
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
                  <Text style={styles.transactionClient}>{transaction.client}</Text>
                </View>
                <View style={styles.transactionAmountContainer}>
                  <Text
                    style={[
                      styles.transactionAmount,
                      { color: transaction.amount > 0 ? '#10B981' : '#EF4444' },
                    ]}
                  >
                    {transaction.amount > 0 ? '+' : '-'}
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
    marginBottom: 8,
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
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: 14,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 8,
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
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },

  // Earnings
  earningsRow: {
    flexDirection: 'row',
  },
  earningCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  earningLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    marginBottom: 6,
  },
  earningValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  changeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Withdraw Button
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
  },
  withdrawButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
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
  transactionClient: {
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
