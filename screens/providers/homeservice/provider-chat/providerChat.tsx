// ============================================
// Provider-side chat (HS7) — the missing half of FR-10. Real socket messages
// via useBookingSocket, REST history on first load, optimistic send,
// delivery state, typing indicator.
// ============================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Platform,
  TextInput,
  Image,
  KeyboardAvoidingView,
  FlatList,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { fetchChatData } from '../../../../networks/serviceProviders/chatNetwork';
import { useBookingSocket } from '../../../../hooks/useBookingSocket';
import { ChatMessage, ChatParticipant } from '../../../../models/serviceProviders';

type Params = {
  bookingId: string;
  customerName?: string;
};

export default function ProviderChatScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: Params }, 'params'>>();
  const { bookingId, customerName } = route.params || ({} as Params);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<ChatParticipant | null>(null);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    messages,
    seedMessages,
    sendMessage,
    emitTyping,
    typing,
    connected,
  } = useBookingSocket(bookingId);

  const loadHistory = useCallback(async () => {
    if (!bookingId) {
      setError('Missing booking reference');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetchChatData(bookingId);
    if (res.success && res.data) {
      seedMessages(res.data.messages);
      setCustomer(res.data.participants.user);
    } else {
      setError(res.message || 'Failed to load chat');
    }
    setLoading(false);
  }, [bookingId, seedMessages]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (messages.length) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending) return;
    setInputText('');
    setSending(true);
    emitTyping(false);
    await sendMessage(text);
    setSending(false);
  };

  const handleTyping = (text: string) => {
    setInputText(text);
    emitTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => emitTyping(false), 1500);
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const mine = item.sender === 'provider';
    return (
      <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
          <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{item.text}</Text>
          <View style={styles.bubbleMeta}>
            <Text style={[styles.timeText, mine && styles.timeTextMine]}>
              {new Date(item.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            {mine && (
              <Ionicons
                name={item.status === 'read' ? 'checkmark-done' : 'checkmark'}
                size={14}
                color={item.status === 'read' ? '#93C5FD' : '#E0E7FF'}
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#10B981" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          {customer?.image ? (
            <Image source={{ uri: customer.image }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Ionicons name="person" size={18} color="#10B981" />
            </View>
          )}
          <View>
            <Text style={styles.headerName} numberOfLines={1}>
              {customer?.name || customerName || 'Customer'}
            </Text>
            <Text style={styles.headerSub}>
              {typing ? 'typing…' : connected ? 'online chat' : 'chat (offline mode)'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() =>
            navigation.navigate('ProviderCallScreen', { bookingId, customerName: customer?.name })
          }
        >
          <Ionicons name="call" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Body */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.stateText}>Loading conversation…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={44} color="#9CA3AF" />
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadHistory}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.center}>
                <Ionicons name="chatbubbles-outline" size={44} color="#D1D5DB" />
                <Text style={styles.stateText}>No messages yet — say hello!</Text>
              </View>
            }
          />
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Type a message…"
              placeholderTextColor="#9CA3AF"
              value={inputText}
              onChangeText={handleTyping}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!inputText.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 12,
  },
  headerBtn: { padding: 6 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 6 },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  avatarFallback: { backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' },
  headerName: { color: '#fff', fontSize: 16, fontWeight: '700', maxWidth: 180 },
  headerSub: { color: '#D1FAE5', fontSize: 12 },
  listContent: { padding: 16, paddingBottom: 8, flexGrow: 1 },
  bubbleRow: { marginBottom: 10, flexDirection: 'row' },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 9 },
  bubbleMine: { backgroundColor: '#10B981', borderBottomRightRadius: 4 },
  bubbleTheirs: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bubbleText: { fontSize: 15, color: '#111827', lineHeight: 20 },
  bubbleTextMine: { color: '#fff' },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 3 },
  timeText: { fontSize: 10, color: '#9CA3AF' },
  timeTextMine: { color: '#D1FAE5' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  input: {
    flex: 1,
    maxHeight: 110,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
    fontSize: 15,
    color: '#111827',
    marginRight: 8,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#9CA3AF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  stateText: { marginTop: 10, color: '#6B7280', fontSize: 14, textAlign: 'center' },
  retryBtn: {
    marginTop: 14,
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryText: { color: '#fff', fontWeight: '700' },
});
