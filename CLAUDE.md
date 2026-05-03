# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start dev server (choose platform)
npm run start          # interactive — pick platform
npm run web            # web only
npm run android        # Android
npm run ios            # iOS

# Type checking (no test suite exists)
npm run typecheck

# Firebase rules/indexes deployment
npm run firebase:deploy:rules
npm run firebase:deploy:indexes
```

There is no lint script and no automated test suite. Type checking (`npm run typecheck`) is the primary code validation step.

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
AuthProvider → LocaleProvider → ThemeProvider → ToastProvider → AppDataProvider
```

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

### Key files

| File | Purpose |
|------|---------|
| `src/types.ts` | All shared types: `EntryRecord`, `EntryType`, `UserProfile`, `AppLanguage` |
| `src/theme.ts` | Theme tokens, palette, surface styles — single source of truth for colors/spacing |
| `src/lib/storage.ts` | All AsyncStorage keys and helpers; `AppSettings` shape and defaults |
| `src/lib/sync.ts` | Offline queue for guest/offline writes |
| `src/services/localStore.ts` | CRUD for entries in AsyncStorage |
| `src/lib/patterns.ts` | Smart alerts and feeding interval analysis |
| `app/(app)/entry/[type].tsx` | Monolithic entry form — handles all 11 entry types via `type` route param |

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
