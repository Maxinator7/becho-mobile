import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';
import { Colors, font, useTheme, useThemedStyles } from '../theme/ThemeContext';
import { Icon } from './ui';

interface Props extends TextInputProps {
  label: string;
  error?: string | null;
  hint?: string;
  /** Text shown before the input, e.g. "+91". */
  prefix?: string;
  /** Adds a show/hide toggle for passwords. */
  password?: boolean;
}

export const FormField: React.FC<Props> = ({ label, error, hint, prefix, password, style, ...input }) => {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.row, focused && styles.rowFocused, !!error && styles.rowError]}>
        {prefix && (
          <View style={styles.prefixBox}>
            <Text style={styles.prefix}>{prefix}</Text>
          </View>
        )}
        <TextInput
          {...input}
          style={[styles.input, style]}
          placeholderTextColor={colors.placeholder}
          secureTextEntry={password ? hidden : input.secureTextEntry}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          onFocus={(e) => { setFocused(true); input.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); input.onBlur?.(e); }}
        />
        {password && (
          <TouchableOpacity onPress={() => setHidden((h) => !h)} accessibilityRole="button" accessibilityLabel={hidden ? 'Show password' : 'Hide password'} style={styles.toggle}>
            <Icon name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {error ? (
        <View style={styles.msgRow}>
          <Icon name="alert-circle-outline" size={14} color={colors.danger} />
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
};

/** Checklist for password rules. */
export const RuleList: React.FC<{ rules: { label: string; ok: boolean }[] }> = ({ rules }) => {
  const { colors } = useTheme();
  return (
    <View style={{ marginTop: 8, gap: 4 }}>
      {rules.map((r) => (
        <View key={r.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name={r.ok ? 'check-circle' : 'circle-outline'} size={14} color={r.ok ? colors.success : colors.textMuted} />
          <Text style={{ fontSize: 12, fontFamily: font.regular, color: r.ok ? colors.success : colors.textMuted }}>{r.label}</Text>
        </View>
      ))}
    </View>
  );
};

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    wrap: { marginTop: 14 },
    label: { color: c.text, fontFamily: font.semibold, fontSize: 13, marginBottom: 6 },
    row: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg, borderRadius: 10, borderWidth: 1, borderColor: c.inputBorder, minHeight: 48 },
    rowFocused: { borderColor: c.primary },
    rowError: { borderColor: c.danger },
    prefixBox: { alignSelf: 'stretch', justifyContent: 'center', paddingHorizontal: 12, borderRightWidth: 1, borderRightColor: c.border, backgroundColor: c.surface2, borderTopLeftRadius: 10, borderBottomLeftRadius: 10 },
    prefix: { color: c.textSecondary, fontFamily: font.semibold, fontSize: 15 },
    input: { flex: 1, color: c.text, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, fontFamily: font.regular },
    toggle: { paddingHorizontal: 12, paddingVertical: 10 },
    msgRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
    error: { flex: 1, color: c.danger, fontSize: 12, fontFamily: font.medium },
    hint: { color: c.textMuted, fontSize: 12, marginTop: 6, fontFamily: font.regular },
  });
