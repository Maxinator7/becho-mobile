import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Colors, useTheme, useThemedStyles } from '../theme/ThemeContext';

export const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();

  const handleLogin = async () => {
    setError(null);
    setLoading(true);

    const isEmail = emailOrPhone.includes('@');
    const body = {
      email: isEmail ? emailOrPhone : undefined,
      phone: !isEmail ? emailOrPhone : undefined,
      password,
    };

    const res = await fetchApi<{ tokens: { accessToken: string; refreshToken: string }; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    setLoading(false);
    if (res.success && res.data) {
      await login(res.data.tokens, res.data.user);
      navigation.popTo('Home');
    } else {
      setError(res.error?.message || 'Login failed');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Sign In</Text>
        {error && <Text style={styles.errorText}>{error}</Text>}

        <Text style={styles.label}>Email or Phone</Text>
        <TextInput
          style={styles.input}
          placeholder="user@example.com"
          placeholderTextColor={colors.placeholder}
          value={emailOrPhone}
          onChangeText={setEmailOrPhone}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor={colors.placeholder}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.buttonText}>Sign In</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.linkButton}>
          <Text style={styles.linkText}>Don't have an account? Register</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const makeStyles = (c: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: c.surface, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: c.border },
  title: { fontSize: 24, fontWeight: '700', color: c.text, marginBottom: 20, textAlign: 'center' },
  label: { color: c.textSecondary, fontSize: 14, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: c.inputBg, color: c.text, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: c.inputBorder },
  button: { backgroundColor: c.primary, borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 24 },
  buttonText: { color: c.onPrimary, fontWeight: '600', fontSize: 16 },
  errorText: { color: c.danger, textAlign: 'center', marginBottom: 12 },
  linkButton: { marginTop: 16, alignItems: 'center' },
  linkText: { color: c.primary, fontSize: 14 },
});
