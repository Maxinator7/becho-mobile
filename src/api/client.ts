import * as SecureStore from 'expo-secure-store';

// Android emulator reaches the host machine at 10.0.2.2; iOS simulator can use localhost.
// For a physical device set EXPO_PUBLIC_API_URL to your machine's LAN IP in .env.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:4000/api/v1';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const ACCESS_KEY = 'becho.accessToken';
const REFRESH_KEY = 'becho.refreshToken';

// In-memory copy so requests don't hit secure storage every time.
let tokens: AuthTokens | null = null;
let onSessionExpired: (() => void) | null = null;

export const session = {
  /** Loads persisted tokens on app start. */
  async restore(): Promise<AuthTokens | null> {
    const [accessToken, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_KEY),
      SecureStore.getItemAsync(REFRESH_KEY),
    ]);
    tokens = accessToken && refreshToken ? { accessToken, refreshToken } : null;
    return tokens;
  },
  async save(next: AuthTokens) {
    tokens = next;
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_KEY, next.accessToken),
      SecureStore.setItemAsync(REFRESH_KEY, next.refreshToken),
    ]);
  },
  async clear() {
    tokens = null;
    await Promise.all([SecureStore.deleteItemAsync(ACCESS_KEY), SecureStore.deleteItemAsync(REFRESH_KEY)]);
  },
  get refreshToken() {
    return tokens?.refreshToken ?? null;
  },
  /** AuthContext registers this to drop the user when refresh fails. */
  onExpired(handler: (() => void) | null) {
    onSessionExpired = handler;
  },
};

let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (!tokens) return false;
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });
    const json = await res.json();
    if (res.ok && json.success) {
      await session.save(json.data);
      return true;
    }
  } catch {
    return false; // network issue: keep the session, retry later
  }
  await session.clear();
  onSessionExpired?.();
  return false;
}

function rawRequest(endpoint: string, options: RequestInit) {
  return fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(tokens ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
      ...((options.headers as Record<string, string>) || {}),
    },
  });
}

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  try {
    let response = await rawRequest(endpoint, options);
    if (response.status === 401 && tokens && !endpoint.startsWith('/auth/')) {
      refreshInFlight ??= refreshSession().finally(() => {
        refreshInFlight = null;
      });
      if (await refreshInFlight) response = await rawRequest(endpoint, options);
    }
    return await response.json();
  } catch (error) {
    console.error('Mobile API Error:', error);
    return { success: false, error: { code: 'NETWORK_ERROR', message: 'Could not connect to Becho. Check your connection.' } };
  }
}
