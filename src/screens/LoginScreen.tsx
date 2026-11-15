import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchApi, AuthTokens } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { FormField } from '../components/FormField';
import { fieldErrors, validate } from '../utils/validation';
import { Colors, useTheme, useThemedStyles } from '../theme/ThemeContext';

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
      navigation.popTo('Home');
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.title}>Sign in</Text>
            {formError && (
              <View style={styles.alert}>
                <Text style={styles.alertText}>{formError.message}</Text>
                {formError.code === 'ACCOUNT_LOCKED' && (
                  <Text style={styles.alertLink} onPress={() => navigation.navigate('ForgotPassword', { identifier })}>Reset your password →</Text>
                )}
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const makeStyles = (c: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: c.surface, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: c.border },
  title: { fontSize: 24, fontWeight: '700', color: c.text, marginBottom: 8, textAlign: 'center' },
  alert: { backgroundColor: c.dangerSoft, borderRadius: 8, padding: 12, marginTop: 8 },
  alertText: { color: c.danger, fontSize: 14 },
  alertLink: { color: c.primary, fontWeight: '700', marginTop: 6 },
  forgot: { alignSelf: 'flex-end', marginTop: 10 },
  button: { backgroundColor: c.primary, borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 20 },
  buttonText: { color: c.onPrimary, fontWeight: '600', fontSize: 16 },
  linkButton: { marginTop: 16, alignItems: 'center' },
  linkText: { color: c.primary, fontSize: 14 },
});
