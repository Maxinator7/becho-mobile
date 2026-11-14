import React, { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors, useTheme, useThemedStyles } from '../theme/ThemeContext';
import { MediaLimits, compressImage, fileSize, formatMB, uploadMedia } from '../utils/media';

export interface MediaItem {
  key: string;
  kind: 'IMAGE' | 'VIDEO';
  previewUri: string;
  status: 'uploading' | 'done' | 'error';
  progress: number;
  uploadId?: string;
  error?: string;
}

interface Props {
  items: MediaItem[];
  onChange: (update: (prev: MediaItem[]) => MediaItem[]) => void;
  limits: MediaLimits;
}

const VIDEO_TYPES: Record<string, string> = { mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', m4v: 'video/mp4' };

/** Pick photos (camera or gallery) and one video; each uploads right away with progress. */
export const MediaPicker: React.FC<Props> = ({ items, onChange, limits }) => {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const [notice, setNotice] = useState<string | null>(null);

  const update = (key: string, patch: Partial<MediaItem>) =>
    onChange((prev) => prev.map((m) => (m.key === key ? { ...m, ...patch } : m)));

  const imageCount = items.filter((m) => m.kind === 'IMAGE' && m.status !== 'error').length;
  const videoCount = items.filter((m) => m.kind === 'VIDEO' && m.status !== 'error').length;

  const uploadAsset = async (item: MediaItem, asset: ImagePicker.ImagePickerAsset) => {
    try {
      if (item.kind === 'IMAGE') {
        const uri = await compressImage(asset.uri, asset.width, asset.height);
        const size = await fileSize(uri);
        if (size > limits.maxImageBytes) throw new Error(`Larger than ${formatMB(limits.maxImageBytes)}`);
        const uploadId = await uploadMedia(uri, 'image/jpeg', size, (p) => update(item.key, { progress: p }));
        update(item.key, { status: 'done', uploadId });
      } else {
        const ext = (asset.fileName ?? asset.uri).split('.').pop()?.toLowerCase() ?? 'mp4';
        const type = asset.mimeType && asset.mimeType.startsWith('video/') ? asset.mimeType : VIDEO_TYPES[ext] ?? 'video/mp4';
        const size = asset.fileSize ?? (await fileSize(asset.uri));
        const seconds = asset.duration ? asset.duration / 1000 : undefined;
        if (size > limits.maxVideoBytes) throw new Error(`Larger than ${formatMB(limits.maxVideoBytes)}`);
        if (seconds && seconds > limits.maxVideoSeconds + 0.5) throw new Error(`Longer than ${limits.maxVideoSeconds}s`);
        const uploadId = await uploadMedia(asset.uri, type, size, (p) => update(item.key, { progress: p }), seconds && Math.floor(seconds));
        update(item.key, { status: 'done', uploadId });
      }
    } catch (err) {
      update(item.key, { status: 'error', error: err instanceof Error ? err.message : 'Upload failed' });
    }
  };

  const addAssets = (assets: ImagePicker.ImagePickerAsset[]) => {
    const problems: string[] = [];
    let images = imageCount;
    let videos = videoCount;
    const added: { item: MediaItem; asset: ImagePicker.ImagePickerAsset }[] = [];
    for (const asset of assets) {
      const kind = asset.type === 'video' ? 'VIDEO' : 'IMAGE';
      if (kind === 'IMAGE' && images >= limits.maxImagesPerListing) { problems.push(`Up to ${limits.maxImagesPerListing} photos`); continue; }
      if (kind === 'VIDEO' && videos >= limits.maxVideosPerListing) { problems.push(`Up to ${limits.maxVideosPerListing} video`); continue; }
      if (kind === 'IMAGE') images++; else videos++;
      added.push({
        asset,
        item: { key: `${Date.now()}-${Math.random().toString(36).slice(2)}`, kind, previewUri: asset.uri, status: 'uploading', progress: 0 },
      });
    }
    setNotice(problems.length ? Array.from(new Set(problems)).join(' · ') : null);
    if (!added.length) return;
    onChange((prev) => [...prev, ...added.map((a) => a.item)]);
    added.forEach(({ item, asset }) => void uploadAsset(item, asset));
  };

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow access to your photos to add them to your listing.');
      return;
    }
    const remainingPhotos = limits.maxImagesPerListing - imageCount;
    const canAddVideo = videoCount < limits.maxVideosPerListing;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: canAddVideo ? ['images', 'videos'] : ['images'],
      allowsMultipleSelection: true,
      selectionLimit: Math.max(1, remainingPhotos + (canAddVideo ? 1 : 0)),
      quality: 1,
      videoMaxDuration: limits.maxVideoSeconds,
    });
    if (!result.canceled) addAssets(result.assets);
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow camera access to take photos of your item.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
    if (!result.canceled) addAssets(result.assets);
  };

  const remove = (key: string) => onChange((prev) => prev.filter((m) => m.key !== key));
  const makeCover = (key: string) =>
    onChange((prev) => {
      const idx = prev.findIndex((m) => m.key === key);
      if (idx <= 0) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      return [item, ...next];
    });

  return (
    <View>
      <View style={styles.buttons}>
        <TouchableOpacity style={styles.addBtn} onPress={pickFromLibrary} accessibilityRole="button">
          <Text style={styles.addBtnText}>🖼️  Gallery</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addBtn} onPress={takePhoto} accessibilityRole="button">
          <Text style={styles.addBtnText}>📷  Camera</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>
        Up to {limits.maxImagesPerListing} photos and {limits.maxVideosPerListing} video ({formatMB(limits.maxVideoBytes)}, {limits.maxVideoSeconds}s max). First photo is the cover.
      </Text>
      {notice && <Text style={styles.notice}>{notice}</Text>}

      {items.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 8 }}>
          {items.map((m, i) => (
            <View key={m.key} style={[styles.tile, m.status === 'error' && { borderColor: colors.danger, borderWidth: 2 }]}>
              {m.kind === 'IMAGE' ? (
                <Image source={{ uri: m.previewUri }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.videoThumb]}><Text style={styles.videoIcon}>▶</Text></View>
              )}
              {i === 0 && m.kind === 'IMAGE' && <Text style={[styles.tag, { backgroundColor: colors.primary }]}>Cover</Text>}
              {m.kind === 'VIDEO' && <Text style={styles.tag}>Video</Text>}
              <TouchableOpacity style={styles.remove} onPress={() => remove(m.key)} accessibilityLabel="Remove">
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>
              {i > 0 && m.kind === 'IMAGE' && m.status === 'done' && (
                <TouchableOpacity style={styles.coverBtn} onPress={() => makeCover(m.key)} accessibilityLabel="Make cover photo">
                  <Text style={styles.coverBtnText}>Cover</Text>
                </TouchableOpacity>
              )}
              {m.status === 'uploading' && (
                <View style={styles.progressOverlay}>
                  <Text style={styles.progressText}>{Math.round(m.progress * 100)}%</Text>
                  <View style={[styles.progressBar, { width: `${m.progress * 100}%` }]} />
                </View>
              )}
              {m.status === 'error' && <Text style={styles.errorText} numberOfLines={2}>{m.error}</Text>}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    buttons: { flexDirection: 'row', gap: 10 },
    addBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: c.inputBorder, backgroundColor: c.surface2, alignItems: 'center' },
    addBtnText: { color: c.text, fontWeight: '600' },
    hint: { color: c.textMuted, fontSize: 12, marginTop: 8 },
    notice: { color: c.danger, fontSize: 12, marginTop: 6 },
    tile: { width: 96, height: 96, borderRadius: 10, overflow: 'hidden', backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border },
    thumb: { width: '100%', height: '100%' },
    videoThumb: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
    videoIcon: { color: '#fff', fontSize: 28 },
    tag: { position: 'absolute', left: 4, top: 4, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: 10, fontWeight: '700', overflow: 'hidden' },
    remove: { position: 'absolute', right: 4, top: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center' },
    removeText: { color: '#fff', fontSize: 12 },
    coverBtn: { position: 'absolute', left: 4, bottom: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.65)' },
    coverBtnText: { color: '#fff', fontSize: 10 },
    progressOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
    progressText: { color: '#fff', fontWeight: '700' },
    progressBar: { position: 'absolute', left: 0, bottom: 0, height: 4, backgroundColor: c.primary },
    errorText: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 3, backgroundColor: c.danger, color: '#fff', fontSize: 9 },
  });
