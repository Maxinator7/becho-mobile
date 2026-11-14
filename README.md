# `becho-mobile`

Becho Mobile Application — React Native application for iOS and Android built with Expo + TypeScript.

## Structure

```text
src/
├── api/            # API client module connecting to becho-api
├── navigation/     # React Navigation configuration
└── screens/        # Screen components (Buyer / Seller)
App.tsx             # Root Expo component
```

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run start
   ```

3. Run on Android / iOS:
   ```bash
   npm run android
   npm run ios
   ```

## API URL

Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL`:

- Android emulator: `http://10.0.2.2:4000/api/v1` (default)
- iOS simulator: `http://localhost:4000/api/v1`
- Physical device: `http://<your-computer-LAN-IP>:4000/api/v1`

Sessions are stored with `expo-secure-store` and refreshed automatically.

## Requirements

- Expo SDK 58 (use the current Expo Go from the App Store / Play Store).
- Node.js 22.13+ (Node 24 recommended; `.nvmrc` is provided, run `nvm use`).

## Run against the staging API

Put `EXPO_PUBLIC_API_URL=https://becho-api.onrender.com/api/v1` in `.env`, then `npx expo start` and scan the QR code with Expo Go.

## Photos, videos, notifications and themes

- **Selling:** pick photos from the gallery or camera, plus one video. Photos are resized on the phone (max 1600px, JPEG) and every file uploads straight to storage with a progress bar. Limits come from the API (`GET /media/limits`).
- **Notifications:** 🔔 on the home screen shows unread messages and offers, checked every 20s while the app is open. Tapping one opens the right chat or listing. Push notifications need an EAS development build (Expo Go can't receive them on Android) and are planned for later.
- **Chat:** offers, counters, accepts and sales appear inline. When a deal is agreed the seller can mark the item as sold or cancel the reservation.
- **Theme:** ◐ / ☀︎ / ☾ in the home header switches between automatic, light and dark.

### Testing uploads against a local API on your phone

The phone can't reach `localhost`, so use your Mac's LAN IP (e.g. `192.168.1.20`):

- Mobile `.env`: `EXPO_PUBLIC_API_URL=http://192.168.1.20:4000/api/v1`
- API `.env`: `PUBLIC_API_URL=http://192.168.1.20:4000` (upload links point here when `STORAGE_DRIVER=local`)
