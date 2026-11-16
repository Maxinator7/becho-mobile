import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchApi } from '../api/client';
import { TopBar } from '../components/TopBar';
import { ListingCard, ListingSummary } from '../components/ListingCard';
import { Button, EmptyState, Icon, SectionTitle } from '../components/ui';
import { useCity } from '../context/CityContext';
import { useAuth } from '../context/AuthContext';
import { categoryIcon, useCategories, useServiceAreas } from '../utils/catalog';
import { Colors, font, useTheme, useThemedStyles } from '../theme/ThemeContext';

const PAD = 16;
const GAP = 12;

export const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { area, setArea } = useCity();
  const areas = useServiceAreas();
  const categories = useCategories();
  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState('');

  const fullWidth = Math.min(width, 640) - PAD * 2;
  const cardWidth = (fullWidth - GAP) / 2;
  const catWidth = (fullWidth - 10 * 2) / 3;
  const { user } = useAuth();
  const cityLabel = area?.cityName ?? 'your area';

  const load = useCallback(async () => {
    let url = '/listings?limit=21';
    if (area) url += `&countryCode=${area.countryCode}&cityCode=${area.cityCode}`;
    const res = await fetchApi<{ listings: ListingSummary[] }>(url);
    setLoading(false);
    setRefreshing(false);
    setFailed(!res.success);
    if (res.success && res.data) setListings(res.data.listings || []);
  }, [area]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const openExplore = (params?: object) => navigation.navigate('Tabs', { screen: 'Explore', params });
  const openListing = (id: string) => navigation.navigate('ProductDetails', { listingId: id });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TopBar />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
      >
        {/* Search */}
        <View style={styles.searchRow}>
          <View style={styles.search}>
            <Icon name="magnify" size={20} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search phones, bikes, sofas…"
              placeholderTextColor={colors.placeholder}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              onSubmitEditing={() => {
                openExplore({ search: search.trim() });
                setSearch('');
              }}
              accessibilityLabel="Search listings"
            />
          </View>
          <TouchableOpacity style={styles.filterBtn} onPress={() => openExplore({ openFilters: true })} accessibilityRole="button" accessibilityLabel="Filters">
            <Icon name="tune-variant" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* City chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {[null, ...areas].map((a) => {
            const selected = (a?.id ?? null) === (area?.id ?? null);
            return (
              <TouchableOpacity
                key={a?.id ?? 'all'}
                style={[styles.cityChip, selected && styles.cityChipSelected]}
                onPress={() => setArea(a)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.cityChipText, selected && { color: colors.onChipSelected }]}>{a?.cityName ?? 'All cities'}</Text>
                {selected && <Icon name="check" size={14} color={colors.onChipSelected} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Trust banner */}
        <View style={styles.trust}>
          <View style={{ flex: 1 }}>
            <Text style={styles.trustTitle}>Trust in every deal</Text>
            <Text style={styles.trustBody}>Buy and sell locally with people who have verified their email.</Text>
            <TouchableOpacity
              style={styles.trustLinkRow}
              onPress={() =>
                Alert.alert(
                  'How Becho keeps trading safe',
                  'Everyone confirms their email address before they can chat, make offers or post ads.\n\nListings marked "Verified by Becho" have been checked by our team. Keep chats and offers inside the app.'
                )
              }
              accessibilityRole="button"
              hitSlop={8}
            >
              <Text style={styles.trustLink}>Learn more</Text>
              <Icon name="arrow-right" size={16} color={colors.primaryText} />
            </TouchableOpacity>
          </View>
          <View style={styles.trustIcon}>
            <Icon name="account-group-outline" size={24} color={colors.primaryText} />
          </View>
        </View>

        {/* Categories */}
        <SectionTitle title="Categories" action="See all" onAction={() => openExplore()} style={{ marginTop: 24 }} />
        <View style={styles.catGrid}>
          {categories.slice(0, 6).map((cat) => (
            <TouchableOpacity key={cat.id} style={[styles.catTile, { width: catWidth }]} onPress={() => openExplore({ categoryId: cat.id })} accessibilityRole="button" accessibilityLabel={cat.name}>
              <View style={styles.catIcon}>
                <Icon name={categoryIcon(cat.slug)} size={22} color={colors.primaryText} />
              </View>
              <Text style={styles.catLabel} numberOfLines={1}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
          {categories.length > 0 && categories.length < 6 && (
            <TouchableOpacity style={[styles.catTile, { width: catWidth }]} onPress={() => openExplore()} accessibilityRole="button" accessibilityLabel="All categories">
              <View style={styles.catIcon}>
                <Icon name="view-grid-outline" size={22} color={colors.primaryText} />
              </View>
              <Text style={styles.catLabel}>All categories</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Sell prompt */}
        <View style={styles.sell}>
          <View style={styles.sellIcon}>
            <Icon name="image-plus" size={20} color={colors.onPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sellTitle}>Looking to sell?</Text>
            <Text style={styles.sellBody}>Posting an ad is free</Text>
          </View>
          <Button title="Post Ad" size="sm" onPress={() => navigation.navigate(user ? 'CreateListing' : 'Login')} />
        </View>

        {/* Listings */}
        <View style={styles.freshRow}>
          <Text style={styles.freshTitle} accessibilityRole="header">Fresh recommendations</Text>
          <Text style={styles.freshCity}>{area?.cityName ?? 'All cities'}</Text>
        </View>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 32 }} />
        ) : listings.length === 0 ? (
          <EmptyState
            icon={failed ? 'wifi-off' : 'package-variant'}
            title={failed ? 'Could not load listings' : `Nothing listed in ${cityLabel} yet`}
            body={failed ? 'Pull down to try again.' : 'Try another city, or be the first to sell something here.'}
          />
        ) : (
          <View style={styles.grid}>
            {listings.map((l, i) => {
              // An odd last card spans the full width, like the Stitch layout.
              const wide = i === listings.length - 1 && listings.length % 2 === 1;
              return (
                <ListingCard key={l.id} listing={l} wide={wide} width={wide ? fullWidth : cardWidth} onPress={() => openListing(l.id)} onNeedLogin={() => navigation.navigate('Login')} />
              );
            })}
          </View>
        )}

        {listings.length > 0 && (
          <TouchableOpacity style={styles.more} onPress={() => openExplore()} accessibilityRole="button">
            <Text style={styles.moreText}>Show more in {area?.cityName ?? 'all cities'}</Text>
            <Icon name="chevron-right" size={20} color={colors.primaryText} />
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    scroll: { padding: PAD, paddingBottom: 32 },
    searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, borderRadius: 12, paddingHorizontal: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
    searchInput: { flex: 1, fontFamily: font.regular, fontSize: 15, color: c.text, paddingVertical: 0 },
    filterBtn: { width: 48, height: 48, borderRadius: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
    chips: { gap: 8, paddingVertical: 12 },
    cityChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, height: 36, borderRadius: 10, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
    cityChipSelected: { backgroundColor: c.chipSelected, borderColor: c.chipSelected },
    cityChipText: { fontFamily: font.medium, fontSize: 13, color: c.text },
    trust: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, borderRadius: 14, backgroundColor: c.tint, borderWidth: 1, borderColor: c.primarySoftBorder },
    trustIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
    trustTitle: { fontFamily: font.heading, fontSize: 19, color: c.primaryText },
    trustBody: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: c.textSecondary, marginTop: 4 },
    trustLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, alignSelf: 'flex-start' },
    trustLink: { fontFamily: font.semibold, fontSize: 14, color: c.primaryText },
    catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    catTile: { height: 92, borderRadius: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 6 },
    catIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
    catLabel: { fontFamily: font.medium, fontSize: 12, color: c.text, textAlign: 'center' },
    sell: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24, padding: 14, borderRadius: 14, backgroundColor: c.primarySoft, borderWidth: 1, borderColor: c.primarySoftBorder },
    sellIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
    sellTitle: { fontFamily: font.semibold, fontSize: 15, color: c.text },
    sellBody: { fontFamily: font.regular, fontSize: 13, color: c.textSecondary, marginTop: 1 },
    freshRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 28, marginBottom: 12 },
    freshTitle: { flex: 1, fontFamily: font.heading, fontSize: 21, color: c.text },
    freshCity: { fontFamily: font.medium, fontSize: 13, color: c.textMuted },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
    more: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 20, height: 48, borderRadius: 12, backgroundColor: c.primarySoft, borderWidth: 1, borderColor: c.primarySoftBorder },
    moreText: { fontFamily: font.heading, fontSize: 15, color: c.primaryText },
  });
