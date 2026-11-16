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

/**
 * Grid card (Stitch 22): inset photo with a save button, then "Verified by Becho" / condition chips,
 * price in indigo, a two-line title and the city. `wide` lays it out full width with a taller photo.
 */
export const ListingCard: React.FC<{ listing: ListingSummary; width: number; onPress: () => void; onNeedLogin: () => void; wide?: boolean }> = ({
  listing,
  width,
  onPress,
  onNeedLogin,
  wide,
}) => {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const areas = useServiceAreas();
  const { isFavorite, toggle } = useFavorites();
  const saved = isFavorite(listing.id);
  const photo = listing.media?.find((m) => m.mediaType !== 'VIDEO')?.url ?? listing.media?.[0]?.url;
  const inner = width - INSET * 2;

  return (
    // The save button sits beside (not inside) the card's touchable, so web never nests two buttons.
    <View style={[styles.card, { width }]}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`${listing.title}, ${formatPrice(listing.price)}${listing.verifiedAt ? ', verified by Becho' : ''}`}
      >
        <View style={[styles.photoWrap, { height: wide ? inner * 0.56 : inner * 0.78 }]}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
          ) : (
            <View style={[styles.photo, styles.noPhoto]}>
              <Icon name="image-outline" size={28} color={colors.textMuted} />
            </View>
          )}
        </View>
        <View style={styles.body}>
          <View style={styles.chips}>
            {listing.verifiedAt ? (
              <View style={[styles.chip, styles.chipVerified]}>
                <Icon name="check-decagram-outline" size={12} color={colors.primaryText} />
                <Text style={[styles.chipText, { color: colors.primaryText }]}>Verified by Becho</Text>
              </View>
            ) : null}
            <View style={styles.chip}>
              <Text style={styles.chipText}>{CONDITION_LABELS[listing.condition] ?? listing.condition}</Text>
            </View>
          </View>
          <View style={wide ? styles.wideRow : undefined}>
            <Text style={[styles.price, wide && styles.priceWide]} numberOfLines={1}>{formatPrice(listing.price)}</Text>
          </View>
          <Text style={[styles.title, wide && styles.titleWide]} numberOfLines={2}>{listing.title}</Text>
          <View style={styles.meta}>
            <Icon name="map-marker-outline" size={13} color={colors.textMuted} />
            <Text style={styles.metaText} numberOfLines={1}>{cityName(areas, listing.cityCode)}</Text>
          </View>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.heart}
        onPress={async () => {
          if (!(await toggle(listing.id))) onNeedLogin();
        }}
        accessibilityRole="button"
        accessibilityLabel={saved ? 'Remove from saved ads' : 'Save ad'}
        hitSlop={6}
      >
        <Icon name={saved ? 'heart' : 'heart-outline'} size={18} color={saved ? colors.danger : '#131B2E'} />
      </TouchableOpacity>
    </View>
  );
};

const INSET = 10;

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    card: { backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: INSET },
    photoWrap: { backgroundColor: c.surface2, borderRadius: 10, overflow: 'hidden' },
    photo: { width: '100%', height: '100%' },
    noPhoto: { alignItems: 'center', justifyContent: 'center' },
    heart: { position: 'absolute', right: INSET + 8, top: INSET + 8, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center' },
    body: { paddingTop: 10, gap: 3 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 2 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: c.surface2 },
    chipVerified: { backgroundColor: c.primarySoft },
    chipText: { fontFamily: font.semibold, fontSize: 11, color: c.textSecondary },
    wideRow: { flexDirection: 'row' },
    price: { fontFamily: font.headingX, fontSize: 18, color: c.primaryText },
    priceWide: { fontSize: 22 },
    title: { fontFamily: font.medium, fontSize: 14, lineHeight: 19, color: c.text },
    titleWide: { fontFamily: font.heading, fontSize: 17, lineHeight: 22 },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
    metaText: { flex: 1, fontFamily: font.regular, fontSize: 12, color: c.textMuted },
  });
