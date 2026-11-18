# Getting the Becho app to beta testers

This repo is ready for [EAS](https://expo.dev/eas) (Expo Application Services). Nothing has been built or published yet —
you run the commands below with **your own** Expo account. Android testers get an installable APK; iPhone testers use
**Expo Go** (no Apple Developer account needed).

What's already configured:

| File | What it sets |
|---|---|
| `app.json` | version `0.9.0`, iOS `bundleIdentifier` / Android `package` `in.becho.app`, iOS `buildNumber` "1", Android `versionCode` 1, `runtimeVersion` policy `appVersion`, an `updates` block for EAS Update |
| `eas.json` | `preview` profile (internal distribution, Android **APK**, channel `preview`) and `production` profile (Android **app bundle**, channel `production`), both with `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_WEB_URL` |
| `app.config.js` | a tiny wrapper around `app.json`, only used to publish updates that Expo Go can open (see step 4) |

`EXPO_PUBLIC_API_URL` = `https://becho-api.onrender.com/api/v1`, `EXPO_PUBLIC_WEB_URL` = `https://becho-web.gautamwarmachine68.workers.dev`
(the in-app "Terms & privacy" links open `<web>/privacy`, so publish `becho-web/docs/beta-privacy.md` there first).

---

## 1. One-time setup

1. Create a free account at <https://expo.dev/signup>.
2. In this folder (Node 24: `nvm use`):
   ```bash
   npx eas-cli@latest login
   npx eas-cli@latest init
   ```
   `init` creates the project on expo.dev and writes `extra.eas.projectId` (and `owner`) into `app.json`.
3. Connect EAS Update:
   ```bash
   npx eas-cli@latest update:configure
   ```
   This adds `updates.url` (`https://u.expo.dev/<projectId>`) to `app.json`. **The `updates` block in `app.json` has no
   `url` yet on purpose — this command fills it in.** Builds made before this step can't receive updates.
4. Commit the `app.json` changes these commands made.

> The `slug` is `becho-mobile`. If you want a different project name on expo.dev, change `slug` in `app.json` **before** `init`.

## 2. Android testers: build an installable APK

```bash
npx eas-cli@latest build --platform android --profile preview
```

- The first build asks to generate an Android keystore — say **yes** and let EAS store it (don't lose it; it signs every future build).
- The build runs on Expo's servers (queue time varies on the free plan). When it finishes you get a **link and a QR code**
  (also on expo.dev → your project → Builds). Share that link; testers open it on their phone, download the APK and allow
  "install from this source" once.
- The build bakes in the env from `eas.json` (staging API + website), regardless of your local `.env`.

## 3. iPhone testers: Expo Go

Installing a real iOS build on testers' phones needs a paid Apple Developer account (ad-hoc or TestFlight). Until then,
iPhone testers can run Becho inside **Expo Go**:

1. Testers install **Expo Go** from the App Store (it must be the version for Expo SDK 58).
2. You publish an update that Expo Go can load (note the `BECHO_EXPO_GO=1` and the env vars):
   ```bash
   BECHO_EXPO_GO=1 \
   EXPO_PUBLIC_API_URL=https://becho-api.onrender.com/api/v1 \
   EXPO_PUBLIC_WEB_URL=https://becho-web.gautamwarmachine68.workers.dev \
   npx eas-cli@latest update --branch preview --message "Beta: first iPhone build"
   ```
3. On expo.dev → your project → **Updates** → open the update → **Preview** shows a QR code / link. Share it; testers scan
   it with the iPhone camera and it opens in Expo Go.

Why `BECHO_EXPO_GO=1`: Expo Go only opens updates whose runtime version is its SDK version (`exposdk:58.0.0`), while our own
builds use the app version (`0.9.0`, from `runtimeVersion.policy: "appVersion"`). The flag makes `app.config.js` switch the
policy to `sdkVersion` for that one command; nothing in `app.json` changes. If expo.dev says an update isn't compatible with
Expo Go, check that you used the flag. (Expo Go behaviour can change between SDKs — if this stops working, see
"Preview updates" in the Expo docs, or share a development server instead with `npx expo start --tunnel`, which only works
while your computer is running it.)

Expo Go limits worth knowing: push notifications and anything that needs custom native code won't work there; everything
Becho uses today (camera, photos, video, secure storage) does.

## 4. Pushing fixes (no new install needed)

JavaScript/TypeScript and asset changes can go out over the air with EAS Update. Testers get them the next time they open the
app (the app checks on launch, downloads in the background, and applies it on the following launch).

```bash
# Android APK testers (runtime 0.9.0, channel "preview")
EXPO_PUBLIC_API_URL=https://becho-api.onrender.com/api/v1 \
EXPO_PUBLIC_WEB_URL=https://becho-web.gautamwarmachine68.workers.dev \
npx eas-cli@latest update --branch preview --message "Fix: city pill text"

# iPhone / Expo Go testers — same command with BECHO_EXPO_GO=1 in front
```

- **Env vars:** `eas update` bundles on your machine, so it does **not** read the `env` in `eas.json` (that's only for
  builds). Pass the URLs as above, or put them in `.env`, or define them as EAS environment variables on expo.dev and add
  `--environment preview` to the command. Otherwise an update could point the app at the wrong API.
- Both updates can live on the `preview` branch: each phone only picks the one matching its runtime version.
- `eas update` can't ship **native** changes (new native packages, permissions, `app.json` native settings, Expo SDK upgrades).
  For those: bump `version` in `app.json` (e.g. `0.9.1`) → new runtime version → rebuild (step 2) and reshare the APK.
  Old installs keep working with the updates published for their version.
- Roll back a bad update from expo.dev (Updates → republish an earlier one) or with `npx eas-cli update:republish`.
- The version testers are running is attached to every feedback they send (e.g. `0.9.0 (1a2b3c4d)` — the part in brackets is
  the update ID), so you can match reports to updates in the admin Feedback inbox.

## 5. Versions: why `appVersionSource` is `local`

`eas.json` uses `"cli": { "appVersionSource": "local" }`: `app.json` is the single source of truth for `version`,
`ios.buildNumber` and `android.versionCode`, and the runtime version (`appVersion` policy) is derived from that same
`version`. Everything is visible and reviewable in git, which is easier to reason about while there's one developer.
(`remote` would let EAS keep the build numbers on its servers and ignore the numbers in `app.json`.)

What it means for you:
- `preview` APKs: Android doesn't care if `versionCode` repeats for side-loaded installs, but to let testers install a new APK
  **over** the old one, keep `versionCode` the same or higher — bump it (2, 3, …) with each new build to be safe.
- `production` has `autoIncrement: true`, which bumps `versionCode` / `buildNumber` in `app.json` on each production build —
  commit that change afterwards. The Play Store rejects a repeated `versionCode`.
- Change `version` only when you change native code (see step 4).

## 6. Later: store builds

```bash
npx eas-cli@latest build --platform android --profile production   # .aab for Google Play
npx eas-cli@latest submit --platform android --profile production  # needs a Play Console account
```
iOS store/TestFlight builds need an Apple Developer Program membership; EAS will ask for your Apple ID and handle certificates.

## 7. Free plan limits

The free Expo plan limits how many cloud builds you can run per month, build queue priority/concurrency, and EAS Update usage
(monthly active users and bandwidth). These numbers change — **check the current limits on <https://expo.dev/pricing>** before
inviting a large group. Tips: build APKs only when native code changed and use `eas update` for everything else; you can also
build locally for free with `npx eas-cli build --local` (needs Android SDK / Java set up on your machine).

## Checklist before inviting testers

- [ ] `becho-web` deployed with `/privacy` live (the app links to it from the banner, Register and Account).
- [ ] Staging API (`becho-api.onrender.com`) up, with the feedback endpoint (`POST /feedback`) deployed.
- [ ] `eas init` + `eas update:configure` done and committed.
- [ ] Android APK built with `--profile preview`, link shared.
- [ ] Expo Go update published with `BECHO_EXPO_GO=1`, preview QR shared with iPhone testers.
- [ ] Tell testers: tap **Feedback** in the beta strip (or Account → Send feedback) to report anything.
