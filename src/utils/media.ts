import * as LegacyFS from 'expo-file-system/legacy';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { fetchApi } from '../api/client';

export interface MediaLimits {
  maxImageBytes: number;
  maxVideoBytes: number;
  maxVideoSeconds: number;
  maxImagesPerListing: number;
  maxVideosPerListing: number;
  listingsPerDay: number;
}

export const DEFAULT_LIMITS: MediaLimits = {
  maxImageBytes: 5 * 1024 * 1024,
  maxVideoBytes: 50 * 1024 * 1024,
  maxVideoSeconds: 60,
  maxImagesPerListing: 10,
  maxVideosPerListing: 1,
  listingsPerDay: 5,
};

export async function getMediaLimits(): Promise<MediaLimits> {
  const res = await fetchApi<MediaLimits>('/media/limits');
  return res.success && res.data ? { ...DEFAULT_LIMITS, ...res.data } : DEFAULT_LIMITS;
}

export const formatMB = (bytes: number) => `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;

const MAX_IMAGE_DIMENSION = 1600;

/** Resizes a photo to at most 1600px on the long side and re-encodes it as JPEG (~200–500 KB). */
export async function compressImage(uri: string, width?: number, height?: number): Promise<string> {
  const ctx = ImageManipulator.manipulate(uri);
  if (width && height && Math.max(width, height) > MAX_IMAGE_DIMENSION) {
    ctx.resize(width >= height ? { width: MAX_IMAGE_DIMENSION } : { height: MAX_IMAGE_DIMENSION });
  }
  const image = await ctx.renderAsync();
  const result = await image.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  return result.uri;
}

export async function fileSize(uri: string): Promise<number> {
  const info = await LegacyFS.getInfoAsync(uri);
  return info.exists && 'size' in info && typeof info.size === 'number' ? info.size : 0;
}

interface UploadTicket {
  uploadId: string;
  uploadUrl: string;
  method: 'PUT';
  headers: Record<string, string>;
}

/**
 * Uploads a local file straight to storage (Cloudflare R2 in production) using a short-lived
 * signed URL from the API. Progress is reported from 0 to 1.
 */
export async function uploadMedia(
  uri: string,
  contentType: string,
  size: number,
  onProgress: (fraction: number) => void,
  durationSeconds?: number
): Promise<string> {
  const ticket = await fetchApi<UploadTicket>('/media/uploads', {
    method: 'POST',
    body: JSON.stringify({ contentType, size, durationSeconds }),
  });
  if (!ticket.success || !ticket.data) throw new Error(ticket.error?.message || 'Could not start the upload');

  const task = LegacyFS.createUploadTask(
    ticket.data.uploadUrl,
    uri,
    { httpMethod: 'PUT', uploadType: LegacyFS.FileSystemUploadType.BINARY_CONTENT, headers: ticket.data.headers },
    (p) => p.totalBytesExpectedToSend > 0 && onProgress(p.totalBytesSent / p.totalBytesExpectedToSend)
  );
  const result = await task.uploadAsync();
  if (!result || result.status < 200 || result.status >= 300) {
    throw new Error(`Upload failed${result ? ` (${result.status})` : ''}. Check your connection and try again.`);
  }
  onProgress(1);
  return ticket.data.uploadId;
}
