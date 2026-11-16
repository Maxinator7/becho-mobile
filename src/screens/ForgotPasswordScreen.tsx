import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchApi } from '../api/client';
import { FormField, OtpInput, RuleList } from '../components/FormField';
import { fieldErrors, passwordRules, validate } from '../utils/validation';
import { Colors, font, useTheme, useThemedStyles } from '../theme/ThemeContext';
import { AuthHeader } from '../components/TopBar';
import { Button, Icon } from '../components/ui';

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

  const stepIndex = step === 'identify' ? 0 : 1;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <AuthHeader title="Reset password" onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Stepper: Identify → Reset */}
          <View style={styles.stepper} accessibilityLabel={`Step ${stepIndex + 1} of 2`}>
            {['Identify', 'Reset'].map((label, i) => {
              const done = i < stepIndex || step === 'done';
              const current = i === stepIndex && step !== 'done';
              return (
                <React.Fragment key={label}>
                  {i > 0 && <View style={[styles.stepLine, (done || current) && { backgroundColor: colors.primary }]} />}
                  <View style={[styles.step, current && styles.stepCurrent]}>
                    <View style={[styles.stepDot, (done || current) && styles.stepDotOn, current && { backgroundColor: colors.onPrimary }]}>
                      {done ? <Icon name="check" size={12} color={colors.onPrimary} /> : <Text style={[styles.stepNum, current && { color: colors.primary }]}>{i + 1}</Text>}
                    </View>
                    <Text style={[styles.stepLabel, current && { color: colors.onPrimary }]}>{`${i + 1}. ${label}`.toUpperCase()}</Text>
                  </View>
                </React.Fragment>
              );
            })}
          </View>

          {step === 'identify' && (
            <>
              <Text style={styles.title}>Forgot your password?</Text>
              <Text style={styles.subtitle}>Enter the email, mobile number or user code of your account. If it exists, we'll email a 6-digit code to its address.</Text>
              <View style={styles.card}>
                <FormField
                  label="Email, mobile number or user code"
                  icon="at"
                  value={identifier}
                  onChangeText={(t) => { setIdentifier(t); setErrors({}); }}
                  error={errors.identifier}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username"
                  placeholder="you@example.com"
                />
                <Button title="Send code" iconRight="arrow-right" onPress={requestCode} loading={loading} style={{ marginTop: 20 }} />
              </View>
            </>
          )}

          {step === 'reset' && (
            <>
              <View style={styles.account}>
                <View style={styles.accountIcon}><Icon name="shield-outline" size={20} color={colors.primaryText} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.accountId} numberOfLines={1}>{identifier.trim()}</Text>
                  <Text style={styles.accountSub}>Code sent by email</Text>
                </View>
                <TouchableOpacity onPress={() => { setStep('identify'); setCode(''); }} accessibilityRole="button" hitSlop={8}>
                  <Text style={styles.linkText}>Change</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.title}>Create new password</Text>
              <Text style={styles.subtitle}>{info?.message ?? 'Enter the code from your email and choose a new password.'}</Text>
              {info?.devOtp && <Text style={styles.devOtp}>Test code: {info.devOtp}</Text>}

              <View style={styles.card}>
                <Text style={styles.label}>6-digit code</Text>
                <OtpInput value={code} onChange={(v) => { setCode(v); setErrors((e) => ({ ...e, code: null })); }} error={errors.code} />
                <TouchableOpacity onPress={requestCode} disabled={cooldown > 0 || loading} style={styles.resend} accessibilityRole="button">
                  <Text style={[styles.linkText, cooldown > 0 && { color: colors.textMuted }]}>{cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}</Text>
                </TouchableOpacity>

                <FormField label="New password" icon="lock-outline" value={password} onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, newPassword: null })); }} error={errors.newPassword} password autoComplete="new-password" textContentType="newPassword" />
                <View style={styles.rules}>
                  <RuleList rules={passwordRules(password)} />
                </View>
                <FormField label="Confirm new password" icon="lock-check-outline" value={confirm} valid={!!confirm && confirm === password} onChangeText={(t) => { setConfirm(t); setErrors((e) => ({ ...e, confirm: null })); }} error={errors.confirm} password autoComplete="new-password" textContentType="newPassword" />

                <View style={styles.signOutNote}>
                  <Icon name="information-outline" size={16} color={colors.primaryText} />
                  <Text style={styles.signOutText}>You'll be signed out on all devices, including this one. Sign in again with your new password.</Text>
                </View>

                <Button title="Update password" iconRight="arrow-right" onPress={reset} loading={loading} style={{ marginTop: 16 }} />
              </View>
            </>
          )}

          {step === 'done' && (
            <View style={[styles.card, { alignItems: 'center', marginTop: 16 }]}>
              <View style={styles.doneIcon}><Icon name="check-circle-outline" size={32} color={colors.success} /></View>
              <Text style={[styles.title, { textAlign: 'center', marginTop: 12 }]}>Password updated</Text>
              <Text style={[styles.subtitle, { textAlign: 'center' }]}>You've been signed out everywhere. Sign in with your new password.</Text>
              <Button title="Sign in" onPress={() => navigation.popTo('Login')} style={{ marginTop: 20, alignSelf: 'stretch' }} />
            </View>
          )}

          {step !== 'done' && (
            <View style={styles.switchRow}>
              <Text style={styles.switchText}>Remember your password?</Text>
              <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button" hitSlop={8}>
                <Text style={[styles.linkText, { textDecorationLine: 'underline' }]}>Return to sign in</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const makeStyles = (c: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  scroll: { flexGrow: 1, padding: 16, paddingBottom: 32 },
  stepper: { flexDirection: 'row', alignItems: 'center', padding: 4, borderRadius: 10, backgroundColor: c.surface2 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7, backgroundColor: c.surface },
  stepCurrent: { backgroundColor: c.primary },
  stepDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: c.borderStrong, alignItems: 'center', justifyContent: 'center' },
  stepDotOn: { backgroundColor: c.primary, borderColor: c.primary },
  stepNum: { fontFamily: font.bold, fontSize: 10, color: c.textMuted },
  stepLabel: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.5, color: c.text },
  stepLine: { flex: 1, height: 2, marginHorizontal: 6, backgroundColor: c.border },
  account: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, padding: 12, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  accountIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
  accountId: { fontFamily: font.bold, fontSize: 15, color: c.text },
  accountSub: { fontFamily: font.regular, fontSize: 13, color: c.textMuted },
  title: { fontSize: 23, fontFamily: font.headingX, color: c.text, marginTop: 20 },
  subtitle: { fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: c.textSecondary, marginTop: 4 },
  devOtp: { color: c.warning, marginTop: 8, fontFamily: font.bold },
  card: { marginTop: 16, padding: 16, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  label: { color: c.text, fontFamily: font.semibold, fontSize: 13, marginBottom: 8 },
  resend: { alignSelf: 'center', marginTop: 10, padding: 4 },
  rules: { marginTop: 8, padding: 10, borderRadius: 10, backgroundColor: c.surface2 },
  signOutNote: { flexDirection: 'row', gap: 8, marginTop: 16, padding: 12, borderRadius: 10, backgroundColor: c.tint },
  signOutText: { flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: c.textSecondary },
  doneIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: c.successSoft, alignItems: 'center', justifyContent: 'center' },
  linkText: { color: c.primaryText, fontSize: 14, fontFamily: font.semibold },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: 24, flexWrap: 'wrap' },
  switchText: { fontFamily: font.regular, fontSize: 15, color: c.textSecondary },
});
