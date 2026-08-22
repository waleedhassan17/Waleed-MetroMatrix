// ============================================================================
// One support entry point for the whole app.
//
// The support address was previously repeated inline in a few Alert copy
// strings, and the "Need Assistance?" cards that were supposed to open support
// had no handler at all — they looked tappable and did nothing.
// ============================================================================

import { Alert, Linking } from 'react-native';

export const SUPPORT_EMAIL = 'support@metromatrix.com';
export const SUPPORT_PHONE = '+923001234567';

/**
 * Offer the user a way to reach support.
 *
 * `context` is appended to the email subject so an agent can see which screen
 * the request came from without having to ask.
 */
export async function contactSupport(context?: string): Promise<void> {
  const subject = encodeURIComponent(
    context ? `MetroMatrix support — ${context}` : 'MetroMatrix support'
  );

  const openMail = async () => {
    const url = `mailto:${SUPPORT_EMAIL}?subject=${subject}`;
    try {
      await Linking.openURL(url);
    } catch {
      // No mail client configured — the address itself is still useful.
      Alert.alert('Contact support', `Email us at ${SUPPORT_EMAIL}`);
    }
  };

  const openPhone = async () => {
    try {
      await Linking.openURL(`tel:${SUPPORT_PHONE}`);
    } catch {
      Alert.alert('Contact support', `Call us at ${SUPPORT_PHONE}`);
    }
  };

  Alert.alert(
    'Need assistance?',
    'Our support team is available 24/7.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Call us', onPress: openPhone },
      { text: 'Email us', onPress: openMail },
    ],
    { cancelable: true }
  );
}
