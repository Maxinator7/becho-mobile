import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchApi, AuthTokens } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { FormField, RuleList, StrengthMeter } from '../components/FormField';
import { fieldErrors, passwordRules, validate } from '../utils/validation';
import { Colors, font, useTheme, useThemedStyles } from '../theme/ThemeContext';
import { AuthHeader } from '../components/TopBar';
import { Button, Icon } from '../components/ui';

interface RegisterResult {
  tokens: AuthTokens;
  user: any;
  otpSentTo?: string;
  verificationMessage: string;
  devOtp?: string;
}

/** Sign-up (Stitch 20). On success the account exists and the user goes to the email code screen. */
export const RegisterScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [form, setForm] = useState({ displayName: '', phone: '', email: '', password: '', confirm: '' });
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();

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
      terms: agreed ? null : 'Please accept the terms to continue',
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
      navigation.replace('VerifyEmail', { email: res.data.otpSentTo ?? form.email.trim(), devOtp: res.data.devOtp, sent: true });
      return;
    }
    if (res.error?.code === 'VALIDATION_ERROR') setErrors(fieldErrors(res.error.details));
    else if (res.error?.code === 'PHONE_TAKEN') setErrors({ phone: res.error.message });
    else if (res.error?.code === 'EMAIL_TAKEN') setErrors({ email: res.error.message });
    else setFormError(res.error?.message || 'Registration failed. Please try again.');
  };

  const matches = !!form.confirm && form.confirm === form.password;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <AuthHeader title="Create account" onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.eyebrow}>
            <Icon name="storefront-outline" size={13} color={colors.primaryText} />
            <Text style={styles.eyebrowText}>INDIA'S NEIGHBOURHOOD BAZAAR</Text>
          </View>
          <Text style={styles.title}>Create your Becho account</Text>
          <Text style={styles.subtitle}>Buy and sell pre-loved things with people in your city.</Text>

          {formError && (
            <View style={styles.alert}>
              <Icon name="alert-circle-outline" size={18} color={colors.danger} />
              <Text style={styles.alertText}>{formError}</Text>
            </View>
          )}

          <FormField label="Full name" icon="account-outline" placeholder="e.g. Aarav Mehta" value={form.displayName} onChangeText={set('displayName')} error={errors.displayName} autoComplete="name" textContentType="name" />
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
            hint="You can sign in with it. It's never shown on your ads."
          />
          <FormField label="Email address" icon="email-outline" placeholder="name@example.com" value={form.email} onChangeText={set('email')} error={errors.email} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" hint="We'll email you a 6-digit code to verify it" />
          <FormField label="Password" icon="lock-outline" placeholder="Create a password" value={form.password} onChangeText={set('password')} error={errors.password} password autoComplete="new-password" textContentType="newPassword" />
          <StrengthMeter password={form.password} />
          <RuleList rules={passwordRules(form.password)} />
          <FormField label="Confirm password" icon="lock-check-outline" placeholder="Type it again" value={form.confirm} onChangeText={set('confirm')} error={errors.confirm} valid={matches} password autoComplete="new-password" textContentType="newPassword" />

          <TouchableOpacity
            style={[styles.terms, !!errors.terms && { borderColor: colors.danger }]}
            onPress={() => { setAgreed((a) => !a); setErrors((e) => ({ ...e, terms: null })); }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreed }}
          >
            <View style={[styles.checkbox, agreed && styles.checkboxOn]}>
              {agreed && <Icon name="check" size={16} color={colors.onPrimary} />}
            </View>
            <Text style={styles.termsText}>
              I agree to Becho's <Text style={styles.termsStrong}>Terms of Service</Text> & <Text style={styles.termsStrong}>Privacy Policy</Text>, and to receive emails about my account, offers and chats.
            </Text>
          </TouchableOpacity>
          {errors.terms ? <Text style={styles.termsError}>{errors.terms}</Text> : null}

          <Button title="Create account & verify" iconRight="arrow-right" onPress={handleRegister} loading={loading} style={{ marginTop: 20 }} />

          {errors.phone?.includes('already registered') || errors.email?.includes('already registered') ? (
            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword', { identifier: form.email || form.phone })} style={styles.center}>
              <Text style={styles.linkText}>Forgot your password?</Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.popTo('Login') : navigation.navigate('Login'))} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.linkText}>Sign In</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.badges}>
            {[
              { icon: 'email-check-outline' as const, label: 'EMAIL VERIFIED MEMBERS' },
              { icon: 'check-decagram-outline' as const, label: 'STAFF-CHECKED ADS' },
            ].map((b) => (
              <View key={b.label} style={styles.badge}>
                <Icon name={b.icon} size={16} color={colors.success} />
                <Text style={styles.badgeText}>{b.label}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const makeStyles = (c: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  scroll: { flexGrow: 1, padding: 16, paddingBottom: 32 },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: c.primarySoft },
  eyebrowText: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.5, color: c.primaryText },
  title: { fontSize: 25, fontFamily: font.headingX, color: c.text, marginTop: 10 },
  subtitle: { fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: c.textSecondary, marginTop: 4 },
  alert: { flexDirection: 'row', gap: 8, backgroundColor: c.dangerSoft, borderWidth: 1, borderColor: c.dangerSoftBorder, borderRadius: 10, padding: 12, marginTop: 14 },
  alertText: { flex: 1, color: c.danger, fontSize: 14, fontFamily: font.medium },
  terms: { flexDirection: 'row', gap: 12, marginTop: 20, padding: 14, borderRadius: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: c.borderStrong, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: c.primary, borderColor: c.primary },
  termsText: { flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: c.textSecondary },
  termsStrong: { fontFamily: font.semibold, color: c.primaryText },
  termsError: { fontFamily: font.medium, fontSize: 12, color: c.danger, marginTop: 6 },
  center: { alignItems: 'center', marginTop: 14 },
  linkText: { color: c.primaryText, fontSize: 14, fontFamily: font.semibold },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: 20 },
  switchText: { fontFamily: font.regular, fontSize: 15, color: c.textSecondary },
  badges: { flexDirection: 'row', gap: 8, marginTop: 20, padding: 10, borderRadius: 12, backgroundColor: c.tint },
  badge: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  badgeText: { fontFamily: font.bold, fontSize: 10, letterSpacing: 0.4, color: c.textSecondary },
});
