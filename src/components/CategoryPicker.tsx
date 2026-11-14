import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, FlatList } from 'react-native';
import { fetchApi } from '../api/client';
import { Colors, useThemedStyles } from '../theme/ThemeContext';

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  children?: CategoryNode[];
}

export const CategoryPicker: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSelectCategory: (cat: CategoryNode) => void;
}> = ({ visible, onClose, onSelectCategory }) => {
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const styles = useThemedStyles(makeStyles);

  useEffect(() => {
    fetchApi<CategoryNode[]>('/categories').then((res) => {
      if (res.success && res.data) {
        setCategories(res.data);
      }
    });
  }, []);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Select Category</Text>
          <FlatList
            data={categories}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.parentSection}>
                <Text style={styles.parentTitle}>{item.name}</Text>
                {item.children?.map((child) => (
                  <TouchableOpacity
                    key={child.id}
                    style={styles.childItem}
                    onPress={() => {
                      onSelectCategory(child);
                      onClose();
                    }}
                  >
                    <Text style={styles.childName}>• {child.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
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
  modalContent: { backgroundColor: c.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '70%' },
  title: { fontSize: 20, fontWeight: '700', color: c.text, marginBottom: 16 },
  parentSection: { marginBottom: 16 },
  parentTitle: { color: c.primary, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  childItem: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 6, backgroundColor: c.surface2, marginBottom: 6 },
  childName: { color: c.text, fontSize: 14 },
  closeButton: { marginTop: 12, padding: 12, alignItems: 'center' },
  closeText: { color: c.textSecondary, fontSize: 16 },
});
