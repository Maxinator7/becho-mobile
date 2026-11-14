import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchApi } from '../api/client';
import { AppNotification, notificationTarget, useNotifications } from '../context/NotificationsContext';
import { Colors, useTheme, useThemedStyles } from '../theme/ThemeContext';

const ICONS: Record<string, string> = {
  MESSAGE_RECEIVED: '💬',
  OFFER_CREATED: '🏷️',
  OFFER_COUNTERED: '🔄',
  OFFER_ACCEPTED: '🤝',
  OFFER_REJECTED: '❌',
  LISTING_APPROVED: '✅',
  LISTING_REJECTED: '⚠️',
  LISTING_SUSPENDED: '⚠️',
  LISTING_EXPIRED: '⏳',
  LISTING_SOLD: '📦',
  RESERVATION_RELEASED: '🔁',
};

function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export const NotificationsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { refresh: refreshCount, unreadCount } = useNotifications();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const res = await fetchApi<{ notifications: AppNotification[] }>('/notifications?limit=30');
    if (res.success && res.data) setItems(res.data.notifications);
    setLoading(false);
    setRefreshing(false);
  }, []);

  // Reload whenever new notifications arrive while this screen is open.
  useEffect(() => { void load(); }, [load, unreadCount]);

  const open = async (n: AppNotification) => {
    if (!n.isRead) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      await fetchApi(`/notifications/${n.id}/read`, { method: 'POST' });
      refreshCount();
    }
    const [screen, params] = notificationTarget(n);
    navigation.navigate(screen, params);
  };

  const markAll = async () => {
    await fetchApi('/notifications/read-all', { method: 'POST' });
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    refreshCount();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button">
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        {items.some((n) => !n.isRead) ? (
          <TouchableOpacity onPress={markAll} accessibilityRole="button">
            <Text style={styles.markAll}>Mark all read</Text>
          </TouchableOpacity>
        ) : <View style={{ width: 80 }} />}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ padding: 12, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.empty}>No notifications yet.{'\n'}You'll see new messages and offers here.</Text>
            </View>
          }
          renderItem={({ item: n }) => (
            <TouchableOpacity style={[styles.row, !n.isRead && styles.rowUnread]} onPress={() => open(n)} accessibilityRole="button">
              <Text style={styles.icon}>{ICONS[n.type] ?? '🔔'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, !n.isRead && { fontWeight: '800' }]}>{n.title}</Text>
                <Text style={styles.rowBody}>{n.body}</Text>
                <Text style={styles.rowTime}>{timeAgo(n.createdAt)}</Text>
              </View>
              {!n.isRead && <View style={styles.dot} />}
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.surface },
    back: { color: c.primary, fontSize: 16, width: 80 },
    title: { color: c.text, fontSize: 18, fontWeight: '800' },
    markAll: { color: c.primary, fontSize: 13, fontWeight: '700', width: 80, textAlign: 'right' },
    empty: { color: c.textSecondary, textAlign: 'center', lineHeight: 22 },
    row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', padding: 14, borderRadius: 12, marginBottom: 6 },
    rowUnread: { backgroundColor: c.surface2 },
    icon: { fontSize: 20, marginTop: 1 },
    rowTitle: { color: c.text, fontSize: 15, fontWeight: '600' },
    rowBody: { color: c.textSecondary, fontSize: 13, marginTop: 2, lineHeight: 18 },
    rowTime: { color: c.textMuted, fontSize: 11, marginTop: 4 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.primary, marginTop: 6 },
  });
