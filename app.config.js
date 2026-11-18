// app.json is the real config (eas init / eas update:configure write to it).
// This wrapper only exists for one case: publishing an update that Expo Go can open.
// Expo Go only loads updates whose runtime version is its SDK ("exposdk:58.0.0"),
// while our own builds use the app version ("0.9.0"). Run e.g.
//   BECHO_EXPO_GO=1 npx eas-cli update --branch preview --message "…"
// to publish the Expo Go flavour. See docs/BETA-DISTRIBUTION.md.
module.exports = ({ config }) =>
  process.env.BECHO_EXPO_GO === '1' ? { ...config, runtimeVersion: { policy: 'sdkVersion' } } : config;
