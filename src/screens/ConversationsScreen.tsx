import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Colors, useTheme, useThemedStyles } from '../theme/ThemeContext';

interface ConversationItem {
  id: string;
  listingId: string;
  lastMessageAt: string;
  listing: {
    id: string;
    title: string;
    price: number;
    media: { url: string }[];
  };
  buyer: { id: string; displayName: string };
  seller: { id: string; displayName: string };
  messages: { content: string; createdAt: string }[];
}

export const ConversationsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigation.navigate('Login');
      return;
    }

    fetchApi<ConversationItem[]>('/conversations').then((res) => {
      setLoading(false);
      if (res.success && res.data) {
        setConversations(res.data);
      }
    });
  }, [user]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Messages & Inbox</Text>
      </View>

      {conversations.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No conversations yet.</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => {
            const otherUser = item.buyer.id === user?.id ? item.seller : item.buyer;
            const lastMsg = item.messages && item.messages.length > 0 ? item.messages[0].content : 'Conversation started';
            const thumb = item.listing.media && item.listing.media.length > 0 ? item.listing.media[0].url : undefined;

            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('ChatDetail', { conversationId: item.id })}
              >
                {thumb ? (
                  <Image source={{ uri: thumb }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.placeholderThumb]} />
                )}
                <View style={styles.cardContent}>
                  <Text style={styles.listingTitle} numberOfLines={1}>{item.listing.title}</Text>
                  <Text style={styles.userName}>{otherUser.displayName}</Text>
                  <Text style={styles.lastMsg} numberOfLines={1}>{lastMsg}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
};

const makeStyles = (c: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: c.border },
  backBtn: { marginBottom: 8 },
  backBtnText: { color: c.primary, fontSize: 16 },
  title: { fontSize: 22, fontWeight: '800', color: c.text },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: c.textSecondary, fontSize: 15 },
  card: { flexDirection: 'row', backgroundColor: c.surface, padding: 12, borderRadius: 12, marginBottom: 12, alignItems: 'center' },
  thumb: { width: 50, height: 50, borderRadius: 8, marginRight: 12, backgroundColor: c.surface2 },
  placeholderThumb: { backgroundColor: c.borderStrong },
  cardContent: { flex: 1 },
  listingTitle: { color: c.text, fontWeight: '700', fontSize: 15, marginBottom: 2 },
  userName: { color: c.primary, fontSize: 13, fontWeight: '600', marginBottom: 2 },
  lastMsg: { color: c.textSecondary, fontSize: 13 },
});
