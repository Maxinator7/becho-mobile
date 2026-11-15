import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackActions } from '@react-navigation/native';
import { fetchApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCity } from '../context/CityContext';
import { CategoryPicker } from '../components/CategoryPicker';
import { LocationModal } from '../components/LocationModal';
import { MediaItem, MediaPicker } from '../components/MediaPicker';
import { OptionSheet } from '../components/OptionSheet';
import { Button, EmptyState, Icon, Notice, ScreenHeader } from '../components/ui';
import { DEFAULT_LIMITS, MediaLimits, getMediaLimits } from '../utils/media';
import { CategoryNode, ServiceArea, categoryIcon, findCategory, getCategories, getServiceAreas } from '../utils/catalog';
import { CONDITIONS, EDITABLE_STATUSES } from '../utils/listing';
import { Colors, font, useTheme, useThemedStyles } from '../theme/ThemeContext';

interface AttributeDefinition {
  id: string;
  name: string;
  dataType: string;
  isRequired: boolean;
  options: { id: string; label: string; value: string }[];
}

interface ExistingListing {
  id: string;
  status: string;
  title: string;
  description: string;
  price: number;
  condition: string;
  categoryId: string;
  countryCode: string;
  stateCode: string;
  cityCode: string;
  attributes: { attributeDefinitionId: string; valueText?: string | null; valueNumber?: number | null }[];
  media: { id: string; url: string; mediaType?: string }[];
}

const TITLE_MAX = 120;
const DESC_RECOMMENDED = 150;

/** Post Ad (route CreateListing) and Edit & resubmit (route EditListing { listingId }). */
export const CreateListingScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const listingId: string | undefined = route.params?.listingId;
  const editing = !!listingId;
  const { user, isVerified } = useAuth();
  const { area: browsingArea } = useCity();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState('USED');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [limits, setLimits] = useState<MediaLimits>(DEFAULT_LIMITS);
  const [category, setCategory] = useState<CategoryNode | null>(null);
  const [parentCategory, setParentCategory] = useState<CategoryNode | null>(null);
  const [area, setArea] = useState<ServiceArea | null>(null);
  const [attributes, setAttributes] = useState<AttributeDefinition[]>([]);
  const [attributeValues, setAttributeValues] = useState<Record<string, string>>({});
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [cityPickerVisible, setCityPickerVisible] = useState(false);
  const [optionFor, setOptionFor] = useState<AttributeDefinition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<'draft' | 'submit' | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(editing);
  const [existingStatus, setExistingStatus] = useState<string | null>(null);
  const [remark, setRemark] = useState<string | null>(null);

  useEffect(() => {
    if (!user) navigation.replace('Login');
  }, [user, navigation]);

  useEffect(() => {
    getMediaLimits().then(setLimits);
  }, []);

  // New ad: default to the city the user is browsing, if selling is open there.
  useEffect(() => {
    if (!editing && browsingArea?.sellingEnabled) setArea((a) => a ?? browsingArea);
  }, [editing, browsingArea]);

  // Edit mode: load the listing and pre-fill everything, keeping existing media as { mediaId }.
  useEffect(() => {
    if (!listingId) return;
    (async () => {
      const [res, tree, areas, reviews] = await Promise.all([
        fetchApi<ExistingListing>(`/listings/${listingId}`),
        getCategories(),
        getServiceAreas(),
        fetchApi<{ remark: string | null }[]>(`/listings/${listingId}/reviews`),
      ]);
      setLoadingExisting(false);
      if (!res.success || !res.data) {
        setError(res.error?.message || 'Could not load this listing.');
        return;
      }
      const l = res.data;
      setExistingStatus(l.status);
      setTitle(l.title);
      setDescription(l.description);
      setPrice(String(Math.round(l.price)));
      setCondition(l.condition);
      const found = findCategory(tree, l.categoryId);
      if (found) {
        setCategory(found.category);
        setParentCategory(found.parent);
      } else {
        setCategory({ id: l.categoryId, name: 'Category', slug: '' });
      }
      setArea(areas.find((a) => a.cityCode === l.cityCode && a.stateCode === l.stateCode) ?? null);
      const values: Record<string, string> = {};
      for (const a of l.attributes ?? []) {
        const v = a.valueText ?? (a.valueNumber != null ? String(a.valueNumber) : null);
        if (v) values[a.attributeDefinitionId] = v;
      }
      setAttributeValues(values);
      setMedia(
        (l.media ?? []).map((m) => ({
          key: m.id,
          kind: m.mediaType === 'VIDEO' ? 'VIDEO' : 'IMAGE',
          previewUri: m.url,
          status: 'done',
          progress: 1,
          mediaId: m.id,
        }))
      );
      if (reviews.success && reviews.data?.[0]?.remark) setRemark(reviews.data[0].remark);
    })();
  }, [listingId]);

  // Attribute definitions for the chosen category.
  useEffect(() => {
    setAttributes([]);
    if (!category) return;
    fetchApi<AttributeDefinition[]>(`/categories/${category.id}/attributes`).then((res) => {
      if (res.success && res.data) setAttributes(res.data);
    });
  }, [category?.id]);

  const uploading = media.some((m) => m.status === 'uploading');
  const hasPhoto = media.some((m) => m.kind === 'IMAGE' && m.status === 'done');
  const requiredAttrsDone = attributes.filter((a) => a.isRequired).every((a) => attributeValues[a.id]);
  const steps = [hasPhoto, !!category, !!area, title.trim().length >= 5, !!price, description.trim().length >= 10, requiredAttrsDone];
  const done = steps.filter(Boolean).length;

  const buildBody = () => ({
    categoryId: category!.id,
    title: title.trim(),
    description: description.trim(),
    price: Number(price),
    condition,
    countryCode: area!.countryCode,
    stateCode: area!.stateCode,
    cityCode: area!.cityCode,
    attributes: attributes
      .filter((a) => attributeValues[a.id])
      .map((a) =>
        a.dataType === 'NUMBER'
          ? { attributeDefinitionId: a.id, valueNumber: Number(attributeValues[a.id]) }
          : { attributeDefinitionId: a.id, valueText: attributeValues[a.id] }
      ),
    // Photos first (the first is the cover), then the video. Existing files are kept by id.
    media: [...media.filter((m) => m.kind === 'IMAGE'), ...media.filter((m) => m.kind === 'VIDEO')]
      .filter((m) => m.status === 'done' && (m.uploadId || m.mediaId))
      .map((m) => (m.mediaId ? { mediaId: m.mediaId } : { uploadId: m.uploadId! })),
  });

  const goToAccount = () => {
    navigation.dispatch(StackActions.popToTop());
    navigation.navigate('Tabs', { screen: 'Account' });
  };

  /** Saves the ad (create or PATCH). Returns the listing id, or null on failure. */
  const save = async (): Promise<string | null> => {
    const res = editing
      ? await fetchApi<{ id: string }>(`/listings/${listingId}`, { method: 'PATCH', body: JSON.stringify(buildBody()) })
      : await fetchApi<{ id: string }>('/listings', { method: 'POST', body: JSON.stringify(buildBody()) });
    if (!res.success || !res.data) {
      const detail = res.error?.details?.[0]?.message;
      setError(detail || res.error?.message || 'Could not save your ad.');
      return null;
    }
    return res.data.id;
  };

  const validateBasics = () => {
    if (!isVerified) return 'Please verify your account before selling.';
    if (!category || !area || !title.trim() || !price || !description.trim()) return 'Category, city, title, price and description are required.';
    if (uploading) return 'Please wait for your photos and video to finish uploading.';
    return null;
  };

  const handleSaveDraft = async () => {
    const problem = validateBasics();
    if (problem) { setError(problem); return; }
    setError(null);
    setSaving('draft');
    const id = await save();
    setSaving(null);
    if (!id) return;
    Alert.alert('Draft saved', 'You can finish and publish it from My Account.');
    goToAccount();
  };

  const handleSubmit = async () => {
    const problem = validateBasics();
    if (problem) { setError(problem); return; }
    const missing = attributes.filter((a) => a.isRequired && !attributeValues[a.id]);
    if (missing.length > 0) { setError(`Please fill in: ${missing.map((a) => a.name).join(', ')}`); return; }
    if (!hasPhoto) { setError('Add at least one photo — listings with photos get far more replies.'); return; }

    setError(null);
    setSaving('submit');
    const id = await save();
    if (!id) { setSaving(null); return; }
    const submitted = await fetchApi<{ status: string }>(`/listings/${id}/submit`, { method: 'POST' });
    setSaving(null);
    if (!submitted.success) {
      setError(`Saved as draft, but could not publish: ${submitted.error?.message || 'unknown error'}`);
      return;
    }
    Alert.alert(
      submitted.data?.status === 'LIVE' ? 'Your ad is live!' : 'Submitted for review',
      submitted.data?.status === 'LIVE' ? 'Buyers can now see your item.' : 'Our team will review it shortly.'
    );
    goToAccount();
  };

  const header = <ScreenHeader title={editing ? 'Edit ad' : 'Post Ad'} onBack={() => navigation.goBack()} backIcon="close" />;

  if (loadingExisting) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {header}
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }
  if (editing && existingStatus && !EDITABLE_STATUSES.includes(existingStatus)) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {header}
        <EmptyState icon="pencil-off-outline" title="This ad can't be edited right now" body="Only drafts and ads that staff sent back for changes can be edited." />
      </SafeAreaView>
    );
  }

  const half = (Math.min(width, 640) - 32 - 10) / 2;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {header}
      {/* Progress */}
      <View style={styles.progressWrap}>
        <View style={styles.progressRow}>
          <Icon name="creation-outline" size={16} color={colors.primaryText} />
          <Text style={styles.progressLabel}>{editing ? 'EDIT & RESUBMIT' : 'PHOTOS & DETAILS'} · {done} OF {steps.length} DONE</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${(done / steps.length) * 100}%` }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 120 + insets.bottom }]} keyboardShouldPersistTaps="handled">
        {remark && (
          <Notice tone="danger" icon="message-alert-outline" title="Staff remark" style={{ marginBottom: 16 }}>
            {remark}
          </Notice>
        )}
        {error && (
          <Notice tone="danger" icon="alert-circle-outline" style={{ marginBottom: 16 }}>
            {error}
          </Notice>
        )}

        <MediaPicker items={media} onChange={setMedia} limits={limits} />
        <Notice tone="primary" icon="lightbulb-on-outline" style={{ marginTop: 12 }}>
          Tip: clear daylight photos from a few angles get more replies. Add a short video to show the item working.
        </Notice>

        <Text style={styles.label}>Category</Text>
        <TouchableOpacity style={styles.rowField} onPress={() => setCategoryPickerVisible(true)} accessibilityRole="button" accessibilityLabel={category ? `Category: ${category.name}. Change` : 'Choose a category'}>
          <View style={styles.rowIcon}>
            <Icon name={categoryIcon(parentCategory?.slug ?? category?.slug ?? '')} size={18} color={colors.primaryText} />
          </View>
          {category ? (
            <Text style={styles.rowText} numberOfLines={1}>
              {parentCategory ? <Text style={{ color: colors.textMuted }}>{parentCategory.name}  ›  </Text> : null}
              <Text style={{ color: colors.primaryText, fontFamily: font.semibold }}>{category.name}</Text>
            </Text>
          ) : (
            <Text style={[styles.rowText, { color: colors.placeholder }]}>Choose a category</Text>
          )}
          <Icon name="pencil-outline" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <Text style={styles.label}>City</Text>
        <TouchableOpacity style={styles.rowField} onPress={() => setCityPickerVisible(true)} accessibilityRole="button" accessibilityLabel={area ? `City: ${area.cityName}. Change` : 'Choose a city'}>
          <View style={styles.rowIcon}>
            <Icon name="map-marker-outline" size={18} color={colors.primaryText} />
          </View>
          <Text style={[styles.rowText, !area && { color: colors.placeholder }]} numberOfLines={1}>
            {area ? `${area.cityName}, ${area.stateName}` : 'Where is the item?'}
          </Text>
          <Icon name="pencil-outline" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {attributes.length > 0 && (
          <View style={styles.attrGrid}>
            {attributes.map((attr) => {
              const value = attributeValues[attr.id] || '';
              const label = `${attr.name}${attr.isRequired ? ' *' : ''}`;
              return (
                <View key={attr.id} style={{ width: half }}>
                  <Text style={styles.label}>{label}</Text>
                  {attr.options.length > 0 ? (
                    <TouchableOpacity style={styles.select} onPress={() => setOptionFor(attr)} accessibilityRole="button" accessibilityLabel={`${attr.name}: ${value || 'not set'}`}>
                      <Text style={[styles.selectText, !value && { color: colors.placeholder }]} numberOfLines={1}>
                        {attr.options.find((o) => o.value === value)?.label ?? (value || 'Select')}
                      </Text>
                      <Icon name="menu-down" size={22} color={colors.textMuted} />
                    </TouchableOpacity>
                  ) : (
                    <TextInput
                      style={styles.input}
                      placeholderTextColor={colors.placeholder}
                      placeholder={attr.dataType === 'NUMBER' ? '0' : ''}
                      keyboardType={attr.dataType === 'NUMBER' ? 'numeric' : 'default'}
                      value={value}
                      onChangeText={(t) => setAttributeValues({ ...attributeValues, [attr.id]: attr.dataType === 'NUMBER' ? t.replace(/[^\d.]/g, '') : t })}
                      accessibilityLabel={attr.name}
                    />
                  )}
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.labelRow}>
          <Text style={styles.label}>Ad title</Text>
          <Text style={styles.counter}>{title.length} / {TITLE_MAX}</Text>
        </View>
        <TextInput style={styles.input} placeholder="e.g. iPhone 14 128GB, blue, with box" placeholderTextColor={colors.placeholder} value={title} onChangeText={setTitle} maxLength={TITLE_MAX} accessibilityLabel="Ad title" />

        <Text style={styles.label}>Item condition</Text>
        <View style={styles.condGrid}>
          {CONDITIONS.map((c) => {
            const active = condition === c.value;
            return (
              <TouchableOpacity key={c.value} style={[styles.condCard, { width: half }, active && styles.condActive]} onPress={() => setCondition(c.value)} accessibilityRole="radio" accessibilityState={{ checked: active }}>
                <Icon name={active ? 'check-circle' : 'circle-outline'} size={20} color={active ? colors.primary : colors.borderStrong} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.condTitle}>{c.label}</Text>
                  <Text style={styles.condSub} numberOfLines={1}>{c.hint}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Price</Text>
        <View style={styles.priceRow}>
          <View style={styles.rupeeBox}><Text style={styles.rupee}>₹</Text></View>
          <TextInput style={styles.priceInput} placeholder="0" placeholderTextColor={colors.placeholder} keyboardType="number-pad" value={price} onChangeText={(t) => setPrice(t.replace(/[^\d]/g, ''))} accessibilityLabel="Price in rupees" />
        </View>
        <Text style={styles.hint}>Buyers can send offers; you choose whether to accept, counter or decline.</Text>

        <View style={styles.labelRow}>
          <Text style={styles.label}>Description</Text>
          <Text style={[styles.counter, description.length >= DESC_RECOMMENDED && { color: colors.success }]}>Recommended: {DESC_RECOMMENDED}+ chars ({description.length})</Text>
        </View>
        <TextInput
          style={[styles.input, { height: 130, textAlignVertical: 'top', paddingTop: 12 }]}
          placeholder="Age, condition, what's included, reason for selling…"
          placeholderTextColor={colors.placeholder}
          multiline
          value={description}
          onChangeText={setDescription}
          accessibilityLabel="Description"
        />

        <Text style={styles.hint}>You can post up to {limits.listingsPerDay} ads a day. Every ad is checked before it goes live.</Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Button title="Save draft" variant="soft" onPress={handleSaveDraft} loading={saving === 'draft'} disabled={!!saving || uploading} style={{ flex: 1 }} />
        <Button
          title={uploading ? 'Uploading…' : editing ? 'Resubmit for review' : 'Submit for review'}
          iconRight="arrow-right"
          onPress={handleSubmit}
          loading={saving === 'submit'}
          disabled={!!saving || uploading}
          style={{ flex: 2 }}
        />
      </View>

      <CategoryPicker
        visible={categoryPickerVisible}
        onClose={() => setCategoryPickerVisible(false)}
        selectedId={category?.id}
        onSelectCategory={(cat, parent) => {
          if (cat.id !== category?.id) setAttributeValues({});
          setCategory(cat);
          setParentCategory(parent);
        }}
      />
      <LocationModal visible={cityPickerVisible} onClose={() => setCityPickerVisible(false)} selectedCity={area?.cityName ?? ''} onSelectCity={(a) => a && setArea(a)} sellingOnly />
      <OptionSheet
        visible={!!optionFor}
        title={optionFor?.name ?? ''}
        options={optionFor?.options.map((o) => ({ value: o.value, label: o.label })) ?? []}
        selected={optionFor ? attributeValues[optionFor.id] : undefined}
        onSelect={(v) => optionFor && setAttributeValues((prev) => ({ ...prev, [optionFor.id]: v }))}
        onClose={() => setOptionFor(null)}
      />
    </SafeAreaView>
  );
};

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    progressWrap: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border },
    progressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    progressLabel: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.6, color: c.primaryText },
    track: { height: 6, borderRadius: 3, backgroundColor: c.surface2, overflow: 'hidden' },
    fill: { height: 6, borderRadius: 3, backgroundColor: c.primary },
    scroll: { padding: 16 },
    label: { color: c.text, fontFamily: font.semibold, fontSize: 14, marginBottom: 8, marginTop: 18 },
    labelRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
    counter: { fontFamily: font.semibold, fontSize: 11, color: c.textMuted, marginBottom: 8 },
    rowField: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
    rowIcon: { width: 34, height: 34, borderRadius: 8, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
    rowText: { flex: 1, fontFamily: font.regular, fontSize: 15, color: c.text },
    attrGrid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 10 },
    select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 48, paddingHorizontal: 12, borderRadius: 10, backgroundColor: c.surface, borderWidth: 1, borderColor: c.inputBorder },
    selectText: { flex: 1, fontFamily: font.regular, fontSize: 15, color: c.text },
    input: { backgroundColor: c.inputBg, color: c.text, borderRadius: 10, paddingHorizontal: 12, minHeight: 48, borderWidth: 1, borderColor: c.inputBorder, fontFamily: font.regular, fontSize: 15 },
    condGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    condCard: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
    condActive: { backgroundColor: c.primarySoft, borderColor: c.primary },
    condTitle: { fontFamily: font.semibold, fontSize: 14, color: c.text },
    condSub: { fontFamily: font.regular, fontSize: 11, color: c.textMuted, marginTop: 1 },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    rupeeBox: { width: 48, height: 56, borderRadius: 10, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border },
    rupee: { fontFamily: font.heading, fontSize: 22, color: c.text },
    priceInput: { flex: 1, height: 56, borderRadius: 10, borderWidth: 1, borderColor: c.inputBorder, backgroundColor: c.inputBg, paddingHorizontal: 14, fontFamily: font.headingX, fontSize: 26, color: c.text },
    hint: { color: c.textMuted, fontSize: 12, marginTop: 8, fontFamily: font.regular, lineHeight: 17 },
    footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border },
  });
