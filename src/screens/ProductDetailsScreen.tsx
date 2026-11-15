import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, FlatList, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { fetchApi } from '../api/client';
import { formatPrice } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { Colors, useTheme, useThemedStyles } from '../theme/ThemeContext';

interface MediaEntry {
  id: string;
  url: string;
  mediaType?: string;
}

interface ListingDetail {
  id: string;
  title: string;
  description: string;
  price: number;
  condition: string;
  status: string;
  verifiedAt?: string | null;
  cityCode: string;
  stateCode: string;
  createdAt: string;
  seller: { id: string; displayName: string; createdAt: string };
  category: { name: string };
  attributes: { id: string; valueText?: string; valueNumber?: number; valueBoolean?: boolean; attributeDefinition: { name: string } }[];
  media: MediaEntry[];
}

interface Offer {
  id: string;
  listingId?: string;
  listing?: { id: string };
  proposedById?: string;
  amount: number;
  status: string;
  createdAt: string;
}

const CONDITION_LABELS: Record<string, string> = { NEW: 'New', LIKE_NEW: 'Like new', USED: 'Used', REFURBISHED: 'Refurbished', FOR_PARTS: 'For parts' };
const PLACEHOLDER = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800';
const GALLERY_HEIGHT = 280;

/** Plays a listing video inline with native controls. */
const ListingVideo: React.FC<{ url: string; width: number }> = ({ url, width }) => {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
  });
  return (
    <VideoView
      player={player}
      style={{ width, height: GALLERY_HEIGHT, backgroundColor: '#000' }}
      contentFit="contain"
      nativeControls
      fullscreenOptions={{ enable: true }}
    />
  );
};

export const ProductDetailsScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { listingId } = route.params;
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { width: screenWidth } = useWindowDimensions();
  const galleryWidth = screenWidth - 32;

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [contacting, setContacting] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [submittingOffer, setSubmittingOffer] = useState(false);
  const [latestOffer, setLatestOffer] = useState<Offer | null>(null);

  useEffect(() => {
    fetchApi<ListingDetail>(`/listings/${listingId}`).then((res) => {
      setLoading(false);
      if (res.success && res.data) {
        setListing(res.data);
        setOfferAmount(String(Math.floor(res.data.price * 0.9)));
      }
    });
  }, [listingId]);

  // Newest offer in my negotiation for this listing (mine or the seller's counter).
  useEffect(() => {
    if (!user) return;
    fetchApi<Offer[]>('/offers/mine').then((res) => {
      if (res.success && res.data) {
        const match = res.data.find((o) => o.listingId === listingId || o.listing?.id === listingId);
        setLatestOffer(match ?? null);
      }
    });
  }, [user, listingId]);

  const openChat = async () => {
    if (!user) { navigation.navigate('Login'); return; }
    if (!listing) return;
    setContacting(true);
    const res = await fetchApi<{ id: string }>('/conversations/initiate', { method: 'POST', body: JSON.stringify({ listingId: listing.id }) });
    setContacting(false);
    if (res.success && res.data) navigation.navigate('ChatDetail', { conversationId: res.data.id });
    else Alert.alert('Could not open chat', res.error?.message || 'Please try again.');
  };

  const handleSubmitOffer = async () => {
    if (!user) { navigation.navigate('Login'); return; }
    if (!listing) return;
    const amount = parseFloat(offerAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid offer amount in ₹.');
      return;
    }
    setSubmittingOffer(true);
    const res = await fetchApi<Offer>('/offers', { method: 'POST', body: JSON.stringify({ listingId: listing.id, amount, message: offerMessage || undefined }) });
    setSubmittingOffer(false);
    if (res.success && res.data) {
      setLatestOffer(res.data);
      setShowOfferModal(false);
      setOfferMessage('');
      Alert.alert('Offer sent', `Your offer of ${formatPrice(amount)} was sent. You'll be notified when the seller replies.`, [
        { text: 'OK' },
        { text: 'Open chat', onPress: openChat },
      ]);
    } else {
      Alert.alert('Could not send offer', res.error?.message || 'Please try again.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (!listing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}><Text style={{ color: colors.danger, fontSize: 16 }}>Listing not found</Text></View>
      </SafeAreaView>
    );
  }

  const media: MediaEntry[] = listing.media?.length ? listing.media : [{ id: 'placeholder', url: PLACEHOLDER, mediaType: 'IMAGE' }];
  const isSeller = user?.id === listing.seller.id;
  const isLive = listing.status === 'LIVE';
  const pending = latestOffer?.status === 'PENDING';
  const theirTurn = pending && latestOffer?.proposedById === user?.id;
  const myTurn = pending && latestOffer?.proposedById !== user?.id;

  const statusNote =
    listing.status === 'RESERVED' ? '🤝 Reserved — a deal is in progress with a buyer.'
      : listing.status === 'SOLD' ? '📦 This item has been sold.'
        : !isLive ? 'This listing is not currently available.' : null;

  return (
    <SafeAreaView style={styles.container}>
      <Modal visible={showOfferModal} transparent animationType="slide" onRequestClose={() => setShowOfferModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Make an offer</Text>
              <Text style={styles.modalSub}>Listed at <Text style={{ color: colors.primary, fontWeight: '700' }}>{formatPrice(listing.price)}</Text></Text>
              <Text style={styles.inputLabel}>Your offer (₹)</Text>
              <TextInput style={styles.input} keyboardType="number-pad" value={offerAmount} onChangeText={(t) => setOfferAmount(t.replace(/[^\d]/g, ''))} placeholder="Enter amount" placeholderTextColor={colors.placeholder} />
              <Text style={styles.inputLabel}>Message to seller (optional)</Text>
              <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} multiline value={offerMessage} onChangeText={setOfferMessage} placeholder="e.g. I can pick up today…" placeholderTextColor={colors.placeholder} />
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitOffer} disabled={submittingOffer}>
                {submittingOffer ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.submitBtnText}>Send offer</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setShowOfferModal(false)}>
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityRole="button">
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>

        {/* Gallery: swipe through photos and the video */}
        <View style={styles.gallery}>
          <FlatList
            data={media}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(m) => m.id}
            onMomentumScrollEnd={(e) => setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / galleryWidth))}
            renderItem={({ item }) =>
              item.mediaType === 'VIDEO' ? (
                <ListingVideo url={item.url} width={galleryWidth} />
              ) : (
                <Image source={{ uri: item.url }} style={{ width: galleryWidth, height: GALLERY_HEIGHT }} resizeMode="cover" />
              )
            }
          />
          {media.length > 1 && (
            <View style={styles.dots}>
              {media.map((m, i) => (
                <View key={m.id} style={[styles.dot, i === activeIndex && styles.dotActive]}>
                  {m.mediaType === 'VIDEO' && <Text style={styles.dotVideo}>▶</Text>}
                </View>
              ))}
            </View>
          )}
        </View>

        {statusNote && <Text style={styles.statusNote}>{statusNote}</Text>}

        <View style={styles.detailsCard}>
          <View style={styles.tagRow}>
            <Text style={styles.categoryBadge}>{listing.category?.name || 'General'}</Text>
            <Text style={styles.conditionBadge}>{CONDITION_LABELS[listing.condition] ?? listing.condition}</Text>
          </View>
          <Text style={styles.title}>{listing.title}</Text>
          {listing.verifiedAt ? <Text style={styles.verified}>✓ Verified by Becho</Text> : null}
          <Text style={styles.price}>{formatPrice(listing.price)}</Text>
          <Text style={styles.location}>📍 {listing.cityCode}, {listing.stateCode} (approximate)</Text>
        </View>

        {latestOffer && !isSeller && (
          <View style={[styles.sectionCard, { borderWidth: 1, borderColor: myTurn ? colors.warning : colors.border }]}>
            <Text style={[styles.sectionTitle, myTurn && { color: colors.warning }]}>
              {myTurn ? `🔄 The seller countered with ${formatPrice(latestOffer.amount)}`
                : theirTurn ? `⏳ Your offer of ${formatPrice(latestOffer.amount)} is waiting for the seller`
                  : latestOffer.status === 'ACCEPTED' ? `🤝 Deal agreed at ${formatPrice(latestOffer.amount)}`
                    : `Last offer ${formatPrice(latestOffer.amount)} · ${latestOffer.status.toLowerCase()}`}
            </Text>
            <TouchableOpacity onPress={openChat} style={{ marginTop: 6 }}>
              <Text style={styles.link}>{myTurn ? 'Respond in chat →' : 'Open chat →'}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{listing.description}</Text>
        </View>

        {listing.attributes?.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Specifications</Text>
            {listing.attributes.map((attr) => {
              const val = attr.valueText || (attr.valueNumber != null ? String(attr.valueNumber) : attr.valueBoolean != null ? (attr.valueBoolean ? 'Yes' : 'No') : '—');
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
          <Text style={styles.sectionTitle}>Seller</Text>
          <View style={styles.sellerRow}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{listing.seller.displayName.charAt(0).toUpperCase()}</Text></View>
            <View>
              <Text style={styles.sellerName}>{listing.seller.displayName} ✓</Text>
              <Text style={styles.sellerSub}>Verified · member since {new Date(listing.seller.createdAt).getFullYear()}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {!isSeller && (isLive || latestOffer) && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.contactBtn} onPress={openChat} disabled={contacting}>
            {contacting ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.contactBtnText}>💬 Chat</Text>}
          </TouchableOpacity>
          {isLive && (
            <TouchableOpacity
              style={[styles.offerBtn, pending && { opacity: 0.6 }]}
              onPress={() => (myTurn ? openChat() : setShowOfferModal(true))}
              disabled={theirTurn}
            >
              <Text style={styles.offerBtnText}>{myTurn ? '🔄 Respond' : theirTurn ? '⏳ Offer sent' : '🏷️ Make offer'}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { padding: 16, paddingBottom: 120 },
    backBtn: { marginBottom: 12 },
    backBtnText: { color: c.primary, fontSize: 16, fontWeight: '600' },
    gallery: { height: GALLERY_HEIGHT, borderRadius: 16, overflow: 'hidden', marginBottom: 12, backgroundColor: c.surface2 },
    dots: { position: 'absolute', bottom: 10, alignSelf: 'center', flexDirection: 'row', gap: 6, backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' },
    dotActive: { backgroundColor: '#fff', width: 16 },
    dotVideo: { fontSize: 6, color: '#000' },
    statusNote: { backgroundColor: c.surface2, color: c.textSecondary, padding: 12, borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
    detailsCard: { backgroundColor: c.surface, padding: 16, borderRadius: 16, marginBottom: 16 },
    tagRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    categoryBadge: { backgroundColor: c.primarySoft, color: c.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontSize: 12, fontWeight: '600', overflow: 'hidden' },
    conditionBadge: { backgroundColor: c.surface2, color: c.textSecondary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontSize: 12, overflow: 'hidden' },
    title: { fontSize: 22, fontWeight: '700', color: c.text, marginBottom: 8 },
    verified: { color: c.success, fontWeight: '700', fontSize: 13, marginBottom: 6 },
    price: { fontSize: 28, fontWeight: '800', color: c.primary, marginBottom: 8 },
    location: { color: c.textSecondary, fontSize: 14 },
    sectionCard: { backgroundColor: c.surface, padding: 16, borderRadius: 16, marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: c.text, marginBottom: 6 },
    link: { color: c.primary, fontWeight: '700' },
    description: { color: c.text, fontSize: 15, lineHeight: 22 },
    attrRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: c.border },
    attrLabel: { color: c.textSecondary, fontSize: 14 },
    attrValue: { color: c.text, fontWeight: '600', fontSize: 14 },
    sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.primary, justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: c.onPrimary, fontSize: 18, fontWeight: '700' },
    sellerName: { color: c.text, fontWeight: '700', fontSize: 16 },
    sellerSub: { color: c.textSecondary, fontSize: 12 },
    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, paddingBottom: 24, backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.border, flexDirection: 'row', gap: 10 },
    contactBtn: { flex: 1, backgroundColor: c.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    contactBtnText: { color: c.onPrimary, fontSize: 15, fontWeight: '700' },
    offerBtn: { flex: 1, backgroundColor: c.primarySoft, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: c.primary },
    offerBtnText: { color: c.primary, fontSize: 15, fontWeight: '700' },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: c.overlay },
    modalCard: { backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    modalTitle: { color: c.text, fontSize: 20, fontWeight: '800', marginBottom: 4 },
    modalSub: { color: c.textSecondary, fontSize: 14, marginBottom: 20 },
    inputLabel: { color: c.textSecondary, fontSize: 13, marginBottom: 6 },
    input: { backgroundColor: c.inputBg, color: c.text, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: c.inputBorder },
    submitBtn: { backgroundColor: c.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
    submitBtnText: { color: c.onPrimary, fontSize: 16, fontWeight: '700' },
    cancelModalBtn: { paddingVertical: 12, alignItems: 'center' },
    cancelModalBtnText: { color: c.textSecondary, fontSize: 15 },
  });
