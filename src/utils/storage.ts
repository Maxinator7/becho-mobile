import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Key-value storage: the device keychain/keystore on iOS and Android (expo-secure-store),
 * localStorage on web (secure-store has no web implementation).
 */
const web = Platform.OS === 'web';

export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (web) return globalThis.localStorage?.getItem(key) ?? null;
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (web) return void globalThis.localStorage?.setItem(key, value);
    return SecureStore.setItemAsync(key, value);
  },
  async deleteItem(key: string): Promise<void> {
    if (web) return void globalThis.localStorage?.removeItem(key);
    return SecureStore.deleteItemAsync(key);
  },
};
