import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { Avatar, Button, Chip, EmptyState, Icon, IconButton, IconName, Notice, ScreenHeader, sheetStyles } from '../components/ui';
import { ListingSummary } from '../components/ListingCard';
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
  seller: { id: string; displayName: string; createdAt: string; userCode?: string; emailVerifiedAt?: string | null; phoneVerifiedAt?: string | null };
  category: { id: string; name: string };
  attributes: { id: string; valueText?: string; valueNumber?: number; valueBoolean?: boolean; attributeDefinition: { id: string; name: string } }[];
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

const GALLERY_RATIO = 0.68;

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
  const galleryWidth = Math.min(screenWidth, 640) - 32;
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
  const [more, setMore] = useState<ListingSummary[]>([]);
  const [acting, setActing] = useState(false);

  const loadListing = useCallback(async () => {
    const res = await fetchApi<ListingDetail>(`/listings/${listingId}`);
    setLoading(false);
    if (res.success && res.data) {
      setListing(res.data);
      setOfferAmount(String(Math.floor(res.data.price * 0.9)));
    }
  }, [listingId]);

  useEffect(() => {
    void loadListing();
  }, [loadListing]);

  // Select attributes store option values ("128-gb"); show the category's labels ("128 GB") instead.
  const [optionLabels, setOptionLabels] = useState<Record<string, Record<string, string>>>({});
  const categoryId = listing?.category?.id;
  useEffect(() => {
    if (!categoryId) return;
    fetchApi<{ id: string; options?: { value: string; label: string }[] }[]>(`/categories/${categoryId}/attributes`).then((res) => {
      if (!res.success || !res.data) return;
      setOptionLabels(Object.fromEntries(res.data.map((d) => [d.id, Object.fromEntries((d.options ?? []).map((o) => [o.value, o.label]))])));
    });
  }, [categoryId]);

  // "More from this seller": other live listings, this one left out.
  const sellerId = listing?.seller.id;
  useEffect(() => {
    if (!sellerId) return;
    fetchApi<{ listings: ListingSummary[] }>(`/listings?sellerId=${sellerId}&excludeId=${listingId}&limit=10`).then((res) => {
      if (res.success && res.data) setMore(res.data.listings ?? []);
    });
  }, [sellerId, listingId]);

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

  /** Seller actions on their own listing (same endpoints as My account). */
  const sellerAction = (action: 'mark-sold' | 'mark-available' | 'renew') => {
    if (!listing) return;
    const copy = {
      'mark-sold': ['Mark as sold?', 'The ad will be removed from search results.', 'Mark as sold'],
      'mark-available': ['Reopen this listing?', 'The reservation is cancelled, the buyer is told and the ad goes back on sale.', 'Reopen'],
      renew: ['Renew this ad?', 'It will be checked again and go live for another 30 days.', 'Renew'],
    }[action];
    Alert.alert(copy[0], copy[1], [
      { text: 'Cancel', style: 'cancel' },
      {
        text: copy[2],
        onPress: async () => {
          setActing(true);
          const res = await fetchApi(`/listings/${listing.id}/${action}`, { method: 'POST' });
          setActing(false);
          if (!res.success) Alert.alert('Action failed', res.error?.message || 'Please try again.');
          void loadListing();
        },
      },
    ]);
  };

  const share = () => {
    if (!listing) return;
    Share.share({ message: `${listing.title} — ${formatPrice(listing.price)} on Becho` }).catch(() => {});
  };

  const saved = listing ? isFavorite(listing.id) : false;
  const toggleSaved = async () => {
    if (listing && !(await toggle(listing.id))) navigation.navigate('Login');
  };
  const header = (
    <ScreenHeader
      title="Product details"
      onBack={() => navigation.goBack()}
      right={
        listing ? (
          <>
            <IconButton name="share-variant-outline" label="Share" onPress={share} />
            <IconButton name={saved ? 'heart' : 'heart-outline'} label={saved ? 'Remove from saved ads' : 'Save ad'} color={saved ? colors.danger : undefined} onPress={toggleSaved} />
          </>
        ) : null
      }
    />
  );

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
      value: (a.valueText && optionLabels[a.attributeDefinition.id]?.[a.valueText]) || a.valueText || (a.valueNumber != null ? String(a.valueNumber) : a.valueBoolean != null ? (a.valueBoolean ? 'Yes' : 'No') : '—'),
    })),
  ];
  // Screen padding 32 + card padding 32 + card border 2, minus the 10px gap.
  const specWidth = Math.floor((Math.min(screenWidth, 640) - 32 - 34 - 10) / 2);
  const sellerButtons: { title: string; icon: IconName; variant: 'primary' | 'outline' | 'accent'; onPress: () => void }[] = !isSeller ? [] : [
    ...(EDITABLE_STATUSES.includes(listing.status) ? [{ title: 'Edit & resubmit', icon: 'pencil-outline' as IconName, variant: 'primary' as const, onPress: () => navigation.navigate('EditListing', { listingId: listing.id }) }] : []),
    ...(listing.status === 'LIVE' ? [{ title: 'Mark as sold', icon: 'check-circle-outline' as IconName, variant: 'primary' as const, onPress: () => sellerAction('mark-sold') }] : []),
    ...(listing.status === 'RESERVED'
      ? [
          { title: 'Reopen listing', icon: 'lock-open-variant-outline' as IconName, variant: 'outline' as const, onPress: () => sellerAction('mark-available') },
          { title: 'Confirm sale', icon: 'check-circle-outline' as IconName, variant: 'accent' as const, onPress: () => sellerAction('mark-sold') },
        ]
      : []),
    ...(listing.status === 'EXPIRED' ? [{ title: 'Renew', icon: 'refresh' as IconName, variant: 'primary' as const, onPress: () => sellerAction('renew') }] : []),
  ];
  const showBar = isSeller ? sellerButtons.length > 0 : isLive || !!latestOffer;
  const moreWidth = 150;
  const memberSince = new Date(listing.seller.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

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
        <View style={[styles.gallery, { height: galleryHeight }]}>
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
              <Icon name="camera-outline" size={13} color="#FFFFFF" />
              <Text style={styles.photoPillText}>
                {Math.min(media.slice(0, activeIndex + 1).filter((m) => m.mediaType !== 'VIDEO').length, photoCount)} of {photoCount}
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
              <Icon name="play-circle-outline" size={14} color="#FFFFFF" />
              <Text style={styles.photoPillText}>Video</Text>
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
          <View style={styles.chipRow}>
            {listing.verifiedAt ? <Chip label="Verified by Becho" tone="success" icon="check-decagram" /> : null}
            <Chip label={CONDITION_LABELS[listing.condition] ?? listing.condition} tone="primary" />
            {isSeller && <Chip label={statusChip(listing.status, !!listing.verifiedAt).label} tone={statusChip(listing.status).tone} />}
          </View>

          {statusNote && (
            <Notice tone={listing.status === 'RESERVED' ? 'primary' : 'neutral'} icon={statusNote.icon} style={{ marginBottom: 12 }}>
              {statusNote.text}
            </Notice>
          )}

          <View style={styles.card}>
            <Text style={styles.price}>{formatPrice(listing.price)}</Text>
            <Text style={styles.title}>{listing.title}</Text>
            <View style={styles.metaRow}>
              <Icon name="map-marker-outline" size={15} color={colors.textMuted} />
              <Text style={styles.meta}>{city}, {state}</Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.meta}>Posted {timeAgo(posted)}</Text>
            </View>
            {listing.verifiedAt ? (
              <Text style={styles.verifiedLine}>
                Checked by the Becho team on {new Date(listing.verifiedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            ) : null}
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

          {/* Details & specifications */}
          <View style={[styles.card, { marginTop: 12 }]}>
            <View style={styles.cardHead}>
              <Icon name="tune-variant" size={20} color={colors.primaryText} />
              <Text style={styles.cardTitle}>Details & Specifications</Text>
            </View>
            <View style={styles.specGrid}>
              {specs.map((s) => (
                <View key={s.label} style={[styles.spec, { width: specWidth }]}>
                  <Text style={styles.specLabel}>{s.label.toUpperCase()}</Text>
                  <Text style={styles.specValue} numberOfLines={2}>{s.value}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.card, { marginTop: 12 }]}>
            <View style={styles.cardHead}>
              <Icon name="text-box-outline" size={20} color={colors.primaryText} />
              <Text style={styles.cardTitle}>Description</Text>
            </View>
            <Text style={styles.description}>{listing.description}</Text>
          </View>

          {/* Seller */}
          <View style={[styles.card, { marginTop: 12 }]}>
            <View style={styles.sellerRow}>
              <Avatar name={listing.seller.displayName} size={52} />
              <View style={{ flex: 1 }}>
                <Text style={styles.sellerName}>{listing.seller.displayName}</Text>
                <Text style={styles.sellerSub}>Member since {memberSince}</Text>
              </View>
              {listing.seller.userCode ? (
                <IconButton
                  name="card-account-details-outline"
                  label={`Copy seller ID ${listing.seller.userCode}`}
                  color={colors.primaryText}
                  onPress={() => Clipboard.setStringAsync(listing.seller.userCode!).then(() => Alert.alert('Copied', `Seller ID ${listing.seller.userCode} copied.`)).catch(() => {})}
                />
              ) : null}
            </View>
            <View style={styles.sellerChips}>
              {listing.seller.emailVerifiedAt ? <Chip label="Email verified" tone="success" icon="check-circle" uppercase={false} /> : null}
              {listing.seller.phoneVerifiedAt ? <Chip label="Mobile verified" tone="success" icon="check-circle" uppercase={false} /> : null}
              {listing.seller.userCode ? <Chip label={`ID ${listing.seller.userCode}`} tone="neutral" uppercase={false} /> : null}
            </View>
          </View>

          {/* More from this seller */}
          {more.length > 0 && (
            <>
              <Text style={styles.section}>More from {sellerFirst}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 4 }}>
                {more.map((m) => {
                  const photo = m.media?.find((x) => x.mediaType !== 'VIDEO')?.url ?? m.media?.[0]?.url;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.moreCard, { width: moreWidth }]}
                      onPress={() => navigation.push('ProductDetails', { listingId: m.id })}
                      accessibilityRole="button"
                      accessibilityLabel={`${m.title}, ${formatPrice(m.price)}`}
                    >
                      {photo ? <Image source={{ uri: photo }} style={styles.moreThumb} /> : <View style={[styles.moreThumb, styles.center]}><Icon name="image-outline" size={22} color={colors.textMuted} /></View>}
                      <Text style={styles.morePrice} numberOfLines={1}>{formatPrice(m.price)}</Text>
                      <Text style={styles.moreTitle} numberOfLines={2}>{m.title}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}

          <View style={styles.safety}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Icon name="shield-check-outline" size={20} color={colors.primaryText} />
              <Text style={styles.safetyTitle}>Trade safely</Text>
            </View>
            {[
              'Meet in a busy public place, in daylight if you can.',
              'Check the item works before you pay.',
              'Keep the conversation and offers in Becho chat.',
            ].map((t) => (
              <View key={t} style={styles.safetyRow}>
                <Icon name="check" size={16} color={colors.success} />
                <Text style={styles.safetyText}>{t}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {showBar && (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {isSeller ? (
            sellerButtons.map((btn) => (
              <Button
                key={btn.title}
                title={btn.title}
                icon={btn.icon}
                variant={btn.variant}
                loading={acting && btn.variant !== 'outline'}
                disabled={acting}
                onPress={btn.onPress}
                style={{ flex: 1 }}
              />
            ))
          ) : (
            <>
              <TouchableOpacity style={styles.bookmark} onPress={toggleSaved} accessibilityRole="button" accessibilityLabel={saved ? 'Remove from saved ads' : 'Save ad'}>
                <Icon name={saved ? 'heart' : 'heart-outline'} size={22} color={saved ? colors.danger : colors.primaryText} />
              </TouchableOpacity>
              {isLive && (
                <Button
                  title={myTurn ? 'Respond' : theirTurn ? 'Offer sent' : 'Make offer'}
                  icon="tag-outline"
                  variant="outline"
                  disabled={theirTurn}
                  onPress={() => (!user ? navigation.navigate('Login') : myTurn ? openChat() : setShowOfferModal(true))}
                  style={{ flex: 1, paddingHorizontal: 8 }}
                />
              )}
              <Button title="Chat with seller" accessibilityLabel={`Chat with ${listing.seller.displayName}`} icon="message-text-outline" onPress={openChat} loading={contacting} style={{ flex: 1.25, paddingHorizontal: 8 }} />
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
    gallery: { marginHorizontal: 16, marginTop: 12, borderRadius: 16, overflow: 'hidden', backgroundColor: c.surface2 },
    photoPill: { position: 'absolute', right: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(19,27,46,0.7)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
    videoPill: { position: 'absolute', right: 12, top: 12, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(19,27,46,0.7)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
    photoPillText: { color: '#FFFFFF', fontFamily: font.semibold, fontSize: 12 },
    dots: { position: 'absolute', left: 14, bottom: 18, flexDirection: 'row', gap: 4 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.6)' },
    dotActive: { backgroundColor: '#FFFFFF', width: 18 },
    body: { padding: 16 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
    card: { padding: 16, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
    price: { fontFamily: font.headingX, fontSize: 26, color: c.text },
    title: { fontFamily: font.heading, fontSize: 22, lineHeight: 28, color: c.text, marginTop: 4 },
    metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 8 },
    meta: { fontFamily: font.regular, fontSize: 13, color: c.textMuted },
    metaDot: { color: c.textMuted, marginHorizontal: 2 },
    verifiedLine: { fontFamily: font.medium, fontSize: 12, color: c.success, marginTop: 8 },
    offerCard: { flexDirection: 'row', gap: 10, marginTop: 12, padding: 14, borderRadius: 14, backgroundColor: c.primarySoft, borderWidth: 1, borderColor: c.primarySoftBorder },
    offerTitle: { fontFamily: font.semibold, fontSize: 14, color: c.text },
    link: { color: c.primaryText, fontFamily: font.semibold, fontSize: 13 },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    cardTitle: { fontFamily: font.heading, fontSize: 17, color: c.text },
    section: { fontFamily: font.heading, fontSize: 18, color: c.text, marginTop: 24, marginBottom: 10 },
    specGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    spec: { padding: 12, borderRadius: 10, backgroundColor: c.tint },
    specLabel: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 0.5, color: c.textMuted },
    specValue: { fontFamily: font.semibold, fontSize: 15, color: c.text, marginTop: 4 },
    description: { fontFamily: font.regular, color: c.textSecondary, fontSize: 15, lineHeight: 22 },
    sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    sellerName: { fontFamily: font.heading, fontSize: 18, color: c.text },
    sellerSub: { fontFamily: font.regular, fontSize: 13, color: c.textMuted, marginTop: 2 },
    sellerChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
    moreCard: { padding: 8, borderRadius: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
    moreThumb: { width: '100%', height: 96, borderRadius: 8, backgroundColor: c.surface2, marginBottom: 8 },
    morePrice: { fontFamily: font.headingX, fontSize: 15, color: c.primaryText },
    moreTitle: { fontFamily: font.medium, fontSize: 13, lineHeight: 17, color: c.text, marginTop: 2 },
    safety: { marginTop: 20, padding: 16, borderRadius: 14, backgroundColor: c.tint, borderWidth: 1, borderColor: c.primarySoftBorder },
    safetyTitle: { fontFamily: font.heading, fontSize: 16, color: c.text },
    safetyRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
    safetyText: { flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: c.textSecondary },
    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border, flexDirection: 'row', gap: 8, alignItems: 'center' },
    bookmark: { width: 48, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: c.primarySoft },
    modalSub: { fontFamily: font.regular, color: c.textSecondary, fontSize: 14, marginBottom: 16 },
    inputLabel: { fontFamily: font.semibold, color: c.text, fontSize: 13, marginBottom: 6 },
    amountRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, borderWidth: 1, borderColor: c.inputBorder, borderRadius: 10, backgroundColor: c.inputBg, paddingHorizontal: 12 },
    rupee: { fontFamily: font.heading, fontSize: 22, color: c.textMuted },
    amountInput: { flex: 1, fontFamily: font.heading, fontSize: 22, color: c.text, paddingVertical: 10 },
    input: { backgroundColor: c.inputBg, color: c.text, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: font.regular, marginBottom: 16, borderWidth: 1, borderColor: c.inputBorder },
  });
