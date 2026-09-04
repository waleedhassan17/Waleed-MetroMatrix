// ============================================================================
// THE conversations list. One implementation for every vertical and both roles.
//
// Follows the same pattern as ChatScreen and CallScreen: the server tells us
// our role per room, so nothing here branches on customer-vs-provider. The
// route name differs per vertical only so each side can theme it and reach it
// from its own navigator.
//
// This closes the gap where chat was reachable ONLY by drilling into a specific
// booking. A provider had no way to see who had messaged them, so a customer
// message could sit unread indefinitely — there was no screen that would ever
// show it.
// ============================================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchConversations,
  type ConversationSummary,
} from '../../../networks/realtime/conversationsNetwork';
import { normalizeRoomParams, type RoomParams } from './roomParams';
import { useAppSelector } from '../../../hooks/useReduxHooks';
import { selectTotalUnread } from '../../../store/unreadSlice';
import { emitEvent } from '../../../services/socket/socketClient';
import { isCallingSupported } from '../../../services/call/usePeerConnection';

/** Where tapping a row should land, per vertical and role. */
const CHAT_ROUTE = {
  homeservice: { user: 'ProviderChatScreen', provider: 'ProviderJobChat' },
  healthcare: { user: 'HealthcareConsultChat', provider: 'DoctorConsultChat' },
} as const;

const CALL_ROUTE = {
  homeservice: { user: 'CallScreen', provider: 'ProviderCallScreen' },
  healthcare: { user: 'HealthcareConsultCall', provider: 'HealthcareConsultCall' },
} as const;

/**
 * Statuses meaning the job is over, so its room is no longer the one to open.
 * Mirrors the backend's TERMINAL_STATUSES plus healthcare's vocabulary — the
 * same set the realtime service uses to decide which empty rooms to drop.
 */
const FINISHED = new Set(['COMPLETED', 'REJECTED', 'CANCELLED', 'completed', 'cancelled']);

/** A conversation row, plus the other rooms folded into it. */
type ConversationRow = ConversationSummary & { rooms: ConversationSummary[] };

/**
 * Collapse a provider's home-service rooms so there is ONE row per person.
 *
 * A room is always exactly one booking, server-side — that is load-bearing for
 * the chat cursor and the message indexes, so it stays that way. But a provider
 * who has worked for the same customer four times does not think of them as
 * four conversations; they saw the same name and face repeated down the list
 * with no way to tell the rows apart, and unread counts split across them.
 *
 * Scoped deliberately narrow:
 *   - provider rows only. A CUSTOMER's list is naturally one row per booking,
 *     since each is a different provider, and folding it would hide jobs.
 *   - home-service only. Healthcare rows keep per-appointment threads.
 * Everything else passes through untouched, which is what keeps this safe in a
 * screen shared by both roles and both verticals.
 */
function groupByCounterpart(list: ConversationSummary[]): ConversationRow[] {
  const foldable = (c: ConversationSummary) => c.role === 'provider' && c.roomType === 'homeservice';
  const newestFirst = (a: ConversationSummary, b: ConversationSummary) =>
    new Date(b.activityAt).getTime() - new Date(a.activityAt).getTime();

  const groups = new Map<string, ConversationSummary[]>();
  const passthrough: ConversationRow[] = [];

  for (const c of list) {
    if (!foldable(c) || !c.counterpart?.id) {
      passthrough.push({ ...c, rooms: [c] });
      continue;
    }
    const bucket = groups.get(c.counterpart.id);
    if (bucket) bucket.push(c);
    else groups.set(c.counterpart.id, [c]);
  }

  const merged: ConversationRow[] = [];
  for (const bucket of groups.values()) {
    const rooms = [...bucket].sort(newestFirst);
    const newest = rooms[0];

    // Open the most recent room still live; if every job with this person is
    // finished, their latest one is the right place to continue the thread.
    const target = rooms.find((r) => !FINISHED.has(r.status)) || newest;

    merged.push({
      ...newest,
      // The row IS the target room, so tapping needs no extra lookup.
      roomId: target.roomId,
      status: target.status,
      // Which job this is about — the disambiguation the repeated names lacked.
      subtitle:
        rooms.length > 1
          ? `${target.subtitle || 'Service'} · ${rooms.length} bookings`
          : target.subtitle,
      // Unread must be the total across their rooms, or the badge undercounts
      // and messages sit unread in a room the provider cannot see separately.
      unread: rooms.reduce((n, r) => n + (r.unread || 0), 0),
      // Newest message across all their rooms — `newest` is already sorted by
      // activity, so its lastMessage is the most recent thing either said.
      lastMessage: newest.lastMessage,
      activityAt: newest.activityAt,
      rooms,
    });
  }

  return [...merged, ...passthrough].sort(newestFirst);
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d` : new Date(then).toLocaleDateString();
}

export default function ConversationsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: RoomParams }, 'params'>>();
  const theme = normalizeRoomParams(route.params);

  // Cached after the first call — a native module cannot appear at runtime.
  const callingSupported = isCallingSupported();

  const [rows, setRows] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    const res = await fetchConversations();
    if (res.success && res.data) {
      setRows(res.data.conversations || []);
      setError(null);
    } else {
      setError(res.message || 'Could not load your conversations');
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  // Reload on focus: unread counts and presence both go stale the moment the
  // user leaves, and coming back to a list that still shows messages they have
  // already read is the most obvious way for this screen to look broken.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Refresh while the list is ALREADY open.
  //
  // It only reloaded on focus, so a message arriving while the user sat on this
  // very screen changed nothing — the row stayed stale and its unread count
  // stayed wrong. The global unread listener updates this total the moment a
  // message lands, so watching it gives the list a live trigger without a
  // second socket subscription.
  const liveUnread = useAppSelector(selectTotalUnread);
  const seenUnread = useRef(liveUnread);
  useEffect(() => {
    if (liveUnread !== seenUnread.current) {
      seenUnread.current = liveUnread;
      load();
    }
  }, [liveUnread, load]);

  // One row per person for a provider's home-service jobs; every other row
  // untouched. Recomputed only when the fetched list changes.
  const displayRows = useMemo(() => groupByCounterpart(rows), [rows]);

  const openChat = (c: ConversationRow) => {
    // A grouped row's badge is the SUM across that person's rooms, but opening
    // the chat only marks the target room read — and the folded rooms are no
    // longer individually reachable from this list, so their unread would sit
    // on the badge forever. Clear the whole group; the chat screen clears the
    // target again on mount, which is harmless.
    for (const room of c.rooms || []) {
      if (room.roomId !== c.roomId && room.unread > 0) {
        emitEvent('mark_read', {
          roomId: room.roomId,
          bookingId: room.roomId,
          roomType: room.roomType,
        });
      }
    }

    navigation.navigate(CHAT_ROUTE[c.roomType][c.role], {
      roomId: c.roomId,
      bookingId: c.roomId,
      roomType: c.roomType,
      counterpartName: c.counterpart.name,
      counterpartImage: c.counterpart.image,
    });
  };

  const openCall = (c: ConversationSummary) => {
    navigation.navigate(CALL_ROUTE[c.roomType][c.role], {
      roomId: c.roomId,
      bookingId: c.roomId,
      roomType: c.roomType,
      counterpartName: c.counterpart.name,
      counterpartImage: c.counterpart.image,
    });
  };

  const renderRow = ({ item }: { item: ConversationRow }) => (
    <TouchableOpacity style={styles.row} onPress={() => openChat(item)} activeOpacity={0.7}>
      <View>
        {item.counterpart.image ? (
          <Image source={{ uri: item.counterpart.image }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Ionicons name="person" size={22} color="#9CA3AF" />
          </View>
        )}
        {item.counterpart.presence === 'online' && <View style={styles.presenceDot} />}
      </View>

      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.name} numberOfLines={1}>
            {item.counterpart.name || 'Contact'}
          </Text>
          {!!item.lastMessage && (
            <Text style={styles.time}>{timeAgo(item.lastMessage.at)}</Text>
          )}
        </View>

        <View style={styles.rowTop}>
          <Text
            style={[styles.preview, item.unread > 0 && styles.previewUnread]}
            numberOfLines={1}
          >
            {item.lastMessage
              ? `${item.lastMessage.fromSelf ? 'You: ' : ''}${item.lastMessage.text}`
              : item.subtitle || 'No messages yet'}
          </Text>
          {item.unread > 0 && (
            <View style={[styles.badge, { backgroundColor: theme.accent }]}>
              <Text style={styles.badgeText}>{item.unread > 99 ? '99+' : item.unread}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Offered only when a call can actually be established: this build has
          the native WebRTC module AND the server says they are online. A call
          placed to an offline person rings once and dies, which is what made
          calling feel fake. Chat, on the row itself, is always available. */}
      {callingSupported && item.counterpart.presence === 'online' && (
        <TouchableOpacity
          style={styles.callBtn}
          onPress={() => openCall(item)}
          accessibilityLabel={`Call ${item.counterpart.name || 'contact'}`}
          // The row itself is the tap target for chat, so give the call button
          // room of its own rather than letting a near-miss open the thread.
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="call" size={19} color={theme.accent} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.accent }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.headerBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={44} color="#9CA3AF" />
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: theme.accent }]}
            onPress={() => load()}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={displayRows}
          keyExtractor={(c) => c.roomId}
          renderItem={renderRow}
          contentContainerStyle={displayRows.length ? styles.listContent : styles.listEmpty}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="chatbubbles-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.stateText}>
                Messages about your bookings appear here.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  headerBtn: { padding: 6, width: 36 },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700', flex: 1, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  listContent: { paddingVertical: 6 },
  listEmpty: { flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: { backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  presenceDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#fff',
  },
  rowBody: { flex: 1, gap: 4 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1 },
  time: { fontSize: 12, color: '#9CA3AF' },
  preview: { fontSize: 13, color: '#6B7280', flex: 1 },
  previewUnread: { color: '#111827', fontWeight: '600' },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  callBtn: { padding: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginTop: 14 },
  stateText: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  retryBtn: { marginTop: 18, paddingHorizontal: 26, paddingVertical: 11, borderRadius: 22 },
  retryText: { color: '#fff', fontWeight: '700' },
});
