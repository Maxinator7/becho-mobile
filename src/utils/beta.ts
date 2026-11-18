import { Linking } from 'react-native';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import * as WebBrowser from 'expo-web-browser';

/** Public website (marketing pages, privacy notice). Set EXPO_PUBLIC_WEB_URL in .env / eas.json. */
export const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL || 'https://becho-web.gautamwarmachine68.workers.dev').replace(/\/+$/, '');
export const PRIVACY_URL = `${WEB_URL}/privacy`;

/** Opens the beta terms & privacy notice in an in-app browser (falls back to the system browser). */
export async function openPrivacy() {
  try {
    await WebBrowser.openBrowserAsync(PRIVACY_URL);
  } catch {
    Linking.openURL(PRIVACY_URL).catch(() => {});
  }
}

/**
 * App version sent with feedback, e.g. "0.9.0" or "0.9.0 (1a2b3c4d)" when running an EAS Update,
 * so we can tell which over-the-air bundle a tester was on.
 */
export function appVersion(): string {
  const version = Constants.expoConfig?.version ?? Constants.nativeApplicationVersion ?? 'dev';
  let updateId: string | null = null;
  try {
    updateId = Updates.isEmbeddedLaunch ? null : Updates.updateId;
  } catch {
    updateId = null; // expo-updates is unavailable (web, some dev clients)
  }
  return (updateId ? `${version} (${updateId.slice(0, 8)})` : version).slice(0, 40);
}
