import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackActions } from '@react-navigation/native';
import { AuthTokens, fetchApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { OtpInput } from '../components/FormField';
import { AuthHeader } from '../components/TopBar';
import { Button, Icon } from '../components/ui';
import { validate } from '../utils/validation';
import { Colors, font, useTheme, useThemedStyles } from '../theme/ThemeContext';

const RESEND_SECONDS = 60;

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/** Email OTP (Stitch 16). Reached right after sign-up, or later from My account / sign-in. */
export const VerifyEmailScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { user, login } = useAuth();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const justSent: boolean = !!route.params?.sent;
  const [email, setEmail] = useState<string | undefined>(route.params?.email ?? user?.email ?? undefined);
  const [devOtp, setDevOtp] = useState<string | undefined>(route.params?.devOtp);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(justSent ? RESEND_SECONDS : 0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const finish = () => navigation.dispatch(StackActions.popToTop());

  const verify = async () => {
    const err = validate.otp(code);
    setError(err);
    if (err) return;
    setLoading(true);
    const res = await fetchApi<{ tokens: AuthTokens; user: any }>('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ code: code.trim() }) });
    setLoading(false);
    if (res.success && res.data) {
      await login(res.data.tokens, res.data.user);
      finish();
    } else {
      setError(res.error?.message || 'Verification failed');
    }
  };

  const resend = async () => {
    setError(null);
    const res = await fetchApi<{ otpSentTo?: string; devOtp?: string }>('/auth/resend-otp', { method: 'POST' });
    if (res.success && res.data) {
      if (res.data.otpSentTo) setEmail(res.data.otpSentTo);
      setDevOtp(res.data.devOtp);
      setCode('');
      setInfo('We sent you a new code.');
      setCooldown(RESEND_SECONDS);
    } else {
      setError(res.error?.message || 'Could not resend the code');
    }
  };

  const alreadyVerified = !!user?.emailVerifiedAt;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <AuthHeader title="Verify email" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.iconTile}>
            <View style={styles.iconInner}>
              <Icon name="email-outline" size={30} color={colors.primaryText} />
            </View>
            <View style={styles.iconBadge}>
              <Icon name="shield-check" size={14} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.title}>Verify your email address</Text>
          {alreadyVerified ? (
            <>
              <Text style={styles.body}>Your email is already verified. You can chat, make offers and post ads.</Text>
              <Button title="Continue" iconRight="arrow-right" onPress={finish} style={{ marginTop: 24 }} />
            </>
          ) : (
            <>
              <Text style={styles.body}>
                {justSent || cooldown > 0 ? 'We have sent a 6-digit verification code to' : 'Enter the 6-digit code we emailed to'}
              </Text>
              {email ? <Text style={styles.email}>{email}</Text> : null}
              {!justSent && cooldown === 0 ? <Text style={styles.hint}>No code, or it has expired? Tap "Resend code".</Text> : null}

              <View style={styles.card}>
                <OtpInput value={code} onChange={(v) => { setCode(v); setError(null); }} error={error} autoFocus />
                <View style={styles.secure}>
                  <Icon name="lock-outline" size={13} color={colors.textMuted} />
                  <Text style={styles.secureText}>The code expires 15 minutes after it was sent</Text>
                </View>
              </View>
              {devOtp ? <Text style={styles.devOtp}>Test code: {devOtp}</Text> : null}
              {info && !error ? <Text style={styles.info}>{info}</Text> : null}

              {cooldown > 0 ? (
                <View style={styles.timer}>
                  <Icon name="clock-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.timerText}>Resend code in <Text style={styles.timerValue}>{mmss(cooldown)}</Text></Text>
                </View>
              ) : (
                <TouchableOpacity style={styles.resend} onPress={resend} accessibilityRole="button">
                  <Icon name="email-sync-outline" size={16} color={colors.primaryText} />
                  <Text style={styles.resendText}>Resend code</Text>
                </TouchableOpacity>
              )}

              <Button title="Verify & Continue" iconRight="arrow-right" onPress={verify} loading={loading} style={{ marginTop: 20 }} />

              <View style={styles.help}>
                <View style={styles.helpIcon}><Icon name="help-box-outline" size={18} color={colors.primaryText} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.helpTitle}>Didn't receive the email?</Text>
                  <Text style={styles.helpText}>Check your spam or junk folder, and make sure the address above is right. You can ask for a new code when the timer ends.</Text>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    scroll: { flexGrow: 1, padding: 16, paddingBottom: 32, alignItems: 'stretch' },
    iconTile: { alignSelf: 'center', width: 80, height: 80, borderRadius: 18, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
    iconInner: { width: 56, height: 56, borderRadius: 14, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
    iconBadge: { position: 'absolute', right: -6, bottom: -6, width: 26, height: 26, borderRadius: 13, backgroundColor: c.primary, borderWidth: 2, borderColor: c.surface, alignItems: 'center', justifyContent: 'center' },
    title: { fontFamily: font.headingX, fontSize: 23, color: c.text, textAlign: 'center', marginTop: 20 },
    body: { fontFamily: font.regular, fontSize: 15, color: c.textSecondary, textAlign: 'center', marginTop: 6 },
    email: { fontFamily: font.bold, fontSize: 15, color: c.text, textAlign: 'center', marginTop: 2 },
    hint: { fontFamily: font.regular, fontSize: 13, color: c.textMuted, textAlign: 'center', marginTop: 6 },
    card: { marginTop: 20, padding: 16, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
    secure: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 10 },
    secureText: { fontFamily: font.regular, fontSize: 12, color: c.textMuted },
    devOtp: { color: c.warning, marginTop: 10, fontFamily: font.bold, textAlign: 'center' },
    info: { color: c.success, marginTop: 10, fontFamily: font.medium, textAlign: 'center' },
    timer: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 6, marginTop: 16, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: c.surface2 },
    timerText: { fontFamily: font.regular, fontSize: 13, color: c.textSecondary },
    timerValue: { fontFamily: font.bold, color: c.text },
    resend: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 6, marginTop: 16, padding: 6 },
    resendText: { fontFamily: font.semibold, fontSize: 14, color: c.primaryText },
    help: { flexDirection: 'row', gap: 12, marginTop: 24, padding: 14, borderRadius: 14, backgroundColor: c.tint },
    helpIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
    helpTitle: { fontFamily: font.bold, fontSize: 14, color: c.text },
    helpText: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: c.textSecondary, marginTop: 2 },
  });
