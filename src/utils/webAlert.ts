import { Alert, AlertButton, Platform } from 'react-native';

/**
 * react-native-web ships Alert.alert as a no-op, so confirmations never run in the web preview.
 * On web only, map it onto the browser dialogs: one action → confirm(), several → a numbered prompt().
 */
export function installWebAlert() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    // Buttons without a handler (plain "OK") just dismiss, like a cancel button.
    const actions = (buttons ?? []).filter((b) => b.style !== 'cancel' && b.onPress);
    const cancel = (buttons ?? []).find((b) => b.style === 'cancel' || !b.onPress);
    if (actions.length === 0) {
      window.alert(text);
      cancel?.onPress?.();
    } else if (actions.length === 1) {
      if (window.confirm(`${text}\n\nOK = ${actions[0].text}`)) actions[0].onPress?.();
      else cancel?.onPress?.();
    } else {
      const choice = window.prompt(`${text}\n\n${actions.map((b, i) => `${i + 1}. ${b.text}`).join('\n')}\n\nType a number:`);
      const picked = actions[Number(choice) - 1];
      if (picked) picked.onPress?.();
      else cancel?.onPress?.();
    }
  };
}
