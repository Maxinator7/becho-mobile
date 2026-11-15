import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchApi, AuthTokens } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { FormField } from '../components/FormField';
import { fieldErrors, validate } from '../utils/validation';
import { Colors, font, useTheme, useThemedStyles } from '../theme/ThemeContext';
import { Logo } from '../components/TopBar';
import { Icon, IconButton } from '../components/ui';

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
      navigation.goBack();
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
    <SafeAreaView style={styles.container}>
      {navigation.canGoBack() && (
        <View style={{ paddingHorizontal: 8, paddingTop: 4 }}>
          <IconButton name="arrow-left" label="Back" onPress={() => navigation.goBack()} />
        </View>
      )}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <Logo />
            <Text style={styles.tagline}>Buy and sell with verified people near you</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.title}>Sign in</Text>
            <Text style={styles.info}>Welcome back. Use your email, mobile number or user code.</Text>
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
              label="Email, mobile number or user code"
              placeholder="98765 43210 or you@example.com"
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
              placeholder="Your password"
              value={password}
              onChangeText={(t) => { setPassword(t); if (errors.password) setErrors({ ...errors, password: null }); }}
              error={errors.password}
              password
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={handleLogin}
            />

            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword', { identifier })} style={styles.forgot}>
              <Text style={styles.linkText}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, loading && { opacity: 0.7 }]} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.buttonText}>Sign in</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.linkButton}>
              <Text style={styles.linkText}>New to Becho? Create an account</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.trust}>
            <Icon name="shield-check-outline" size={14} color={colors.success} />
            <Text style={styles.trustText}>Everyone on Becho verifies their email before trading</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const makeStyles = (c: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  brand: { alignItems: 'center', marginBottom: 20, gap: 6 },
  tagline: { fontFamily: font.regular, fontSize: 13, color: c.textMuted },
  card: { backgroundColor: c.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: c.border },
  title: { fontSize: 22, fontFamily: font.heading, color: c.text, marginBottom: 4 },
  info: { color: c.textSecondary, marginTop: 4, lineHeight: 20, fontFamily: font.regular, fontSize: 14 },
  devOtp: { color: c.warning, marginTop: 8, fontFamily: font.bold },
  alert: { flexDirection: 'row', gap: 8, backgroundColor: c.dangerSoft, borderWidth: 1, borderColor: c.dangerSoftBorder, borderRadius: 10, padding: 12, marginTop: 10 },
  alertText: { color: c.danger, fontSize: 14, fontFamily: font.medium },
  alertLink: { color: c.primaryText, fontFamily: font.semibold, marginTop: 6 },
  errorText: { color: c.danger, marginTop: 8, fontFamily: font.medium },
  forgot: { alignSelf: 'flex-end', marginTop: 12 },
  button: { backgroundColor: c.primary, borderRadius: 10, minHeight: 48, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  buttonText: { color: c.onPrimary, fontFamily: font.semibold, fontSize: 16 },
  linkButton: { marginTop: 16, alignItems: 'center' },
  linkText: { color: c.primaryText, fontSize: 14, fontFamily: font.semibold },
  trust: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 },
  trustText: { fontFamily: font.regular, fontSize: 12, color: c.textMuted },
});
