import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { fetchApi } from '../api/client';
import { ListingCard, ListingSummary } from '../components/ListingCard';
import { Button, EmptyState, ScreenHeader } from '../components/ui';
import { useFavorites } from '../context/FavoritesContext';
import { Colors, useTheme, useThemedStyles } from '../theme/ThemeContext';

/** Listings the user saved with the heart / bookmark button. */
export const SavedAdsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { ids } = useFavorites();
  const [items, setItems] = useState<(ListingSummary & { status?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const res = await fetchApi<(ListingSummary & { status?: string })[]>('/favorites');
    if (res.success && res.data) setItems(res.data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  // Hide cards the user just unsaved without waiting for a reload.
  const visible = items.filter((l) => ids.has(l.id));
  const cardWidth = (Math.min(width, 640) - 32 - 12) / 2;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Saved ads" onBack={() => navigation.goBack()} />
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(l) => l.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <EmptyState
                icon="heart-outline"
                title="No saved ads yet"
                body="Tap the heart on any listing to keep it here."
                action={<Button title="Explore listings" size="sm" onPress={() => navigation.navigate('Tabs', { screen: 'Explore' })} />}
              />
            </View>
          }
          renderItem={({ item }) => (
            <ListingCard listing={item} width={cardWidth} onPress={() => navigation.navigate('ProductDetails', { listingId: item.id })} onNeedLogin={() => navigation.navigate('Login')} />
          )}
        />
      )}
    </SafeAreaView>
  );
};

const makeStyles = (c: Colors) => StyleSheet.create({ container: { flex: 1, backgroundColor: c.bg } });
