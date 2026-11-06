import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { fetchApi } from '../api/client';

export const CreateListingScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title || !price || !description) {
      setError('Title, price, and description are required.');
      return;
    }

    setError(null);
    setLoading(true);

    const body = {
      categoryId: 'default-mobile-cat',
      title,
      description,
      price: parseFloat(price),
      condition: 'USED',
    };

    const res = await fetchApi('/listings', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    setLoading(false);
    if (res.success) {
      navigation.navigate('Home');
    } else {
      setError(res.error?.message || 'Failed to create listing');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Create Listing</Text>
        {error && <Text style={styles.errorText}>{error}</Text>}

        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. iPhone 14 Pro"
          placeholderTextColor="#6b7280"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Price ($)</Text>
        <TextInput
          style={styles.input}
          placeholder="799"
          placeholderTextColor="#6b7280"
          keyboardType="numeric"
          value={price}
          onChangeText={setPrice}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
          placeholder="Describe your item..."
          placeholderTextColor="#6b7280"
          multiline
          value={description}
          onChangeText={setDescription}
        />

        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Publish Listing</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090d16' },
  scroll: { padding: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#f9fafb', marginBottom: 20, textAlign: 'center' },
  label: { color: '#9ca3af', fontSize: 14, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#1f2937', color: '#fff', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#374151' },
  button: { backgroundColor: '#6366f1', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 24 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  cancelBtn: { marginTop: 12, alignItems: 'center' },
  cancelText: { color: '#9ca3af', fontSize: 15 },
  errorText: { color: '#ef4444', textAlign: 'center', marginBottom: 12 },
});
