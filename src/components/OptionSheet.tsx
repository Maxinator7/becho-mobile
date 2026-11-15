import React from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, font, useTheme, useThemedStyles } from '../theme/ThemeContext';
import { Icon, IconButton, sheetStyles } from './ui';

/** Simple single-choice bottom sheet (used for select-type listing attributes). */
export const OptionSheet: React.FC<{
  visible: boolean;
  title: string;
  options: { value: string; label: string }[];
  selected?: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}> = ({ visible, title, options, selected, onSelect, onClose }) => {
  const sheet = useThemedStyles(sheetStyles);
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={sheet.overlay} onPress={onClose}>
        <Pressable style={sheet.sheet}>
          <View style={sheet.handle} />
          <View style={sheet.titleRow}>
            <Text style={sheet.title}>{title}</Text>
            <IconButton name="close" label="Close" onPress={onClose} />
          </View>
          <FlatList
            data={options}
            keyExtractor={(o) => o.value}
            renderItem={({ item }) => {
              const active = item.value === selected;
              return (
                <TouchableOpacity
                  style={[styles.row, active && styles.rowActive]}
                  onPress={() => {
                    onSelect(item.value);
                    onClose();
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.label, active && { color: colors.primaryText }]}>{item.label}</Text>
                  {active && <Icon name="check" size={20} color={colors.primaryText} />}
                </TouchableOpacity>
              );
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 12, borderRadius: 10 },
    rowActive: { backgroundColor: c.primarySoft },
    label: { fontFamily: font.medium, fontSize: 15, color: c.text },
  });
