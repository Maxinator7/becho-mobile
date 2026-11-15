import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchApi, session } from '../api/client';
import { FormField, RuleList } from '../components/FormField';
import { Button, Card, Notice, ScreenHeader } from '../components/ui';
import { fieldErrors, passwordRules, validate } from '../utils/validation';
import { Colors, font, useThemedStyles } from '../theme/ThemeContext';

/** POST /auth/change-password — keeps this device signed in, signs out the others. */
export const ChangePasswordScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const styles = useThemedStyles(makeStyles);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const e = {
      currentPassword: current ? null : 'Enter your current password',
      newPassword: validate.password(next) ?? (next === current ? 'New password must be different from the current one' : null),
      confirm: confirm === next ? null : 'Passwords do not match',
    };
    setErrors(e);
    setFormError(null);
    if (Object.values(e).some(Boolean)) return;
    setLoading(true);
    const res = await fetchApi<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword: current, newPassword: next, refreshToken: session.refreshToken ?? undefined }),
    });
    setLoading(false);
    if (res.success) {
      Alert.alert('Password changed', res.data?.message ?? 'Other devices have been signed out.');
      navigation.goBack();
    } else if (res.error?.code === 'VALIDATION_ERROR') {
      setErrors(fieldErrors(res.error.details));
    } else if (res.error?.code === 'INVALID_CURRENT_PASSWORD') {
      setErrors({ currentPassword: res.error.message });
    } else {
      setFormError(res.error?.message || 'Could not change your password.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Change password" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          <Card>
            <Text style={styles.intro}>You'll stay signed in on this phone. Other devices will be signed out.</Text>
            {formError && <Notice tone="danger" icon="alert-circle-outline" style={{ marginTop: 12 }}>{formError}</Notice>}
            <FormField label="Current password" value={current} onChangeText={(t) => { setCurrent(t); setErrors((x) => ({ ...x, currentPassword: null })); }} error={errors.currentPassword} password autoComplete="current-password" textContentType="password" />
            <FormField label="New password" value={next} onChangeText={(t) => { setNext(t); setErrors((x) => ({ ...x, newPassword: null })); }} error={errors.newPassword} password autoComplete="new-password" textContentType="newPassword" />
            <RuleList rules={passwordRules(next)} />
            <FormField label="Confirm new password" value={confirm} onChangeText={(t) => { setConfirm(t); setErrors((x) => ({ ...x, confirm: null })); }} error={errors.confirm} password autoComplete="new-password" textContentType="newPassword" onSubmitEditing={submit} />
            <Button title="Update password" onPress={submit} loading={loading} style={{ marginTop: 20 }} />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    intro: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: c.textSecondary },
  });
