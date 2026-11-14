import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, FlatList } from 'react-native';
import { fetchApi } from '../api/client';
import { Colors, useTheme, useThemedStyles } from '../theme/ThemeContext';

export interface ServiceArea {
  id: string;
  countryCode: string;
  stateCode: string;
  stateName: string;
  cityCode: string;
  cityName: string;
  isActive: boolean;
  buyingEnabled: boolean;
  sellingEnabled: boolean;
}

export const LocationModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSelectCity: (area: ServiceArea | null) => void;
  selectedCity: string;
  /** Only cities where selling is enabled, and no "All cities" option. */
  sellingOnly?: boolean;
}> = ({ visible, onClose, onSelectCity, selectedCity, sellingOnly }) => {
  const [areas, setAreas] = useState<ServiceArea[]>([]);
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();

  useEffect(() => {
    fetchApi<ServiceArea[]>('/locations/service-areas').then((res) => {
      if (res.success && res.data) {
        setAreas(sellingOnly ? res.data.filter((a) => a.sellingEnabled) : res.data);
      }
    });
  }, []);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Choose your city</Text>
          {!sellingOnly && (
            <TouchableOpacity style={[styles.cityItem, selectedCity === 'All cities' && styles.selectedItem]} onPress={() => { onSelectCity(null); onClose(); }}>
              <Text style={styles.cityName}>All cities</Text>
            </TouchableOpacity>
          )}
          <FlatList
            data={areas}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.cityItem, selectedCity === item.cityName && styles.selectedItem]}
                onPress={() => {
                  onSelectCity(item);
                  onClose();
                }}
              >
                <Text style={styles.cityName}>{item.cityName}, {item.stateName}</Text>
                <Text style={[styles.statusText, !(item.buyingEnabled && item.sellingEnabled) && { color: colors.warning }]}>
                  {item.buyingEnabled && item.sellingEnabled ? 'Active' : 'Restricted'}
                </Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const makeStyles = (c: Colors) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: c.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '60%' },
  title: { fontSize: 20, fontWeight: '700', color: c.text, marginBottom: 16 },
  cityItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 8, marginBottom: 8, backgroundColor: c.surface2 },
  selectedItem: { borderColor: c.primary, borderWidth: 1 },
  cityName: { color: c.text, fontSize: 16, fontWeight: '500' },
  statusText: { color: c.success, fontSize: 14 },
  closeButton: { marginTop: 16, padding: 12, alignItems: 'center' },
  closeText: { color: c.textSecondary, fontSize: 16 },
});
