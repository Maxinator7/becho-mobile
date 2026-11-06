import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { fetchApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

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
          <ActivityIndicator size="large" color="#6366f1" />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090d16' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  backBtn: { marginBottom: 8 },
  backBtnText: { color: '#818cf8', fontSize: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#9ca3af', fontSize: 15 },
  card: { flexDirection: 'row', backgroundColor: '#131b2e', padding: 12, borderRadius: 12, marginBottom: 12, alignItems: 'center' },
  thumb: { width: 50, height: 50, borderRadius: 8, marginRight: 12, backgroundColor: '#1e293b' },
  placeholderThumb: { backgroundColor: '#374151' },
  cardContent: { flex: 1 },
  listingTitle: { color: '#fff', fontWeight: '700', fontSize: 15, marginBottom: 2 },
  userName: { color: '#38bdf8', fontSize: 13, fontWeight: '600', marginBottom: 2 },
  lastMsg: { color: '#9ca3af', fontSize: 13 },
});
