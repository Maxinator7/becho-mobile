import React, { useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';
import { Colors, font, useTheme, useThemedStyles } from '../theme/ThemeContext';
import { Icon, IconName } from './ui';

/** The field row already shows focus, so drop the browser's own outline in the web preview. */
const WEB_NO_OUTLINE = { outlineStyle: 'none' } as object;

interface Props extends TextInputProps {
  label: string;
  error?: string | null;
  hint?: string;
  /** Text shown before the input, e.g. "+91". */
  prefix?: string;
  /** Adds a show/hide toggle for passwords. */
  password?: boolean;
  /** Outlined icon inside the field, on the left. */
  icon?: IconName;
  /** Small text right of the label, e.g. "As per ID". */
  labelRight?: string;
  /** Shows a green tick at the end of the field (e.g. passwords match). */
  valid?: boolean;
}

export const FormField: React.FC<Props> = ({ label, error, hint, prefix, password, icon, labelRight, valid, style, ...input }) => {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {labelRight ? <Text style={styles.labelRight}>{labelRight}</Text> : null}
      </View>
      <View style={[styles.row, focused && styles.rowFocused, !!error && styles.rowError]}>
        {icon && <Icon name={icon} size={20} color={colors.textMuted} style={{ marginLeft: 12 }} />}
        {prefix && (
          <View style={styles.prefixBox}>
            <Text style={styles.prefix}>{prefix}</Text>
          </View>
        )}
        <TextInput
          {...input}
          style={[styles.input, Platform.OS === 'web' && WEB_NO_OUTLINE, style]}
          placeholderTextColor={colors.placeholder}
          secureTextEntry={password ? hidden : input.secureTextEntry}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          onFocus={(e) => { setFocused(true); input.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); input.onBlur?.(e); }}
        />
        {valid && <Icon name="check-circle" size={20} color={colors.success} style={{ marginRight: password ? 0 : 12 }} accessibilityLabel="Looks good" />}
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

/** Six boxes over one hidden input, so paste and SMS/email autofill still work. */
export const OtpInput: React.FC<{ value: string; onChange: (v: string) => void; error?: string | null; autoFocus?: boolean }> = ({ value, onChange, error, autoFocus }) => {
  const styles = useThemedStyles(makeStyles);
  const [focused, setFocused] = useState(false);
  return (
    <View>
      <View style={styles.otpRow}>
        {Array.from({ length: 6 }).map((_, i) => {
          const active = focused && (i === value.length || (i === 5 && value.length === 6));
          return (
            <View key={i} style={[styles.otpBox, active && styles.otpBoxActive, !!error && styles.rowError]}>
              <Text style={styles.otpDigit}>{value[i] ?? ''}</Text>
            </View>
          );
        })}
        <TextInput
          value={value}
          onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          caretHidden
          style={[styles.otpHidden, Platform.OS === 'web' && WEB_NO_OUTLINE]}
          accessibilityLabel="6-digit code"
        />
      </View>
      {error ? (
        <View style={[styles.msgRow, { justifyContent: 'center' }]}>
          <Icon name="alert-circle-outline" size={14} color="#BA1A1A" />
          <Text style={[styles.error, { flex: 0 }]}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
};

/** Four-segment strength bar (Weak → Strong) shown under a new password. */
export const StrengthMeter: React.FC<{ password: string }> = ({ password: v }) => {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const score = !v ? 0 : [v.length >= 8, /[A-Za-z]/.test(v) && /\d/.test(v), /[a-z]/.test(v) && /[A-Z]/.test(v), /[^A-Za-z0-9]/.test(v) || v.length >= 12].filter(Boolean).length;
  const label = ['', 'Weak', 'Fair', 'Good', 'Strong'][score];
  const color = score <= 1 ? colors.danger : score === 2 ? colors.warning : colors.successFill;
  return (
    <View style={styles.strength}>
      <View style={styles.strengthHead}>
        <Text style={styles.strengthTitle}>PASSWORD STRENGTH</Text>
        {label ? <Text style={[styles.strengthLabel, { color }]}>{label}</Text> : null}
      </View>
      <View style={styles.strengthBars}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={[styles.strengthBar, i <= score && { backgroundColor: color }]} />
        ))}
      </View>
    </View>
  );
};

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    wrap: { marginTop: 14 },
    labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    label: { color: c.text, fontFamily: font.semibold, fontSize: 13 },
    labelRight: { color: c.textMuted, fontFamily: font.regular, fontSize: 12 },
    row: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg, borderRadius: 10, borderWidth: 1, borderColor: c.inputBorder, minHeight: 50 },
    rowFocused: { borderColor: c.primary },
    rowError: { borderColor: c.danger },
    prefixBox: { alignSelf: 'stretch', justifyContent: 'center', paddingHorizontal: 12, borderRightWidth: 1, borderRightColor: c.border, backgroundColor: c.surface2, borderTopLeftRadius: 10, borderBottomLeftRadius: 10 },
    prefix: { color: c.textSecondary, fontFamily: font.semibold, fontSize: 15 },
    input: { flex: 1, color: c.text, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, fontFamily: font.regular },
    toggle: { paddingHorizontal: 12, paddingVertical: 10 },
    msgRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
    error: { flex: 1, color: c.danger, fontSize: 12, fontFamily: font.medium },
    hint: { color: c.textMuted, fontSize: 12, marginTop: 6, fontFamily: font.regular },
    otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
    otpBox: { width: 46, height: 56, borderRadius: 10, backgroundColor: c.inputBg, borderWidth: 1, borderColor: c.inputBorder, alignItems: 'center', justifyContent: 'center' },
    otpBoxActive: { borderColor: c.primary, borderWidth: 2, backgroundColor: c.surface },
    otpDigit: { fontFamily: font.headingX, fontSize: 24, color: c.text },
    otpHidden: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.011, color: 'transparent', fontSize: 1, backgroundColor: 'transparent', borderWidth: 0 },
    strength: { marginTop: 10, padding: 12, borderRadius: 10, backgroundColor: c.surface2 },
    strengthHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    strengthTitle: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 0.6, color: c.textMuted },
    strengthLabel: { fontFamily: font.bold, fontSize: 12 },
    strengthBars: { flexDirection: 'row', gap: 6 },
    strengthBar: { flex: 1, height: 5, borderRadius: 3, backgroundColor: c.border },
  });
