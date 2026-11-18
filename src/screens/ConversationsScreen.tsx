import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { fetchApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';
import { Avatar, Button, EmptyState, Icon } from '../components/ui';
import { FeedbackButton } from '../components/FeedbackButton';
import { formatPrice, timeAgo } from '../utils/format';
import { Colors, font, useTheme, useThemedStyles } from '../theme/ThemeContext';

interface ConversationItem {
  id: string;
  listingId: string;
  lastMessageAt: string;
  listing: { id: string; title: string; price: number; status?: string; media: { url: string }[] };
  buyer: { id: string; displayName: string };
  seller: { id: string; displayName: string };
  messages: { content: string; createdAt: string; senderId: string; isRead?: boolean; kind?: string }[];
}

/** Chats tab: one row per buyer–seller conversation, newest first. */
export const ConversationsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const { refresh: refreshBadges } = useNotifications();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const res = await fetchApi<ConversationItem[]>('/conversations');
    setLoading(false);
    setRefreshing(false);
    if (res.success && res.data) setConversations(res.data);
    refreshBadges();
  }, [refreshBadges]);

  useFocusEffect(
    useCallback(() => {
      if (!user) {
        navigation.navigate('Login');
        return;
      }
      void load();
    }, [user, load, navigation])
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.header, { flexDirection: 'row', alignItems: 'center' }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} accessibilityRole="header">Chats</Text>
          <Text style={styles.sub}>Messages and offers with buyers and sellers</Text>
        </View>
        <FeedbackButton style={{ marginRight: -8 }} />
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={
            <EmptyState
              icon="chat-outline"
              title="No conversations yet"
              body="Chat with a seller from any listing. Your conversations will show up here."
              action={<Button title="Explore listings" size="sm" onPress={() => navigation.navigate('Tabs', { screen: 'Explore' })} />}
            />
          }
          renderItem={({ item }) => {
            const iAmBuyer = item.buyer.id === user?.id;
            const other = iAmBuyer ? item.seller : item.buyer;
            const last = item.messages?.[0];
            const unread = !!last && last.senderId !== user?.id && last.isRead === false;
            const preview = last ? `${last.senderId === user?.id ? 'You: ' : ''}${last.content}` : 'Conversation started';
            const thumb = item.listing.media?.[0]?.url;
            return (
              <TouchableOpacity style={[styles.row, unread && styles.rowUnread]} onPress={() => navigation.navigate('ChatDetail', { conversationId: item.id })} accessibilityRole="button" accessibilityLabel={`${other.displayName}, ${item.listing.title}${unread ? ', unread' : ''}`}>
                <View>
                  <Avatar name={other.displayName} size={48} />
                  {thumb ? <Image source={{ uri: thumb }} style={styles.thumb} /> : null}
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={styles.line}>
                    <Text style={[styles.name, unread && { fontFamily: font.bold }]} numberOfLines={1}>{other.displayName}</Text>
                    <Text style={[styles.time, unread && { color: colors.primaryText }]}>{timeAgo(last?.createdAt ?? item.lastMessageAt)}</Text>
                  </View>
                  <Text style={styles.listing} numberOfLines={1}>
                    <Icon name="tag-outline" size={12} color={colors.textMuted} /> {item.listing.title} · {formatPrice(Number(item.listing.price))}
                  </Text>
                  <View style={styles.line}>
                    <Text style={[styles.preview, unread && { color: colors.text, fontFamily: font.semibold }]} numberOfLines={1}>{preview}</Text>
                    {unread && <View style={styles.dot} />}
                  </View>
                </View>
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
    header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border },
    title: { fontFamily: font.heading, fontSize: 24, color: c.text },
    sub: { fontFamily: font.regular, fontSize: 13, color: c.textMuted, marginTop: 2 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
    rowUnread: { borderColor: c.primarySoftBorder, backgroundColor: c.primarySoft },
    thumb: { position: 'absolute', right: -4, bottom: -4, width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: c.surface, backgroundColor: c.surface2 },
    line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    name: { flex: 1, fontFamily: font.semibold, fontSize: 15, color: c.text },
    time: { fontFamily: font.regular, fontSize: 12, color: c.textMuted },
    listing: { fontFamily: font.regular, fontSize: 12, color: c.textMuted },
    preview: { flex: 1, fontFamily: font.regular, fontSize: 13, color: c.textSecondary },
    dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: c.primary },
  });
