import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors, font, useTheme, useThemedStyles } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useCity } from '../context/CityContext';
import { NotificationBell } from './NotificationBell';
import { LocationModal } from './LocationModal';
import { Icon } from './ui';
import { FeedbackButton } from './FeedbackButton';
import { useBeta } from '../context/BetaContext';

/** Becho logo mark + wordmark. */
export const Logo: React.FC = () => {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  return (
    <View style={styles.logo} accessibilityRole="header" accessibilityLabel="Becho">
      <View style={styles.mark}>
        <Text style={styles.markText}>B</Text>
      </View>
      <Text style={styles.wordmark}>Becho</Text>
    </View>
  );
};

/** Header for sign-in screens: back · "B" mark · title (Stitch 04/20/16/03). */
export const AuthHeader: React.FC<{ title: string; onBack?: () => void }> = ({ title, onBack }) => {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  return (
    <View style={styles.authBar}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} style={styles.authBack}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
      ) : null}
      <View style={styles.mark}>
        <Text style={styles.markText}>B</Text>
      </View>
      <Text style={styles.authTitle} accessibilityRole="header" numberOfLines={1}>{title}</Text>
    </View>
  );
};

/**
 * Main top bar: logo · city pill · bell · avatar (or Sign in).
 * The beta banner below it carries the Feedback action; once the banner is closed a feedback button
 * takes its place here so feedback stays one tap away.
 */
export const TopBar: React.FC = () => {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { area, setArea } = useCity();
  const [picker, setPicker] = useState(false);
  const { bannerDismissed } = useBeta();

  return (
    <View style={styles.bar}>
      <Logo />
      <TouchableOpacity style={styles.cityPill} onPress={() => setPicker(true)} accessibilityRole="button" accessibilityLabel={`City: ${area?.cityName ?? 'All cities'}. Change city`}>
        <Icon name="map-marker-outline" size={16} color={colors.primaryText} />
        <Text style={styles.cityText} numberOfLines={1}>{(area?.cityName ?? 'All cities').toUpperCase()}</Text>
        <Icon name="chevron-down" size={16} color={colors.textMuted} />
      </TouchableOpacity>
      <View style={styles.right}>
        {bannerDismissed && <FeedbackButton />}
        {user ? (
          <>
            <NotificationBell onPress={() => navigation.navigate('Notifications')} />
            <TouchableOpacity onPress={() => navigation.navigate('Tabs', { screen: 'Account' })} accessibilityRole="button" accessibilityLabel="My account">
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user.displayName.trim().charAt(0).toUpperCase() || '?'}</Text>
              </View>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.signIn} onPress={() => navigation.navigate('Login')} accessibilityRole="button">
            <Text style={styles.signInText}>Sign in</Text>
          </TouchableOpacity>
        )}
      </View>
      <LocationModal visible={picker} onClose={() => setPicker(false)} selectedCity={area?.cityName ?? 'All cities'} onSelectCity={setArea} />
    </View>
  );
};

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    bar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border },
    logo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    mark: { width: 28, height: 28, borderRadius: 8, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
    markText: { fontFamily: font.headingX, fontSize: 16, color: '#FFFFFF', marginTop: -1 },
    wordmark: { fontFamily: font.headingX, fontSize: 21, color: c.primaryText, letterSpacing: -0.3 },
    cityPill: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 36, borderRadius: 10, backgroundColor: c.surface2, marginLeft: 4 },
    cityText: { flexShrink: 1, fontFamily: font.semibold, fontSize: 12, letterSpacing: 0.4, color: c.text },
    authBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, height: 60, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border },
    authBack: { width: 32, height: 40, justifyContent: 'center' },
    authTitle: { flex: 1, fontFamily: font.heading, fontSize: 19, color: c.text },
    avatar: { width: 36, height: 36, borderRadius: 10, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
    avatarText: { fontFamily: font.heading, fontSize: 16, color: c.onPrimary },
    right: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 },
    signIn: { backgroundColor: c.primary, paddingHorizontal: 14, height: 34, borderRadius: 8, justifyContent: 'center' },
    signInText: { color: c.onPrimary, fontFamily: font.semibold, fontSize: 13 },
  });
