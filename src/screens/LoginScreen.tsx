import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { fetchApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

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
      login(res.data.tokens.accessToken, res.data.tokens.refreshToken, res.data.user);
      navigation.navigate('Home');
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
          placeholderTextColor="#6b7280"
          value={emailOrPhone}
          onChangeText={setEmailOrPhone}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#6b7280"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.linkButton}>
          <Text style={styles.linkText}>Don't have an account? Register</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090d16', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#111827', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#1f2937' },
  title: { fontSize: 24, fontWeight: '700', color: '#f9fafb', marginBottom: 20, textAlign: 'center' },
  label: { color: '#9ca3af', fontSize: 14, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#1f2937', color: '#fff', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#374151' },
  button: { backgroundColor: '#6366f1', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 24 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  errorText: { color: '#ef4444', textAlign: 'center', marginBottom: 12 },
  linkButton: { marginTop: 16, alignItems: 'center' },
  linkText: { color: '#818cf8', fontSize: 14 },
});
