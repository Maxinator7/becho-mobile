import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, RefreshControl, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { fetchApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import { useNotifications } from '../context/NotificationsContext';
import { TopBar } from '../components/TopBar';
import { FormField } from '../components/FormField';
import { Avatar, Button, Chip, EmptyState, Icon, IconName, Notice, Overline } from '../components/ui';
import { formatCompactPrice, formatPhone, formatPrice, timeAgo } from '../utils/format';
import { DELETABLE_STATUSES, EDITABLE_STATUSES, statusChip } from '../utils/listing';
import { normalizeIndianMobile, validate } from '../utils/validation';
import { Colors, ThemePreference, font, useTheme, useThemedStyles } from '../theme/ThemeContext';

interface MyListing {
  id: string;
  title: string;
  price: number;
  status: string;
  verifiedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  media: { url: string; mediaType?: string }[];
  reviews?: { action: string; remark: string | null; createdAt: string }[];
}

type TabKey = 'live' | 'review' | 'changes' | 'drafts' | 'sold' | 'other';
const TABS: { key: TabKey; label: string; statuses: string[] }[] = [
  { key: 'live', label: 'Live', statuses: ['LIVE', 'RESERVED'] },
  { key: 'review', label: 'Under review', statuses: ['SUBMITTED', 'PENDING_REVIEW', 'APPROVED'] },
  { key: 'changes', label: 'Changes requested', statuses: ['CHANGES_REQUESTED', 'REJECTED', 'SUSPENDED'] },
  { key: 'drafts', label: 'Drafts', statuses: ['DRAFT'] },
  { key: 'sold', label: 'Sold', statuses: ['SOLD'] },
  { key: 'other', label: 'Expired', statuses: ['EXPIRED', 'ARCHIVED'] },
];

const THEME_OPTIONS: { value: ThemePreference; icon: IconName; label: string }[] = [
  { value: 'system', icon: 'theme-light-dark', label: 'Automatic theme' },
  { value: 'light', icon: 'white-balance-sunny', label: 'Light theme' },
  { value: 'dark', icon: 'weather-night', label: 'Dark theme' },
];

export const AccountScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, logout, refreshUser, setUser } = useAuth();
  const { ids: favoriteIds, refresh: refreshFavorites } = useFavorites();
  const { unreadCount } = useNotifications();
  const { colors, preference, setPreference } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [listings, setListings] = useState<MyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<TabKey>('live');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [savingPhone, setSavingPhone] = useState(false);

  const load = useCallback(async () => {
    const res = await fetchApi<MyListing[]>('/listings/mine');
    if (res.success && res.data) setListings(res.data);
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
        <EmptyState icon="account-outline" title="Sign in to see your account" action={<Button title="Sign in" onPress={() => navigation.navigate('Login')} />} />
      </SafeAreaView>
    );
  }

  const inTab = (key: TabKey) => listings.filter((l) => TABS.find((t) => t.key === key)!.statuses.includes(l.status));
  const counts = Object.fromEntries(TABS.map((t) => [t.key, inTab(t.key).length])) as Record<TabKey, number>;
  const sold = listings.filter((l) => l.status === 'SOLD');
  const soldValue = sold.reduce((sum, l) => sum + Number(l.price), 0);
  const visibleTabs = TABS.filter((t) => counts[t.key] > 0 || t.key === 'live' || t.key === 'review' || t.key === 'changes');
  const shown = inTab(tab);

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
    } else {
      setPhoneError(res.error?.details?.[0]?.message || res.error?.message || 'Could not save your number');
    }
  };

  const listingAction = (l: MyListing, action: 'mark-sold' | 'delete' | 'renew') => {
    const copy = {
      'mark-sold': ['Mark as sold?', 'The ad will be removed from search results.', 'Mark as sold'],
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
    Alert.alert('Sign out?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => { void logout(); navigation.navigate('Tabs', { screen: 'Home' }); } },
    ]);

  const roleLabel = user.role === 'ADMIN' ? 'Admin' : user.role === 'MODERATOR' ? 'Moderator' : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TopBar />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); void refreshUser(); }} tintColor={colors.primary} />}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Overline>Account & trust center</Overline>
            <Text style={styles.title} accessibilityRole="header">My Account</Text>
          </View>
          <View style={styles.themeToggle} accessibilityRole="radiogroup" accessibilityLabel="Theme">
            {THEME_OPTIONS.map((o) => {
              const active = preference === o.value;
              return (
                <TouchableOpacity key={o.value} style={[styles.themeBtn, active && styles.themeBtnActive]} onPress={() => setPreference(o.value)} accessibilityRole="radio" accessibilityState={{ checked: active }} accessibilityLabel={o.label}>
                  <Icon name={o.icon} size={16} color={active ? colors.primaryText : colors.textMuted} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Profile + trust */}
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <Avatar name={user.displayName} size={60} />
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text style={styles.name}>{user.displayName}</Text>
                {roleLabel && <Chip label={roleLabel} tone="primary" />}
              </View>
              {user.userCode ? (
                <TouchableOpacity style={styles.codeRow} onPress={copyCode} accessibilityRole="button" accessibilityLabel={`User code ${user.userCode}. Copy`}>
                  <Text style={styles.code}>{user.userCode}</Text>
                  <Icon name="content-copy" size={14} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
              {user.createdAt ? <Text style={styles.since}>Member since {new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</Text> : null}
            </View>
          </View>

          <View style={styles.trustBox}>
            <Overline style={{ marginBottom: 6 }}>Trust & verification</Overline>
            <View style={styles.trustRow}>
              <Icon name="email-outline" size={18} color={colors.textMuted} />
              <Text style={styles.trustText} numberOfLines={1}>{user.email ?? 'No email'}</Text>
              {user.emailVerifiedAt ? <Chip label="Verified" tone="success" icon="check-circle" uppercase={false} /> : <Chip label="Not verified" tone="warning" uppercase={false} />}
            </View>
            <View style={styles.trustRow}>
              <Icon name="phone-outline" size={18} color={colors.textMuted} />
              <Text style={styles.trustText} numberOfLines={1}>{user.phone ? formatPhone(user.phone) : 'No mobile number'}</Text>
              {user.phoneVerifiedAt ? (
                <Chip label="Verified" tone="success" icon="check-circle" uppercase={false} />
              ) : user.phone ? (
                <Chip label="On file" tone="neutral" uppercase={false} />
              ) : (
                <Chip label="Missing" tone="danger" uppercase={false} />
              )}
            </View>
            {user.phone && !user.phoneVerifiedAt ? <Text style={styles.trustNote}>SMS verification of mobile numbers is coming soon.</Text> : null}
          </View>

          {!user.phone && (
            <View style={{ marginTop: 4 }}>
              <FormField
                label="Add your mobile number"
                prefix="+91"
                placeholder="98765 43210"
                value={phone}
                onChangeText={(t) => { setPhone(t.replace(/[^\d ]/g, '')); setPhoneError(null); }}
                error={phoneError}
                keyboardType="phone-pad"
                maxLength={11}
                hint="Buyers and sellers trust accounts with a mobile number. It is never shown publicly."
              />
              <Button title="Save mobile number" size="sm" onPress={savePhone} loading={savingPhone} style={{ marginTop: 10, alignSelf: 'flex-start' }} />
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          {[
            { value: String(counts.live), label: 'Live ads' },
            { value: String(sold.length), label: 'Sold' },
            { value: soldValue ? formatCompactPrice(soldValue) : '₹0', label: 'Total sold' },
          ].map((s) => (
            <View key={s.label} style={styles.stat}>
              <Text style={styles.statValue}>{loading ? '–' : s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* My listings */}
        <View style={styles.sectionRow}>
          <Text style={styles.section}>My listings</Text>
          <Overline>{listings.length} total</Overline>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
          {visibleTabs.map((t) => {
            const active = tab === t.key;
            return (
              <TouchableOpacity key={t.key} style={[styles.tab, active && styles.tabActive]} onPress={() => setTab(t.key)} accessibilityRole="tab" accessibilityState={{ selected: active }}>
                <Text style={[styles.tabText, active && { color: colors.onChipSelected }]}>{t.label}</Text>
                <View style={[styles.tabCount, active && { backgroundColor: 'rgba(255,255,255,0.2)' }, t.key === 'changes' && counts.changes > 0 && !active && { backgroundColor: colors.dangerSoft }]}>
                  <Text style={[styles.tabCountText, active && { color: colors.onChipSelected }, t.key === 'changes' && counts.changes > 0 && !active && { color: colors.danger }]}>{counts[t.key]}</Text>
                </View>
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
            const chip = statusChip(l.status, !!l.verifiedAt);
            const remark = l.reviews?.[0]?.remark;
            const needsAction = ['CHANGES_REQUESTED', 'REJECTED', 'SUSPENDED'].includes(l.status);
            const underReview = TABS[1].statuses.includes(l.status);
            const photo = l.media?.find((m) => m.mediaType !== 'VIDEO')?.url ?? l.media?.[0]?.url;
            return (
              <View key={l.id} style={[styles.card, styles.listingCard]}>
                <TouchableOpacity style={styles.listingRow} onPress={() => navigation.navigate('ProductDetails', { listingId: l.id })} accessibilityRole="button" accessibilityLabel={`${l.title}, ${chip.label}`}>
                  <View style={styles.thumbWrap}>
                    {photo ? <Image source={{ uri: photo }} style={styles.thumb} /> : <View style={[styles.thumb, styles.noThumb]}><Icon name="image-outline" size={22} color={colors.textMuted} /></View>}
                    {l.status === 'SOLD' && <View style={styles.soldOverlay}><Text style={styles.soldText}>SOLD</Text></View>}
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <Chip label={chip.label} tone={chip.tone} icon={chip.tone === 'success' ? 'check-circle' : undefined} />
                      <Text style={styles.date}>{timeAgo(l.updatedAt ?? l.createdAt)}</Text>
                    </View>
                    <Text style={[styles.listingTitle, l.status === 'SOLD' && { color: colors.textMuted }]} numberOfLines={1}>{l.title}</Text>
                    <Text style={[styles.listingPrice, l.status === 'SOLD' && styles.struck]}>{formatPrice(Number(l.price))}</Text>
                  </View>
                </TouchableOpacity>

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
                      iconRight="arrow-right"
                      size="sm"
                      variant={needsAction ? 'danger' : 'primary'}
                      onPress={() => navigation.navigate('EditListing', { listingId: l.id })}
                    />
                  )}
                  {(l.status === 'LIVE' || l.status === 'RESERVED') && (
                    <Button title="Mark as sold" icon="check-circle-outline" size="sm" variant="outline" loading={busyId === l.id} onPress={() => listingAction(l, 'mark-sold')} />
                  )}
                  {l.status === 'EXPIRED' && <Button title="Renew" icon="refresh" size="sm" variant="outline" loading={busyId === l.id} onPress={() => listingAction(l, 'renew')} />}
                  {DELETABLE_STATUSES.includes(l.status) && (
                    <Button title="Delete" icon="trash-can-outline" size="sm" variant="ghost" disabled={busyId === l.id} onPress={() => listingAction(l, 'delete')} style={{ marginLeft: 'auto' }} />
                  )}
                </View>
              </View>
            );
          })
        )}

        {/* Account & support */}
        <Text style={[styles.section, { marginTop: 20, marginBottom: 10 }]}>Account & support</Text>
        <View style={[styles.card, { padding: 4 }]}>
          {[
            { icon: 'heart-outline' as IconName, label: 'Saved ads', badge: favoriteIds.size, onPress: () => navigation.navigate('SavedAds') },
            { icon: 'bell-outline' as IconName, label: 'Notifications', badge: unreadCount, onPress: () => navigation.navigate('Notifications') },
            { icon: 'lock-reset' as IconName, label: 'Change password', onPress: () => navigation.navigate('ChangePassword') },
          ].map((row) => (
            <TouchableOpacity key={row.label} style={styles.menuRow} onPress={row.onPress} accessibilityRole="button">
              <View style={styles.menuIcon}><Icon name={row.icon} size={20} color={colors.text} /></View>
              <Text style={styles.menuText}>{row.label}</Text>
              {row.badge ? <View style={styles.menuBadge}><Text style={styles.menuBadgeText}>{row.badge}</Text></View> : null}
              <Icon name="chevron-right" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.menuRow, { borderBottomWidth: 0 }]} onPress={signOut} accessibilityRole="button">
            <View style={[styles.menuIcon, { backgroundColor: colors.dangerSoft }]}><Icon name="logout" size={20} color={colors.danger} /></View>
            <Text style={[styles.menuText, { color: colors.danger }]}>Sign out</Text>
            <Icon name="arrow-right" size={20} color={colors.danger} />
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
    titleRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 14 },
    title: { fontFamily: font.heading, fontSize: 24, color: c.text, marginTop: 2 },
    themeToggle: { flexDirection: 'row', padding: 3, borderRadius: 999, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border },
    themeBtn: { width: 32, height: 30, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
    themeBtnActive: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
    card: { backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: c.border, padding: 14 },
    profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    name: { fontFamily: font.heading, fontSize: 19, color: c.text },
    codeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border },
    code: { fontFamily: font.bold, fontSize: 12, letterSpacing: 1, color: c.text },
    since: { fontFamily: font.regular, fontSize: 12, color: c.textMuted },
    trustBox: { marginTop: 14, padding: 12, borderRadius: 10, backgroundColor: c.surface2, gap: 8 },
    trustRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    trustText: { flex: 1, fontFamily: font.regular, fontSize: 14, color: c.text },
    trustNote: { fontFamily: font.regular, fontSize: 12, color: c.textMuted },
    stats: { flexDirection: 'row', gap: 8, marginTop: 12 },
    stat: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
    statValue: { fontFamily: font.headingX, fontSize: 20, color: c.text },
    statLabel: { fontFamily: font.medium, fontSize: 12, color: c.textMuted, marginTop: 2 },
    sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 10 },
    section: { fontFamily: font.heading, fontSize: 18, color: c.text },
    tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 14, paddingRight: 6, height: 36, borderRadius: 999, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
    tabActive: { backgroundColor: c.chipSelected, borderColor: c.chipSelected },
    tabText: { fontFamily: font.medium, fontSize: 13, color: c.text },
    tabCount: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' },
    tabCountText: { fontFamily: font.bold, fontSize: 11, color: c.textSecondary },
    listingCard: { marginBottom: 10, padding: 12 },
    listingRow: { flexDirection: 'row', gap: 12 },
    thumbWrap: { width: 76, height: 76, borderRadius: 8, overflow: 'hidden' },
    thumb: { width: '100%', height: '100%', backgroundColor: c.surface2 },
    noThumb: { alignItems: 'center', justifyContent: 'center' },
    soldOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(15,23,42,0.55)', alignItems: 'center', justifyContent: 'center' },
    soldText: { color: '#FFFFFF', fontFamily: font.bold, fontSize: 12, letterSpacing: 1 },
    date: { fontFamily: font.regular, fontSize: 12, color: c.textMuted },
    listingTitle: { fontFamily: font.heading, fontSize: 15, color: c.text },
    listingPrice: { fontFamily: font.headingX, fontSize: 17, color: c.text },
    struck: { textDecorationLine: 'line-through', color: c.textMuted },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border },
    menuIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' },
    menuText: { flex: 1, fontFamily: font.medium, fontSize: 15, color: c.text },
    menuBadge: { minWidth: 24, height: 22, borderRadius: 11, paddingHorizontal: 7, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' },
    menuBadgeText: { fontFamily: font.bold, fontSize: 12, color: c.textSecondary },
  });
