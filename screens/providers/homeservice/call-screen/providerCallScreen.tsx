// ============================================
// Provider-side call screen (HS7) — SIGNALLING ONLY, mirroring the HS3
// backend decision (SOCKET_API.md): ring/accept/decline/end travel over the
// socket; the actual audio call is handed to the phone's native dialer.
// The UI says so honestly — there is no in-app voice.
// ============================================

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Platform,
  Animated,
  Linking,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { emitEvent, joinBooking } from '../../../../services/socket/socketClient';

type Params = {
  bookingId: string;
  customerName?: string;
  customerPhone?: string;
};

export default function ProviderCallScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: Params }, 'params'>>();
  const { bookingId, customerName, customerPhone } = route.params || ({} as Params);

  const [phase, setPhase] = useState<'idle' | 'ringing' | 'ended'>('idle');
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (bookingId) joinBooking(bookingId);
  }, [bookingId]);

  useEffect(() => {
    if (phase !== 'ringing') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [phase, pulse]);

  const ring = async () => {
    setPhase('ringing');
    await emitEvent('call_ring', { bookingId });
  };

  const endSignal = async () => {
    await emitEvent('call_end', { bookingId });
    setPhase('ended');
    setTimeout(() => navigation.goBack(), 600);
  };

  const dialNative = () => {
    if (customerPhone) {
      emitEvent('call_accept', { bookingId });
      Linking.openURL(`tel:${customerPhone.replace(/\s/g, '')}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#065F46" />
      <View style={styles.body}>
        <Animated.View style={[styles.avatarRing, { transform: [{ scale: pulse }] }]}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={56} color="#10B981" />
          </View>
        </Animated.View>
        <Text style={styles.name}>{customerName || 'Customer'}</Text>
        <Text style={styles.phase}>
          {phase === 'ringing'
            ? 'Ringing…'
            : phase === 'ended'
            ? 'Call ended'
            : 'Ready to call'}
        </Text>

        {/* Honest scope note: no in-app voice */}
        <View style={styles.noteBox}>
          <Ionicons name="information-circle-outline" size={16} color="#A7F3D0" />
          <Text style={styles.noteText}>
            Voice is carried by your phone's dialer. This screen only signals the
            customer that you are calling.
          </Text>
        </View>
      </View>

      <View style={styles.controls}>
        {phase !== 'ringing' ? (
          <>
            <TouchableOpacity style={[styles.ctrlBtn, styles.ringBtn]} onPress={ring}>
              <Ionicons name="notifications" size={26} color="#fff" />
              <Text style={styles.ctrlLabel}>Ring</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.ctrlBtn, styles.dialBtn, !customerPhone && styles.disabled]}
              onPress={dialNative}
              disabled={!customerPhone}
            >
              <Ionicons name="call" size={26} color="#fff" />
              <Text style={styles.ctrlLabel}>Dial</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={[styles.ctrlBtn, styles.endBtn]} onPress={endSignal}>
            <Ionicons name="call" size={26} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
            <Text style={styles.ctrlLabel}>End</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.ctrlBtn, styles.backBtn]} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color="#fff" />
          <Text style={styles.ctrlLabel}>Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#065F46' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  avatarRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: '#34D399',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { color: '#fff', fontSize: 24, fontWeight: '700' },
  phase: { color: '#A7F3D0', fontSize: 15, marginTop: 6 },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 12,
    marginTop: 28,
    maxWidth: 320,
  },
  noteText: { color: '#A7F3D0', fontSize: 12, marginLeft: 8, flex: 1, lineHeight: 17 },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingBottom: Platform.OS === 'ios' ? 30 : 40,
  },
  ctrlBtn: { alignItems: 'center' },
  ctrlLabel: { color: '#fff', fontSize: 12, marginTop: 6 },
  ringBtn: {
    backgroundColor: '#F59E0B',
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialBtn: {
    backgroundColor: '#10B981',
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endBtn: {
    backgroundColor: '#EF4444',
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
});
