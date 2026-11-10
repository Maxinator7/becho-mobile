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
