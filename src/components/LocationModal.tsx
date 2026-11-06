import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, FlatList } from 'react-native';
import { fetchApi } from '../api/client';

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
  onSelectCity: (area: ServiceArea) => void;
  selectedCity: string;
}> = ({ visible, onClose, onSelectCity, selectedCity }) => {
  const [areas, setAreas] = useState<ServiceArea[]>([]);

  useEffect(() => {
    fetchApi<ServiceArea[]>('/locations/service-areas').then((res) => {
      if (res.success && res.data) {
        setAreas(res.data);
      }
    });
  }, []);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Select Service Area</Text>
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
                <Text style={styles.cityName}>{item.cityName}, {item.stateCode}</Text>
                <Text style={styles.statusText}>
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

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#111827', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '60%' },
  title: { fontSize: 20, fontWeight: '700', color: '#f9fafb', marginBottom: 16 },
  cityItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 8, marginBottom: 8, backgroundColor: '#1f2937' },
  selectedItem: { borderColor: '#6366f1', borderWidth: 1 },
  cityName: { color: '#f9fafb', fontSize: 16, fontWeight: '500' },
  statusText: { color: '#10b981', fontSize: 14 },
  closeButton: { marginTop: 16, padding: 12, alignItems: 'center' },
  closeText: { color: '#9ca3af', fontSize: 16 },
});
