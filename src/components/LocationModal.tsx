import React from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, font, useTheme, useThemedStyles } from '../theme/ThemeContext';
import { ServiceArea, useServiceAreas } from '../utils/catalog';
import { Icon, IconButton, sheetStyles } from './ui';

export type { ServiceArea } from '../utils/catalog';

export const LocationModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSelectCity: (area: ServiceArea | null) => void;
  selectedCity: string;
  /** Only cities where selling is enabled, and no "All cities" option. */
  sellingOnly?: boolean;
}> = ({ visible, onClose, onSelectCity, selectedCity, sellingOnly }) => {
  const all = useServiceAreas();
  const areas = sellingOnly ? all.filter((a) => a.sellingEnabled) : all;
  const sheet = useThemedStyles(sheetStyles);
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();

  const Row = ({ label, sub, selected, onPress }: { label: string; sub?: string; selected: boolean; onPress: () => void }) => (
    <TouchableOpacity style={[styles.row, selected && styles.rowSelected]} onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }}>
      <Icon name={selected ? 'map-marker' : 'map-marker-outline'} size={20} color={selected ? colors.primaryText : colors.textMuted} />
      <View style={{ flex: 1 }}>
        <Text style={styles.city}>{label}</Text>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      </View>
      {selected && <Icon name="check" size={20} color={colors.primaryText} />}
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={sheet.overlay} onPress={onClose}>
        <Pressable style={sheet.sheet}>
          <View style={sheet.handle} />
          <View style={sheet.titleRow}>
            <Text style={sheet.title}>{sellingOnly ? 'Where is the item?' : 'Choose your city'}</Text>
            <IconButton name="close" label="Close" onPress={onClose} />
          </View>
          <FlatList
            data={areas}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={
              sellingOnly ? undefined : (
                <Row label="All cities" selected={selectedCity === 'All cities'} onPress={() => { onSelectCity(null); onClose(); }} />
              )
            }
            renderItem={({ item }) => (
              <Row
                label={item.cityName}
                sub={`${item.stateName}${!sellingOnly && !(item.buyingEnabled && item.sellingEnabled) ? ' · limited service' : ''}`}
                selected={selectedCity === item.cityName}
                onPress={() => { onSelectCity(item); onClose(); }}
              />
            )}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, marginBottom: 4 },
    rowSelected: { backgroundColor: c.primarySoft },
    city: { fontFamily: font.semibold, fontSize: 15, color: c.text },
    sub: { fontFamily: font.regular, fontSize: 12, color: c.textMuted, marginTop: 1 },
  });
