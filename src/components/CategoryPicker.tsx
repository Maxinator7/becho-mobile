import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, font, useTheme, useThemedStyles } from '../theme/ThemeContext';
import { CategoryNode, categoryIcon, useCategories } from '../utils/catalog';
import { Icon, IconButton, sheetStyles } from './ui';

export type { CategoryNode } from '../utils/catalog';

/** Two-level category sheet; returns the chosen subcategory and its parent. */
export const CategoryPicker: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSelectCategory: (cat: CategoryNode, parent: CategoryNode | null) => void;
  selectedId?: string;
}> = ({ visible, onClose, onSelectCategory, selectedId }) => {
  const categories = useCategories();
  const sheet = useThemedStyles(sheetStyles);
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={sheet.overlay} onPress={onClose}>
        <Pressable style={sheet.sheet}>
          <View style={sheet.handle} />
          <View style={sheet.titleRow}>
            <Text style={sheet.title}>Choose a category</Text>
            <IconButton name="close" label="Close" onPress={onClose} />
          </View>
          <ScrollView>
            {categories.map((top) => (
              <View key={top.id} style={styles.section}>
                <View style={styles.parentRow}>
                  <Icon name={categoryIcon(top.slug)} size={18} color={colors.primaryText} />
                  <Text style={styles.parent}>{top.name}</Text>
                </View>
                <View style={styles.children}>
                  {(top.children ?? []).map((child) => {
                    const selected = child.id === selectedId;
                    return (
                      <TouchableOpacity
                        key={child.id}
                        style={[styles.child, selected && styles.childSelected]}
                        onPress={() => {
                          onSelectCategory(child, top);
                          onClose();
                        }}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                      >
                        <Text style={[styles.childText, selected && { color: colors.primaryText }]}>{child.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    section: { marginBottom: 16 },
    parentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    parent: { fontFamily: font.heading, fontSize: 15, color: c.text },
    children: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    child: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border },
    childSelected: { backgroundColor: c.primarySoft, borderColor: c.primarySoftBorder },
    childText: { fontFamily: font.medium, fontSize: 13, color: c.text },
  });
