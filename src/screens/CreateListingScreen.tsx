import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { CategoryPicker, CategoryNode } from '../components/CategoryPicker';
import { LocationModal, ServiceArea } from '../components/LocationModal';
import { MediaItem, MediaPicker } from '../components/MediaPicker';
import { DEFAULT_LIMITS, MediaLimits, getMediaLimits } from '../utils/media';
import { Colors, useTheme, useThemedStyles } from '../theme/ThemeContext';

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
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState('USED');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [limits, setLimits] = useState<MediaLimits>(DEFAULT_LIMITS);
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
    getMediaLimits().then(setLimits);
  }, []);

  useEffect(() => {
    setAttributes([]);
    setAttributeValues({});
    if (!category) return;
    fetchApi<AttributeDefinition[]>(`/categories/${category.id}/attributes`).then((res) => {
      if (res.success && res.data) setAttributes(res.data);
    });
  }, [category]);

  const uploading = media.some((m) => m.status === 'uploading');

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
    if (uploading) {
      setError('Please wait for your photos and video to finish uploading.');
      return;
    }
    if (!media.some((m) => m.kind === 'IMAGE' && m.status === 'done')) {
      setError('Add at least one photo — listings with photos get far more replies.');
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
      // Photos first (the first is the cover), then the video.
      media: [...media.filter((m) => m.kind === 'IMAGE'), ...media.filter((m) => m.kind === 'VIDEO')]
        .filter((m) => m.status === 'done' && m.uploadId)
        .map((m) => ({ uploadId: m.uploadId! })),
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
    navigation.popTo('Home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Sell an item</Text>
        {error && <Text style={styles.errorText}>{error}</Text>}

        <Text style={styles.label}>Photos and video *</Text>
        <MediaPicker items={media} onChange={setMedia} limits={limits} />

        <Text style={styles.label}>Category</Text>
        <TouchableOpacity style={styles.input} onPress={() => setCategoryPickerVisible(true)}>
          <Text style={category ? styles.valueText : styles.placeholderText}>{category ? category.name : 'Choose a category'}</Text>
        </TouchableOpacity>

        <Text style={styles.label}>City</Text>
        <TouchableOpacity style={styles.input} onPress={() => setCityPickerVisible(true)}>
          <Text style={area ? styles.valueText : styles.placeholderText}>{area ? `${area.cityName}, ${area.stateName}` : 'Where is the item?'}</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Title</Text>
        <TextInput style={styles.input} placeholder="e.g. iPhone 14 128GB" placeholderTextColor={colors.placeholder} value={title} onChangeText={setTitle} />

        <Text style={styles.label}>Price (₹)</Text>
        <TextInput style={styles.input} placeholder="25000" placeholderTextColor={colors.placeholder} keyboardType="numeric" value={price} onChangeText={(t) => setPrice(t.replace(/[^\d]/g, ''))} />

        <Text style={styles.label}>Condition</Text>
        <View style={styles.chipRow}>
          {CONDITIONS.map((c) => (
            <TouchableOpacity key={c.value} style={[styles.chip, condition === c.value && styles.chipActive]} onPress={() => setCondition(c.value)}>
              <Text style={[styles.chipText, condition === c.value && styles.chipTextActive]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {attributes.map((attr) => (
          <View key={attr.id}>
            <Text style={styles.label}>{attr.name}{attr.isRequired ? ' *' : ''}</Text>
            {attr.options.length > 0 ? (
              <View style={styles.chipRow}>
                {attr.options.map((opt) => {
                  const active = attributeValues[attr.id] === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setAttributeValues({ ...attributeValues, [attr.id]: opt.value })}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <TextInput
                style={styles.input}
                placeholderTextColor={colors.placeholder}
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
          placeholderTextColor={colors.placeholder}
          multiline
          value={description}
          onChangeText={setDescription}
        />

        <Text style={styles.hint}>You can post up to {limits.listingsPerDay} listings a day.</Text>

        <TouchableOpacity style={[styles.button, (loading || uploading) && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading || uploading}>
          {loading ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.buttonText}>{uploading ? 'Uploading media…' : 'Publish Listing'}</Text>}
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

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    scroll: { padding: 24 },
    title: { fontSize: 28, fontWeight: '800', color: c.text, marginBottom: 20, textAlign: 'center' },
    label: { color: c.textSecondary, fontSize: 14, marginBottom: 6, marginTop: 14 },
    input: { backgroundColor: c.inputBg, color: c.text, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: c.inputBorder },
    valueText: { color: c.text },
    placeholderText: { color: c.placeholder },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.inputBorder },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipText: { color: c.text, fontSize: 13 },
    chipTextActive: { color: c.onPrimary },
    hint: { color: c.textMuted, fontSize: 12, marginTop: 14 },
    button: { backgroundColor: c.primary, borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 16 },
    buttonText: { color: c.onPrimary, fontWeight: '600', fontSize: 16 },
    cancelBtn: { marginTop: 12, alignItems: 'center' },
    cancelText: { color: c.textSecondary, fontSize: 15 },
    errorText: { color: c.danger, textAlign: 'center', marginBottom: 12 },
  });
