import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchApi } from '../api/client';
import { AppNotification, notificationTarget, useNotifications } from '../context/NotificationsContext';
import { EmptyState, Icon, IconName, ScreenHeader } from '../components/ui';
import { timeAgo } from '../utils/format';
import { Tone } from '../utils/listing';
import { Colors, font, useTheme, useThemedStyles } from '../theme/ThemeContext';

const ICONS: Record<string, [IconName, Tone]> = {
  MESSAGE_RECEIVED: ['chat-outline', 'primary'],
  OFFER_CREATED: ['tag-outline', 'primary'],
  OFFER_COUNTERED: ['swap-horizontal', 'warning'],
  OFFER_ACCEPTED: ['handshake-outline', 'success'],
  OFFER_REJECTED: ['close-circle-outline', 'danger'],
  LISTING_APPROVED: ['check-circle-outline', 'success'],
  LISTING_VERIFIED: ['check-decagram-outline', 'success'],
  LISTING_REJECTED: ['alert-outline', 'danger'],
  LISTING_CHANGES_REQUESTED: ['pencil-outline', 'danger'],
  LISTING_REMARK: ['message-alert-outline', 'warning'],
  LISTING_SUSPENDED: ['alert-outline', 'danger'],
  LISTING_EXPIRED: ['timer-sand', 'neutral'],
  LISTING_SOLD: ['package-variant-closed', 'neutral'],
  RESERVATION_RELEASED: ['lock-open-variant-outline', 'warning'],
};

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

  const tone = (t: Tone) =>
    ({ success: [colors.success, colors.successSoft], warning: [colors.warning, colors.warningSoft], danger: [colors.danger, colors.dangerSoft], primary: [colors.primaryText, colors.primarySoft], neutral: [colors.textSecondary, colors.surface2] })[t];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title="Notifications"
        onBack={() => navigation.goBack()}
        right={items.some((n) => !n.isRead) ? (
          <TouchableOpacity onPress={markAll} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.markAll}>Mark all read</Text>
          </TouchableOpacity>
        ) : null}
      />
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={<EmptyState icon="bell-outline" title="No notifications yet" body="You'll see new messages, offers and updates about your ads here." />}
          renderItem={({ item: n }) => {
            const [icon, t] = ICONS[n.type] ?? (['bell-outline', 'neutral'] as [IconName, Tone]);
            const [fg, bg] = tone(t);
            return (
              <TouchableOpacity style={[styles.row, !n.isRead && styles.rowUnread]} onPress={() => open(n)} accessibilityRole="button" accessibilityLabel={`${n.title}${n.isRead ? '' : ', unread'}`}>
                <View style={[styles.icon, { backgroundColor: bg }]}><Icon name={icon} size={20} color={fg} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, !n.isRead && { fontFamily: font.bold }]}>{n.title}</Text>
                  <Text style={styles.rowBody}>{n.body}</Text>
                  <Text style={styles.rowTime}>{timeAgo(n.createdAt)}</Text>
                </View>
                {!n.isRead && <View style={styles.dot} />}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
};

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    markAll: { color: c.primaryText, fontSize: 13, fontFamily: font.semibold },
    row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', padding: 14, borderRadius: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
    rowUnread: { borderColor: c.primarySoftBorder },
    icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    rowTitle: { color: c.text, fontSize: 15, fontFamily: font.semibold },
    rowBody: { color: c.textSecondary, fontSize: 13, marginTop: 2, lineHeight: 18, fontFamily: font.regular },
    rowTime: { color: c.textMuted, fontSize: 11, marginTop: 6, fontFamily: font.regular },
    dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: c.primary, marginTop: 6 },
  });
