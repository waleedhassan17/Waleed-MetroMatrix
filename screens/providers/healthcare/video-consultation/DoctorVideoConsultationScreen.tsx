import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import { startVideoCallApi } from '../../../../networks/healthcare/appointmentApi';

// The doctor-side counterpart of the patient VideoCall screen: both join the
// same Jitsi room (H6 transport), so the call can actually connect.
const DARK = {
  bg: '#070B18',
  surface: 'rgba(255,255,255,0.07)',
  primary: '#2A7FFF',
  danger: '#EF4444',
  text: '#F1F5F9',
  textDim: 'rgba(241,245,249,0.55)',
};

const DoctorVideoConsultationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const appointmentId = route.params?.appointmentId as string;

  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const join = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await startVideoCallApi(appointmentId);
    if (res.success && res.data?.roomUrl) {
      setRoomUrl(res.data.roomUrl);
    } else {
      setError(res.message || 'Could not join the consultation room');
    }
    setLoading(false);
  }, [appointmentId]);

  useEffect(() => {
    join();
  }, [join]);

  const handleEnd = () => {
    Alert.alert('End consultation?', 'You can rejoin from the appointment while it is active.', [
      { text: 'Stay', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DARK.bg} />
      <View style={styles.header}>
        <Text style={styles.title}>Video Consultation</Text>
        <TouchableOpacity style={styles.endBtn} onPress={handleEnd}>
          <Ionicons name="call" size={18} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
          <Text style={styles.endText}>End</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={DARK.primary} size="large" />
          <Text style={styles.centerText}>Joining consultation room…</Text>
        </View>
      ) : error || !roomUrl ? (
        <View style={styles.center}>
          <Ionicons name="videocam-off-outline" size={44} color={DARK.textDim} />
          <Text style={styles.centerText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={join}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <WebView
          source={{ uri: roomUrl }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          mediaCapturePermissionGrantType="grant"
          originWhitelist={['*']}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  title: { color: DARK.text, fontSize: 16, fontWeight: '700' },
  endBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: DARK.danger, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  endText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  centerText: { color: DARK.textDim, textAlign: 'center', fontSize: 14 },
  retryBtn: { backgroundColor: DARK.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#FFF', fontWeight: '700' },
  webview: { flex: 1, backgroundColor: DARK.bg },
});

export default DoctorVideoConsultationScreen;
