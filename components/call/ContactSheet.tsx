// ============================================================================
// CONTACT SHEET — "how do you want to reach this person?"
//
// Replaces the native `Alert.alert` that Service Status and My Bookings used
// to show. Two problems with the Alert, both of which this fixes:
//
//   1. It was an OS dialog in the middle of an otherwise fully-designed flow,
//      and it could not carry the counterpart's name, avatar or presence.
//   2. It always offered "Call", including in builds where calling cannot
//      work at all (`react-native-webrtc` unlinked — Expo Go, or a binary made
//      before the native module was added) and when the other person has no
//      live socket. Both cases ring briefly and die, which is exactly what
//      made calling read as a dummy feature.
//
// So Call is GATED: it is offered only when this build can place a call AND
// the server says the counterpart is reachable. Otherwise it is shown disabled
// with the actual reason. Message is always available — it is durable, and
// works whether or not the other person is holding their phone.
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { isCallingSupported } from '../../services/call/usePeerConnection';

export interface ContactSheetProps {
  visible: boolean;
  onClose: () => void;
  /** The other person — shown in the sheet so it is obvious who is being called. */
  name: string;
  image?: string;
  subtitle?: string;
  /**
   * Server-reported presence of the counterpart, straight from
   * `useRoomSocket().counterpartPresence`. `null` means "not known yet", which
   * is treated as not-reachable: better a disabled Call than a dead one.
   */
  presence?: 'online' | 'offline' | null;
  onCall: () => void;
  onMessage: () => void;
}

const ContactSheet: React.FC<ContactSheetProps> = ({
  visible,
  onClose,
  name,
  image,
  subtitle,
  presence,
  onCall,
  onMessage,
}) => {
  const supported = isCallingSupported();
  const reachable = presence === 'online';
  const canCall = supported && reachable;

  // Say WHY, rather than showing a dead button. The two reasons are genuinely
  // different: one is about this app, the other about the other person.
  const callHint = !supported
    ? 'Calling needs the latest app version'
    : !reachable
      ? `${name || 'They'} are offline right now`
      : 'Voice call over the internet';

  const act = (fn: () => void) => {
    onClose();
    fn();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        {/* Swallows taps on the sheet itself so only the backdrop dismisses. */}
        <TouchableOpacity style={styles.sheet} activeOpacity={1}>
          <View style={styles.grabber} />

          <View style={styles.header}>
            {image ? (
              <Image source={{ uri: image }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>
                  {(name || '?').trim().charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.headerText}>
              <Text style={styles.title} numberOfLines={1}>
                {name || 'Provider'}
              </Text>
              {!!subtitle && (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              )}
            </View>
            {reachable && (
              <View style={styles.presenceDot} accessibilityLabel="Online" />
            )}
          </View>

          <TouchableOpacity
            style={[styles.option, !canCall && styles.optionDisabled]}
            onPress={() => canCall && act(onCall)}
            disabled={!canCall}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canCall }}
          >
            <View style={[styles.optionIcon, { backgroundColor: Colors.primaryLight }]}>
              <Ionicons
                name="call"
                size={20}
                color={canCall ? Colors.primary : Colors.text.tertiary}
              />
            </View>
            <View style={styles.optionText}>
              <Text style={[styles.optionLabel, !canCall && styles.optionLabelDisabled]}>
                Call
              </Text>
              <Text style={styles.optionHint}>{callHint}</Text>
            </View>
            {canCall && (
              <Ionicons name="chevron-forward" size={18} color={Colors.text.tertiary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.option}
            onPress={() => act(onMessage)}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <View style={[styles.optionIcon, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="chatbubble-ellipses" size={20} color={Colors.secondary} />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionLabel}>Message</Text>
              <Text style={styles.optionHint}>
                {reachable ? 'Chat now' : "They'll see it when they're back"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.text.tertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancel} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 36,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.borderLight,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  presenceDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.success,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  optionDisabled: {
    opacity: 0.55,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
    marginLeft: 14,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  optionLabelDisabled: {
    color: Colors.text.tertiary,
  },
  optionHint: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  cancel: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: Colors.borderLight,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
});

export default ContactSheet;
