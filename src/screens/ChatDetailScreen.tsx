import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, SafeAreaView, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Modal } from 'react-native';
import { fetchApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface MessageItem {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
}

interface ConversationMeta {
  id: string;
  listingId: string;
  listing: { id: string; title: string; price: number };
  buyer: { id: string; displayName: string };
  seller: { id: string; displayName: string };
}

interface Offer {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  status: string;
  message?: string;
  createdAt: string;
  buyer: { id: string; displayName: string };
  seller: { id: string; displayName: string };
  listing: { id: string; title: string; price: number };
  parentOffer?: { id: string; amount: number; status: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',
  ACCEPTED: '#22c55e',
  REJECTED: '#ef4444',
  COUNTERED: '#818cf8',
  CANCELLED: '#6b7280',
  EXPIRED: '#6b7280',
};

export const ChatDetailScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { conversationId } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [meta, setMeta] = useState<ConversationMeta | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);

  // Offer state
  const [offers, setOffers] = useState<Offer[]>([]);
  const [showOffersModal, setShowOffersModal] = useState(false);
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [counterTargetOffer, setCounterTargetOffer] = useState<Offer | null>(null);
  const [counterAmount, setCounterAmount] = useState('');
  const [counterMessage, setCounterMessage] = useState('');
  const [actingOnOffer, setActingOnOffer] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);

  const loadData = async () => {
    const res = await fetchApi<{ conversation: ConversationMeta; messages: MessageItem[] }>(`/conversations/${conversationId}/messages`);
    setLoading(false);
    if (res.success && res.data) {
      setMeta(res.data.conversation);
      setMessages(res.data.messages);
      fetchApi(`/conversations/${conversationId}/read`, { method: 'PATCH' });
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, [conversationId]);

  // Load offers for the conversation's listing
  const loadOffers = async () => {
    if (!meta || !user) return;
    const isSeller = meta.seller.id === user.id;
    const endpoint = isSeller
      ? `/offers/listing/${meta.listingId}`
      : `/offers/chain?listingId=${meta.listingId}&buyerId=${meta.buyer.id}`;
    const res = await fetchApi<Offer[]>(endpoint);
    if (res.success && res.data) setOffers(res.data);
  };

  useEffect(() => { loadOffers(); }, [meta, user]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const content = input.trim();
    setInput('');
    const res = await fetchApi<MessageItem>(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
    if (res.success && res.data) setMessages((prev) => [...prev, res.data!]);
  };

  const handleOfferAction = async (offerId: string, action: 'accept' | 'reject' | 'cancel') => {
    const labels: Record<string, string> = { accept: 'Accept', reject: 'Reject', cancel: 'Cancel' };
    Alert.alert(`${labels[action]} Offer`, `Are you sure you want to ${action} this offer?`, [
      { text: 'No', style: 'cancel' },
      {
        text: labels[action], style: action === 'accept' ? 'default' : 'destructive',
        onPress: async () => {
          setActingOnOffer(offerId);
          const res = await fetchApi<Offer>(`/offers/${offerId}/${action}`, { method: 'POST' });
          setActingOnOffer(null);
          if (res.success && res.data) {
            setOffers((prev) => prev.map((o) => (o.id === offerId ? res.data! : o)));
          }
        },
      },
    ]);
  };

  const handleOpenCounter = (offer: Offer) => {
    setCounterTargetOffer(offer);
    setCounterAmount(String(Math.round(offer.amount * 1.05)));
    setCounterMessage('');
    setShowOffersModal(false);
    setShowCounterModal(true);
  };

  const handleSubmitCounter = async () => {
    if (!counterTargetOffer) return;
    const amount = parseFloat(counterAmount);
    if (isNaN(amount) || amount <= 0) { Alert.alert('Invalid', 'Enter a valid amount.'); return; }
    setActingOnOffer(counterTargetOffer.id);
    const res = await fetchApi<Offer>(`/offers/${counterTargetOffer.id}/counter`, {
      method: 'POST',
      body: JSON.stringify({ amount, message: counterMessage || undefined }),
    });
    setActingOnOffer(null);
    if (res.success && res.data) {
      setOffers((prev) => [res.data!, ...prev.map((o) => o.id === counterTargetOffer.id ? { ...o, status: 'COUNTERED' } : o)]);
      setShowCounterModal(false);
      setCounterTargetOffer(null);
      Alert.alert('Counter Sent! 🔄', `Your counter offer of $${amount.toLocaleString()} was sent.`);
    } else {
      Alert.alert('Error', res.error?.message || 'Failed to send counter offer.');
    }
  };

  const pendingOffers = offers.filter((o) => o.status === 'PENDING');

  if (loading) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}><ActivityIndicator size="large" color="#6366f1" /></View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Offers Modal */}
      <Modal visible={showOffersModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🏷️ Offers & Negotiation</Text>
              <TouchableOpacity onPress={() => setShowOffersModal(false)}>
                <Text style={{ color: '#9ca3af', fontSize: 18 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={offers}
              keyExtractor={(o) => o.id}
              style={{ maxHeight: 400 }}
              renderItem={({ item: offer }) => {
                const iAmSeller = offer.sellerId === user?.id;
                const iAmBuyer = offer.buyerId === user?.id;
                const canAct = iAmSeller && offer.status === 'PENDING';
                const canCancel = iAmBuyer && offer.status === 'PENDING';
                return (
                  <View style={[styles.offerCard, { borderColor: STATUS_COLORS[offer.status] }]}>
                    <View style={styles.offerCardRow}>
                      <Text style={[styles.offerAmount, { color: STATUS_COLORS[offer.status] }]}>
                        ${offer.amount.toLocaleString()}
                      </Text>
                      <Text style={[styles.offerStatus, { backgroundColor: `${STATUS_COLORS[offer.status]}22`, color: STATUS_COLORS[offer.status] }]}>
                        {offer.status}
                      </Text>
                    </View>
                    <Text style={styles.offerMeta}>From {offer.buyer.displayName} · {new Date(offer.createdAt).toLocaleDateString()}</Text>
                    {offer.message ? <Text style={styles.offerMsg}>"{offer.message}"</Text> : null}
                    {offer.parentOffer ? <Text style={styles.offerReply}>↩ Reply to ${offer.parentOffer.amount.toLocaleString()}</Text> : null}
                    {(canAct || canCancel) && (
                      <View style={styles.offerActions}>
                        {canAct && (
                          <>
                            <TouchableOpacity style={[styles.offerActionBtn, { borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)' }]} onPress={() => handleOfferAction(offer.id, 'accept')}>
                              <Text style={{ color: '#22c55e', fontWeight: '700', fontSize: 13 }}>✅ Accept</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.offerActionBtn, { borderColor: '#818cf8', backgroundColor: 'rgba(129,140,248,0.1)' }]} onPress={() => handleOpenCounter(offer)}>
                              <Text style={{ color: '#818cf8', fontWeight: '700', fontSize: 13 }}>🔄 Counter</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.offerActionBtn, { borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)' }]} onPress={() => handleOfferAction(offer.id, 'reject')}>
                              <Text style={{ color: '#ef4444', fontWeight: '700', fontSize: 13 }}>❌ Reject</Text>
                            </TouchableOpacity>
                          </>
                        )}
                        {canCancel && (
                          <TouchableOpacity style={[styles.offerActionBtn, { borderColor: '#6b7280', backgroundColor: 'rgba(107,114,128,0.1)' }]} onPress={() => handleOfferAction(offer.id, 'cancel')}>
                            <Text style={{ color: '#9ca3af', fontWeight: '700', fontSize: 13 }}>🚫 Cancel</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                );
              }}
              ListEmptyComponent={<Text style={{ color: '#9ca3af', textAlign: 'center', padding: 20 }}>No offers yet.</Text>}
            />
          </View>
        </View>
      </Modal>

      {/* Counter Offer Modal */}
      <Modal visible={showCounterModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>🔄 Counter Offer</Text>
                <TouchableOpacity onPress={() => setShowCounterModal(false)}>
                  <Text style={{ color: '#9ca3af', fontSize: 18 }}>✕</Text>
                </TouchableOpacity>
              </View>
              {counterTargetOffer && (
                <Text style={styles.modalSub}>Their offer: <Text style={{ color: '#f59e0b', fontWeight: '700' }}>${counterTargetOffer.amount.toLocaleString()}</Text></Text>
              )}
              <Text style={styles.inputLabel}>Your Counter Amount ($)</Text>
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                value={counterAmount}
                onChangeText={setCounterAmount}
                placeholder="Enter amount"
                placeholderTextColor="#9ca3af"
              />
              <Text style={styles.inputLabel}>Message (optional)</Text>
              <TextInput
                style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                multiline
                value={counterMessage}
                onChangeText={setCounterMessage}
                placeholder="Best I can do..."
                placeholderTextColor="#9ca3af"
              />
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitCounter} disabled={!!actingOnOffer}>
                {actingOnOffer ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Send Counter Offer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          {meta && (
            <View style={styles.headerContent}>
              <View>
                <Text style={styles.headerTitle} numberOfLines={1}>{meta.listing.title}</Text>
                <Text style={styles.headerSub}>${meta.listing.price.toLocaleString()}</Text>
              </View>
              {/* Offers badge */}
              <TouchableOpacity
                style={[styles.offersBadge, pendingOffers.length > 0 && { borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.12)' }]}
                onPress={() => setShowOffersModal(true)}
              >
                <Text style={[styles.offersBadgeText, pendingOffers.length > 0 && { color: '#f59e0b' }]}>
                  🏷️ {offers.length} Offer{offers.length !== 1 ? 's' : ''}
                  {pendingOffers.length > 0 ? ` (${pendingOffers.length} pending)` : ''}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
            const isMe = item.senderId === user?.id;
            return (
              <View style={[styles.msgWrapper, isMe ? styles.msgRight : styles.msgLeft]}>
                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                  <Text style={styles.msgText}>{item.content}</Text>
                </View>
                <Text style={[styles.timeText, { textAlign: isMe ? 'right' : 'left' }]}>
                  {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            );
          }}
        />

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Type message..."
            placeholderTextColor="#9ca3af"
            value={input}
            onChangeText={setInput}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
            <Text style={styles.sendBtnText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090d16' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', backgroundColor: '#131b2e' },
  backBtn: { marginBottom: 8 },
  backBtnText: { color: '#818cf8', fontSize: 16 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700', flex: 1, marginRight: 10 },
  headerSub: { color: '#6366f1', fontSize: 14, fontWeight: '700' },
  offersBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.05)' },
  offersBadgeText: { color: '#9ca3af', fontSize: 12, fontWeight: '600' },
  msgWrapper: { marginBottom: 12, maxWidth: '75%' },
  msgLeft: { alignSelf: 'flex-start' },
  msgRight: { alignSelf: 'flex-end' },
  bubble: { padding: 12, borderRadius: 16 },
  bubbleMe: { backgroundColor: '#6366f1' },
  bubbleOther: { backgroundColor: '#1f2937' },
  msgText: { color: '#fff', fontSize: 15 },
  timeText: { color: '#9ca3af', fontSize: 10, marginTop: 4 },
  inputContainer: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', backgroundColor: '#131b2e' },
  textInput: { flex: 1, backgroundColor: '#1e293b', color: '#fff', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15 },
  sendBtn: { marginLeft: 8, backgroundColor: '#6366f1', borderRadius: 20, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' },
  sendBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalCard: { backgroundColor: '#131b2e', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  modalSub: { color: '#9ca3af', fontSize: 14, marginBottom: 16 },
  inputLabel: { color: '#9ca3af', fontSize: 13, marginBottom: 6 },
  input: { backgroundColor: '#1e293b', color: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  submitBtn: { backgroundColor: '#6366f1', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // Offer cards
  offerCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  offerCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  offerAmount: { fontSize: 18, fontWeight: '800' },
  offerStatus: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  offerMeta: { color: '#9ca3af', fontSize: 12, marginBottom: 4 },
  offerMsg: { color: '#cbd5e1', fontSize: 13, fontStyle: 'italic', marginBottom: 4 },
  offerReply: { color: '#818cf8', fontSize: 12, marginBottom: 4 },
  offerActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  offerActionBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
});
