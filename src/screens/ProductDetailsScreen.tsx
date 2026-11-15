import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as Clipboard from 'expo-clipboard';
import { fetchApi } from '../api/client';
import { formatPrice, timeAgo } from '../utils/format';
import { CONDITION_LABELS, EDITABLE_STATUSES, statusChip } from '../utils/listing';
import { cityName, useServiceAreas } from '../utils/catalog';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import { Avatar, Button, Chip, EmptyState, Icon, IconButton, Notice, Overline, ScreenHeader, sheetStyles } from '../components/ui';
import { Colors, font, useTheme, useThemedStyles } from '../theme/ThemeContext';

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
  publishedAt?: string | null;
  seller: { id: string; displayName: string; createdAt: string; userCode?: string };
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

const GALLERY_RATIO = 0.78;

/** Plays a listing video inline with native controls. */
const ListingVideo: React.FC<{ url: string; width: number; height: number }> = ({ url, width, height }) => {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
  });
  return <VideoView player={player} style={{ width, height, backgroundColor: '#000' }} contentFit="contain" nativeControls fullscreenOptions={{ enable: true }} />;
};

export const ProductDetailsScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { listingId } = route.params;
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const sheet = useThemedStyles(sheetStyles);
  const insets = useSafeAreaInsets();
  const areas = useServiceAreas();
  const { isFavorite, toggle } = useFavorites();
  const { width: screenWidth } = useWindowDimensions();
  const galleryWidth = Math.min(screenWidth, 640);
  const galleryHeight = Math.round(galleryWidth * GALLERY_RATIO);
  const galleryRef = useRef<FlatList<MediaEntry>>(null);

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

  const share = () => {
    if (!listing) return;
    Share.share({ message: `${listing.title} — ${formatPrice(listing.price)} on Becho` }).catch(() => {});
  };

  const header = <ScreenHeader title="Listing details" onBack={() => navigation.goBack()} right={listing ? <IconButton name="share-variant-outline" label="Share" onPress={share} /> : null} />;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {header}
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (!listing) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {header}
        <EmptyState icon="file-hidden" title="Listing not found" body="It may have been sold, removed or is waiting for review." />
      </SafeAreaView>
    );
  }

  const media: MediaEntry[] = listing.media ?? [];
  const photoCount = media.filter((m) => m.mediaType !== 'VIDEO').length;
  const videoIndex = media.findIndex((m) => m.mediaType === 'VIDEO');
  const isSeller = user?.id === listing.seller.id;
  const isLive = listing.status === 'LIVE';
  const pending = latestOffer?.status === 'PENDING';
  const theirTurn = pending && latestOffer?.proposedById === user?.id;
  const myTurn = pending && latestOffer?.proposedById !== user?.id;
  const saved = isFavorite(listing.id);
  const sellerFirst = listing.seller.displayName.split(' ')[0];
  const posted = listing.publishedAt ?? listing.createdAt;
  const city = cityName(areas, listing.cityCode);
  const state = areas.find((a) => a.cityCode === listing.cityCode)?.stateName ?? listing.stateCode;

  const statusNote =
    listing.status === 'RESERVED' ? { icon: 'handshake-outline' as const, text: 'Reserved — a deal is in progress with a buyer.' }
      : listing.status === 'SOLD' ? { icon: 'package-variant-closed' as const, text: 'This item has been sold.' }
        : !isLive ? { icon: 'eye-off-outline' as const, text: isSeller ? 'Only you can see this listing right now.' : 'This listing is not currently available.' } : null;

  const specs = [
    { label: 'Condition', value: CONDITION_LABELS[listing.condition] ?? listing.condition },
    ...(listing.attributes ?? []).map((a) => ({
      label: a.attributeDefinition.name,
      value: a.valueText || (a.valueNumber != null ? String(a.valueNumber) : a.valueBoolean != null ? (a.valueBoolean ? 'Yes' : 'No') : '—'),
    })),
  ];
  const specWidth = (Math.min(screenWidth, 640) - 32 - 10) / 2;
  const showBar = isSeller ? EDITABLE_STATUSES.includes(listing.status) : isLive || !!latestOffer;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {header}
      <Modal visible={showOfferModal} transparent animationType="slide" onRequestClose={() => setShowOfferModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable style={sheet.overlay} onPress={() => setShowOfferModal(false)}>
            <Pressable style={sheet.sheet}>
              <View style={sheet.handle} />
              <View style={sheet.titleRow}>
                <Text style={sheet.title}>Make an offer</Text>
                <IconButton name="close" label="Close" onPress={() => setShowOfferModal(false)} />
              </View>
              <Text style={styles.modalSub}>Listed at <Text style={{ color: colors.text, fontFamily: font.bold }}>{formatPrice(listing.price)}</Text></Text>
              <Text style={styles.inputLabel}>Your offer</Text>
              <View style={styles.amountRow}>
                <Text style={styles.rupee}>₹</Text>
                <TextInput style={styles.amountInput} keyboardType="number-pad" value={offerAmount} onChangeText={(t) => setOfferAmount(t.replace(/[^\d]/g, ''))} placeholder="Enter amount" placeholderTextColor={colors.placeholder} accessibilityLabel="Offer amount in rupees" />
              </View>
              <Text style={styles.inputLabel}>Message to seller (optional)</Text>
              <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} multiline value={offerMessage} onChangeText={setOfferMessage} placeholder="e.g. I can pick up today…" placeholderTextColor={colors.placeholder} />
              <Button title="Send offer" onPress={handleSubmitOffer} loading={submittingOffer} />
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <ScrollView contentContainerStyle={{ paddingBottom: showBar ? 110 : 32 }}>
        {/* Gallery */}
        <View style={{ height: galleryHeight, backgroundColor: colors.surface2 }}>
          {media.length ? (
            <FlatList
              ref={galleryRef}
              data={media}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(m) => m.id}
              onMomentumScrollEnd={(e) => setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / galleryWidth))}
              onScroll={Platform.OS === 'web' ? (e) => setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / galleryWidth)) : undefined}
              scrollEventThrottle={64}
              renderItem={({ item }) =>
                item.mediaType === 'VIDEO' ? (
                  <ListingVideo url={item.url} width={galleryWidth} height={galleryHeight} />
                ) : (
                  <Image source={{ uri: item.url }} style={{ width: galleryWidth, height: galleryHeight }} resizeMode="cover" accessibilityLabel={listing.title} />
                )
              }
            />
          ) : (
            <View style={styles.center}>
              <Icon name="image-off-outline" size={36} color={colors.textMuted} />
              <Text style={styles.noPhotos}>No photos</Text>
            </View>
          )}
          {media.length > 0 && media[activeIndex]?.mediaType !== 'VIDEO' && (
            <View style={styles.photoPill}>
              <Icon name="image-outline" size={13} color="#FFFFFF" />
              <Text style={styles.photoPillText}>
                PHOTO {Math.min(media.slice(0, activeIndex + 1).filter((m) => m.mediaType !== 'VIDEO').length, photoCount)} OF {photoCount}
              </Text>
            </View>
          )}
          {videoIndex >= 0 && (
            <TouchableOpacity
              style={styles.videoPill}
              onPress={() => {
                galleryRef.current?.scrollToIndex({ index: videoIndex, animated: true });
                setActiveIndex(videoIndex);
              }}
              accessibilityRole="button"
              accessibilityLabel="Watch the video"
            >
              <Icon name="video-outline" size={14} color="#34D399" />
              <Text style={styles.photoPillText}>VIDEO</Text>
            </TouchableOpacity>
          )}
          {media.length > 1 && (
            <View style={styles.dots}>
              {media.map((m, i) => (
                <View key={m.id} style={[styles.dot, i === activeIndex && styles.dotActive]} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.body}>
          {listing.verifiedAt ? (
            <View style={styles.verifiedBanner}>
              <View style={styles.verifiedIcon}>
                <Icon name="check-decagram" size={20} color={colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.verifiedTitle}>STAFF VERIFIED LISTING</Text>
                <Text style={styles.verifiedBody}>Checked by the Becho team on {new Date(listing.verifiedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
              </View>
            </View>
          ) : null}

          {statusNote && (
            <Notice tone={listing.status === 'RESERVED' ? 'primary' : 'neutral'} icon={statusNote.icon} style={{ marginBottom: 12 }}>
              {statusNote.text}
            </Notice>
          )}

          <View style={styles.chipRow}>
            <Chip label={listing.category?.name || 'General'} tone="neutral" />
            <Chip label={CONDITION_LABELS[listing.condition] ?? listing.condition} tone="primary" />
            {isSeller && <Chip label={statusChip(listing.status, !!listing.verifiedAt).label} tone={statusChip(listing.status).tone} />}
          </View>
          <Text style={styles.title}>{listing.title}</Text>
          <View style={styles.metaRow}>
            <Icon name="map-marker-outline" size={15} color={colors.textMuted} />
            <Text style={styles.meta}>{city}, {state}</Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.meta}>Posted {timeAgo(posted)}</Text>
          </View>

          <View style={styles.priceCard}>
            <Text style={styles.price}>{formatPrice(listing.price)}</Text>
            {isLive && !isSeller ? <Text style={styles.priceSub}>Make an offer or chat with {sellerFirst} to agree a price</Text> : null}
          </View>

          {latestOffer && !isSeller && (
            <View style={[styles.offerCard, myTurn && { borderColor: colors.warningSoftBorder, backgroundColor: colors.warningSoft }]}>
              <Icon name={myTurn ? 'swap-horizontal' : latestOffer.status === 'ACCEPTED' ? 'handshake-outline' : 'tag-outline'} size={20} color={myTurn ? colors.warning : colors.primaryText} />
              <View style={{ flex: 1 }}>
                <Text style={styles.offerTitle}>
                  {myTurn ? `${sellerFirst} countered with ${formatPrice(latestOffer.amount)}`
                    : theirTurn ? `Your offer of ${formatPrice(latestOffer.amount)} is waiting for ${sellerFirst}`
                      : latestOffer.status === 'ACCEPTED' ? `Deal agreed at ${formatPrice(latestOffer.amount)}`
                        : `Last offer ${formatPrice(latestOffer.amount)} · ${latestOffer.status.toLowerCase()}`}
                </Text>
                <TouchableOpacity onPress={openChat} style={{ marginTop: 4 }} accessibilityRole="button">
                  <Text style={styles.link}>{myTurn ? 'Respond in chat →' : 'Open chat →'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <Text style={styles.section}>Details</Text>
          <View style={styles.specGrid}>
            {specs.map((s) => (
              <View key={s.label} style={[styles.spec, { width: specWidth }]}>
                <Text style={styles.specLabel}>{s.label}</Text>
                <Text style={styles.specValue} numberOfLines={2}>{s.value}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.section}>Description</Text>
          <View style={styles.card}>
            <Text style={styles.description}>{listing.description}</Text>
          </View>

          <Text style={styles.section}>Seller</Text>
          <View style={styles.card}>
            <View style={styles.sellerRow}>
              <Avatar name={listing.seller.displayName} size={52} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={styles.sellerName}>{listing.seller.displayName}</Text>
                  <Icon name="check-decagram" size={16} color={colors.primary} accessibilityLabel="Verified account" />
                </View>
                <Text style={styles.sellerSub}>Verified account · Member since {new Date(listing.seller.createdAt).getFullYear()}</Text>
              </View>
            </View>
            {listing.seller.userCode ? (
              <View style={styles.sellerId}>
                <Icon name="pound" size={16} color={colors.textMuted} />
                <Overline>Seller ID</Overline>
                <Text style={styles.sellerIdValue}>{listing.seller.userCode}</Text>
                <TouchableOpacity
                  onPress={() => Clipboard.setStringAsync(listing.seller.userCode!).then(() => Alert.alert('Copied', 'Seller ID copied.')).catch(() => {})}
                  style={styles.copy}
                  accessibilityRole="button"
                  accessibilityLabel="Copy seller ID"
                >
                  <Icon name="content-copy" size={14} color={colors.primaryText} />
                  <Text style={styles.copyText}>COPY</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          <View style={styles.safety}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Icon name="shield-outline" size={20} color="#34D399" />
              <Text style={styles.safetyTitle}>Trade safely</Text>
            </View>
            {[
              'Meet in a busy public place, in daylight if you can.',
              'Check the item works before you pay.',
              'Keep the conversation and offers in Becho chat.',
            ].map((t) => (
              <View key={t} style={styles.safetyRow}>
                <Icon name="check" size={16} color="#34D399" />
                <Text style={styles.safetyText}>{t}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {showBar && (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {isSeller ? (
            <Button title="Edit & resubmit" icon="pencil-outline" onPress={() => navigation.navigate('EditListing', { listingId: listing.id })} style={{ flex: 1 }} />
          ) : (
            <>
              <TouchableOpacity
                style={styles.bookmark}
                onPress={async () => { if (!(await toggle(listing.id))) navigation.navigate('Login'); }}
                accessibilityRole="button"
                accessibilityLabel={saved ? 'Remove from saved ads' : 'Save ad'}
              >
                <Icon name={saved ? 'bookmark' : 'bookmark-outline'} size={22} color={saved ? colors.primaryText : colors.text} />
              </TouchableOpacity>
              {isLive && (
                <Button
                  title={myTurn ? 'Respond' : theirTurn ? 'Offer sent' : 'Make offer'}
                  variant="outline"
                  disabled={theirTurn}
                  onPress={() => (!user ? navigation.navigate('Login') : myTurn ? openChat() : setShowOfferModal(true))}
                  style={{ flex: 1 }}
                />
              )}
              <Button title={`Chat with ${sellerFirst}`} icon="chat-outline" onPress={openChat} loading={contacting} style={{ flex: 1.4 }} />
            </>
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    noPhotos: { fontFamily: font.medium, color: c.textMuted, marginTop: 6 },
    photoPill: { position: 'absolute', left: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(15,23,42,0.75)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
    videoPill: { position: 'absolute', right: 12, top: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(15,23,42,0.75)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
    photoPillText: { color: '#FFFFFF', fontFamily: font.semibold, fontSize: 11, letterSpacing: 0.5 },
    dots: { position: 'absolute', right: 12, bottom: 16, flexDirection: 'row', gap: 5, backgroundColor: 'rgba(15,23,42,0.45)', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.55)' },
    dotActive: { backgroundColor: '#FFFFFF', width: 6 },
    body: { padding: 16 },
    verifiedBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, backgroundColor: c.successSoft, borderWidth: 1, borderColor: c.successSoftBorder, marginBottom: 14 },
    verifiedIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
    verifiedTitle: { fontFamily: font.bold, fontSize: 12, letterSpacing: 0.5, color: c.success },
    verifiedBody: { fontFamily: font.regular, fontSize: 13, color: c.textSecondary, marginTop: 1 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
    title: { fontFamily: font.heading, fontSize: 22, lineHeight: 28, color: c.text },
    metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 6 },
    meta: { fontFamily: font.regular, fontSize: 13, color: c.textMuted },
    metaDot: { color: c.textMuted, marginHorizontal: 2 },
    priceCard: { marginTop: 14, padding: 16, borderRadius: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
    price: { fontFamily: font.headingX, fontSize: 28, color: c.text },
    priceSub: { fontFamily: font.regular, fontSize: 13, color: c.textMuted, marginTop: 2 },
    offerCard: { flexDirection: 'row', gap: 10, marginTop: 12, padding: 14, borderRadius: 12, backgroundColor: c.primarySoft, borderWidth: 1, borderColor: c.primarySoftBorder },
    offerTitle: { fontFamily: font.semibold, fontSize: 14, color: c.text },
    link: { color: c.primaryText, fontFamily: font.semibold, fontSize: 13 },
    section: { fontFamily: font.heading, fontSize: 18, color: c.text, marginTop: 24, marginBottom: 10 },
    specGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    spec: { padding: 14, borderRadius: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
    specLabel: { fontFamily: font.regular, fontSize: 12, color: c.textMuted },
    specValue: { fontFamily: font.heading, fontSize: 16, color: c.text, marginTop: 4 },
    card: { padding: 16, borderRadius: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
    description: { fontFamily: font.regular, color: c.textSecondary, fontSize: 15, lineHeight: 22 },
    sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    sellerName: { fontFamily: font.heading, fontSize: 17, color: c.text },
    sellerSub: { fontFamily: font.regular, fontSize: 12, color: c.textMuted, marginTop: 2 },
    sellerId: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, padding: 10, borderRadius: 10, backgroundColor: c.surface2 },
    sellerIdValue: { flex: 1, fontFamily: font.bold, fontSize: 13, color: c.text, letterSpacing: 0.5 },
    copy: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    copyText: { fontFamily: font.bold, fontSize: 11, color: c.primaryText },
    safety: { marginTop: 20, padding: 16, borderRadius: 12, backgroundColor: c.surfaceDeep, borderWidth: 1, borderColor: c.border },
    safetyTitle: { fontFamily: font.heading, fontSize: 16, color: c.onSurfaceDeep },
    safetyRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
    safetyText: { flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: '#CBD5E1' },
    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border, flexDirection: 'row', gap: 8, alignItems: 'center' },
    bookmark: { width: 48, height: 48, borderRadius: 10, borderWidth: 1, borderColor: c.borderStrong, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface },
    modalSub: { fontFamily: font.regular, color: c.textSecondary, fontSize: 14, marginBottom: 16 },
    inputLabel: { fontFamily: font.semibold, color: c.text, fontSize: 13, marginBottom: 6 },
    amountRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, borderWidth: 1, borderColor: c.inputBorder, borderRadius: 10, backgroundColor: c.inputBg, paddingHorizontal: 12 },
    rupee: { fontFamily: font.heading, fontSize: 22, color: c.textMuted },
    amountInput: { flex: 1, fontFamily: font.heading, fontSize: 22, color: c.text, paddingVertical: 10 },
    input: { backgroundColor: c.inputBg, color: c.text, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: font.regular, marginBottom: 16, borderWidth: 1, borderColor: c.inputBorder },
  });
