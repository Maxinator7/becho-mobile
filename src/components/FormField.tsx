import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';
import { Colors, useTheme, useThemedStyles } from '../theme/ThemeContext';

interface Props extends TextInputProps {
  label: string;
  error?: string | null;
  hint?: string;
  /** Text shown before the input, e.g. "+91". */
  prefix?: string;
  /** Adds a Show/Hide toggle for passwords. */
  password?: boolean;
}

export const FormField: React.FC<Props> = ({ label, error, hint, prefix, password, style, ...input }) => {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const [hidden, setHidden] = useState(true);
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.row, !!error && styles.rowError]}>
        {prefix && <Text style={styles.prefix}>{prefix}</Text>}
        <TextInput
          {...input}
          style={[styles.input, style]}
          placeholderTextColor={colors.placeholder}
          secureTextEntry={password ? hidden : input.secureTextEntry}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
        />
        {password && (
          <TouchableOpacity onPress={() => setHidden((h) => !h)} accessibilityRole="button" accessibilityLabel={hidden ? 'Show password' : 'Hide password'} style={styles.toggle}>
            <Text style={styles.toggleText}>{hidden ? 'Show' : 'Hide'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
};

/** ✓/• checklist for password rules. */
export const RuleList: React.FC<{ rules: { label: string; ok: boolean }[] }> = ({ rules }) => {
  const { colors } = useTheme();
  return (
    <View style={{ marginTop: 6, gap: 2 }}>
      {rules.map((r) => (
        <Text key={r.label} style={{ fontSize: 12, color: r.ok ? colors.success : colors.textMuted }}>
          {r.ok ? '✓' : '•'} {r.label}
        </Text>
      ))}
    </View>
  );
};

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    wrap: { marginTop: 12 },
    label: { color: c.textSecondary, fontSize: 14, marginBottom: 6 },
    row: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg, borderRadius: 8, borderWidth: 1, borderColor: c.inputBorder },
    rowError: { borderColor: c.danger },
    prefix: { color: c.textSecondary, paddingLeft: 12, fontSize: 15 },
    input: { flex: 1, color: c.text, padding: 12, fontSize: 15 },
    toggle: { paddingHorizontal: 12, paddingVertical: 10 },
    toggleText: { color: c.primary, fontWeight: '600', fontSize: 13 },
    error: { color: c.danger, fontSize: 12, marginTop: 4 },
    hint: { color: c.textMuted, fontSize: 12, marginTop: 4 },
  });
