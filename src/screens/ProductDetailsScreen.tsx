import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { fetchApi } from '../api/client';
import { formatPrice } from '../utils/format';
import { useAuth } from '../context/AuthContext';

interface ListingDetail {
  id: string;
  title: string;
  description: string;
  price: number;
  condition: string;
  cityCode: string;
  stateCode: string;
  createdAt: string;
  seller: { id: string; displayName: string; createdAt: string };
  category: { name: string };
  attributes: { id: string; valueText?: string; valueNumber?: number; valueBoolean?: boolean; attributeDefinition: { name: string } }[];
  media: { id: string; url: string }[];
}

interface Offer {
  id: string;
  proposedById?: string;
  amount: number;
  status: string;
  message?: string;
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: '⏳ Pending',
  ACCEPTED: '✅ Accepted',
  REJECTED: '❌ Rejected',
  COUNTERED: '🔄 Countered',
  CANCELLED: '🚫 Cancelled',
  EXPIRED: '⌛ Expired',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',
  ACCEPTED: '#22c55e',
  REJECTED: '#ef4444',
  COUNTERED: '#818cf8',
  CANCELLED: '#6b7280',
  EXPIRED: '#6b7280',
};

export const ProductDetailsScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { listingId } = route.params;
  const { user } = useAuth();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [contacting, setContacting] = useState(false);

  // Offer state
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [submittingOffer, setSubmittingOffer] = useState(false);
  const [existingOffer, setExistingOffer] = useState<Offer | null>(null);

  useEffect(() => {
    fetchApi<ListingDetail>(`/listings/${listingId}`).then((res) => {
      setLoading(false);
      if (res.success && res.data) {
        setListing(res.data);
        setOfferAmount(String(Math.floor(res.data.price * 0.9)));
      }
    });
  }, [listingId]);

  useEffect(() => {
    if (!user) return;
    fetchApi<Offer[]>('/offers/mine').then((res) => {
      if (res.success && res.data) {
        const match = res.data.find((o: any) => o.listingId === listingId || o.listing?.id === listingId);
        if (match) setExistingOffer(match);
      }
    });
  }, [user, listingId]);

  const handleContactSeller = async () => {
    if (!user) { navigation.navigate('Login'); return; }
    if (!listing) return;
    setContacting(true);
    const res = await fetchApi<any>('/conversations/initiate', {
      method: 'POST',
      body: JSON.stringify({ listingId: listing.id }),
    });
    setContacting(false);
    if (res.success && res.data) {
      navigation.navigate('ChatDetail', { conversationId: res.data.id });
    } else {
      Alert.alert('Error', res.error?.message || 'Failed to start conversation');
    }
  };

  const handleSubmitOffer = async () => {
    if (!user) { navigation.navigate('Login'); return; }
    if (!listing) return;
    const amount = parseFloat(offerAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid offer amount.');
      return;
    }
    setSubmittingOffer(true);
    const res = await fetchApi<Offer>('/offers', {
      method: 'POST',
      body: JSON.stringify({ listingId: listing.id, amount, message: offerMessage || undefined }),
    });
    setSubmittingOffer(false);
    if (res.success && res.data) {
      setExistingOffer(res.data);
      setShowOfferModal(false);
      setOfferMessage('');
      Alert.alert('Offer Sent! 🎉', `Your offer of ${formatPrice(amount)} was sent to the seller.`);
    } else {
      Alert.alert('Error', res.error?.message || 'Failed to submit offer.');
    }
  };

  const handleCancelOffer = async () => {
    if (!existingOffer) return;
    Alert.alert('Cancel Offer', 'Are you sure you want to cancel your offer?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancel Offer', style: 'destructive', onPress: async () => {
          const res = await fetchApi<Offer>(`/offers/${existingOffer.id}/cancel`, { method: 'POST' });
          if (res.success && res.data) setExistingOffer(res.data);
        },
      },
    ]);
  };

  if (loading) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#6366f1" /></View>
    </SafeAreaView>
  );

  if (!listing) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.loadingContainer}><Text style={{ color: '#ef4444', fontSize: 16 }}>Listing not found</Text></View>
    </SafeAreaView>
  );

  const mainImage = listing.media && listing.media.length > 0
    ? listing.media[0].url
    : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800';

  const isSeller = user?.id === listing.seller.id;

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Offer Modal ── */}
      <Modal visible={showOfferModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>💰 Make an Offer</Text>
              <Text style={styles.modalSub}>
                Listed at <Text style={{ color: '#6366f1', fontWeight: '700' }}>{formatPrice(listing.price)}</Text>
              </Text>

              <Text style={styles.inputLabel}>Your Offer Amount ($)</Text>
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                value={offerAmount}
                onChangeText={setOfferAmount}
                placeholder="Enter amount"
                placeholderTextColor="#9ca3af"
              />

              <Text style={styles.inputLabel}>Message to Seller (optional)</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                multiline
                value={offerMessage}
                onChangeText={setOfferMessage}
                placeholder="e.g. I can pick up today for cash..."
                placeholderTextColor="#9ca3af"
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitOffer} disabled={submittingOffer}>
                {submittingOffer ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Send Offer</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setShowOfferModal(false)}>
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>

        <Image source={{ uri: mainImage }} style={styles.image} />

        <View style={styles.detailsCard}>
          <View style={styles.tagRow}>
            <Text style={styles.categoryBadge}>{listing.category?.name || 'General'}</Text>
            <Text style={styles.conditionBadge}>{listing.condition}</Text>
          </View>
          <Text style={styles.title}>{listing.title}</Text>
          <Text style={styles.price}>{formatPrice(listing.price)}</Text>
          <Text style={styles.location}>📍 {listing.cityCode}, {listing.stateCode} (Approximate)</Text>
        </View>

        {/* Existing Offer Status */}
        {existingOffer && !isSeller && (
          <View style={[styles.sectionCard, { borderColor: STATUS_COLORS[existingOffer.status], borderWidth: 1 }]}>
            <Text style={[styles.sectionTitle, { color: STATUS_COLORS[existingOffer.status] }]}>
              {STATUS_LABELS[existingOffer.status]} — Your Offer: {formatPrice(existingOffer.amount)}
            </Text>
            {existingOffer.status === 'PENDING' && (
              <TouchableOpacity onPress={handleCancelOffer} style={{ marginTop: 8 }}>
                <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '600' }}>Cancel Offer</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{listing.description}</Text>
        </View>

        {listing.attributes && listing.attributes.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Specifications</Text>
            {listing.attributes.map((attr) => {
              const val = attr.valueText || (attr.valueNumber !== undefined ? String(attr.valueNumber) : attr.valueBoolean !== undefined ? (attr.valueBoolean ? 'Yes' : 'No') : 'N/A');
              return (
                <View key={attr.id} style={styles.attrRow}>
                  <Text style={styles.attrLabel}>{attr.attributeDefinition.name}</Text>
                  <Text style={styles.attrValue}>{val}</Text>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Seller Information</Text>
          <View style={styles.sellerRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{listing.seller.displayName.charAt(0).toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.sellerName}>{listing.seller.displayName}</Text>
              <Text style={styles.sellerSub}>Member since {new Date(listing.seller.createdAt).getFullYear()}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Floating Bottom CTA */}
      {!isSeller && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.contactBtn} onPress={handleContactSeller} disabled={contacting}>
            {contacting ? <ActivityIndicator color="#fff" /> : <Text style={styles.contactBtnText}>💬 Chat with Seller</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.offerBtn, existingOffer?.status === 'PENDING' && { opacity: 0.55 }]}
            onPress={() => setShowOfferModal(true)}
            disabled={existingOffer?.status === 'PENDING'}
          >
            <Text style={styles.offerBtnText}>
              {existingOffer?.status === 'PENDING' ? '⏳ Offer Pending' : '🏷️ Make Offer'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090d16' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16, paddingBottom: 120 },
  backBtn: { marginBottom: 12 },
  backBtnText: { color: '#818cf8', fontSize: 16, fontWeight: '600' },
  image: { width: '100%', height: 260, borderRadius: 16, marginBottom: 16, backgroundColor: '#1e293b' },
  detailsCard: { backgroundColor: '#131b2e', padding: 16, borderRadius: 16, marginBottom: 16 },
  tagRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  categoryBadge: { backgroundColor: 'rgba(99,102,241,0.2)', color: '#818cf8', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontSize: 12, fontWeight: '600' },
  conditionBadge: { backgroundColor: 'rgba(255,255,255,0.1)', color: '#9ca3af', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontSize: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 8 },
  price: { fontSize: 28, fontWeight: '800', color: '#6366f1', marginBottom: 8 },
  location: { color: '#9ca3af', fontSize: 14 },
  sectionCard: { backgroundColor: '#131b2e', padding: 16, borderRadius: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 10 },
  description: { color: '#cbd5e1', fontSize: 15, lineHeight: 22 },
  attrRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  attrLabel: { color: '#9ca3af', fontSize: 14 },
  attrValue: { color: '#fff', fontWeight: '600', fontSize: 14 },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  sellerName: { color: '#fff', fontWeight: '700', fontSize: 16 },
  sellerSub: { color: '#38bdf8', fontSize: 12 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, paddingBottom: 24, backgroundColor: '#090d16', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', gap: 10 },
  contactBtn: { flex: 1, backgroundColor: '#6366f1', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  contactBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  offerBtn: { flex: 1, backgroundColor: 'rgba(99,102,241,0.15)', paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(99,102,241,0.5)' },
  offerBtnText: { color: '#818cf8', fontSize: 15, fontWeight: '700' },
  // Modal styles
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalCard: { backgroundColor: '#131b2e', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 4 },
  modalSub: { color: '#9ca3af', fontSize: 14, marginBottom: 20 },
  inputLabel: { color: '#9ca3af', fontSize: 13, marginBottom: 6 },
  input: { backgroundColor: '#1e293b', color: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  submitBtn: { backgroundColor: '#6366f1', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelModalBtn: { paddingVertical: 12, alignItems: 'center' },
  cancelModalBtnText: { color: '#9ca3af', fontSize: 15 },
});
