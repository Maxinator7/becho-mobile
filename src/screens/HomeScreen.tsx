import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchApi } from '../api/client';
import { formatPrice } from '../utils/format';
import { LocationModal, ServiceArea } from '../components/LocationModal';
import { CategoryPicker, CategoryNode } from '../components/CategoryPicker';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from '../components/NotificationBell';
import { Colors, ThemePreference, useTheme, useThemedStyles } from '../theme/ThemeContext';

const THEME_LABEL: Record<ThemePreference, string> = { system: '◐', light: '☀︎', dark: '☾' };

interface ListingItem {
  id: string;
  title: string;
  price: number;
  condition: string;
  cityCode: string;
  media: { url: string }[];
  category: { name: string };
}

export const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const styles = useThemedStyles(makeStyles);
  const { colors, preference, cyclePreference } = useTheme();
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArea, setSelectedArea] = useState<ServiceArea | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState<boolean>(false);

  const loadListings = async () => {
    setLoading(true);
    let url = '/listings?limit=20';
    if (selectedCategoryId) url += `&categoryId=${selectedCategoryId}`;
    if (selectedArea) url += `&countryCode=${selectedArea.countryCode}&cityCode=${selectedArea.cityCode}`;

    const res = await fetchApi<{ listings: ListingItem[] }>(url);
    setLoading(false);
    if (res.success && res.data) {
      setListings(res.data.listings || []);
    }
  };

  useEffect(() => {
    loadListings();
  }, [selectedCategoryId, selectedArea]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar Header */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.title}>BECHO</Text>
          <Text style={styles.subtitle}>Marketplace</Text>
        </View>

        <View style={styles.userControls}>
          <TouchableOpacity
            style={styles.themeBtn}
            onPress={cyclePreference}
            accessibilityRole="button"
            accessibilityLabel={`Theme: ${preference === 'system' ? 'automatic' : preference}. Tap to change.`}
          >
            <Text style={styles.themeBtnText}>{THEME_LABEL[preference]}</Text>
          </TouchableOpacity>
          {user ? (
            <>
              <NotificationBell onPress={() => navigation.navigate('Notifications')} />
              <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Conversations')} accessibilityLabel="Messages">
                <Text style={styles.iconBtnText}>💬</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('CreateListing')} accessibilityLabel="Sell an item">
                <Text style={styles.iconBtnText}>➕</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.loginBtn} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginBtnText}>Sign In</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Location & Category Pickers */}
      <View style={styles.filterRow}>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.filterBtnText}>📍 {selectedArea?.cityName ?? 'All cities'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.filterBtn} onPress={() => setCategoryModalVisible(true)}>
          <Text style={styles.filterBtnText}>🏷️ {selectedCategory}</Text>
        </TouchableOpacity>
      </View>

      {/* Main Listings Grid / List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : listings.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No listings found in this area/category.</Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ padding: 10 }}
          renderItem={({ item }) => {
            const thumb = item.media && item.media.length > 0 ? item.media[0].url : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500';
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('ProductDetails', { listingId: item.id })}
              >
                <Image source={{ uri: thumb }} style={styles.cardImage} />
                <View style={styles.cardBody}>
                  <Text style={styles.catText}>{item.category?.name || 'General'}</Text>
                  <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.itemPrice}>{formatPrice(item.price)}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Modals */}
      <LocationModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        selectedCity={selectedArea?.cityName ?? 'All cities'}
        onSelectCity={setSelectedArea}
      />

      <CategoryPicker
        visible={categoryModalVisible}
        onClose={() => setCategoryModalVisible(false)}
        onSelectCategory={(cat: CategoryNode) => {
          setSelectedCategory(cat.name);
          setSelectedCategoryId(cat.id);
        }}
      />
    </SafeAreaView>
  );
};

const makeStyles = (c: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: '800', color: c.primary },
  subtitle: { fontSize: 12, fontWeight: '600', color: c.textSecondary },
  userControls: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconBtn: { backgroundColor: c.border, padding: 10, borderRadius: 20 },
  iconBtnText: { fontSize: 16 },
  themeBtn: { backgroundColor: c.border, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 20 },
  themeBtnText: { color: c.text, fontSize: 13, fontWeight: '600' },
  loginBtn: { backgroundColor: c.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  loginBtnText: { color: c.onPrimary, fontWeight: '700', fontSize: 13 },
  filterRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 10 },
  filterBtn: { flex: 1, backgroundColor: c.surface, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: c.border },
  filterBtnText: { color: c.primary, fontWeight: '600', fontSize: 13 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: c.textSecondary, fontSize: 14 },
  card: { flex: 0.5, margin: 6, backgroundColor: c.surface, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: c.border },
  cardImage: { width: '100%', height: 130, backgroundColor: c.surface2 },
  cardBody: { padding: 10 },
  catText: { color: c.primary, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
  itemTitle: { color: c.text, fontWeight: '700', fontSize: 14, marginBottom: 4 },
  itemPrice: { color: c.primary, fontWeight: '800', fontSize: 16 },
});
