import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { fetchApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import { useNotifications } from '../context/NotificationsContext';
import { TopBar } from '../components/TopBar';
import { BetaBanner } from '../components/BetaBanner';
import { useBeta } from '../context/BetaContext';
import { openPrivacy } from '../utils/beta';
import { FormField } from '../components/FormField';
import { Button, Chip, EmptyState, Icon, IconButton, IconName, Notice, sheetStyles } from '../components/ui';
import { formatPrice } from '../utils/format';
import { DELETABLE_STATUSES, EDITABLE_STATUSES } from '../utils/listing';
import { cityName, useServiceAreas } from '../utils/catalog';
import { normalizeIndianMobile, validate } from '../utils/validation';
import { Colors, ThemePreference, font, useTheme, useThemedStyles } from '../theme/ThemeContext';

interface MyListing {
  id: string;
  title: string;
  price: number;
  status: string;
  cityCode: string;
  verifiedAt?: string | null;
  soldAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  media: { url: string; mediaType?: string }[];
  reviews?: { action: string; remark: string | null; createdAt: string }[];
}

interface ReceivedOffer {
  id: string;
  listingId: string;
  amount: number;
  status: string;
  buyer: { id: string; displayName: string };
}

type TabKey = 'live' | 'reserved' | 'sold' | 'review' | 'changes' | 'drafts' | 'expired';
const TABS: { key: TabKey; label: string; statuses: string[]; always?: boolean }[] = [
  { key: 'live', label: 'Active', statuses: ['LIVE'], always: true },
  { key: 'reserved', label: 'Reserved', statuses: ['RESERVED'], always: true },
  { key: 'sold', label: 'Sold', statuses: ['SOLD'], always: true },
  { key: 'review', label: 'In review', statuses: ['SUBMITTED', 'PENDING_REVIEW', 'APPROVED'] },
  { key: 'changes', label: 'Needs changes', statuses: ['CHANGES_REQUESTED', 'REJECTED', 'SUSPENDED'] },
  { key: 'drafts', label: 'Drafts', statuses: ['DRAFT'] },
  { key: 'expired', label: 'Expired', statuses: ['EXPIRED', 'ARCHIVED'] },
];

/** Badge on the listing photo. */
const BADGE: Record<string, { label: string; tone: 'primary' | 'accent' | 'dark' | 'warning' | 'danger' }> = {
  LIVE: { label: 'ACTIVE', tone: 'primary' },
  RESERVED: { label: 'RESERVED', tone: 'accent' },
  SOLD: { label: 'SOLD', tone: 'dark' },
  DRAFT: { label: 'DRAFT', tone: 'dark' },
  SUBMITTED: { label: 'IN REVIEW', tone: 'warning' },
  PENDING_REVIEW: { label: 'IN REVIEW', tone: 'warning' },
  APPROVED: { label: 'IN REVIEW', tone: 'warning' },
  CHANGES_REQUESTED: { label: 'CHANGES', tone: 'danger' },
  REJECTED: { label: 'REJECTED', tone: 'danger' },
  SUSPENDED: { label: 'SUSPENDED', tone: 'danger' },
  EXPIRED: { label: 'EXPIRED', tone: 'dark' },
};

const THEME_LABEL: Record<ThemePreference, { label: string; icon: IconName }> = {
  system: { label: 'AUTO', icon: 'theme-light-dark' },
  light: { label: 'LIGHT', icon: 'white-balance-sunny' },
  dark: { label: 'DARK', icon: 'weather-night' },
};

const SAFETY_TIPS =
  '• Meet in a busy public place, in daylight if you can.\n• Check the item works before you pay.\n• Keep chats and offers inside Becho.\n• Never share passwords or one-time codes.\n• Report anything suspicious to the Becho team.';

export const AccountScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, logout, refreshUser, setUser } = useAuth();
  const { ids: favoriteIds, refresh: refreshFavorites } = useFavorites();
  const { unreadCount } = useNotifications();
  const { openFeedback } = useBeta();
  const { colors, preference, cyclePreference } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const sheet = useThemedStyles(sheetStyles);
  const areas = useServiceAreas();
  const { width } = useWindowDimensions();

  const [listings, setListings] = useState<MyListing[]>([]);
  const [reservations, setReservations] = useState<Record<string, ReceivedOffer>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<TabKey>('live');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [phoneSheet, setPhoneSheet] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [savingPhone, setSavingPhone] = useState(false);

  const load = useCallback(async () => {
    const [mine, received] = await Promise.all([fetchApi<MyListing[]>('/listings/mine'), fetchApi<ReceivedOffer[]>('/offers/received')]);
    if (mine.success && mine.data) setListings(mine.data);
    // The accepted offer on a reserved listing tells us who it's reserved for, and at what price.
    if (received.success && received.data) {
      const map: Record<string, ReceivedOffer> = {};
      for (const o of received.data) if (o.status === 'ACCEPTED') map[o.listingId] = o;
      setReservations(map);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      void load();
      void refreshUser();
      void refreshFavorites();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id])
  );

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <TopBar />
        <BetaBanner />
        <EmptyState icon="account-outline" title="Sign in to see your account" action={<Button title="Sign in" onPress={() => navigation.navigate('Login')} />} />
      </SafeAreaView>
    );
  }

  const inTab = (key: TabKey) => listings.filter((l) => TABS.find((t) => t.key === key)!.statuses.includes(l.status));
  const counts = Object.fromEntries(TABS.map((t) => [t.key, inTab(t.key).length])) as Record<TabKey, number>;
  const visibleTabs = TABS.filter((t) => t.always || counts[t.key] > 0);
  const shown = inTab(tab);
  const tabWidth = (Math.min(width, 640) - 32 - 8) / 3;

  const copyCode = async () => {
    if (!user.userCode) return;
    try {
      await Clipboard.setStringAsync(user.userCode);
      Alert.alert('Copied', `Your user code ${user.userCode} was copied.`);
    } catch {
      Share.share({ message: user.userCode }).catch(() => {});
    }
  };

  const savePhone = async () => {
    const err = validate.mobile(phone);
    setPhoneError(err);
    if (err) return;
    setSavingPhone(true);
    const res = await fetchApi<typeof user>('/users/me', { method: 'PATCH', body: JSON.stringify({ phone: normalizeIndianMobile(phone) }) });
    setSavingPhone(false);
    if (res.success && res.data) {
      setUser({ ...user, ...res.data });
      setPhone('');
      setPhoneSheet(false);
    } else {
      setPhoneError(res.error?.details?.[0]?.message || res.error?.message || 'Could not save your number');
    }
  };

  const listingAction = (l: MyListing, action: 'mark-sold' | 'mark-available' | 'delete' | 'renew') => {
    const buyer = reservations[l.id]?.buyer.displayName;
    const copy = {
      'mark-sold': l.status === 'RESERVED'
        ? ['Confirm the sale?', `${buyer ? `${buyer} has` : 'The buyer has'} bought this item. The ad will be marked as sold.`, 'Confirm sale']
        : ['Mark as sold?', 'The ad will be removed from search results.', 'Mark as sold'],
      'mark-available': ['Reopen this listing?', `The reservation${buyer ? ` for ${buyer}` : ''} is cancelled, the buyer is told and the ad goes back on sale.`, 'Reopen listing'],
      delete: ['Delete this ad?', 'This cannot be undone.', 'Delete'],
      renew: ['Renew this ad?', 'It will be checked again and go live for another 30 days.', 'Renew'],
    }[action];
    Alert.alert(copy[0], copy[1], [
      { text: 'Cancel', style: 'cancel' },
      {
        text: copy[2],
        style: action === 'delete' ? 'destructive' : 'default',
        onPress: async () => {
          setBusyId(l.id);
          const res =
            action === 'delete'
              ? await fetchApi(`/listings/${l.id}`, { method: 'DELETE' })
              : await fetchApi(`/listings/${l.id}/${action}`, { method: 'POST' });
          setBusyId(null);
          if (!res.success) Alert.alert('Action failed', res.error?.message || 'Please try again.');
          void load();
        },
      },
    ]);
  };

  const signOut = () =>
    Alert.alert('Log out?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => { void logout(); navigation.navigate('Tabs', { screen: 'Home' }); } },
    ]);

  const roleLabel = user.role === 'ADMIN' ? 'Admin' : user.role === 'MODERATOR' ? 'Moderator' : null;
  const theme = THEME_LABEL[preference];

  const badgeColors = (tone: (typeof BADGE)[string]['tone']) =>
    tone === 'primary' ? colors.primary : tone === 'accent' ? colors.accent : tone === 'warning' ? '#B45309' : tone === 'danger' ? '#BA1A1A' : '#131B2E';

  const settings: { icon: IconName; label: string; badge?: string; onPress: () => void; hidden?: boolean }[] = [
    { icon: 'bookmark-outline', label: 'Saved ads', badge: favoriteIds.size ? `${favoriteIds.size} saved` : undefined, onPress: () => navigation.navigate('SavedAds') },
    { icon: 'lock-reset', label: 'Change password', onPress: () => navigation.navigate('ChangePassword') },
    { icon: 'cellphone', label: 'Add mobile number', onPress: () => setPhoneSheet(true), hidden: !!user.phone },
    { icon: 'bell-outline', label: 'Notifications', badge: unreadCount ? `${unreadCount} new` : undefined, onPress: () => navigation.navigate('Notifications') },
    { icon: 'shield-outline', label: 'Help & safety tips', onPress: () => Alert.alert('Trade safely on Becho', SAFETY_TIPS) },
    { icon: 'message-draw', label: 'Send feedback', badge: 'Beta', onPress: () => openFeedback() },
    { icon: 'file-document-outline', label: 'Terms & privacy', onPress: () => void openPrivacy() },
    { icon: 'account-remove-outline', label: 'Request account deletion', onPress: () => openFeedback({ category: 'OTHER', message: 'Delete my account' }) },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TopBar />
      <BetaBanner />
      <Modal visible={phoneSheet} transparent animationType="slide" onRequestClose={() => setPhoneSheet(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable style={sheet.overlay} onPress={() => setPhoneSheet(false)}>
            <Pressable style={sheet.sheet}>
              <View style={sheet.handle} />
              <View style={sheet.titleRow}>
                <Text style={sheet.title}>Add mobile number</Text>
                <IconButton name="close" label="Close" onPress={() => setPhoneSheet(false)} />
              </View>
              <FormField
                label="Mobile number"
                prefix="+91"
                placeholder="98765 43210"
                value={phone}
                onChangeText={(t) => { setPhone(t.replace(/[^\d ]/g, '')); setPhoneError(null); }}
                error={phoneError}
                keyboardType="phone-pad"
                maxLength={11}
                hint="It is never shown publicly. You can add it once; to change it later, contact support."
              />
              <Button title="Save mobile number" onPress={savePhone} loading={savingPhone} style={{ marginTop: 16 }} />
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); void refreshUser(); }} tintColor={colors.primary} />}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile */}
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user.displayName.trim().charAt(0).toUpperCase() || '?'}</Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.name} numberOfLines={2}>{user.displayName}</Text>
              {roleLabel ? <Chip label={roleLabel} tone="primary" /> : null}
              {user.userCode ? (
                <View style={styles.codeRow}>
                  <Text style={styles.codeLabel}>USER CODE</Text>
                  <Text style={styles.code}>{user.userCode}</Text>
                  <TouchableOpacity onPress={copyCode} style={styles.copy} accessibilityRole="button" accessibilityLabel={`Copy user code ${user.userCode}`} hitSlop={6}>
                    <Icon name="content-copy" size={14} color={colors.primaryText} />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
            <TouchableOpacity style={styles.themePill} onPress={cyclePreference} accessibilityRole="button" accessibilityLabel={`Theme: ${theme.label.toLowerCase()}. Change theme`}>
              <Icon name={theme.icon} size={14} color={colors.primaryText} />
              <Text style={styles.themeText}>{theme.label}</Text>
            </TouchableOpacity>
          </View>
          {(user.emailVerifiedAt || user.phoneVerifiedAt) && (
            <View style={styles.verifiedRow}>
              {user.emailVerifiedAt ? <Chip label="Email verified" tone="primary" icon="check-circle" uppercase={false} /> : null}
              {user.phoneVerifiedAt ? <Chip label="Mobile verified" tone="primary" icon="check-circle" uppercase={false} /> : null}
            </View>
          )}
          {!user.emailVerifiedAt && (
            <Notice tone="warning" icon="email-alert-outline" title="Verify your email" style={{ marginTop: 12 }}>
              <Text style={styles.noticeText}>You need a verified email to chat, make offers and post ads.</Text>
              <Text style={styles.noticeLink} onPress={() => navigation.navigate('VerifyEmail')}>Enter the code →</Text>
            </Notice>
          )}
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          {[
            { icon: 'storefront-outline' as IconName, value: counts.live, label: 'Active ads' },
            { icon: 'check-decagram-outline' as IconName, value: counts.sold, label: 'Sold items' },
          ].map((s) => (
            <View key={s.label} style={styles.stat}>
              <View style={styles.statIcon}><Icon name={s.icon} size={20} color={colors.primaryText} /></View>
              <View>
                <Text style={styles.statValue}>{loading ? '–' : s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* My listings */}
        <Text style={styles.section} accessibilityRole="header">My listings</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={{ padding: 4, gap: 0 }}>
          {visibleTabs.map((t) => {
            const active = tab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.tab, { minWidth: tabWidth }, active && styles.tabActive]}
                onPress={() => setTab(t.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive, t.key === 'changes' && !active && { color: colors.danger }]}>
                  {t.label} ({counts[t.key]})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
        ) : shown.length === 0 ? (
          <View style={[styles.card, { paddingVertical: 8 }]}>
            <EmptyState
              icon="tag-outline"
              title={listings.length ? 'Nothing here' : 'You have no ads yet'}
              body={listings.length ? undefined : 'Post your first ad in a minute.'}
              action={!listings.length ? <Button title="Post an ad" icon="plus" size="sm" onPress={() => navigation.navigate('CreateListing')} /> : undefined}
            />
          </View>
        ) : (
          shown.map((l) => {
            const badge = BADGE[l.status] ?? { label: l.status, tone: 'dark' as const };
            const remark = l.reviews?.[0]?.remark;
            const needsAction = ['CHANGES_REQUESTED', 'REJECTED', 'SUSPENDED'].includes(l.status);
            const underReview = TABS[3].statuses.includes(l.status);
            const photo = l.media?.find((m) => m.mediaType !== 'VIDEO')?.url ?? l.media?.[0]?.url;
            const reservation = l.status === 'RESERVED' ? reservations[l.id] : undefined;
            const busy = busyId === l.id;
            return (
              <View key={l.id} style={[styles.card, styles.listingCard]}>
                <TouchableOpacity style={styles.listingRow} onPress={() => navigation.navigate('ProductDetails', { listingId: l.id })} accessibilityRole="button" accessibilityLabel={`${l.title}, ${badge.label.toLowerCase()}`}>
                  <View style={styles.thumbWrap}>
                    {photo ? <Image source={{ uri: photo }} style={styles.thumb} /> : <View style={[styles.thumb, styles.noThumb]}><Icon name="image-outline" size={22} color={colors.textMuted} /></View>}
                    <View style={[styles.badge, { backgroundColor: badgeColors(badge.tone) }]}>
                      <Text style={styles.badgeText}>{badge.label}</Text>
                    </View>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    {l.verifiedAt ? (
                      <View style={styles.verified}>
                        <Icon name="check-decagram" size={12} color={colors.primaryText} />
                        <Text style={styles.verifiedText}>Verified by Becho</Text>
                      </View>
                    ) : null}
                    <Text style={[styles.listingTitle, l.status === 'SOLD' && { color: colors.textMuted }]} numberOfLines={1}>{l.title}</Text>
                    {reservation && Number(reservation.amount) !== Number(l.price) ? <Text style={styles.listed}>Listed: {formatPrice(Number(l.price))}</Text> : null}
                    <Text style={[styles.listingPrice, l.status === 'RESERVED' && { color: colors.accentText }]}>
                      {formatPrice(Number(reservation?.amount ?? l.price))}
                    </Text>
                    <Text style={styles.listingMeta} numberOfLines={1}>
                      {cityName(areas, l.cityCode)}
                      {l.status === 'SOLD' && l.soldAt ? ` • Sold on ${new Date(l.soldAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
                    </Text>
                  </View>
                </TouchableOpacity>

                {reservation ? (
                  <View style={styles.reservedBar}>
                    <Icon name="handshake-outline" size={16} color={colors.accentText} />
                    <Text style={styles.reservedText}>
                      Reserved for buyer <Text style={styles.reservedName}>({reservation.buyer.displayName})</Text> at {formatPrice(Number(reservation.amount))}
                    </Text>
                  </View>
                ) : null}

                {remark ? (
                  <Notice tone={needsAction ? 'danger' : 'primary'} icon="message-alert-outline" title="Staff remark" style={{ marginTop: 10 }}>
                    {remark}
                  </Notice>
                ) : underReview ? (
                  <Notice tone="warning" icon="timer-sand" style={{ marginTop: 10 }}>
                    Our team is reviewing this ad. You'll get a notification when it's live.
                  </Notice>
                ) : null}

                <View style={styles.actions}>
                  {EDITABLE_STATUSES.includes(l.status) && (
                    <Button
                      title={l.status === 'DRAFT' ? 'Continue editing' : 'Edit & resubmit'}
                      size="sm"
                      variant={needsAction ? 'danger' : 'primary'}
                      onPress={() => navigation.navigate('EditListing', { listingId: l.id })}
                      style={{ flex: 1 }}
                    />
                  )}
                  {l.status === 'LIVE' && (
                    <>
                      <Button title="View listing" size="sm" variant="soft" onPress={() => navigation.navigate('ProductDetails', { listingId: l.id })} style={{ flex: 1 }} />
                      <Button title="Mark sold" size="sm" loading={busy} onPress={() => listingAction(l, 'mark-sold')} style={{ flex: 1 }} />
                    </>
                  )}
                  {l.status === 'RESERVED' && (
                    <>
                      <Button title="Reopen listing" size="sm" variant="soft" disabled={busy} onPress={() => listingAction(l, 'mark-available')} style={{ flex: 1 }} />
                      <Button title="Confirm sale" size="sm" variant="accent" loading={busy} onPress={() => listingAction(l, 'mark-sold')} style={{ flex: 1 }} />
                    </>
                  )}
                  {l.status === 'SOLD' && (
                    <Button title="View listing" size="sm" variant="soft" iconRight="arrow-right" onPress={() => navigation.navigate('ProductDetails', { listingId: l.id })} style={{ flex: 1 }} />
                  )}
                  {l.status === 'EXPIRED' && <Button title="Renew" icon="refresh" size="sm" loading={busy} onPress={() => listingAction(l, 'renew')} style={{ flex: 1 }} />}
                  {DELETABLE_STATUSES.includes(l.status) && (
                    <Button title="Delete" icon="trash-can-outline" size="sm" variant="ghost" disabled={busy} onPress={() => listingAction(l, 'delete')} />
                  )}
                </View>
              </View>
            );
          })
        )}

        {/* Account & settings */}
        <Text style={[styles.section, { marginTop: 24 }]} accessibilityRole="header">Account & Settings</Text>
        <View style={[styles.card, { padding: 4 }]}>
          {settings.filter((r) => !r.hidden).map((row) => (
            <TouchableOpacity key={row.label} style={styles.menuRow} onPress={row.onPress} accessibilityRole="button">
              <View style={styles.menuIcon}><Icon name={row.icon} size={20} color={colors.primaryText} /></View>
              <Text style={styles.menuText}>{row.label}</Text>
              {row.badge ? <View style={styles.menuBadge}><Text style={styles.menuBadgeText}>{row.badge}</Text></View> : null}
              <Icon name="chevron-right" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.menuRow, { borderBottomWidth: 0 }]} onPress={signOut} accessibilityRole="button">
            <View style={[styles.menuIcon, { backgroundColor: colors.dangerSoft }]}><Icon name="logout" size={20} color={colors.danger} /></View>
            <Text style={[styles.menuText, { color: colors.danger }]}>Log out</Text>
            <Icon name="chevron-right" size={20} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    scroll: { padding: 16, paddingBottom: 32 },
    card: { backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 14 },
    profileRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
    avatar: { width: 64, height: 64, borderRadius: 14, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontFamily: font.headingX, fontSize: 26, color: c.primaryText },
    name: { fontFamily: font.headingX, fontSize: 22, color: c.text },
    codeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    codeLabel: { fontFamily: font.semibold, fontSize: 10, letterSpacing: 0.8, color: c.textMuted },
    code: { fontFamily: font.bold, fontSize: 13, letterSpacing: 0.5, color: c.primaryText },
    copy: { width: 28, height: 28, borderRadius: 8, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' },
    themePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 30, borderRadius: 999, backgroundColor: c.surface2 },
    themeText: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.5, color: c.primaryText },
    verifiedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
    noticeText: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: c.textSecondary },
    noticeLink: { fontFamily: font.semibold, fontSize: 13, color: c.primaryText, marginTop: 6 },
    stats: { flexDirection: 'row', gap: 10, marginTop: 12 },
    stat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
    statIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
    statValue: { fontFamily: font.headingX, fontSize: 20, color: c.text },
    statLabel: { fontFamily: font.medium, fontSize: 13, color: c.textSecondary },
    section: { fontFamily: font.heading, fontSize: 21, color: c.text, marginTop: 24, marginBottom: 10 },
    tabs: { flexGrow: 0, borderRadius: 12, backgroundColor: c.surface2, marginBottom: 12 },
    tab: { height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
    tabActive: { backgroundColor: c.surface, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
    tabText: { fontFamily: font.medium, fontSize: 14, color: c.textSecondary },
    tabTextActive: { fontFamily: font.semibold, color: c.primaryText },
    listingCard: { marginBottom: 12, padding: 12 },
    listingRow: { flexDirection: 'row', gap: 12 },
    thumbWrap: { width: 96, height: 96, borderRadius: 10, overflow: 'hidden' },
    thumb: { width: '100%', height: '100%', backgroundColor: c.surface2 },
    noThumb: { alignItems: 'center', justifyContent: 'center' },
    badge: { position: 'absolute', top: 6, left: 6, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
    badgeText: { color: '#FFFFFF', fontFamily: font.bold, fontSize: 10, letterSpacing: 0.4 },
    verified: { flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: c.primarySoft },
    verifiedText: { fontFamily: font.semibold, fontSize: 11, color: c.primaryText },
    listingTitle: { fontFamily: font.heading, fontSize: 16, color: c.text },
    listed: { fontFamily: font.regular, fontSize: 12, color: c.textMuted },
    listingPrice: { fontFamily: font.headingX, fontSize: 21, color: c.primaryText },
    listingMeta: { fontFamily: font.regular, fontSize: 12, color: c.textMuted },
    reservedBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, padding: 10, borderRadius: 10, backgroundColor: c.accentSoft },
    reservedText: { flex: 1, fontFamily: font.medium, fontSize: 13, color: c.text },
    reservedName: { fontFamily: font.semibold, color: c.accentText },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border },
    menuIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
    menuText: { flex: 1, fontFamily: font.medium, fontSize: 16, color: c.text },
    menuBadge: { height: 24, borderRadius: 12, paddingHorizontal: 9, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
    menuBadgeText: { fontFamily: font.semibold, fontSize: 12, color: c.primaryText },
  });
