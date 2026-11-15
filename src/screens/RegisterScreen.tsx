import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchApi, AuthTokens } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { FormField, RuleList } from '../components/FormField';
import { fieldErrors, passwordRules, validate } from '../utils/validation';
import { Colors, font, useTheme, useThemedStyles } from '../theme/ThemeContext';
import { Logo } from '../components/TopBar';
import { Icon, IconButton } from '../components/ui';
import { StackActions } from '@react-navigation/native';

interface RegisterResult {
  tokens: AuthTokens;
  user: any;
  otpSentTo?: string;
  verificationMessage: string;
  devOtp?: string;
}

const RESEND_SECONDS = 60;

export const RegisterScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [form, setForm] = useState({ displayName: '', phone: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState<{ to?: string; devOtp?: string } | null>(null);
  const [otp, setOtp] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const { login } = useAuth();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const set = (key: keyof typeof form) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: null }));
  };

  const check = () => {
    const next = {
      displayName: validate.name(form.displayName),
      phone: validate.mobile(form.phone),
      email: validate.email(form.email),
      password: validate.password(form.password),
      confirm: form.confirm === form.password ? null : 'Passwords do not match',
    };
    setErrors(next);
    return Object.values(next).every((v) => !v);
  };

  const handleRegister = async () => {
    setFormError(null);
    if (!check()) return;
    setLoading(true);
    const res = await fetchApi<RegisterResult>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ displayName: form.displayName.trim(), phone: form.phone, email: form.email.trim(), password: form.password }),
    });
    setLoading(false);
    if (res.success && res.data) {
      await login(res.data.tokens, res.data.user);
      setSent({ to: res.data.otpSentTo, devOtp: res.data.devOtp });
      setCooldown(RESEND_SECONDS);
      return;
    }
    if (res.error?.code === 'VALIDATION_ERROR') setErrors(fieldErrors(res.error.details));
    else if (res.error?.code === 'PHONE_TAKEN') setErrors({ phone: res.error.message });
    else if (res.error?.code === 'EMAIL_TAKEN') setErrors({ email: res.error.message });
    else setFormError(res.error?.message || 'Registration failed. Please try again.');
  };

  const handleVerify = async () => {
    const err = validate.otp(otp);
    setErrors({ otp: err });
    if (err) return;
    setLoading(true);
    const res = await fetchApi<{ tokens: AuthTokens; user: any }>('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ code: otp.trim() }) });
    setLoading(false);
    if (res.success && res.data) {
      await login(res.data.tokens, res.data.user);
      navigation.dispatch(StackActions.popToTop());
    } else {
      setErrors({ otp: res.error?.message || 'Verification failed' });
    }
  };

  const handleResend = async () => {
    const res = await fetchApi<{ otpSentTo?: string; devOtp?: string }>('/auth/resend-otp', { method: 'POST' });
    if (res.success && res.data) {
      setSent({ to: res.data.otpSentTo ?? sent?.to, devOtp: res.data.devOtp });
      setCooldown(RESEND_SECONDS);
      setErrors({});
    } else {
      setErrors({ otp: res.error?.message || 'Could not resend the code' });
    }
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
            <Text style={styles.title}>{sent ? 'Verify your email' : 'Create account'}</Text>
            {formError && <Text style={styles.errorText}>{formError}</Text>}

            {!sent ? (
              <>
                <FormField label="Full name" placeholder="Aarav Sharma" value={form.displayName} onChangeText={set('displayName')} error={errors.displayName} autoComplete="name" textContentType="name" />
                <FormField
                  label="Mobile number"
                  prefix="+91"
                  placeholder="98765 43210"
                  value={form.phone}
                  onChangeText={(t) => set('phone')(t.replace(/[^\d ]/g, ''))}
                  error={errors.phone}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  maxLength={11}
                  hint="Your mobile number is your account's unique identifier"
                />
                <FormField label="Email" placeholder="you@example.com" value={form.email} onChangeText={set('email')} error={errors.email} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" hint="We'll email you a code to verify your account" />
                <FormField label="Password" placeholder="Create a password" value={form.password} onChangeText={set('password')} error={errors.password} password autoComplete="new-password" textContentType="newPassword" />
                <RuleList rules={passwordRules(form.password)} />
                <FormField label="Confirm password" placeholder="Type it again" value={form.confirm} onChangeText={set('confirm')} error={errors.confirm} password autoComplete="new-password" textContentType="newPassword" />

                <TouchableOpacity style={[styles.button, loading && { opacity: 0.7 }]} onPress={handleRegister} disabled={loading}>
                  {loading ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.buttonText}>Create account</Text>}
                </TouchableOpacity>
                {errors.phone?.includes('already registered') || errors.email?.includes('already registered') ? (
                  <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword', { identifier: form.email || form.phone })} style={styles.linkButton}>
                    <Text style={styles.linkText}>Forgot your password?</Text>
                  </TouchableOpacity>
                ) : null}
              </>
            ) : (
              <>
                <Text style={styles.info}>We sent a 6-digit code to {sent.to ?? 'your email'}. It expires in 15 minutes.</Text>
                {sent.devOtp && <Text style={styles.devOtp}>Test code: {sent.devOtp}</Text>}
                <FormField
                  label="Verification code"
                  placeholder="123456"
                  value={otp}
                  onChangeText={(t) => { setOtp(t.replace(/\D/g, '')); setErrors({}); }}
                  error={errors.otp}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  style={{ textAlign: 'center', fontSize: 20, letterSpacing: 6 }}
                />
                <TouchableOpacity style={[styles.button, loading && { opacity: 0.7 }]} onPress={handleVerify} disabled={loading}>
                  {loading ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.buttonText}>Verify</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={handleResend} disabled={cooldown > 0} style={styles.linkButton}>
                  <Text style={[styles.linkText, cooldown > 0 && { color: colors.textMuted }]}>
                    {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {!sent && (
              <TouchableOpacity onPress={() => navigation.popTo('Login')} style={styles.linkButton}>
                <Text style={styles.linkText}>Already have an account? Sign in</Text>
              </TouchableOpacity>
            )}
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
