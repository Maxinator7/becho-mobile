import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { fetchApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const RegisterScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [displayName, setDisplayName] = useState('');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [registeredUserId, setRegisteredUserId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleRegister = async () => {
    setError(null);
    setLoading(true);

    const isEmail = emailOrPhone.includes('@');
    const body = {
      displayName,
      email: isEmail ? emailOrPhone : undefined,
      phone: !isEmail ? emailOrPhone : undefined,
      password,
    };

    const res = await fetchApi<{ tokens: { accessToken: string; refreshToken: string }; user: any; verificationMessage: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    setLoading(false);
    if (res.success && res.data) {
      setRegisteredUserId(res.data.user.id);
      setInfo(res.data.verificationMessage);
      login(res.data.tokens.accessToken, res.data.tokens.refreshToken, res.data.user);
    } else {
      setError(res.error?.message || 'Registration failed');
    }
  };

  const handleVerifyOtp = async () => {
    setError(null);
    setLoading(true);

    const isEmail = emailOrPhone.includes('@');
    const res = await fetchApi('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({
        userId: registeredUserId,
        channel: isEmail ? 'EMAIL' : 'PHONE',
        code: otpCode,
      }),
    });

    setLoading(false);
    if (res.success) {
      navigation.navigate('Home');
    } else {
      setError(res.error?.message || 'Verification failed');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Create Account</Text>
        {error && <Text style={styles.errorText}>{error}</Text>}
        {info && <Text style={styles.infoText}>{info}</Text>}

        {!registeredUserId ? (
          <>
            <Text style={styles.label}>Display Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Jane Doe"
              placeholderTextColor="#6b7280"
              value={displayName}
              onChangeText={setDisplayName}
            />

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

            <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Register</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.label}>Enter 6-Digit OTP</Text>
            <TextInput
              style={[styles.input, { textAlign: 'center', fontSize: 20, letterSpacing: 4 }]}
              placeholder="123456"
              placeholderTextColor="#6b7280"
              maxLength={6}
              value={otpCode}
              onChangeText={setOtpCode}
              keyboardType="number-pad"
            />

            <TouchableOpacity style={styles.button} onPress={handleVerifyOtp} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify OTP</Text>}
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkButton}>
          <Text style={styles.linkText}>Already registered? Sign In</Text>
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
  infoText: { color: '#10b981', textAlign: 'center', marginBottom: 12, fontSize: 13 },
  linkButton: { marginTop: 16, alignItems: 'center' },
  linkText: { color: '#818cf8', fontSize: 14 },
});
