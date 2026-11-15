import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors, font, useTheme, useThemedStyles } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useCity } from '../context/CityContext';
import { NotificationBell } from './NotificationBell';
import { LocationModal } from './LocationModal';
import { Avatar, Icon } from './ui';

/** Becho logo mark + wordmark. */
export const Logo: React.FC = () => {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  return (
    <View style={styles.logo} accessibilityRole="header" accessibilityLabel="Becho">
      <View style={styles.mark}>
        <Icon name="tag-outline" size={16} color={colors.onPrimary} />
      </View>
      <Text style={styles.wordmark}>Becho</Text>
    </View>
  );
};

/** Main top bar: logo · city pill · bell · avatar (or Sign in). */
export const TopBar: React.FC = () => {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { area, setArea } = useCity();
  const [picker, setPicker] = useState(false);

  return (
    <View style={styles.bar}>
      <Logo />
      <TouchableOpacity style={styles.cityPill} onPress={() => setPicker(true)} accessibilityRole="button" accessibilityLabel={`City: ${area?.cityName ?? 'All cities'}. Change city`}>
        <Icon name="map-marker-outline" size={16} color={colors.primaryText} />
        <Text style={styles.cityText} numberOfLines={1}>{area ? `${area.cityName}, ${area.stateCode}` : 'All cities'}</Text>
        <Icon name="chevron-down" size={16} color={colors.textMuted} />
      </TouchableOpacity>
      <View style={styles.right}>
        {user ? (
          <>
            <NotificationBell onPress={() => navigation.navigate('Notifications')} />
            <TouchableOpacity onPress={() => navigation.navigate('Tabs', { screen: 'Account' })} accessibilityRole="button" accessibilityLabel="My account">
              <Avatar name={user.displayName} size={34} />
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
    bar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border },
    logo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    mark: { width: 28, height: 28, borderRadius: 8, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
    wordmark: { fontFamily: font.headingX, fontSize: 21, color: c.primaryText, letterSpacing: -0.3 },
    cityPill: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 34, borderRadius: 999, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border, marginLeft: 4 },
    cityText: { flexShrink: 1, fontFamily: font.semibold, fontSize: 13, color: c.text },
    right: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 },
    signIn: { backgroundColor: c.primary, paddingHorizontal: 14, height: 34, borderRadius: 8, justifyContent: 'center' },
    signInText: { color: c.onPrimary, fontFamily: font.semibold, fontSize: 13 },
  });
