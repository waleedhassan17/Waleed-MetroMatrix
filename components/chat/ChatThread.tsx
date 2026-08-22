// ============================================================================
// ChatThread — the one chat implementation, shared by all four modules:
//   home-service user  <-> home-service provider
//   healthcare patient <-> doctor
//
// Both verticals hit the same realtime endpoints with the same events, so the
// only differences are cosmetic (accent colour, labels) plus which room type
// is being addressed.
//
// WHICH BUBBLE IS "MINE" comes from the server. GET /api/chat/:roomId returns
// `role` derived from actual booking/appointment membership; the client never
// infers it from the token. That is what makes one component correct for both
// sides of a conversation.
// ============================================================================

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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { fetchChatData, RoomType } from '../../networks/serviceProviders/chatNetwork';
import { useRoomSocket } from '../../hooks/useRoomSocket';
import { ChatMessage, ChatParticipant } from '../../models/serviceProviders';

export interface ChatThreadProps {
  roomId: string;
  roomType: RoomType;
  /** Header accent colour. */
  accent?: string;
  accentSoft?: string;
  /** Shown until the server returns the counterpart's real name. */
  fallbackTitle?: string;
  /** Called with the counterpart once loaded — lets the screen wire a Call button. */
  onParticipantsLoaded?: (counterpart: ChatParticipant, me: ChatParticipant) => void;
  /** Tapping the header phone icon. Hidden when omitted. */
  onCall?: (counterpart: ChatParticipant | null) => void;
}

export const ChatThread: React.FC<ChatThreadProps> = ({
  roomId,
  roomType,
  accent = '#10B981',
  accentSoft = '#D1FAE5',
  fallbackTitle = 'Chat',
  onParticipantsLoaded,
  onCall,
}) => {
  const navigation = useNavigation<any>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counterpart, setCounterpart] = useState<ChatParticipant | null>(null);
  const [myRole, setMyRole] = useState<'user' | 'provider'>('user');
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { messages, seedMessages, sendMessage, emitTyping, markRead, typing, connected } =
    useRoomSocket(roomId, roomType);

  const loadHistory = useCallback(async () => {
    if (!roomId) {
      setError('Missing conversation reference');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetchChatData(roomId, roomType);
    if (res.success && res.data) {
      seedMessages(res.data.messages);
      const other = res.data.participants.counterpart || res.data.participants.provider;
      const role = res.data.role || 'user';
      setMyRole(role);
      // The counterpart is whichever side I am NOT.
      const them = role === 'user' ? other : res.data.participants.user;
      const me = role === 'user' ? res.data.participants.user : other;
      setCounterpart(them);
      onParticipantsLoaded?.(them, me);
    } else {
      setError(res.message || 'Failed to load chat');
    }
    setLoading(false);
  }, [roomId, roomType, seedMessages, onParticipantsLoaded]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Mark the thread read once it is open and history has landed.
  useEffect(() => {
    if (!loading && !error && messages.length) markRead();
  }, [loading, error, messages.length, markRead]);

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

  useEffect(() => () => {
    if (typingTimer.current) clearTimeout(typingTimer.current);
  }, []);

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const mine = item.sender === myRole;
    return (
      <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
        <View
          style={[
            styles.bubble,
            mine ? { backgroundColor: accent, borderBottomRightRadius: 4 } : styles.bubbleTheirs,
          ]}
        >
          <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{item.text}</Text>
          <View style={styles.bubbleMeta}>
            <Text style={[styles.timeText, mine && { color: accentSoft }]}>
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
      <StatusBar barStyle="light-content" backgroundColor={accent} />
      <View style={[styles.header, { backgroundColor: accent }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          {counterpart?.image ? (
            <Image source={{ uri: counterpart.image }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Ionicons name="person" size={18} color={accent} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.headerName} numberOfLines={1}>
              {counterpart?.name || fallbackTitle}
            </Text>
            <Text style={[styles.headerSub, { color: accentSoft }]}>
              {typing ? 'typing…' : connected ? 'online' : 'reconnecting…'}
            </Text>
          </View>
        </View>
        {!!onCall && (
          <TouchableOpacity style={styles.headerBtn} onPress={() => onCall(counterpart)}>
            <Ionicons name="call" size={22} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* A dropped socket is the most common reason a message silently fails to
          deliver, and it used to be visible only as a two-word header
          subtitle. Messages still queue and fall back to REST, so the wording
          says "delayed", not "failed". */}
      {!connected && !loading && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={15} color="#92400E" />
          <Text style={styles.offlineBannerText}>
            Reconnecting — new messages may be delayed
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={accent} />
          <Text style={styles.stateText}>Loading conversation…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={44} color="#9CA3AF" />
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: accent }]} onPress={loadHistory}>
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
              style={[
                styles.sendBtn,
                { backgroundColor: accent },
                (!inputText.trim() || sending) && styles.sendBtnDisabled,
              ]}
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
};

const styles = StyleSheet.create({
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  offlineBannerText: {
    fontSize: 12.5,
    color: '#92400E',
    fontWeight: '500',
  },
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 12,
  },
  headerBtn: { padding: 6 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 6 },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  avatarFallback: { backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  headerName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerSub: { fontSize: 12 },
  listContent: { padding: 16, paddingBottom: 8, flexGrow: 1 },
  bubbleRow: { marginBottom: 10, flexDirection: 'row' },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 9 },
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
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#9CA3AF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  stateText: { marginTop: 10, color: '#6B7280', fontSize: 14, textAlign: 'center' },
  retryBtn: { marginTop: 14, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700' },
});

export default ChatThread;
