import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchApi } from '../api/client';
import { FormField, RuleList } from '../components/FormField';
import { fieldErrors, passwordRules, validate } from '../utils/validation';
import { Colors, font, useTheme, useThemedStyles } from '../theme/ThemeContext';
import { Logo } from '../components/TopBar';
import { Icon, IconButton } from '../components/ui';

type Step = 'identify' | 'reset' | 'done';
const RESEND_SECONDS = 60;

/** Forgot password: identifier → emailed code + new password → done. */
export const ForgotPasswordScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const [step, setStep] = useState<Step>('identify');
  const [identifier, setIdentifier] = useState<string>(route.params?.identifier ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [info, setInfo] = useState<{ message: string; devOtp?: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const requestCode = async () => {
    const err = validate.identifier(identifier);
    setErrors({ identifier: err });
    if (err) return;
    setLoading(true);
    const res = await fetchApi<{ message: string; otpSentTo?: string; devOtp?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ identifier: identifier.trim() }),
    });
    setLoading(false);
    if (res.success && res.data) {
      setInfo({ message: res.data.message, devOtp: res.data.devOtp });
      setStep('reset');
      setCooldown(RESEND_SECONDS);
    } else if (res.error?.code === 'OTP_COOLDOWN') {
      setStep('reset');
      setInfo({ message: res.error.message });
    } else {
      setErrors(res.error?.code === 'VALIDATION_ERROR' ? fieldErrors(res.error.details) : { identifier: res.error?.message || 'Something went wrong' });
    }
  };

  const reset = async () => {
    const next = {
      code: validate.otp(code),
      newPassword: validate.password(password),
      confirm: confirm === password ? null : 'Passwords do not match',
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    setLoading(true);
    const res = await fetchApi<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ identifier: identifier.trim(), code: code.trim(), newPassword: password }),
    });
    setLoading(false);
    if (res.success) {
      setStep('done');
    } else if (res.error?.code === 'VALIDATION_ERROR') {
      setErrors(fieldErrors(res.error.details));
    } else {
      setErrors({ code: res.error?.message || 'Could not reset your password' });
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
            <Text style={styles.title}>{step === 'done' ? 'Password updated' : 'Reset password'}</Text>

            {step === 'identify' && (
              <>
                <Text style={styles.info}>Enter the email, mobile number or user code of your account. We'll email you a 6-digit code.</Text>
                <FormField
                  label="Email, mobile number or user code"
                  value={identifier}
                  onChangeText={(t) => { setIdentifier(t); setErrors({}); }}
                  error={errors.identifier}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username"
                />
                <TouchableOpacity style={[styles.button, loading && { opacity: 0.7 }]} onPress={requestCode} disabled={loading}>
                  {loading ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.buttonText}>Send code</Text>}
                </TouchableOpacity>
              </>
            )}

            {step === 'reset' && (
              <>
                {info && <Text style={styles.info}>{info.message}</Text>}
                {info?.devOtp && <Text style={styles.devOtp}>Test code: {info.devOtp}</Text>}
                <FormField
                  label="6-digit code"
                  value={code}
                  onChangeText={(t) => { setCode(t.replace(/\D/g, '')); setErrors((e) => ({ ...e, code: null })); }}
                  error={errors.code}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  style={{ textAlign: 'center', fontSize: 20, letterSpacing: 6 }}
                />
                <FormField label="New password" value={password} onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, newPassword: null })); }} error={errors.newPassword} password autoComplete="new-password" textContentType="newPassword" />
                <RuleList rules={passwordRules(password)} />
                <FormField label="Confirm new password" value={confirm} onChangeText={(t) => { setConfirm(t); setErrors((e) => ({ ...e, confirm: null })); }} error={errors.confirm} password autoComplete="new-password" textContentType="newPassword" />
                <TouchableOpacity style={[styles.button, loading && { opacity: 0.7 }]} onPress={reset} disabled={loading}>
                  {loading ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.buttonText}>Set new password</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={requestCode} disabled={cooldown > 0 || loading} style={styles.linkButton}>
                  <Text style={[styles.linkText, cooldown > 0 && { color: colors.textMuted }]}>{cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 'done' && (
              <>
                <Text style={styles.info}>You can now sign in with your new password. You've been signed out on other devices.</Text>
                <TouchableOpacity style={styles.button} onPress={() => navigation.popTo('Login')}>
                  <Text style={styles.buttonText}>Sign in</Text>
                </TouchableOpacity>
              </>
            )}

            {step !== 'done' && (
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.linkButton}>
                <Text style={styles.linkText}>Back to sign in</Text>
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
