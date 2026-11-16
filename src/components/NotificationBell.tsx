import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNotifications } from '../context/NotificationsContext';
import { Colors, font, useThemedStyles } from '../theme/ThemeContext';
import { IconButton } from './ui';

/** Bell with an unread badge; opens the Notifications screen. */
export const NotificationBell: React.FC<{ onPress: () => void }> = ({ onPress }) => {
  const { unreadCount } = useNotifications();
  const styles = useThemedStyles(makeStyles);
  return (
    <IconButton
      name="bell-outline"
      onPress={onPress}
      label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
    >
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
        </View>
      )}
    </IconButton>
  );
};

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    badge: { position: 'absolute', top: 3, right: 2, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 3, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: c.surface },
    badgeText: { color: '#fff', fontSize: 9, fontFamily: font.bold },
  });
