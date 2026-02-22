// screens/providers/homeservice/chat/providerChatListScreen.tsx
//
// This screen lives in the provider's tab bar.
// Add it to: screens/providers/homeservice/tabs/index.tsx
// Tab name: "Messages"
//
import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { fetchChatRooms, ChatRoom } from '../../../user/homeservice/providers-chat/providersChatSlice';
import { RootState } from '../../../../store/store';

const SERVICE_COLORS: Record<string, string> = {
  electricians: '#F59E0B',
  plumbers: '#3B82F6',
  'ac-repairers': '#06B6D4',
  general: '#8B5CF6',
};

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = diffMs / (1000 * 60 * 60);

  if (diffH < 24) {
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }
  if (diffH < 48) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface RoomItemProps {
  room: ChatRoom & { userId: any; providerId: any };
  onPress: () => void;
  isProvider: boolean;
}

const RoomItem: React.FC<RoomItemProps> = ({ room, onPress, isProvider }) => {
  const accentColor = SERVICE_COLORS[room.serviceType] || '#8B5CF6';
  const otherParty = isProvider ? room.userId : room.providerId;
  const unreadCount = isProvider ? room.unreadCountProvider : room.unreadCountUser;

  return (
    <TouchableOpacity style={styles.roomItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.roomAvatarWrapper}>
        {otherParty?.profileImage ? (
          <Image source={{ uri: otherParty.profileImage }} style={styles.roomAvatar} />
        ) : (
          <LinearGradient colors={[accentColor, accentColor + 'BB']} style={styles.roomAvatarFallback}>
            <Text style={styles.roomAvatarInitial}>
              {(otherParty?.name || '?')[0].toUpperCase()}
            </Text>
          </LinearGradient>
        )}
        <View style={[styles.serviceTypeIndicator, { backgroundColor: accentColor }]} />
      </View>

      <View style={styles.roomContent}>
        <View style={styles.roomHeader}>
          <Text style={styles.roomName} numberOfLines={1}>
            {otherParty?.name || 'Unknown User'}
          </Text>
          <Text style={styles.roomTime}>{formatTime(room.lastMessageAt)}</Text>
        </View>

        <View style={styles.roomFooter}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {room.lastMessage || 'No messages yet'}
          </Text>
          {unreadCount > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: accentColor }]}>
              <Text style={styles.unreadCount}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function ProviderChatListScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const rooms = useSelector((state: RootState) => state.providersChat?.rooms ?? []);
  const isLoading = useSelector((state: RootState) => state.providersChat?.roomsLoading);

  const loadRooms = useCallback(() => {
    dispatch(fetchChatRooms() as any);
  }, [dispatch]);

  useEffect(() => {
    loadRooms();
  }, []);

  const handleRoomPress = useCallback((room: any) => {
    const otherParty = room.userId; // provider sees user info
    // @ts-ignore
    navigation.navigate('ProviderChatRoom', {
      room,
      otherParty,
    });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{rooms.length}</Text>
        </View>
      </View>

      <LinearGradient
        colors={['#8B5CF6', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerAccent}
      />

      {isLoading && rooms.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <RoomItem
              room={item as any}
              onPress={() => handleRoomPress(item)}
              isProvider
            />
          )}
          refreshControl={
            <RefreshControl refreshing={!!isLoading} onRefresh={loadRooms} colors={['#8B5CF6']} />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <LinearGradient colors={['#EDE9FE', '#DDD6FE']} style={styles.emptyIcon}>
                <Ionicons name="chatbubbles-outline" size={40} color="#8B5CF6" />
              </LinearGradient>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySubtitle}>
                When users send you messages, they'll appear here
              </Text>
            </View>
          }
          contentContainerStyle={rooms.length === 0 ? styles.emptyList : undefined}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1E293B', flex: 1 },
  headerBadge: {
    backgroundColor: '#8B5CF620',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerBadgeText: { fontSize: 13, fontWeight: '700', color: '#8B5CF6' },
  headerAccent: { height: 3, marginBottom: 4 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: '#64748B' },

  roomItem: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 14,
  },
  roomAvatarWrapper: { position: 'relative' },
  roomAvatar: { width: 52, height: 52, borderRadius: 16 },
  roomAvatarFallback: {
    width: 52, height: 52, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  roomAvatarInitial: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  serviceTypeIndicator: {
    position: 'absolute', bottom: 0, right: 0,
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 2, borderColor: '#FFFFFF',
  },

  roomContent: { flex: 1 },
  roomHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  roomName: { fontSize: 15, fontWeight: '700', color: '#1E293B', flex: 1 },
  roomTime: { fontSize: 12, color: '#94A3B8' },
  roomFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lastMessage: { fontSize: 13, color: '#64748B', flex: 1 },
  unreadBadge: {
    minWidth: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 6, marginLeft: 8,
  },
  unreadCount: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },

  separator: { height: 1, backgroundColor: '#F8FAFC', marginHorizontal: 20 },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  emptyIcon: {
    width: 88, height: 88, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center', maxWidth: 250 },
});
