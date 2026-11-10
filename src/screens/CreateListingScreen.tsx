import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { fetchApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { CategoryPicker, CategoryNode } from '../components/CategoryPicker';
import { LocationModal, ServiceArea } from '../components/LocationModal';

interface AttributeDefinition {
  id: string;
  name: string;
  dataType: string;
  isRequired: boolean;
  options: { id: string; label: string; value: string }[];
}

const CONDITIONS = [
  { value: 'NEW', label: 'New' },
  { value: 'LIKE_NEW', label: 'Like new' },
  { value: 'USED', label: 'Used' },
  { value: 'REFURBISHED', label: 'Refurbished' },
];

export const CreateListingScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, isVerified } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState('USED');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState<CategoryNode | null>(null);
  const [area, setArea] = useState<ServiceArea | null>(null);
  const [attributes, setAttributes] = useState<AttributeDefinition[]>([]);
  const [attributeValues, setAttributeValues] = useState<Record<string, string>>({});
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [cityPickerVisible, setCityPickerVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) navigation.replace('Login');
  }, [user, navigation]);

  useEffect(() => {
    setAttributes([]);
    setAttributeValues({});
    if (!category) return;
    fetchApi<AttributeDefinition[]>(`/categories/${category.id}/attributes`).then((res) => {
      if (res.success && res.data) setAttributes(res.data);
    });
  }, [category]);

  const handleSubmit = async () => {
    if (!isVerified) {
      setError('Please verify your account before selling.');
      return;
    }
    if (!category || !area || !title || !price || !description) {
      setError('Category, city, title, price and description are required.');
      return;
    }
    const missing = attributes.filter((a) => a.isRequired && !attributeValues[a.id]);
    if (missing.length > 0) {
      setError(`Please fill in: ${missing.map((a) => a.name).join(', ')}`);
      return;
    }

    setError(null);
    setLoading(true);

    const body = {
      categoryId: category.id,
      title,
      description,
      price: Number(price),
      condition,
      countryCode: area.countryCode,
      stateCode: area.stateCode,
      cityCode: area.cityCode,
      attributes: attributes
        .filter((a) => attributeValues[a.id])
        .map((a) =>
          a.dataType === 'NUMBER'
            ? { attributeDefinitionId: a.id, valueNumber: Number(attributeValues[a.id]) }
            : { attributeDefinitionId: a.id, valueText: attributeValues[a.id] }
        ),
      media: imageUrl ? [{ url: imageUrl.trim() }] : [],
    };

    const created = await fetchApi<{ id: string }>('/listings', { method: 'POST', body: JSON.stringify(body) });
    if (!created.success || !created.data) {
      setLoading(false);
      setError(created.error?.message || 'Failed to create listing');
      return;
    }

    const submitted = await fetchApi<{ status: string }>(`/listings/${created.data.id}/submit`, { method: 'POST' });
    setLoading(false);
    if (!submitted.success) {
      setError(`Saved as draft, but could not publish: ${submitted.error?.message || 'unknown error'}`);
      return;
    }
    Alert.alert(
      submitted.data?.status === 'LIVE' ? 'Listing is live!' : 'Submitted for review',
      submitted.data?.status === 'LIVE' ? 'Buyers can now see your item.' : 'Our team will review it shortly.'
    );
    navigation.navigate('Home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Sell an item</Text>
        {error && <Text style={styles.errorText}>{error}</Text>}

        <Text style={styles.label}>Category</Text>
        <TouchableOpacity style={styles.input} onPress={() => setCategoryPickerVisible(true)}>
          <Text style={category ? styles.valueText : styles.placeholderText}>{category ? category.name : 'Choose a category'}</Text>
        </TouchableOpacity>

        <Text style={styles.label}>City</Text>
        <TouchableOpacity style={styles.input} onPress={() => setCityPickerVisible(true)}>
          <Text style={area ? styles.valueText : styles.placeholderText}>{area ? `${area.cityName}, ${area.stateName}` : 'Where is the item?'}</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Title</Text>
        <TextInput style={styles.input} placeholder="e.g. iPhone 14 128GB" placeholderTextColor="#6b7280" value={title} onChangeText={setTitle} />

        <Text style={styles.label}>Price (₹)</Text>
        <TextInput style={styles.input} placeholder="25000" placeholderTextColor="#6b7280" keyboardType="numeric" value={price} onChangeText={(t) => setPrice(t.replace(/[^\d]/g, ''))} />

        <Text style={styles.label}>Condition</Text>
        <View style={styles.chipRow}>
          {CONDITIONS.map((c) => (
            <TouchableOpacity key={c.value} style={[styles.chip, condition === c.value && styles.chipActive]} onPress={() => setCondition(c.value)}>
              <Text style={styles.chipText}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {attributes.map((attr) => (
          <View key={attr.id}>
            <Text style={styles.label}>{attr.name}{attr.isRequired ? ' *' : ''}</Text>
            {attr.options.length > 0 ? (
              <View style={styles.chipRow}>
                {attr.options.map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.chip, attributeValues[attr.id] === opt.value && styles.chipActive]}
                    onPress={() => setAttributeValues({ ...attributeValues, [attr.id]: opt.value })}
                  >
                    <Text style={styles.chipText}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <TextInput
                style={styles.input}
                placeholderTextColor="#6b7280"
                keyboardType={attr.dataType === 'NUMBER' ? 'numeric' : 'default'}
                value={attributeValues[attr.id] || ''}
                onChangeText={(t) => setAttributeValues({ ...attributeValues, [attr.id]: t })}
              />
            )}
          </View>
        ))}

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
          placeholder="Describe your item..."
          placeholderTextColor="#6b7280"
          multiline
          value={description}
          onChangeText={setDescription}
        />

        <Text style={styles.label}>Image URL (optional)</Text>
        <TextInput style={styles.input} placeholder="https://..." placeholderTextColor="#6b7280" autoCapitalize="none" value={imageUrl} onChangeText={setImageUrl} />

        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Publish Listing</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>

      <CategoryPicker visible={categoryPickerVisible} onClose={() => setCategoryPickerVisible(false)} onSelectCategory={setCategory} />
      <LocationModal
        visible={cityPickerVisible}
        onClose={() => setCityPickerVisible(false)}
        selectedCity={area?.cityName ?? ''}
        onSelectCity={(a) => a && setArea(a)}
        sellingOnly
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090d16' },
  scroll: { padding: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#f9fafb', marginBottom: 20, textAlign: 'center' },
  label: { color: '#9ca3af', fontSize: 14, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#1f2937', color: '#fff', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#374151' },
  valueText: { color: '#fff' },
  placeholderText: { color: '#6b7280' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#1f2937', borderWidth: 1, borderColor: '#374151' },
  chipActive: { backgroundColor: '#4f46e5', borderColor: '#6366f1' },
  chipText: { color: '#f9fafb', fontSize: 13 },
  button: { backgroundColor: '#6366f1', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 24 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  cancelBtn: { marginTop: 12, alignItems: 'center' },
  cancelText: { color: '#9ca3af', fontSize: 15 },
  errorText: { color: '#ef4444', textAlign: 'center', marginBottom: 12 },
});
