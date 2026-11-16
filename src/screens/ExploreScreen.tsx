import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchApi } from '../api/client';
import { ListingCard, ListingSummary } from '../components/ListingCard';
import { LocationModal } from '../components/LocationModal';
import { Button, EmptyState, Icon, IconButton, sheetStyles } from '../components/ui';
import { useCity } from '../context/CityContext';
import { useCategories } from '../utils/catalog';
import { CONDITIONS } from '../utils/listing';
import { formatPrice } from '../utils/format';
import { Colors, font, useTheme, useThemedStyles } from '../theme/ThemeContext';

const PAD = 16;
const GAP = 12;
const PAGE = 20;

type Sort = 'newest' | 'price_asc' | 'price_desc';
const SORTS: { value: Sort; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];

interface Filters {
  condition: string | null;
  minPrice: string;
  maxPrice: string;
  verified: boolean;
  sort: Sort;
}
const EMPTY: Filters = { condition: null, minPrice: '', maxPrice: '', verified: false, sort: 'newest' };

/** Full search & browse: text search, category, city, condition, price range, verified only, sort. */
export const ExploreScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const styles = useThemedStyles(makeStyles);
  const sheet = useThemedStyles(sheetStyles);
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const categories = useCategories();
  const { area, setArea } = useCity();

  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [showFilters, setShowFilters] = useState(false);
  const [showCities, setShowCities] = useState(false);

  const [items, setItems] = useState<ListingSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const requestId = useRef(0);

  // Params from Home (search box, category tile, filter button, "show verified").
  useEffect(() => {
    const p = route.params;
    // Params are cleared below once applied; stop here when there is nothing new, or this loops.
    if (!p || (p.search === undefined && p.categoryId === undefined && !p.verified && !p.openFilters)) return;
    if (p.search !== undefined) {
      setQuery(p.search);
      setSearch(p.search);
    }
    if (p.categoryId !== undefined) setCategoryId(p.categoryId || null);
    if (p.verified) setFilters((f) => ({ ...f, verified: true }));
    if (p.openFilters) {
      setDraft(filters);
      setShowFilters(true);
    }
    navigation.setParams({ search: undefined, categoryId: undefined, verified: undefined, openFilters: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params]);

  const buildUrl = useCallback(
    (pageNo: number) => {
      const q = new URLSearchParams({ limit: String(PAGE), page: String(pageNo), sort: filters.sort });
      if (search) q.set('search', search);
      if (categoryId) q.set('categoryId', categoryId);
      if (area) {
        q.set('countryCode', area.countryCode);
        q.set('cityCode', area.cityCode);
      }
      if (filters.condition) q.set('condition', filters.condition);
      if (filters.minPrice) q.set('minPrice', filters.minPrice);
      if (filters.maxPrice) q.set('maxPrice', filters.maxPrice);
      if (filters.verified) q.set('verified', 'true');
      return `/listings?${q.toString()}`;
    },
    [search, categoryId, area, filters]
  );

  useEffect(() => {
    const id = ++requestId.current;
    setLoading(true);
    fetchApi<{ listings: ListingSummary[]; pagination: { total: number; totalPages: number } }>(buildUrl(1)).then((res) => {
      if (id !== requestId.current) return;
      setLoading(false);
      setFailed(!res.success);
      if (res.success && res.data) {
        setItems(res.data.listings);
        setTotal(res.data.pagination.total);
        setTotalPages(res.data.pagination.totalPages);
        setPage(1);
      }
    });
  }, [buildUrl]);

  const loadMore = async () => {
    if (loadingMore || loading || page >= totalPages) return;
    setLoadingMore(true);
    const id = requestId.current;
    const res = await fetchApi<{ listings: ListingSummary[] }>(buildUrl(page + 1));
    setLoadingMore(false);
    if (id !== requestId.current || !res.success || !res.data) return;
    setItems((prev) => [...prev, ...res.data!.listings]);
    setPage((p) => p + 1);
  };

  const activeCount = (filters.condition ? 1 : 0) + (filters.minPrice || filters.maxPrice ? 1 : 0) + (filters.verified ? 1 : 0) + (filters.sort !== 'newest' ? 1 : 0);
  const cardWidth = (Math.min(width, 640) - PAD * 2 - GAP) / 2;

  const summaryChips: { key: string; label: string; clear: () => void }[] = [];
  if (filters.verified) summaryChips.push({ key: 'v', label: 'Verified only', clear: () => setFilters((f) => ({ ...f, verified: false })) });
  if (filters.condition) summaryChips.push({ key: 'c', label: CONDITIONS.find((c) => c.value === filters.condition)?.label ?? filters.condition, clear: () => setFilters((f) => ({ ...f, condition: null })) });
  if (filters.minPrice || filters.maxPrice) {
    const label = filters.minPrice && filters.maxPrice ? `${formatPrice(+filters.minPrice)} – ${formatPrice(+filters.maxPrice)}` : filters.minPrice ? `From ${formatPrice(+filters.minPrice)}` : `Up to ${formatPrice(+filters.maxPrice)}`;
    summaryChips.push({ key: 'p', label, clear: () => setFilters((f) => ({ ...f, minPrice: '', maxPrice: '' })) });
  }
  if (filters.sort !== 'newest') summaryChips.push({ key: 's', label: SORTS.find((s) => s.value === filters.sort)!.label, clear: () => setFilters((f) => ({ ...f, sort: 'newest' })) });

  const header = (
    <View>
      <View style={styles.titleRow}>
        <Text style={styles.title} accessibilityRole="header">Explore</Text>
        <TouchableOpacity style={styles.cityPill} onPress={() => setShowCities(true)} accessibilityRole="button" accessibilityLabel={`City: ${area?.cityName ?? 'All cities'}. Change city`}>
          <Icon name="map-marker-outline" size={16} color={colors.primaryText} />
          <Text style={styles.cityText}>{area?.cityName ?? 'All cities'}</Text>
          <Icon name="chevron-down" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
      <View style={styles.searchRow}>
        <View style={styles.search}>
          <Icon name="magnify" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search phones, bikes, sofas…"
            placeholderTextColor={colors.placeholder}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            onSubmitEditing={() => setSearch(query.trim())}
            accessibilityLabel="Search listings"
          />
          {query ? (
            <TouchableOpacity onPress={() => { setQuery(''); setSearch(''); }} accessibilityLabel="Clear search" hitSlop={8}>
              <Icon name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, activeCount > 0 && styles.filterBtnActive]}
          onPress={() => { setDraft(filters); setShowFilters(true); }}
          accessibilityRole="button"
          accessibilityLabel={activeCount ? `Filters, ${activeCount} active` : 'Filters'}
        >
          <Icon name="tune-variant" size={20} color={activeCount ? colors.onPrimary : colors.text} />
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {[{ id: null as string | null, name: 'All' }, ...categories].map((cat) => {
          const selected = cat.id === categoryId;
          return (
            <TouchableOpacity key={cat.id ?? 'all'} style={[styles.chip, selected && styles.chipSelected]} onPress={() => setCategoryId(cat.id)} accessibilityRole="button" accessibilityState={{ selected }}>
              <Text style={[styles.chipText, selected && { color: colors.onChipSelected }]}>{cat.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {summaryChips.length > 0 && (
        <View style={styles.summary}>
          {summaryChips.map((c) => (
            <TouchableOpacity key={c.key} style={styles.summaryChip} onPress={c.clear} accessibilityRole="button" accessibilityLabel={`Remove filter ${c.label}`}>
              <Text style={styles.summaryText}>{c.label}</Text>
              <Icon name="close" size={14} color={colors.primaryText} />
            </TouchableOpacity>
          ))}
        </View>
      )}
      {!loading && !failed && (
        <Text style={styles.count}>
          {total} {total === 1 ? 'result' : 'results'}
          {search ? ` for “${search}”` : ''}
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerWrap}>{header}</View>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(l) => l.id}
          numColumns={2}
          columnWrapperStyle={{ gap: GAP }}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <EmptyState
              icon={failed ? 'wifi-off' : 'text-search'}
              title={failed ? 'Could not load listings' : 'No listings match'}
              body={failed ? 'Check your connection and try again.' : 'Try a different search, another city or fewer filters.'}
              action={
                !failed && (activeCount > 0 || search || categoryId) ? (
                  <Button title="Clear all" variant="outline" size="sm" onPress={() => { setFilters(EMPTY); setSearch(''); setQuery(''); setCategoryId(null); }} />
                ) : undefined
              }
            />
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : undefined}
          renderItem={({ item }) => (
            <ListingCard listing={item} width={cardWidth} onPress={() => navigation.navigate('ProductDetails', { listingId: item.id })} onNeedLogin={() => navigation.navigate('Login')} />
          )}
        />
      )}

      <Modal visible={showFilters} transparent animationType="slide" onRequestClose={() => setShowFilters(false)}>
        <Pressable style={sheet.overlay} onPress={() => setShowFilters(false)}>
          <Pressable style={sheet.sheet}>
            <View style={sheet.handle} />
            <View style={sheet.titleRow}>
              <Text style={sheet.title}>Filters</Text>
              <IconButton name="close" label="Close" onPress={() => setShowFilters(false)} />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.fLabel}>Sort by</Text>
              <View style={styles.fChips}>
                {SORTS.map((s) => (
                  <TouchableOpacity key={s.value} style={[styles.chip, draft.sort === s.value && styles.chipSelected]} onPress={() => setDraft({ ...draft, sort: s.value })} accessibilityState={{ selected: draft.sort === s.value }}>
                    <Text style={[styles.chipText, draft.sort === s.value && { color: colors.onChipSelected }]}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fLabel}>Condition</Text>
              <View style={styles.fChips}>
                {[{ value: null as string | null, label: 'Any' }, ...CONDITIONS].map((c) => (
                  <TouchableOpacity key={c.value ?? 'any'} style={[styles.chip, draft.condition === c.value && styles.chipSelected]} onPress={() => setDraft({ ...draft, condition: c.value })} accessibilityState={{ selected: draft.condition === c.value }}>
                    <Text style={[styles.chipText, draft.condition === c.value && { color: colors.onChipSelected }]}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fLabel}>Price (₹)</Text>
              <View style={styles.priceRow}>
                <TextInput style={styles.priceInput} placeholder="Min" placeholderTextColor={colors.placeholder} keyboardType="number-pad" value={draft.minPrice} onChangeText={(t) => setDraft({ ...draft, minPrice: t.replace(/\D/g, '') })} accessibilityLabel="Minimum price" />
                <Text style={styles.priceDash}>–</Text>
                <TextInput style={styles.priceInput} placeholder="Max" placeholderTextColor={colors.placeholder} keyboardType="number-pad" value={draft.maxPrice} onChangeText={(t) => setDraft({ ...draft, maxPrice: t.replace(/\D/g, '') })} accessibilityLabel="Maximum price" />
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchTitle}>Verified only</Text>
                  <Text style={styles.switchSub}>Listings checked by the Becho team</Text>
                </View>
                <Switch value={draft.verified} onValueChange={(v) => setDraft({ ...draft, verified: v })} trackColor={{ true: colors.primary, false: colors.borderStrong }} thumbColor="#FFFFFF" accessibilityLabel="Verified only" />
              </View>
            </ScrollView>
            <View style={styles.fFooter}>
              <Button title="Reset" variant="outline" onPress={() => setDraft(EMPTY)} style={{ flex: 1 }} />
              <Button
                title="Show results"
                onPress={() => {
                  const min = +draft.minPrice;
                  const max = +draft.maxPrice;
                  setFilters(draft.minPrice && draft.maxPrice && min > max ? { ...draft, minPrice: draft.maxPrice, maxPrice: draft.minPrice } : draft);
                  setShowFilters(false);
                }}
                style={{ flex: 2 }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <LocationModal visible={showCities} onClose={() => setShowCities(false)} selectedCity={area?.cityName ?? 'All cities'} onSelectCity={setArea} />
    </SafeAreaView>
  );
};

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    headerWrap: { paddingHorizontal: PAD, paddingTop: 8, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border },
    titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    title: { fontFamily: font.heading, fontSize: 24, color: c.text },
    cityPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 34, borderRadius: 999, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border },
    cityText: { fontFamily: font.semibold, fontSize: 13, color: c.text },
    searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, borderRadius: 999, paddingHorizontal: 14, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border },
    searchInput: { flex: 1, fontFamily: font.regular, fontSize: 15, color: c.text, paddingVertical: 0 },
    filterBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
    filterBtnActive: { backgroundColor: c.primary, borderColor: c.primary },
    chips: { gap: 8, paddingVertical: 12 },
    chip: { paddingHorizontal: 14, height: 34, justifyContent: 'center', borderRadius: 999, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
    chipSelected: { backgroundColor: c.chipSelected, borderColor: c.chipSelected },
    chipText: { fontFamily: font.medium, fontSize: 13, color: c.text },
    summary: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
    summaryChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 28, borderRadius: 999, backgroundColor: c.primarySoft, borderWidth: 1, borderColor: c.primarySoftBorder },
    summaryText: { fontFamily: font.medium, fontSize: 12, color: c.primaryText },
    count: { fontFamily: font.medium, fontSize: 12, color: c.textMuted, marginBottom: 10 },
    list: { padding: PAD, gap: GAP, flexGrow: 1 },
    fLabel: { fontFamily: font.semibold, fontSize: 13, color: c.text, marginTop: 14, marginBottom: 8 },
    fChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    priceInput: { flex: 1, height: 46, borderRadius: 10, borderWidth: 1, borderColor: c.inputBorder, backgroundColor: c.inputBg, paddingHorizontal: 12, fontFamily: font.regular, fontSize: 15, color: c.text },
    priceDash: { color: c.textMuted, fontFamily: font.medium },
    switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18, padding: 12, borderRadius: 12, backgroundColor: c.surface2 },
    switchTitle: { fontFamily: font.semibold, fontSize: 14, color: c.text },
    switchSub: { fontFamily: font.regular, fontSize: 12, color: c.textMuted, marginTop: 2 },
    fFooter: { flexDirection: 'row', gap: 10, marginTop: 16 },
  });
