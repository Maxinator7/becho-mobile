import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchApi, AuthTokens } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { FormField } from '../components/FormField';
import { fieldErrors, validate } from '../utils/validation';
import { Colors, font, useTheme, useThemedStyles } from '../theme/ThemeContext';
import { AuthHeader } from '../components/TopBar';
import { Button, Icon } from '../components/ui';

export const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formError, setFormError] = useState<{ message: string; code?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();

  const handleLogin = async () => {
    const next = { identifier: validate.identifier(identifier), password: password ? null : 'Enter your password' };
    setErrors(next);
    setFormError(null);
    if (next.identifier || next.password) return;

    setLoading(true);
    const res = await fetchApi<{ tokens: AuthTokens; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: identifier.trim(), password }),
    });
    setLoading(false);

    if (res.success && res.data) {
      await login(res.data.tokens, res.data.user);
      // Unverified accounts can browse but not trade, so offer the code screen straight away.
      if (!res.data.user?.emailVerifiedAt) navigation.replace('VerifyEmail', { email: res.data.user?.email });
      else navigation.goBack();
      return;
    }
    if (res.error?.code === 'VALIDATION_ERROR') {
      setErrors(fieldErrors(res.error.details));
      return;
    }
    if (res.error?.code === 'INVALID_CREDENTIALS') setPassword('');
    setFormError({ message: res.error?.message || 'Sign in failed. Please try again.', code: res.error?.code });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <AuthHeader title="Login" onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <View style={styles.eyebrow}>
              <View style={styles.eyebrowDot} />
              <Text style={styles.eyebrowText}>INDIA'S LOCAL MARKETPLACE</Text>
            </View>
            <Text style={styles.title}>Welcome back to Becho</Text>
            <Text style={styles.subtitle}>Buy and sell safely with people near you who have verified their email.</Text>
          </View>

          <View style={styles.card}>
            {formError && (
              <View style={styles.alert}>
                <Icon name="alert-circle-outline" size={18} color={colors.danger} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertText}>{formError.message}</Text>
                  {formError.code === 'ACCOUNT_LOCKED' && (
                    <Text style={styles.alertLink} onPress={() => navigation.navigate('ForgotPassword', { identifier })}>Reset your password →</Text>
                  )}
                </View>
              </View>
            )}

            <FormField
              label="Email, mobile number, or user code"
              icon="at"
              placeholder="you@example.com, 98765 43210…"
              value={identifier}
              onChangeText={(t) => { setIdentifier(t); if (errors.identifier) setErrors({ ...errors, identifier: null }); }}
              onBlur={() => identifier && setErrors({ ...errors, identifier: validate.identifier(identifier) })}
              error={errors.identifier}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              returnKeyType="next"
            />
            <FormField
              label="Password"
              icon="lock-outline"
              placeholder="Enter your password"
              value={password}
              onChangeText={(t) => { setPassword(t); if (errors.password) setErrors({ ...errors, password: null }); }}
              error={errors.password}
              password
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={handleLogin}
            />

            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword', { identifier })} style={styles.forgot} accessibilityRole="button">
              <Text style={styles.linkText}>Forgot password?</Text>
            </TouchableOpacity>

            <Button title="Sign In" iconRight="arrow-right" onPress={handleLogin} loading={loading} style={{ marginTop: 16 }} />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.linkText}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.trust}>
            <View style={styles.trustIcon}>
              <Icon name="shield-check" size={18} color={colors.primaryText} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.trustTitle}>SAFE & AUTHENTIC</Text>
              <Text style={styles.trustText}>Every member verifies their email before they can chat, make offers or sell. Staff check listings marked "Verified by Becho".</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const makeStyles = (c: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  scroll: { flexGrow: 1, padding: 16, paddingBottom: 32 },
  hero: { alignItems: 'center', marginTop: 8, marginBottom: 18 },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: c.primarySoft },
  eyebrowDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.accent },
  eyebrowText: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.6, color: c.primaryText },
  title: { fontSize: 25, fontFamily: font.headingX, color: c.text, marginTop: 12, textAlign: 'center' },
  subtitle: { fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: c.textSecondary, textAlign: 'center', marginTop: 6, paddingHorizontal: 12 },
  card: { backgroundColor: c.surface, borderRadius: 14, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 2, borderWidth: 1, borderColor: c.border },
  alert: { flexDirection: 'row', gap: 8, backgroundColor: c.dangerSoft, borderWidth: 1, borderColor: c.dangerSoftBorder, borderRadius: 10, padding: 12, marginTop: 14 },
  alertText: { color: c.danger, fontSize: 14, fontFamily: font.medium },
  alertLink: { color: c.primaryText, fontFamily: font.semibold, marginTop: 6 },
  forgot: { alignSelf: 'flex-end', marginTop: 12 },
  linkText: { color: c.primaryText, fontSize: 14, fontFamily: font.semibold },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: 24 },
  switchText: { fontFamily: font.regular, fontSize: 15, color: c.textSecondary },
  trust: { flexDirection: 'row', gap: 12, marginTop: 24, padding: 14, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  trustIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
  trustTitle: { fontFamily: font.bold, fontSize: 12, letterSpacing: 0.5, color: c.text },
  trustText: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: c.textSecondary, marginTop: 2 },
});
