import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNotifications } from '../context/NotificationsContext';
import { Colors, useThemedStyles } from '../theme/ThemeContext';

/** Bell with an unread badge; opens the Notifications screen. */
export const NotificationBell: React.FC<{ onPress: () => void }> = ({ onPress }) => {
  const { unreadCount } = useNotifications();
  const styles = useThemedStyles(makeStyles);
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
    >
      <Text style={styles.icon}>🔔</Text>
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    button: { width: 38, height: 38, borderRadius: 19, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
    icon: { fontSize: 17 },
    badge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: c.danger, alignItems: 'center', justifyContent: 'center' },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  });
