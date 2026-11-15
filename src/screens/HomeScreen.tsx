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

  const cardWidth = (Math.min(width, 640) - PAD * 2 - GAP) / 2;
  const cityLabel = area?.cityName ?? 'your area';

  const load = useCallback(async () => {
    let url = '/listings?limit=20';
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
                {selected && <Icon name="navigation-variant-outline" size={14} color={colors.onChipSelected} />}
                <Text style={[styles.cityChipText, selected && { color: colors.onChipSelected }]}>{a?.cityName ?? 'All cities'}</Text>
                {selected && <Icon name="check" size={14} color={colors.onChipSelected} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Trust banner */}
        <View style={styles.trust}>
          <View style={styles.trustIcon}>
            <Icon name="shield-check-outline" size={22} color={colors.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.trustTitle}>Verified people only</Text>
            <Text style={styles.trustBody}>Every buyer and seller confirms their email before they can chat or sell.</Text>
          </View>
          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                'How Becho keeps trading safe',
                'Everyone confirms their email address before they can chat, make offers or post ads.\n\nListings with a VERIFIED badge have been checked by the Becho team. Chats and offers stay inside the app.'
              )
            }
            accessibilityRole="button"
            hitSlop={8}
          >
            <Text style={styles.trustLink}>Know more ›</Text>
          </TouchableOpacity>
        </View>

        {/* Categories */}
        <SectionTitle title="Categories" action="Explore all" onAction={() => openExplore()} style={{ marginTop: 24 }} />
        <View style={styles.catGrid}>
          {categories.slice(0, 7).map((cat) => (
            <TouchableOpacity key={cat.id} style={[styles.catTile, { width: (Math.min(width, 640) - PAD * 2 - 8 * 3) / 4 }]} onPress={() => openExplore({ categoryId: cat.id })} accessibilityRole="button" accessibilityLabel={cat.name}>
              <View style={styles.catIcon}>
                <Icon name={categoryIcon(cat.slug)} size={22} color={colors.primaryText} />
              </View>
              <Text style={styles.catLabel} numberOfLines={1}>{cat.name.split(' ')[0].replace(/,$/, '')}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.catTile, { width: (Math.min(width, 640) - PAD * 2 - 8 * 3) / 4 }]} onPress={() => openExplore()} accessibilityRole="button" accessibilityLabel="All categories">
            <View style={styles.catIcon}>
              <Icon name="view-grid-outline" size={22} color={colors.primaryText} />
            </View>
            <Text style={styles.catLabel}>All</Text>
          </TouchableOpacity>
        </View>

        {/* Promo: staff-verified listings */}
        <View style={styles.promo}>
          <View style={styles.promoOverlineRow}>
            <Icon name="check-decagram-outline" size={14} color="#A5B4FC" />
            <Text style={styles.promoOverline}>STAFF VERIFIED</Text>
          </View>
          <Text style={styles.promoTitle}>Shop listings checked by the Becho team</Text>
          <Text style={styles.promoBody}>Look for the green VERIFIED badge, or show only verified ads.</Text>
          <Button title="Show verified ads" size="sm" onPress={() => openExplore({ verified: true })} style={{ alignSelf: 'flex-start', marginTop: 12 }} />
        </View>

        {/* Listings */}
        <SectionTitle title={`Trending in ${area?.cityName ?? 'India'}`} subtitle="Newest live listings first" style={{ marginTop: 24 }} />
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
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l} width={cardWidth} onPress={() => openListing(l.id)} onNeedLogin={() => navigation.navigate('Login')} />
            ))}
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
    search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, borderRadius: 999, paddingHorizontal: 14, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border },
    searchInput: { flex: 1, fontFamily: font.regular, fontSize: 15, color: c.text, paddingVertical: 0 },
    filterBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
    chips: { gap: 8, paddingVertical: 12 },
    cityChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, height: 34, borderRadius: 999, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
    cityChipSelected: { backgroundColor: c.chipSelected, borderColor: c.chipSelected },
    cityChipText: { fontFamily: font.medium, fontSize: 13, color: c.text },
    trust: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, backgroundColor: c.successSoft, borderWidth: 1, borderColor: c.successSoftBorder },
    trustIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
    trustTitle: { fontFamily: font.heading, fontSize: 15, color: c.text },
    trustBody: { fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: c.textSecondary, marginTop: 2 },
    trustLink: { fontFamily: font.semibold, fontSize: 13, color: c.primaryText },
    catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    catTile: { aspectRatio: 1, borderRadius: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 4 },
    catIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
    catLabel: { fontFamily: font.medium, fontSize: 12, color: c.text },
    promo: { marginTop: 24, padding: 16, borderRadius: 12, backgroundColor: c.surfaceDeep, borderWidth: 1, borderColor: c.border },
    promoOverlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    promoOverline: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 0.7, color: '#A5B4FC' },
    promoTitle: { fontFamily: font.heading, fontSize: 18, lineHeight: 24, color: c.onSurfaceDeep, marginTop: 6 },
    promoBody: { fontFamily: font.regular, fontSize: 13, color: '#94A3B8', marginTop: 4 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
    more: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 20, height: 48, borderRadius: 12, backgroundColor: c.primarySoft, borderWidth: 1, borderColor: c.primarySoftBorder },
    moreText: { fontFamily: font.heading, fontSize: 15, color: c.primaryText },
  });
