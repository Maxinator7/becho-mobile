import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, font, useTheme, useThemedStyles } from '../theme/ThemeContext';
import { Tone } from '../utils/listing';

export type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Outlined icon set used across the app (Material Community Icons). */
export const Icon: React.FC<{ name: IconName | string; size?: number; color?: string; style?: StyleProp<TextStyle>; accessibilityLabel?: string }> = ({
  name,
  size = 20,
  color,
  style,
  accessibilityLabel,
}) => {
  const { colors } = useTheme();
  return (
    <MaterialCommunityIcons
      name={name as IconName}
      size={size}
      color={color ?? colors.text}
      style={style}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={!accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
    />
  );
};

export function toneColors(c: Colors, tone: Tone) {
  switch (tone) {
    case 'success':
      return { fg: c.success, bg: c.successSoft, border: c.successSoftBorder };
    case 'warning':
      return { fg: c.warning, bg: c.warningSoft, border: c.warningSoftBorder };
    case 'danger':
      return { fg: c.danger, bg: c.dangerSoft, border: c.dangerSoftBorder };
    case 'primary':
      return { fg: c.primaryText, bg: c.primarySoft, border: c.primarySoftBorder };
    default:
      return { fg: c.textSecondary, bg: c.surface2, border: c.border };
  }
}

/** Uppercase status pill, e.g. UNDER REVIEW / LIVE & VERIFIED. */
export const Chip: React.FC<{ label: string; tone?: Tone; icon?: IconName; uppercase?: boolean; style?: StyleProp<ViewStyle> }> = ({
  label,
  tone = 'neutral',
  icon,
  uppercase = true,
  style,
}) => {
  const { colors } = useTheme();
  const t = toneColors(colors, tone);
  return (
    <View style={[chipStyles.chip, { backgroundColor: t.bg, borderColor: t.border }, style]}>
      {icon && <Icon name={icon} size={12} color={t.fg} />}
      <Text style={[chipStyles.text, { color: t.fg }, uppercase && chipStyles.upper]} numberOfLines={1}>
        {uppercase ? label.toUpperCase() : label}
      </Text>
    </View>
  );
};

const chipStyles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  text: { fontFamily: font.semibold, fontSize: 11 },
  upper: { fontSize: 10, letterSpacing: 0.6 },
});

type ButtonVariant = 'primary' | 'outline' | 'strong' | 'soft' | 'danger' | 'ghost';

export const Button: React.FC<{
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  size?: 'md' | 'sm';
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}> = ({ title, onPress, variant = 'primary', icon, iconRight, loading, disabled, size = 'md', style, accessibilityLabel }) => {
  const { colors } = useTheme();
  const palette: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary },
    strong: { bg: colors.strongButton, fg: '#FFFFFF', border: colors.strongButton },
    outline: { bg: colors.surface, fg: colors.text, border: colors.borderStrong },
    soft: { bg: colors.primarySoft, fg: colors.primaryText, border: colors.primarySoft },
    danger: { bg: colors.danger, fg: '#FFFFFF', border: colors.danger },
    ghost: { bg: 'transparent', fg: colors.primaryText, border: 'transparent' },
  };
  const p = palette[variant];
  const small = size === 'sm';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!(disabled || loading) }}
      activeOpacity={0.8}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          backgroundColor: p.bg,
          borderColor: p.border,
          borderWidth: 1,
          borderRadius: small ? 8 : 10,
          paddingHorizontal: small ? 12 : 16,
          minHeight: small ? 36 : 48,
          opacity: disabled ? 0.55 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <>
          {icon && <Icon name={icon} size={small ? 16 : 18} color={p.fg} />}
          <Text style={{ color: p.fg, fontFamily: font.semibold, fontSize: small ? 13 : 15 }} numberOfLines={1}>
            {title}
          </Text>
          {iconRight && <Icon name={iconRight} size={small ? 16 : 18} color={p.fg} />}
        </>
      )}
    </TouchableOpacity>
  );
};

/** Round icon-only button (back, share, close…). */
export const IconButton: React.FC<{
  name: IconName;
  onPress?: () => void;
  label: string;
  size?: number;
  color?: string;
  filled?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}> = ({ name, onPress, label, size = 22, color, filled, style, children }) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={[
        { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
        filled && { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
        style,
      ]}
    >
      <Icon name={name} size={size} color={color ?? colors.text} />
      {children}
    </TouchableOpacity>
  );
};

/** Back arrow + title header for stack screens. */
export const ScreenHeader: React.FC<{ title: string; onBack?: () => void; right?: React.ReactNode; backIcon?: IconName }> = ({
  title,
  onBack,
  right,
  backIcon = 'arrow-left',
}) => {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.header}>
      {onBack ? <IconButton name={backIcon} label="Back" onPress={onBack} /> : <View style={{ width: 8 }} />}
      <Text style={styles.headerTitle} numberOfLines={1} accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.headerRight}>{right}</View>
    </View>
  );
};

export const Avatar: React.FC<{ name?: string | null; size?: number; style?: StyleProp<ViewStyle> }> = ({ name, size = 40, style }) => {
  const { colors } = useTheme();
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?';
  return (
    <View
      style={[
        { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primarySoftBorder, alignItems: 'center', justifyContent: 'center' },
        style,
      ]}
    >
      <Text style={{ color: colors.primaryText, fontFamily: font.heading, fontSize: size * 0.42 }}>{initial}</Text>
    </View>
  );
};

export const Card: React.FC<{ children: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({ children, style }) => {
  const styles = useThemedStyles(makeStyles);
  return <View style={[styles.card, style]}>{children}</View>;
};

export const Overline: React.FC<{ children: React.ReactNode; color?: string; style?: StyleProp<TextStyle> }> = ({ children, color, style }) => {
  const { colors } = useTheme();
  return <Text style={[{ fontFamily: font.semibold, fontSize: 11, letterSpacing: 0.7, color: color ?? colors.textMuted, textTransform: 'uppercase' }, style]}>{children}</Text>;
};

export const SectionTitle: React.FC<{ title: string; subtitle?: string; action?: string; onAction?: () => void; style?: StyleProp<ViewStyle> }> = ({
  title,
  subtitle,
  action,
  onAction,
  style,
}) => {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.sectionRow, style]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text style={styles.sectionSub}>{subtitle}</Text> : null}
      </View>
      {action && onAction ? (
        <TouchableOpacity onPress={onAction} accessibilityRole="button" hitSlop={8}>
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

export const EmptyState: React.FC<{ icon: IconName; title: string; body?: string; action?: React.ReactNode }> = ({ icon, title, body, action }) => {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={28} color={colors.primaryText} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
      {action}
    </View>
  );
};

/** Tinted info box (tips, staff remarks, notices). */
export const Notice: React.FC<{ tone?: Tone; icon?: IconName; title?: string; children?: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({
  tone = 'primary',
  icon = 'information-outline',
  title,
  children,
  style,
}) => {
  const { colors } = useTheme();
  const t = toneColors(colors, tone);
  return (
    <View style={[{ flexDirection: 'row', gap: 10, padding: 12, borderRadius: 10, backgroundColor: t.bg, borderWidth: 1, borderColor: t.border }, style]}>
      <Icon name={icon} size={18} color={t.fg} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: 2 }}>
        {title ? <Text style={{ fontFamily: font.semibold, fontSize: 13, color: t.fg }}>{title}</Text> : null}
        {typeof children === 'string' ? <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: colors.textSecondary }}>{children}</Text> : children}
      </View>
    </View>
  );
};

/** Bottom sheet shell used by pickers and forms. */
export const sheetStyles = (c: Colors) =>
  StyleSheet.create({
    overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
    sheet: { backgroundColor: c.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32, maxHeight: '85%' },
    handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: c.borderStrong, marginBottom: 14 },
    titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    title: { fontFamily: font.heading, fontSize: 18, color: c.text },
  });

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 56, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border },
    headerTitle: { flex: 1, fontFamily: font.heading, fontSize: 18, color: c.text },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 4 },
    card: { backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: c.border, padding: 16 },
    sectionRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
    sectionTitle: { fontFamily: font.heading, fontSize: 18, color: c.text },
    sectionSub: { fontFamily: font.regular, fontSize: 13, color: c.textMuted, marginTop: 2 },
    sectionAction: { fontFamily: font.semibold, fontSize: 13, color: c.primaryText },
    empty: { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
    emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    emptyTitle: { fontFamily: font.heading, fontSize: 16, color: c.text, textAlign: 'center' },
    emptyBody: { fontFamily: font.regular, fontSize: 14, color: c.textMuted, textAlign: 'center', lineHeight: 20 },
  });
