import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import { ChevronLeft, Check, X, Lock } from 'lucide-react-native';
import { useAppDispatch } from '../../../store/hooks';
import { fetchWallet, clearWalletError } from '../../../services/wallet';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../constants/Colors';

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 44;

const TopUpWebViewScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();

  const { url, sessionId } = route.params as { url: string; sessionId: string };

  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isUpdatingBalance, setIsUpdatingBalance] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const cancelledRef = useRef(false);
  const successStartedRef = useRef(false);

  // Smooth progress bar animation
  const progressAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  const handleCancel = () => navigation.goBack();

  const handleSuccessFlow = useCallback(async () => {
    if (successStartedRef.current) return;
    successStartedRef.current = true;

    setIsUpdatingBalance(true);

    const MAX_ATTEMPTS = 15;
    const INTERVAL_MS = 2000;

    const finish = async (completed: boolean) => {
      if (cancelledRef.current) return;
      setIsUpdatingBalance(false);
      setShowSuccess(true);

      // Always fetch wallet before navigating back — backend may have
      // updated the balance even if the transaction status field wasn't
      // immediately visible in the polling response.
      try {
        await dispatch(fetchWallet()).unwrap();
      } catch {
        /* ignore */
      }

      // Wait a bit longer for any final webhook processing
      setTimeout(() => {
        if (!cancelledRef.current) navigation.goBack();
      }, completed ? 3000 : 2000);
    };

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (cancelledRef.current) return;
      try {
        const result: any = await dispatch(fetchWallet()).unwrap();
        const transactions = result?.transactions ?? [];
        const completedTx = transactions.find(
          (t: any) => t.stripeSessionId === sessionId && t.status === 'completed'
        );
        if (completedTx) {
          await finish(true);
          return;
        }
      } catch {
        /* ignore — keep polling */
      }
      await new Promise((r) => setTimeout(r, INTERVAL_MS));
    }

    await finish(false);
  }, [dispatch, sessionId, navigation]);

  const handleNavigationStateChange = useCallback((navState: any) => {
    const currentUrl = navState.url;

    if (currentUrl.includes('/api/wallet/topup/success') ||
        currentUrl.startsWith('metromatrix://wallet/topup-success')) {
      handleSuccessFlow();
    } else if (currentUrl.includes('/api/wallet/topup/cancel') ||
               currentUrl.startsWith('metromatrix://wallet/topup-cancel')) {
      setShowCancel(true);
      setTimeout(() => navigation.goBack(), 1500);
    }
  }, [handleSuccessFlow, navigation]);

  const handleLoadStart = () => {
    setIsLoading(true);
    setProgress(0.15);
  };
  const handleLoadEnd = () => {
    setProgress(1);
    setTimeout(() => setIsLoading(false), 200);
  };

  useEffect(() => {
    return () => { cancelledRef.current = true; };
  }, []);

  useFocusEffect(
    useCallback(() => {
      dispatch(clearWalletError());
    }, [dispatch])
  );

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleCancel}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ChevronLeft size={22} color={Colors.text.primary} strokeWidth={2} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Add money</Text>
          <View style={styles.headerSubRow}>
            <Lock size={9} color={Colors.text.tertiary} strokeWidth={2.5} />
            <Text style={styles.headerSub}>Secure checkout · Stripe</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.closeBtn}
          onPress={handleCancel}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <X size={18} color={Colors.text.primary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Progress bar — minimal hairline, like Stripe's own pages */}
      <View style={styles.progressTrack}>
        {isLoading && (
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        )}
      </View>

      {/* Success Overlay */}
      {showSuccess && (
        <View style={styles.overlay} pointerEvents="auto">
          <View style={styles.statusCard}>
            <View style={styles.statusIconSuccess}>
              <Check size={28} color="#FFFFFF" strokeWidth={2.75} />
            </View>
            <Text style={styles.statusTitle}>Payment received</Text>
            <Text style={styles.statusSub}>Your balance is being updated.</Text>
          </View>
        </View>
      )}

      {/* Cancel Overlay */}
      {showCancel && (
        <View style={styles.overlay} pointerEvents="auto">
          <View style={styles.statusCard}>
            <View style={styles.statusIconCancel}>
              <X size={26} color={Colors.text.secondary} strokeWidth={2.5} />
            </View>
            <Text style={styles.statusTitle}>Payment canceled</Text>
            <Text style={styles.statusSub}>No charge was made.</Text>
          </View>
        </View>
      )}

      {/* Balance Update Overlay */}
      {isUpdatingBalance && (
        <View style={styles.overlay} pointerEvents="auto">
          <View style={styles.statusCard}>
            <ActivityIndicator size="small" color={Colors.text.primary} />
            <Text style={[styles.statusTitle, { marginTop: 14 }]}>
              Confirming with Stripe…
            </Text>
            <Text style={styles.statusSub}>This usually takes a moment.</Text>
          </View>
        </View>
      )}

      {/* WebView */}
      <WebView
        source={{ uri: url }}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onLoadProgress={({ nativeEvent }) => setProgress(nativeEvent.progress)}
        style={styles.webView}
        startInLoadingState={false}
        javaScriptEnabled
        domStorageEnabled
      />

      {/* Initial loader (only while first chrome paints) */}
      {isLoading && progress < 0.4 && (
        <View style={styles.initialLoader} pointerEvents="none">
          <ActivityIndicator size="small" color={Colors.text.tertiary} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: STATUS_BAR_HEIGHT + 4,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    letterSpacing: -0.1,
  },
  headerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  headerSub: {
    fontSize: 10,
    color: Colors.text.tertiary,
    fontWeight: '500',
    letterSpacing: 0.1,
  },

  progressTrack: {
    height: 2,
    backgroundColor: Colors.borderLight,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.text.primary,
  },

  webView: { flex: 1 },

  initialLoader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    top: STATUS_BAR_HEIGHT + 60,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    zIndex: 10,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 28,
    paddingVertical: 32,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 260,
    ...Shadows.large,
  },
  statusIconSuccess: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.success,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  statusIconCancel: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.backgroundAlt,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    letterSpacing: -0.2,
  },
  statusSub: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 4,
    textAlign: 'center',
  },
});

export default TopUpWebViewScreen;