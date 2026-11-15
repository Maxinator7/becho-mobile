import React, { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors, font, useTheme, useThemedStyles } from '../theme/ThemeContext';
import { Icon } from './ui';
import { MediaLimits, compressImage, fileSize, formatMB, uploadMedia } from '../utils/media';

export interface MediaItem {
  key: string;
  kind: 'IMAGE' | 'VIDEO';
  previewUri: string;
  status: 'uploading' | 'done' | 'error';
  progress: number;
  uploadId?: string;
  /** Set for files already attached to the listing being edited (sent back as { mediaId }). */
  mediaId?: string;
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

  const total = items.filter((m) => m.status !== 'error').length;
  const maxTotal = limits.maxImagesPerListing + limits.maxVideosPerListing;

  return (
    <View>
      <View style={styles.headRow}>
        <Text style={styles.headTitle}>Photos & video</Text>
        <Text style={styles.headCount}>{total} / {maxTotal} items</Text>
      </View>
      <TouchableOpacity style={styles.dropTile} onPress={pickFromLibrary} accessibilityRole="button" accessibilityLabel="Add photos or a video from your gallery">
        <View style={styles.dropIcon}>
          <Icon name="camera-plus-outline" size={24} color={colors.primaryText} />
        </View>
        <Text style={styles.dropTitle}>Add photos (up to {limits.maxImagesPerListing}) & {limits.maxVideosPerListing} video</Text>
        <Text style={styles.dropSub}>
          Video up to {limits.maxVideoSeconds}s and {formatMB(limits.maxVideoBytes)}. The first photo is the cover.
        </Text>
        <TouchableOpacity style={styles.cameraBtn} onPress={takePhoto} accessibilityRole="button" accessibilityLabel="Take a photo with the camera">
          <Icon name="camera-outline" size={16} color={colors.primaryText} />
          <Text style={styles.cameraText}>Take a photo</Text>
        </TouchableOpacity>
      </TouchableOpacity>
      {notice && <Text style={styles.notice}>{notice}</Text>}

      {items.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 10 }}>
          {items.map((m, i) => (
            <View key={m.key} style={[styles.tile, m.status === 'error' && { borderColor: colors.danger, borderWidth: 2 }]}>
              {m.kind === 'IMAGE' ? (
                <Image source={{ uri: m.previewUri }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.videoThumb]}>
                  <Icon name="play-circle-outline" size={30} color="#FFFFFF" />
                </View>
              )}
              {i === 0 && m.kind === 'IMAGE' && <Text style={[styles.tag, { backgroundColor: colors.primary }]}>COVER</Text>}
              {m.kind === 'VIDEO' && (
                <View style={styles.videoTag}>
                  <Icon name="video-outline" size={11} color="#FFFFFF" />
                  <Text style={styles.videoTagText}>VIDEO</Text>
                </View>
              )}
              <TouchableOpacity style={styles.remove} onPress={() => remove(m.key)} accessibilityLabel="Remove" hitSlop={6}>
                <Icon name="close" size={14} color="#FFFFFF" />
              </TouchableOpacity>
              {i > 0 && m.kind === 'IMAGE' && m.status === 'done' && (
                <TouchableOpacity style={styles.coverBtn} onPress={() => makeCover(m.key)} accessibilityLabel="Make cover photo">
                  <Text style={styles.coverBtnText}>Set cover</Text>
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
    headRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 },
    headTitle: { fontFamily: font.heading, fontSize: 17, color: c.text },
    headCount: { fontFamily: font.semibold, fontSize: 12, color: c.textMuted },
    dropTile: { alignItems: 'center', paddingVertical: 18, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.borderStrong, backgroundColor: c.surface },
    dropIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    dropTitle: { fontFamily: font.semibold, fontSize: 14, color: c.text, textAlign: 'center' },
    dropSub: { fontFamily: font.regular, fontSize: 12, color: c.textMuted, textAlign: 'center', marginTop: 2 },
    cameraBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: c.primarySoft },
    cameraText: { fontFamily: font.semibold, fontSize: 12, color: c.primaryText },
    notice: { color: c.danger, fontSize: 12, marginTop: 6, fontFamily: font.medium },
    tile: { width: 92, height: 92, borderRadius: 10, overflow: 'hidden', backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border },
    thumb: { width: '100%', height: '100%' },
    videoThumb: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F172A' },
    tag: { position: 'absolute', left: 4, top: 4, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, color: '#fff', fontSize: 9, fontFamily: font.bold, overflow: 'hidden', letterSpacing: 0.4 },
    videoTag: { position: 'absolute', left: 4, bottom: 4, flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.65)' },
    videoTagText: { color: '#fff', fontSize: 9, fontFamily: font.bold },
    remove: { position: 'absolute', right: 4, top: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center' },
    coverBtn: { position: 'absolute', left: 4, bottom: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.65)' },
    coverBtnText: { color: '#fff', fontSize: 9, fontFamily: font.semibold },
    progressOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
    progressText: { color: '#fff', fontFamily: font.bold },
    progressBar: { position: 'absolute', left: 0, bottom: 0, height: 4, backgroundColor: c.primary },
    errorText: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 3, backgroundColor: c.danger, color: '#fff', fontSize: 9 },
  });
