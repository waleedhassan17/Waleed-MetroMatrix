// The order-inbox bell for the shopping and brand home headers. Refreshes its
// unread count whenever the screen regains focus; a failed count is just 0.
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { T } from '../../constants/theme';
import { ThemeColors, useTheme } from '../../theme';
import { fetchShoppingUnreadCountApi } from '../../networks/shopping/notificationApi';

interface Props {
  /** The route that opens the inbox in the current stack. */
  route: 'ShoppingNotifications' | 'BrandNotifications';
  color: string;
}

export default function NotificationBell({ route, color }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const [count, setCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      fetchShoppingUnreadCountApi().then((n) => alive && setCount(n));
      return () => {
        alive = false;
      };
    }, [])
  );

  return (
    <TouchableOpacity
      style={styles.btn}
      onPress={() => navigation.navigate(route, route === 'BrandNotifications' ? { audience: 'vendor' } : undefined)}
      accessibilityRole="button"
      accessibilityLabel={count ? `Notifications, ${count} unread` : 'Notifications'}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      <Ionicons name="notifications-outline" size={22} color={color} />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    btn: { padding: 4, marginHorizontal: 4 },
    badge: {
      position: 'absolute',
      top: 0,
      right: 0,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      paddingHorizontal: 3,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.error,
    },
    badgeText: { ...T.micro, color: c.inkInverse },
  });
