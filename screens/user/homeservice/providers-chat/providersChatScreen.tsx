// screens/user/homeservice/providers-chat/providersChatScreen.tsx
import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  SafeAreaView,
  Image,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../../../../constants/Colors';
import { Fonts } from '../../../../constants/Fonts';
import { RootState } from '../../../../store/store';
import {
  initChatRoom,
  loadMoreMessages,
  receiveMessage,
  addOptimisticMessage,
  setTyping,
  clearChat,
  ChatMessage,
} from './providersChatSlice';
import SocketService from '../../../../utils/socketService';
import { chatNetwork } from '../../../../networks/serviceProviders/chatNetwork';

// ─── Types ───────────────────────────────────────────────────────────────────

const SERVICE_CONFIG: Record<string, { gradient: string[]; accentColor: string; title: string }> = {
  electricians: { gradient: ['#F59E0B', '#D97706'], accentColor: '#F59E0B', title: 'Electrician' },
  plumbers: { gradient: ['#3B82F6', '#2563EB'], accentColor: '#3B82F6', title: 'Plumber' },
  'ac-repairers': { gradient: ['#06B6D4', '#0891B2'], accentColor: '#06B6D4', title: 'AC Repairer' },
};

type ChatScreenParams = {
  provider?: {
    id: string;
    name: string;
    specialty: string;
    rating: number;
    reviews: number;
    image: string;
  };
  serviceType?: 'electricians' | 'plumbers' | 'ac-repairers';
};

// ─── Message Bubble ───────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  accentColor: string;
  showAvatar: boolean;
  providerImage?: string;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  accentColor,
  showAvatar,
  providerImage,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, []);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  const renderStatusIcon = () => {
    if (!isOwn) return null;
    switch (message.status) {
      case 'read':
        return <Ionicons name="checkmark-done" size={12} color={accentColor} />;
      case 'delivered':
        return <Ionicons name="checkmark-done" size={12} color="#94A3B8" />;
      default:
        return <Ionicons name="checkmark" size={12} color="#94A3B8" />;
    }
  };

  return (
    <Animated.View
      style={[
        styles.messageRow,
        isOwn ? styles.messageRowOwn : styles.messageRowOther,
        { opacity: fadeAnim },
      ]}
    >
      {!isOwn && (
        <View style={styles.avatarContainer}>
          {showAvatar ? (
            providerImage ? (
              <Image source={{ uri: providerImage }} style={styles.messageAvatar} />
            ) : (
              <View style={[styles.messageAvatarPlaceholder, { backgroundColor: accentColor }]}>
                <Text style={styles.avatarInitial}>P</Text>
              </View>
            )
          ) : (
            <View style={styles.avatarSpacer} />
          )}
        </View>
      )}

      <View style={[styles.bubbleWrapper, isOwn ? styles.bubbleWrapperOwn : styles.bubbleWrapperOther]}>
        {message.type === 'call_log' ? (
          <View style={styles.callLogBubble}>
            <Ionicons name="call" size={14} color="#64748B" />
            <Text style={styles.callLogText}>{message.content}</Text>
          </View>
        ) : (
          <View
            style={[
              styles.bubble,
              isOwn
                ? [styles.bubbleOwn, { backgroundColor: accentColor }]
                : styles.bubbleOther,
            ]}
          >
            <Text style={[styles.bubbleText, isOwn ? styles.bubbleTextOwn : styles.bubbleTextOther]}>
              {message.content}
            </Text>
          </View>
        )}

        <View style={[styles.messageFooter, isOwn && styles.messageFooterOwn]}>
          <Text style={styles.messageTime}>{formatTime(message.createdAt)}</Text>
          {renderStatusIcon()}
        </View>
      </View>
    </Animated.View>
  );
};

// ─── Typing Indicator ─────────────────────────────────────────────────────────

const TypingIndicator: React.FC<{ accentColor: string }> = ({ accentColor }) => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const bounce = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      );

    const a1 = bounce(dot1, 0);
    const a2 = bounce(dot2, 150);
    const a3 = bounce(dot3, 300);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  return (
    <View style={styles.typingRow}>
      <View style={styles.typingBubble}>
        {[dot1, dot2, dot3].map((anim, i) => (
          <Animated.View
            key={i}
            style={[styles.typingDot, { backgroundColor: accentColor, transform: [{ translateY: anim }] }]}
          />
        ))}
      </View>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProvidersChatScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: ChatScreenParams }, 'params'>>();
  const dispatch = useDispatch();

  const { provider, serviceType = 'electricians' } = route.params || {};
  const serviceConfig = SERVICE_CONFIG[serviceType] || SERVICE_CONFIG.electricians;

  // Redux state
  const roomId = useSelector((state: RootState) => state.providersChat?.roomId);
  const messages = useSelector((state: RootState) => state.providersChat?.messages ?? []);
  const isLoading = useSelector((state: RootState) => state.providersChat?.isLoading);
  const isTyping = useSelector((state: RootState) => state.providersChat?.isTyping);
  const hasMore = useSelector((state: RootState) => state.providersChat?.hasMore);
  const page = useSelector((state: RootState) => state.providersChat?.page ?? 1);
  const currentUser = useSelector((state: RootState) => (state as any).auth?.user);

  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Initialize chat room & socket ───────────────────────────────
  useEffect(() => {
    if (!provider?.id) return;

    // Init room + load messages
    dispatch(initChatRoom({ providerId: provider.id, serviceType }) as any);

    // Connect socket and join room once roomId is available
    return () => {
      dispatch(clearChat());
    };
  }, [provider?.id, serviceType]);

  // Join socket room once roomId is available
  useEffect(() => {
    if (!roomId) return;

    SocketService.joinRoom(roomId);
    chatNetwork.markAsRead(roomId).catch(() => {}); // mark as read on open

    // Subscribe to incoming messages
    const unsubMessage = SocketService.onMessage((data) => {
      if (data.roomId === roomId) {
        dispatch(receiveMessage(data));
      }
    });

    // Subscribe to typing events
    const unsubTyping = SocketService.onTyping(() => {
      dispatch(setTyping(true));
    });
    const unsubStopTyping = SocketService.onStopTyping(() => {
      dispatch(setTyping(false));
    });

    // Emit read status to update sender
    SocketService.emitRead(roomId);

    return () => {
      SocketService.leaveRoom(roomId);
      unsubMessage();
      unsubTyping();
      unsubStopTyping();
    };
  }, [roomId]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  // ── Send message ─────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const content = inputText.trim();
    if (!content || !roomId || isSending) return;

    setInputText('');
    setIsSending(true);

    // Optimistic message
    const optimistic: ChatMessage = {
      _id: `optimistic_${Date.now()}`,
      senderId: currentUser?.id || 'me',
      senderType: 'User',
      content,
      type: 'text',
      status: 'sent',
      createdAt: new Date().toISOString(),
    };
    dispatch(addOptimisticMessage(optimistic));

    // Send via Socket.IO
    SocketService.sendMessage(roomId, content);
    SocketService.emitStopTyping(roomId);

    setIsSending(false);
  }, [inputText, roomId, isSending, currentUser?.id, dispatch]);

  // ── Typing detection ─────────────────────────────────────────────
  const handleInputChange = useCallback((text: string) => {
    setInputText(text);
    if (!roomId) return;

    SocketService.emitTyping(roomId);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      SocketService.emitStopTyping(roomId);
    }, 1500);
  }, [roomId]);

  // ── Load more (pagination) ────────────────────────────────────────
  const handleLoadMore = useCallback(() => {
    if (!hasMore || isLoading || !roomId) return;
    dispatch(loadMoreMessages({ roomId, page: page + 1 }) as any);
  }, [hasMore, isLoading, roomId, page, dispatch]);

  // ── Navigate to call screen ───────────────────────────────────────
  const handleCallPress = useCallback(() => {
    // @ts-ignore
    navigation.navigate('CallScreen', {
      provider,
      serviceType,
    });
  }, [navigation, provider, serviceType]);

  // ── Render helpers ────────────────────────────────────────────────
  const renderMessage = useCallback(({ item, index }: { item: ChatMessage; index: number }) => {
    const isOwn = item.senderType === 'User';
    const prevMsg = messages[index - 1];
    const showAvatar = !isOwn && (!prevMsg || prevMsg.senderType !== item.senderType);

    return (
      <MessageBubble
        key={item._id}
        message={item}
        isOwn={isOwn}
        accentColor={serviceConfig.accentColor}
        showAvatar={showAvatar}
        providerImage={provider?.image}
      />
    );
  }, [messages, serviceConfig.accentColor, provider?.image]);

  const quickReplies = useMemo(() => [
    'What is your availability?',
    'How much will it cost?',
    'Are you near my location?',
    'How long will it take?',
  ], []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#1E293B" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerProfile} activeOpacity={0.8}>
          <View style={styles.headerAvatarWrapper}>
            {provider?.image ? (
              <Image source={{ uri: provider.image }} style={styles.headerAvatar} />
            ) : (
              <LinearGradient
                colors={serviceConfig.gradient as [string, string]}
                style={styles.headerAvatarPlaceholder}
              >
                <Text style={styles.headerAvatarInitial}>
                  {provider?.name?.[0] || 'P'}
                </Text>
              </LinearGradient>
            )}
            <View style={styles.onlineIndicator} />
          </View>

          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1}>
              {provider?.name || 'Service Provider'}
            </Text>
            <View style={styles.headerMeta}>
              <View style={[styles.servicePill, { backgroundColor: `${serviceConfig.accentColor}18` }]}>
                <Text style={[styles.servicePillText, { color: serviceConfig.accentColor }]}>
                  {serviceConfig.title}
                </Text>
              </View>
              <Text style={styles.onlineText}>● Online</Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.callHeaderButton, { backgroundColor: `${serviceConfig.accentColor}12` }]}
          onPress={handleCallPress}
          activeOpacity={0.8}
        >
          <Ionicons name="call" size={20} color={serviceConfig.accentColor} />
        </TouchableOpacity>
      </View>

      {/* ── Accent Line ── */}
      <LinearGradient
        colors={serviceConfig.gradient as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerAccent}
      />

      {/* ── Messages ── */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {isLoading && messages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={serviceConfig.accentColor} />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item._id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            onScrollToIndexFailed={() => {}}
            onStartReached={handleLoadMore}
            onStartReachedThreshold={0.1}
            ListHeaderComponent={
              isLoading && hasMore ? (
                <ActivityIndicator size="small" color={serviceConfig.accentColor} style={{ margin: 12 }} />
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <LinearGradient
                  colors={[`${serviceConfig.accentColor}18`, `${serviceConfig.accentColor}08`]}
                  style={styles.emptyIcon}
                >
                  <Ionicons name="chatbubbles-outline" size={40} color={serviceConfig.accentColor} />
                </LinearGradient>
                <Text style={styles.emptyTitle}>Start the conversation</Text>
                <Text style={styles.emptySubtitle}>
                  Message {provider?.name || 'this provider'} about your service needs
                </Text>
              </View>
            }
            ListFooterComponent={isTyping ? (
              <TypingIndicator accentColor={serviceConfig.accentColor} />
            ) : null}
          />
        )}

        {/* ── Quick Replies ── */}
        {messages.length === 0 && !isLoading && (
          <View style={styles.quickRepliesContainer}>
            <Text style={styles.quickRepliesLabel}>Quick messages</Text>
            <View style={styles.quickRepliesScroll}>
              {quickReplies.map((reply, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.quickReplyChip, { borderColor: serviceConfig.accentColor }]}
                  onPress={() => setInputText(reply)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.quickReplyText, { color: serviceConfig.accentColor }]}>
                    {reply}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── Input Bar ── */}
        <View style={styles.inputBar}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              placeholderTextColor="#94A3B8"
              value={inputText}
              onChangeText={handleInputChange}
              multiline
              maxLength={2000}
              returnKeyType="default"
            />
          </View>

          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: inputText.trim() ? serviceConfig.accentColor : '#E2E8F0' },
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isSending}
            activeOpacity={0.8}
          >
            <Ionicons
              name="send"
              size={18}
              color={inputText.trim() ? '#FFFFFF' : '#94A3B8'}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerProfile: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerAvatarWrapper: { width: 44, height: 44, position: 'relative' },
  headerAvatar: { width: 44, height: 44, borderRadius: 14 },
  headerAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarInitial: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  onlineIndicator: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  servicePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  servicePillText: { fontSize: 11, fontWeight: '600' },
  onlineText: { fontSize: 11, color: '#10B981', fontWeight: '500' },
  callHeaderButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAccent: { height: 3 },

  // Messages list
  messagesList: { padding: 16, paddingBottom: 8 },

  // Loading
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: '#64748B' },

  // Empty state
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center', maxWidth: 240 },

  // Message rows
  messageRow: { flexDirection: 'row', marginVertical: 2, alignItems: 'flex-end' },
  messageRowOwn: { justifyContent: 'flex-end' },
  messageRowOther: { justifyContent: 'flex-start' },

  // Avatar in messages
  avatarContainer: { width: 32, marginRight: 8 },
  messageAvatar: { width: 32, height: 32, borderRadius: 10 },
  messageAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  avatarSpacer: { width: 32 },

  // Bubble
  bubbleWrapper: { maxWidth: '72%' },
  bubbleWrapperOwn: { alignItems: 'flex-end' },
  bubbleWrapperOther: { alignItems: 'flex-start' },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 3,
  },
  bubbleOwn: { borderBottomRightRadius: 4 },
  bubbleOther: {
    backgroundColor: '#F1F5F9',
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  bubbleTextOwn: { color: '#FFFFFF' },
  bubbleTextOther: { color: '#1E293B' },

  // Call log bubble
  callLogBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 3,
  },
  callLogText: { fontSize: 13, color: '#64748B' },

  // Message footer (time + status)
  messageFooter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  messageFooterOwn: { justifyContent: 'flex-end' },
  messageTime: { fontSize: 11, color: '#94A3B8' },

  // Typing indicator
  typingRow: { flexDirection: 'row', marginVertical: 4, paddingLeft: 40 },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  typingDot: { width: 8, height: 8, borderRadius: 4 },

  // Quick replies
  quickRepliesContainer: { paddingHorizontal: 16, paddingBottom: 8 },
  quickRepliesLabel: { fontSize: 12, color: '#94A3B8', marginBottom: 8 },
  quickRepliesScroll: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickReplyChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    backgroundColor: '#FAFAFA',
  },
  quickReplyText: { fontSize: 13, fontWeight: '500' },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 10,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 120,
  },
  textInput: {
    fontSize: 15,
    color: '#1E293B',
    padding: 0,
    margin: 0,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
