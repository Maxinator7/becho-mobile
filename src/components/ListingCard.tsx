import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, font, useTheme, useThemedStyles } from '../theme/ThemeContext';
import { formatPrice } from '../utils/format';
import { CONDITION_LABELS } from '../utils/listing';
import { cityName, useServiceAreas } from '../utils/catalog';
import { useFavorites } from '../context/FavoritesContext';
import { Icon } from './ui';

export interface ListingSummary {
  id: string;
  title: string;
  price: number;
  condition: string;
  cityCode: string;
  media?: { url: string; mediaType?: string }[];
  category?: { name: string };
  verifiedAt?: string | null;
}

/** Grid card: 4:3 photo with condition + VERIFIED chips and a save button, then price, title and city. */
export const ListingCard: React.FC<{ listing: ListingSummary; width: number; onPress: () => void; onNeedLogin: () => void }> = ({
  listing,
  width,
  onPress,
  onNeedLogin,
}) => {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const areas = useServiceAreas();
  const { isFavorite, toggle } = useFavorites();
  const saved = isFavorite(listing.id);
  const photo = listing.media?.find((m) => m.mediaType !== 'VIDEO')?.url ?? listing.media?.[0]?.url;

  return (
    <TouchableOpacity
      style={[styles.card, { width }]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${listing.title}, ${formatPrice(listing.price)}${listing.verifiedAt ? ', verified' : ''}`}
    >
      <View style={[styles.photoWrap, { height: (width * 3) / 4 }]}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={[styles.photo, styles.noPhoto]}>
            <Icon name="image-outline" size={28} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.condition}>
          <Text style={styles.conditionText}>{CONDITION_LABELS[listing.condition] ?? listing.condition}</Text>
        </View>
        {listing.verifiedAt ? (
          <View style={styles.verified}>
            <Icon name="check-decagram" size={11} color="#FFFFFF" />
            <Text style={styles.verifiedText}>VERIFIED</Text>
          </View>
        ) : null}
        <TouchableOpacity
          style={styles.heart}
          onPress={async () => {
            if (!(await toggle(listing.id))) onNeedLogin();
          }}
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Remove from saved ads' : 'Save ad'}
          hitSlop={6}
        >
          <Icon name={saved ? 'heart' : 'heart-outline'} size={18} color={saved ? colors.danger : colors.text} />
        </TouchableOpacity>
      </View>
      <View style={styles.body}>
        <Text style={styles.price} numberOfLines={1}>{formatPrice(listing.price)}</Text>
        <Text style={styles.title} numberOfLines={1}>{listing.title}</Text>
        <View style={styles.meta}>
          <Icon name="map-marker-outline" size={13} color={colors.textMuted} />
          <Text style={styles.metaText} numberOfLines={1}>{cityName(areas, listing.cityCode)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    card: { backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
    photoWrap: { backgroundColor: c.surface2 },
    photo: { width: '100%', height: '100%' },
    noPhoto: { alignItems: 'center', justifyContent: 'center' },
    condition: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
    conditionText: { fontFamily: font.semibold, fontSize: 11, color: '#0F172A' },
    verified: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: c.successFill, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 },
    verifiedText: { fontFamily: font.bold, fontSize: 9, letterSpacing: 0.4, color: '#FFFFFF' },
    heart: { position: 'absolute', right: 8, bottom: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border },
    body: { padding: 10, gap: 2 },
    price: { fontFamily: font.headingX, fontSize: 17, color: c.text },
    title: { fontFamily: font.medium, fontSize: 14, color: c.text },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
    metaText: { flex: 1, fontFamily: font.regular, fontSize: 12, color: c.textMuted },
  });
