import React, { useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import {
  setInputText,
  sendMessageStart,
  sendMessageSuccess,
  sendMessageFailure,
  clearChat,
  type InCallMessage,
  type Attachment,
} from './inCallChatSlice';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const PANEL_HEIGHT = SCREEN_HEIGHT * 0.58;

// ── Theme ─────────────────────────────────────

const DARK = {
  bg: 'rgba(8,12,26,0.97)',
  surface: 'rgba(255,255,255,0.06)',
  surfaceHigh: 'rgba(255,255,255,0.10)',
  border: 'rgba(255,255,255,0.08)',
  primary: '#2A7FFF',
  primaryDim: 'rgba(236,72,153,0.20)',
  accent: '#5A9FFF',
  accentDim: 'rgba(244,114,182,0.20)',
  text: '#F1F5F9',
  textSecondary: 'rgba(241,245,249,0.55)',
  textTertiary: 'rgba(241,245,249,0.30)',
  gradient: {
    primary: ['#2A7FFF', '#1857C0'] as [string, string],
    me: ['#2A7FFF', '#A8CFFF'] as [string, string],
  },
};

// ── Props ─────────────────────────────────────

interface InCallChatScreenProps {
  visible: boolean;
  onClose: () => void;
}

// ── Helpers ───────────────────────────────────

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ── Component ─────────────────────────────────

const InCallChatScreen: React.FC<InCallChatScreenProps> = ({ visible, onClose }) => {
  const dispatch = useAppDispatch();
  const { messages, inputText, sending, error } = useAppSelector(
    (state) => state.inCallChat,
  );

  const listRef = useRef<FlatList>(null);
  const slideAnim = useRef(new Animated.Value(PANEL_HEIGHT)).current;
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : PANEL_HEIGHT,
      tension: 80,
      friction: 12,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  // ── Send ──────────────────────────────────

  const handleSend = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed || sending) return;

    dispatch(sendMessageStart());
    const message: InCallMessage = {
      id: Date.now().toString(),
      senderId: 'patient',
      senderName: 'You',
      type: 'text',
      text: trimmed,
      timestamp: new Date().toISOString(),
    };
    setTimeout(() => dispatch(sendMessageSuccess(message)), 200);
  }, [inputText, sending, dispatch]);

  // ── Attachment ───────────────────────────

  const handleAttachment = useCallback(() => {
    Alert.alert('Share Attachment', 'Choose a file type', [
      {
        text: 'Image from Gallery',
        onPress: () => {
          const mockAttachment: Attachment = {
            uri: 'file://mock-image.jpg',
            name: 'medical-report.jpg',
            mimeType: 'image/jpeg',
            size: 245_000,
          };
          dispatch(sendMessageStart());
          const msg: InCallMessage = {
            id: Date.now().toString(),
            senderId: 'patient',
            senderName: 'You',
            type: 'image',
            text: '',
            attachment: mockAttachment,
            timestamp: new Date().toISOString(),
          };
          setTimeout(() => dispatch(sendMessageSuccess(msg)), 300);
        },
      },
      {
        text: 'File / Document',
        onPress: () => {
          const mockFile: Attachment = {
            uri: 'file://mock-file.pdf',
            name: 'lab-results.pdf',
            mimeType: 'application/pdf',
            size: 1_200_000,
          };
          dispatch(sendMessageStart());
          const msg: InCallMessage = {
            id: Date.now().toString(),
            senderId: 'patient',
            senderName: 'You',
            type: 'file',
            text: '',
            attachment: mockFile,
            timestamp: new Date().toISOString(),
          };
          setTimeout(() => dispatch(sendMessageSuccess(msg)), 300);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [dispatch]);

  // ── Message Bubble ────────────────────────

  const renderMessage = ({ item }: { item: InCallMessage }) => {
    const isMe = item.senderId === 'patient';

    return (
      <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowThem]}>
        {!isMe && (
          <View style={styles.avatarSmall}>
            <MaterialCommunityIcons name="doctor" size={14} color={DARK.primary} />
          </View>
        )}

        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          {!isMe && <Text style={styles.senderName}>{item.senderName}</Text>}

          {/* Text */}
          {item.type === 'text' && (
            <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.text}</Text>
          )}

          {/* Image */}
          {item.type === 'image' && item.attachment && (
            <View style={styles.imageWrapper}>
              <Image
                source={{ uri: item.attachment.uri }}
                style={styles.imagePreview}
                resizeMode="cover"
              />
              <View style={styles.imageOverlay}>
                <Ionicons name="expand-outline" size={16} color="#FFFFFF" />
              </View>
              <Text style={styles.attachmentName}>{item.attachment.name}</Text>
            </View>
          )}

          {/* File */}
          {item.type === 'file' && item.attachment && (
            <View style={styles.fileContainer}>
              <View style={styles.fileIconWrap}>
                <MaterialCommunityIcons name="file-pdf-box" size={24} color="#EF4444" />
              </View>
              <View style={styles.fileMeta}>
                <Text style={styles.fileName} numberOfLines={1}>{item.attachment.name}</Text>
                <Text style={styles.fileSize}>{formatFileSize(item.attachment.size)}</Text>
              </View>
              <Ionicons name="download-outline" size={18} color={DARK.textSecondary} />
            </View>
          )}

          <Text style={[styles.timestamp, isMe && styles.timestampMe]}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  if (!visible) return null;

  // ── Render ────────────────────────────────

  return (
    <Animated.View style={[styles.overlay, { transform: [{ translateY: slideAnim }] }]}>
      <KeyboardAvoidingView
        style={styles.panel}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Handle */}
        <View style={styles.handleWrap}>
          <View style={styles.handle} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconWrap}>
              <LinearGradient
                colors={DARK.gradient.primary}
                style={styles.headerIconGradient}
              >
                <Ionicons name="chatbubble-ellipses" size={14} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <View>
              <Text style={styles.headerTitle}>In-Call Chat</Text>
              <View style={styles.headerStatus}>
                <View style={styles.headerStatusDot} />
                <Text style={styles.headerStatusText}>Connected</Text>
              </View>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerActionBtn}
              onPress={() => dispatch(clearChat())}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="broom" size={16} color={DARK.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerActionBtn}
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={18} color={DARK.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Message list */}
        <FlatList
          ref={listRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <LinearGradient colors={DARK.gradient.primary} style={styles.emptyIconGradient}>
                  <Ionicons name="chatbubbles-outline" size={24} color="#FFFFFF" />
                </LinearGradient>
              </View>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySubtitle}>
                Send a message or share files with your doctor during the call
              </Text>
            </View>
          }
        />

        {/* Error banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={14} color="#FCA5A5" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Input row */}
        <View style={styles.inputRow}>
          <TouchableOpacity
            style={styles.attachBtn}
            onPress={handleAttachment}
            activeOpacity={0.75}
          >
            <Ionicons name="attach" size={20} color={DARK.textSecondary} />
          </TouchableOpacity>

          <TextInput
            ref={inputRef}
            style={styles.textInput}
            value={inputText}
            onChangeText={(t) => dispatch(setInputText(t))}
            placeholder="Type a message…"
            placeholderTextColor={DARK.textTertiary}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            editable={!sending}
            multiline
            maxLength={1000}
          />

          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={sending || !inputText.trim()}
            activeOpacity={0.85}
          >
            {inputText.trim() && !sending ? (
              <LinearGradient
                colors={DARK.gradient.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sendBtnGradient}
              >
                <Ionicons name="send" size={16} color="#FFFFFF" />
              </LinearGradient>
            ) : (
              <View style={[styles.sendBtnGradient, { backgroundColor: DARK.surface }]}>
                <Ionicons name="send" size={16} color={DARK.textTertiary} />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
};

// ── Styles ─────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: PANEL_HEIGHT,
    zIndex: 100,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
      },
      android: { elevation: 20 },
    }),
  },
  panel: {
    flex: 1,
    backgroundColor: DARK.bg,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },

  // Handle
  handleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconWrap: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  headerIconGradient: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: DARK.text,
    letterSpacing: -0.2,
  },
  headerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  headerStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  headerStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 6,
  },
  headerActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: DARK.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: DARK.border,
    marginHorizontal: 18,
  },

  // Message list
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexGrow: 1,
  },

  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
    gap: 10,
  },
  emptyIconWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 4,
  },
  emptyIconGradient: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DARK.text,
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: DARK.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 18,
  },

  // Messages
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
    gap: 8,
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowThem: {
    justifyContent: 'flex-start',
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: DARK.primaryDim,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubble: {
    maxWidth: '76%',
    borderRadius: 10,
    padding: 12,
  },
  bubbleMe: {
    backgroundColor: DARK.primary,
    borderBottomRightRadius: 5,
  },
  bubbleThem: {
    backgroundColor: DARK.surface,
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: DARK.border,
  },
  senderName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38BDF8',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  bubbleText: {
    fontSize: 14,
    fontWeight: '500',
    color: DARK.text,
    lineHeight: 20,
  },
  bubbleTextMe: {
    color: '#FFFFFF',
  },
  timestamp: {
    fontSize: 10,
    fontWeight: '500',
    color: DARK.textTertiary,
    marginTop: 5,
    textAlign: 'left',
  },
  timestampMe: {
    textAlign: 'right',
    color: 'rgba(255,255,255,0.5)',
  },

  // Image attachment
  imageWrapper: {
    marginBottom: 4,
  },
  imagePreview: {
    width: '100%',
    height: 130,
    borderRadius: 10,
    backgroundColor: DARK.surface,
  },
  imageOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentName: {
    fontSize: 11,
    fontWeight: '500',
    color: DARK.textSecondary,
    marginTop: 5,
  },

  // File attachment
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 10,
    gap: 10,
    marginBottom: 4,
  },
  fileIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileMeta: {
    flex: 1,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '700',
    color: DARK.text,
  },
  fileSize: {
    fontSize: 11,
    fontWeight: '500',
    color: DARK.textSecondary,
    marginTop: 2,
  },

  // Error
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FCA5A5',
    flex: 1,
  },

  // Input
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    borderTopWidth: 1,
    borderTopColor: DARK.border,
    gap: 8,
  },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: DARK.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: DARK.border,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: DARK.surface,
    color: DARK.text,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 14,
    fontWeight: '500',
    borderWidth: 1,
    borderColor: DARK.border,
  },
  sendBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnGradient: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
});

export default InCallChatScreen;