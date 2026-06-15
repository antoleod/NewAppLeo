# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start dev server (choose platform)
npm run start          # interactive — pick platform
npm run web            # web only
npm run android        # Android
npm run ios            # iOS

# Type checking
npm run typecheck

# Lint (ESLint 9 flat config, eslint-config-expo)
npm run lint

# Unit tests (custom runner — discovers tests/*.test.ts, runs each with tsx)
npm test

# Web production build (export + PWA manifest injection)
npm run build:web

# Playwright live smoke test against a running site
npm run smoke

# Firebase rules/indexes deployment
npm run firebase:deploy:rules
npm run firebase:deploy:indexes
```

`npm test` runs the pure-logic tests in `tests/` (sync-queue merge logic, food suggestions) via `scripts/run-tests.mjs` — there is no Jest/Vitest. CI (`.github/workflows/test.yml`, the `CI` workflow) runs typecheck + lint + test + web build on every push/PR.

## Architecture Overview

**Expo Router** app (file-based routing) targeting iOS, Android, and Web simultaneously.

### Route structure

```
app/
  _layout.tsx           ← Root: providers, biometric lock, incognito overlay
  index.tsx             ← Redirects to /login or /home
  (auth)/               ← login, register, pair
  (app)/
    _layout.tsx         ← Auth guard + onboarding redirect
    onboarding.tsx
    entry/[type].tsx    ← Universal entry form (feed, food, sleep, diaper, medication, vaccine, measurement, symptom, temperature, milestone, pump)
    (tabs)/
      home.tsx          ← Main dashboard
      history.tsx
      insights.tsx
      profile.tsx
      settings-theme.tsx
```

### Provider hierarchy (root `_layout.tsx`)

```
AuthProvider → LocaleProvider → ThemeProvider → ToastProvider
  → AppDataProvider → TimerProvider → IconPackProvider
```

The root layout also handles biometric auto-lock (re-locks on return from background via `expo-local-authentication`) and an incognito overlay (hides content when backgrounded).

### Data flow

- **Authenticated users**: entries live in Firestore at `users/{uid}/entries`, synced via `onSnapshot` in `AppDataContext`.
- **Guest mode**: entries stored in `AsyncStorage` via `src/services/localStore.ts`. Offline writes are queued in `src/lib/sync.ts` and flushed when connectivity returns.
- `AppDataContext` abstracts the difference — components always call `addEntry / updateEntry / deleteEntry` without knowing whether they're online or offline.

### Theme system (`src/theme.ts`)

Three independent axes:
- **Variant** (`sage | rose | navy | sand`) — color palette
- **PaletteMode** (`nuit | jour`) — dark/light
- **SurfaceStyle** (`default | photo | classic`) — `default` = frosted glass, `photo` = more transparent (vivid background), `classic` = solid opaque

`getThemeTokens(resolvedMode, variant, customOverride, surfaceMode)` returns `{ theme, colors, gradients }`. Components consume via `useTheme()` from `src/context/ThemeContext.tsx`.

A separate **icon pack** axis (`soft | classic | outline | bold`) lives in `src/components/icons/` — packs are swapped via `IconPackContext`, independent of the theme variant.

### i18n

Custom lightweight system — no i18next or react-intl.

- Locale files: `src/locales/{en,fr,es,nl}.json`
- Engine: `src/lib/i18n.ts` — dot-notation lookup, variable interpolation with `{key}` syntax
- Hook: `const { t, format, language } = useTranslation()` from `src/hooks/useTranslation.ts`
- Language stored on `UserProfile.language` (Firestore) or `BabyProfile.language` (AsyncStorage)
- Supported: `'fr' | 'es' | 'en' | 'nl'` (type `AppLanguage` in `src/types.ts`)

**Rule**: never hardcode visible text in components. Always use `t('section.key')`. When adding a new key, add it to all four locale files.

### Auth

Firebase Auth + Firestore profile at `users/{uid}`. Three modes:
1. **Email/password**
2. **Google** (redirect flow, handles web + native)
3. **Guest** — local-only profile stored in AsyncStorage, no Firebase account

`AuthContext` exposes `user`, `profile`, `guestMode`. The `profile` object (`UserProfile`) holds theme mode, language, and onboarding status.

### Source structure

```
src/
  components/           # UI components organized by screen domain
    entries/            # Per-type form sections (*Section.tsx, 11 types)
    history/            # HistoryEntryRow, EntryEditSheet, ShareCard, …
    home/               # FoodHistoryRow, NextFeedingCard, TimerModal, …
    icons/              # Icon pack system (soft/classic/outline/bold)
    insights/           # WeightHistoryChart
    navigation/         # TabIcons
    profile/            # BabyEditSheet, DataImporter/Exporter, …
    shared/
      ui/               # Design system: Page, Card, Button, Heading, Input, …
      Chip, Toast, SyncStatusBadge, QuantityPicker, …
    system/             # BabyFlowIcon
  config/               # Third-party setup (firebase.ts)
  context/              # React contexts: AppData, Auth, Locale, Theme, Timer
  data/                 # Static JSON: medications, food-portions, seasonal-foods, leodata
  hooks/                # Domain hooks: useNextFeeding, useFeedingSettings, useTemperatureEntry, …
  i18n/                 # Translation engine (engine.ts) + translations.ts
  lib/                  # Baby-tracking domain logic + sync/storage
    entryComposer/      # Builds entry titles/payloads
    patterns.ts         # Smart alerts and feeding analysis
    sync.ts / storage.ts / sleepDraft.ts / …
  locales/              # en/fr/es/nl JSON translation files
  services/             # External / feature services
    authService, localStore, notifications, photoStorage,
    shareEntry, importExport, pdf, pairingService, …
  utils/                # Pure helpers (no side effects)
    date.ts, shadow.ts, haptics.ts, confirm.ts, crypto.ts, entries.ts
    homeHelpers.ts      # Pure functions extracted from home.tsx
    historyHelpers.ts   # Pure functions extracted from history.tsx
    profileHelpers.ts   # Unit conversions and validation for profile.tsx
  theme.ts              # Color tokens, spacing, radii
  typography.ts         # Text style scale
  types.ts              # EntryRecord, EntryType, UserProfile, AppLanguage, …
```

### Key files

| File | Purpose |
|------|---------|
| `src/types.ts` | All shared types: `EntryRecord`, `EntryType`, `UserProfile`, `AppLanguage` |
| `src/theme.ts` | Theme tokens, palette, surface styles — single source of truth for colors/spacing |
| `src/lib/storage.ts` | All AsyncStorage keys and helpers; `AppSettings` shape and defaults |
| `src/lib/sync.ts` | Offline queue for guest/offline writes |
| `src/services/localStore.ts` | CRUD for entries in AsyncStorage |
| `src/lib/patterns.ts` | Smart alerts and feeding interval analysis |
| `src/lib/entryComposer/` | Builds entry titles/payloads shared by the entry form and history |
| `src/config/firebase.ts` | Firebase app initialization |
| `src/i18n/engine.ts` | i18n engine (dot-notation lookup, interpolation) |
| `app/(app)/entry/[type].tsx` | Entry form — handles all 11 entry types via `type` route param; per-type UI lives in `src/components/entries/*Section.tsx` |

### Environment variables

All Firebase config via `EXPO_PUBLIC_*` variables (required at build time):

```
EXPO_PUBLIC_FIREBASE_API_KEY
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
EXPO_PUBLIC_FIREBASE_PROJECT_ID
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
EXPO_PUBLIC_FIREBASE_APP_ID
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID  (optional)
```

### Path aliases

`@/` maps to `src/` (configured in `tsconfig.json`). Use `@/components/ui`, `@/context/ThemeContext`, etc.

### Platform-specific files

`DateTimeField` has three implementations: `.tsx` (shared), `.native.tsx`, `.web.tsx`. Expo's resolver picks the right one automatically.
