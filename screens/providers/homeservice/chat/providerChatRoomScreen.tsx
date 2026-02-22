// screens/providers/homeservice/chat/providerChatRoomScreen.tsx
//
// Provider's view of a chat room with a user.
// Registered in Base.tsx as route: 'ProviderChatRoom'
//
import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
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
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { RootState } from '../../../../store/store';
import {
  initChatRoom,
  loadMoreMessages,
  receiveMessage,
  addOptimisticMessage,
  setTyping,
  clearChat,
  ChatMessage,
} from '../../../user/homeservice/providers-chat/providersChatSlice';
import SocketService from '../../../../utils/socketService';
import { chatNetwork } from '../../../../networks/serviceProviders/chatNetwork';

type ProviderChatRoomParams = {
  room: {
    _id: string;
    userId: string;
    providerId: string;
    serviceType: string;
  };
  otherParty: {
    _id: string;
    name: string;
    profileImage?: string;
  };
};

export default function ProviderChatRoomScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: ProviderChatRoomParams }, 'params'>>();
  const dispatch = useDispatch();

  const { room, otherParty } = route.params;

  const messages = useSelector((state: RootState) => state.providersChat?.messages ?? []);
  const isLoading = useSelector((state: RootState) => state.providersChat?.isLoading);
  const isTyping = useSelector((state: RootState) => state.providersChat?.isTyping);
  const hasMore = useSelector((state: RootState) => state.providersChat?.hasMore);
  const page = useSelector((state: RootState) => state.providersChat?.page ?? 1);

  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();

    // Load existing messages from DB
    loadRoomMessages();

    // Subscribe to socket events
    SocketService.joinRoom(room._id);
    chatNetwork.markAsRead(room._id).catch(() => {});

    const unsubMsg = SocketService.onMessage((data) => {
      if (data.roomId === room._id) dispatch(receiveMessage(data));
    });
    const unsubTyping = SocketService.onTyping(() => dispatch(setTyping(true)));
    const unsubStop = SocketService.onStopTyping(() => dispatch(setTyping(false)));

    return () => {
      SocketService.leaveRoom(room._id);
      unsubMsg();
      unsubTyping();
      unsubStop();
      dispatch(clearChat());
    };
  }, [room._id]);

  const loadRoomMessages = async () => {
    try {
      const { messages: msgs } = await chatNetwork.getMessages(room._id, 1);
      dispatch(addOptimisticMessage({ messages: msgs.reverse() } as any));
    } catch {
      // fallback – room was just created
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = useCallback(() => {
    const content = inputText.trim();
    if (!content) return;

    setInputText('');

    const optimistic: ChatMessage = {
      _id: `opt_${Date.now()}`,
      senderId: 'provider_me',
      senderType: 'Provider',
      content,
      type: 'text',
      status: 'sent',
      createdAt: new Date().toISOString(),
    };
    dispatch(addOptimisticMessage(optimistic));

    SocketService.sendMessage(room._id, content);
    SocketService.emitStopTyping(room._id);
  }, [inputText, room._id, dispatch]);

  const handleInput = useCallback((text: string) => {
    setInputText(text);
    SocketService.emitTyping(room._id);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => SocketService.emitStopTyping(room._id), 1500);
  }, [room._id]);

  const handleCall = useCallback(() => {
    // @ts-ignore
    navigation.navigate('CallScreen', {
      provider: { id: otherParty._id, name: otherParty.name, image: otherParty.profileImage },
      serviceType: room.serviceType,
    });
  }, [navigation, otherParty, room.serviceType]);

  const renderMessage = useCallback(({ item, index }: { item: ChatMessage; index: number }) => {
    const isOwn = item.senderType === 'Provider';
    const prev = messages[index - 1];
    const showAvatar = !isOwn && (!prev || prev.senderType !== item.senderType);

    const formatTime = (s: string) => {
      const d = new Date(s);
      return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
    };

    return (
      <View style={[styles.msgRow, isOwn ? styles.msgRowOwn : styles.msgRowOther]}>
        {!isOwn && (
          <View style={styles.msgAvatarSlot}>
            {showAvatar ? (
              otherParty.profileImage ? (
                <Image source={{ uri: otherParty.profileImage }} style={styles.msgAvatar} />
              ) : (
                <View style={styles.msgAvatarFallback}>
                  <Text style={styles.msgAvatarInitial}>{otherParty.name[0]}</Text>
                </View>
              )
            ) : <View style={styles.msgAvatarSpacer} />}
          </View>
        )}
        <View style={{ maxWidth: '72%', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
          <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
            <Text style={[styles.bubbleText, isOwn && styles.bubbleTextOwn]}>{item.content}</Text>
          </View>
          <View style={[styles.msgMeta, isOwn && { justifyContent: 'flex-end' }]}>
            <Text style={styles.msgTime}>{formatTime(item.createdAt)}</Text>
            {isOwn && (
              <Ionicons
                name={item.status === 'read' ? 'checkmark-done' : 'checkmark-done'}
                size={12}
                color={item.status === 'read' ? '#3B82F6' : '#94A3B8'}
              />
            )}
          </View>
        </View>
      </View>
    );
  }, [messages, otherParty]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#1E293B" />
        </TouchableOpacity>

        <View style={styles.headerProfile}>
          {otherParty.profileImage ? (
            <Image source={{ uri: otherParty.profileImage }} style={styles.headerAvatar} />
          ) : (
            <View style={styles.headerAvatarFallback}>
              <Text style={styles.headerAvatarInitial}>{otherParty.name[0]}</Text>
            </View>
          )}
          <View style={styles.onlineDot} />
          <View>
            <Text style={styles.headerName}>{otherParty.name}</Text>
            <Text style={styles.headerSub}>● Online</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.callBtn} onPress={handleCall}>
          <Ionicons name="call" size={20} color="#10B981" />
        </TouchableOpacity>
      </View>

      <View style={{ height: 3, backgroundColor: '#8B5CF6', opacity: 0.6 }} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item._id}
          renderItem={renderMessage}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={40} color="#CBD5E1" />
              <Text style={styles.emptyText}>Start the conversation</Text>
            </View>
          }
          ListFooterComponent={
            isTyping ? (
              <View style={styles.typingRow}>
                <View style={styles.typingBubble}>
                  <Text style={styles.typingText}>typing...</Text>
                </View>
              </View>
            ) : null
          }
        />

        <View style={styles.inputBar}>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              placeholder="Reply..."
              placeholderTextColor="#94A3B8"
              value={inputText}
              onChangeText={handleInput}
              multiline
            />
          </View>
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: inputText.trim() ? '#8B5CF6' : '#E2E8F0' }]}
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={18} color={inputText.trim() ? '#FFF' : '#94A3B8'} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center',
  },
  headerProfile: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: { width: 44, height: 44, borderRadius: 14 },
  headerAvatarFallback: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#8B5CF6', justifyContent: 'center', alignItems: 'center',
  },
  headerAvatarInitial: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  onlineDot: {
    position: 'absolute', left: 31, top: 31,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#10B981', borderWidth: 2, borderColor: '#FFF',
  },
  headerName: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  headerSub: { fontSize: 11, color: '#10B981', fontWeight: '500' },
  callBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center',
  },

  list: { padding: 16, paddingBottom: 8 },

  msgRow: { flexDirection: 'row', marginVertical: 2, alignItems: 'flex-end' },
  msgRowOwn: { justifyContent: 'flex-end' },
  msgRowOther: { justifyContent: 'flex-start' },
  msgAvatarSlot: { width: 32, marginRight: 8 },
  msgAvatar: { width: 32, height: 32, borderRadius: 10 },
  msgAvatarFallback: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#8B5CF6', justifyContent: 'center', alignItems: 'center',
  },
  msgAvatarInitial: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  msgAvatarSpacer: { width: 32 },

  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 3 },
  bubbleOwn: { backgroundColor: '#8B5CF6', borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: '#F1F5F9', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, color: '#1E293B', lineHeight: 20 },
  bubbleTextOwn: { color: '#FFFFFF' },

  msgMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  msgTime: { fontSize: 11, color: '#94A3B8' },

  typingRow: { paddingLeft: 48, paddingVertical: 4 },
  typingBubble: {
    backgroundColor: '#F1F5F9', borderRadius: 18, borderBottomLeftRadius: 4,
    paddingHorizontal: 14, paddingVertical: 10, alignSelf: 'flex-start',
  },
  typingText: { fontSize: 13, color: '#64748B', fontStyle: 'italic' },

  empty: { flex: 1, alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyText: { fontSize: 15, color: '#94A3B8' },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 10,
    backgroundColor: '#FFFFFF',
  },
  inputBox: {
    flex: 1, backgroundColor: '#F8FAFC', borderRadius: 20,
    borderWidth: 1, borderColor: '#E2E8F0',
    paddingHorizontal: 16, paddingVertical: 10, maxHeight: 120,
  },
  input: { fontSize: 15, color: '#1E293B', maxHeight: 100, padding: 0 },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
});
