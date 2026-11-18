import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useBeta } from '../context/BetaContext';
import { Colors, font, useTheme, useThemedStyles } from '../theme/ThemeContext';
import { openPrivacy } from '../utils/beta';
import { Icon, IconButton } from './ui';

/** Slim "this is a beta" strip under the top bar; closed for the rest of the session with ×. */
export const BetaBanner: React.FC = () => {
  const { bannerDismissed, dismissBanner, openFeedback } = useBeta();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  if (bannerDismissed) return null;

  return (
    <View style={styles.bar} accessibilityRole="summary">
      <View style={styles.pill}>
        <Text style={styles.pillText}>BETA</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.text} accessibilityLabel="Beta. Early version — data may be reset.">
          Early version — data may be reset.
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => openFeedback()} accessibilityRole="button" accessibilityLabel="Send feedback" hitSlop={8} style={styles.action}>
            <Icon name="message-draw" size={14} color={colors.primaryText} />
            <Text style={styles.actionText}>Feedback</Text>
          </TouchableOpacity>
          <Text style={styles.dot}>·</Text>
          <TouchableOpacity onPress={() => void openPrivacy()} accessibilityRole="link" accessibilityLabel="Beta terms and privacy notice" hitSlop={8} style={styles.action}>
            <Icon name="shield-check-outline" size={14} color={colors.primaryText} />
            <Text style={styles.actionText}>Terms & privacy</Text>
          </TouchableOpacity>
        </View>
      </View>
      <IconButton name="close" size={18} label="Hide beta notice" color={colors.textMuted} onPress={dismissBanner} style={styles.close} />
    </View>
  );
};

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    bar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 16, paddingRight: 6, paddingVertical: 6, backgroundColor: c.accentSoft, borderBottomWidth: 1, borderBottomColor: c.border },
    pill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: c.accent },
    pillText: { fontFamily: font.bold, fontSize: 10, letterSpacing: 0.7, color: '#FFFFFF' },
    body: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 10, rowGap: 2 },
    text: { fontFamily: font.medium, fontSize: 12, color: c.text },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    action: { flexDirection: 'row', alignItems: 'center', gap: 3, minHeight: 24 },
    actionText: { fontFamily: font.semibold, fontSize: 12, color: c.primaryText },
    dot: { fontSize: 12, color: c.textMuted },
    close: { width: 32, height: 32 },
  });
