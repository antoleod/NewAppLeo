## Current Focus

- [x] Define the target app structure and map live-site features to the new Expo app

## Done

- [x] Create `app/_layout.tsx` with root stack, auth gate, theme provider, and `useColorScheme`
- [x] Create `app/(app)/(tabs)/_layout.tsx` with tabs: `home`, `history`, `insights`, `profile`
- [x] Create `app/(app)/onboarding.tsx` for baby profile creation
- [x] Create `src/lib/storage.ts` for AsyncStorage CRUD and baby namespaces
- [x] Create `src/lib/patterns.ts` for feeding interval computation
- [x] Create `src/lib/who-data.ts` for WHO reference tables
- [x] Create `src/lib/notifications.ts` for summary/reminder messages
- [x] Create `src/lib/pdf.ts` for a first PDF export stub
- [x] Create `src/lib/sync.ts` for a first sync stub
- [x] Replace the main tab screens with working home/history/insights/profile views
- [x] Add `app/(auth)/pair.tsx` for partner pairing
- [x] Add CSV export to `app/(app)/(tabs)/history.tsx`
- [x] Add timeline strip and weekly digest blocks to `app/(app)/(tabs)/home.tsx`
- [x] Add `symptom` entry support to the shared entry model and composer
- [x] Add `TimerWidget` and `QuantityPicker`
- [x] Add hydration and quick presets to `app/(app)/(tabs)/home.tsx`
- [x] Add day navigation to `app/(app)/(tabs)/history.tsx`
- [x] Add milestones to `app/(app)/(tabs)/profile.tsx`
- [x] Add growth and sleep visuals to `app/(app)/(tabs)/insights.tsx`
- [x] Add module visibility persistence and toggles
- [x] Add settings panel with summary time and large touch mode
- [x] Wire saved summary time into the notifications stub
- [x] Propagate large touch mode to timer and quantity controls
- [x] Add red night mode toggle and overlay support
- [x] Make notifications scheduling real
- [x] Make PDF export real
- [x] Add milestone photo attachment
- [x] Make local sync queue real
- [x] Add swipe-to-delete to history rows
- [x] Show milestone photo thumbnails in profile
- [x] Show success/error feedback when scheduling daily summaries
- [x] `TimerWidget`
- [x] `QuantityPicker`
- [x] `BabySwitcher`
- [x] `MilestoneList`
- [x] `SettingsPanel`
- [x] Empty states for all tabs
- [x] Large touch mode
- [x] Red night screen mode
- [x] Wire local sync queue into app writes
- [x] Point auth screens to the pairing flow
- [x] Refactor `app/(app)/entry/[type].tsx` into cleaner type-aware helpers
- [x] Polish `app/(app)/(tabs)/profile.tsx` empty states and baby switcher
- [x] Polish `app/(app)/(tabs)/home.tsx` empty-state handling for hidden modules
- [x] Add real Firestore-backed pairing sessions with local fallback
- [x] Add a background sync flush action for queued entries
- [x] Add a native voice capture bridge
- [x] Add lock screen / home widget support
- [x] Add guest mode to the app start flow
- [x] Add startup theme presets for professional family branding

## Next Up

- [ ] Build the requested visual/effects refactor pass from the latest brief
- [ ] Propagate saved language into any remaining low-priority helper text and export copy
- [x] Add undo toast after delete in history

## Requested Improvements

- [x] Move theme picker out of `app/index.tsx` and keep theme selection in `app/(app)/(tabs)/profile.tsx`
- [x] Keep a single primary `Continuer` CTA on `app/index.tsx` with guest mode as the default path
- [x] Keep `Sign in` as a small text link below the primary CTA on `app/index.tsx`
- [x] Remove `Create account` from `app/index.tsx` and keep it only on `app/(auth)/login.tsx`
- [x] Shorten the landing headline and keep it personal, family-oriented, and in French
- [ ] Rebuild onboarding for three user types: Guest, PIN user, Authenticated user
- [x] Extend onboarding data collection with baby name, birth date, birth weight, current weight, height, optional notes, and language choice
- [x] Load and persist local data from `leodata.json` while staying future-ready for multiple babies
- [x] Refactor dashboard into clean card sections: last feeding, hydration summary, recent activity, quick actions
- [x] Add baby header stats on home with weight and height pulled from measurements
- [x] Split feed quick action into `Sein` and `Biberon`
- [x] Keep `DailyStatusCard` on home with milk total bar, 750-1050 ml zone, and status label
- [x] Keep `NextFeedingCard` on home with countdown or `Possible maintenant` and last feed timestamp
- [x] Keep side-by-side `LastFeedMiniCards` for the latest breast and bottle sessions
- [x] Finish fullscreen timer flow for `Sein` and `Biberon`: black background, animated emoji, centered thin timer, single red `STOP` button, and save bottom sheet
- [x] Keep notes collapsed by default behind `+ Ajouter une note` in `app/(app)/entry/[type].tsx`
- [x] Keep native `DateTimePicker` on native platforms and safe web fallback in `app/(app)/entry/[type].tsx`
- [x] Reduce new-entry logging to max two taps with quick amounts `100/130/150/180 ml`
- [ ] Redesign history grouped by day with mini charts, feeding frequency, daily totals, and weight trend
- [x] Redesign history grouped by day with mini charts, feeding frequency, daily totals, and weight trend
- [x] Refine bottom tab navigation for Home / History / Insights / Profile with compact balanced spacing
- [x] Add UI motion inspired by the live app: countdowns, progress feedback, slide-up sheets, undo toast, tap scale feedback, and smooth transitions
- [x] Add multilingual i18n structure with French default plus Spanish, English, and Dutch
- [x] Add built-in themes plus custom theme builder in profile, persisted locally
- [x] Add baby photo upload and local personalization settings for visible dashboard metrics and hydration goals

## Surprise Additions

- [x] Seed guest/local sessions from `leodata.json` automatically on first launch
- [x] Persist baby profile extras: birth weight, current weight, height, notes, photo, language
- [x] Add a photo picker for the baby header/profile
- [x] Add dashboard metric visibility toggles
- [x] Add configurable hydration goal storage
- [x] Add compact home-card mode
- [x] Add live countdown toggle
- [x] Add emoji pulse toggle for fullscreen timers
- [x] Add gradient hero card toggle
- [x] Add press-scale toggle for quick actions and recent activity cards
- [x] Add locale-aware tab labels
- [x] Add daily summary cards plus weight trend to history
- [x] Add locale-aware insights range view
- [x] Center high-visibility dashboard cards and bottom-sheet actions
- [x] Improve button usability with consistent centered press targets
- [x] Add custom palette controls persisted in profile
- [x] Replace the old history list with a full report screen
- [x] Add OMS reference cards and collapsible monthly OMS table
- [x] Add SVG weight chart with OMS band
- [x] Add structured CSV/PDF/share export for the selected day
- [x] Refactor HomeScreen into a compact report-style layout
- [x] Remove duplicated HomeScreen action buttons and add duplicate-label warnings
- [x] Add reanimated micro-interactions to HomeScreen controls
- [x] Add explicit head circumference support to measurements
- [x] Polish Insights screen to match the compact dashboard/report visual system

## P1 - Critical

- [x] Create `app/(app)/(tabs)/home.tsx` with:
  - [x] `QuickActionBar`
  - [x] `DailyStatusCard`
  - [x] `NextFeedingCard`
  - [x] `TimelineStrip`
  - [x] `WeeklyDigestCard`
- [x] Create `app/(app)/entry/[type].tsx` with all entry types
- [x] Improve `app/(app)/(tabs)/history.tsx` with day navigation and swipe-to-delete
- [x] Connect `src/lib/notifications.ts` to Expo Notifications when dependency is added

## P2 - Important

- [x] Create `app/(app)/(tabs)/insights.tsx` with stats and charts
- [x] Add `GrowthChart` with WHO percentile curves
- [x] Add `SleepAnalysis` with fragmentation and heatmap
- [x] Create `app/(app)/(tabs)/profile.tsx` with baby info, milestones, settings, and switcher
- [x] Add photo milestones with `expo-image-picker`
- [x] Create `src/lib/pdf.ts` for PDF export
- [x] Create `src/lib/patterns.ts` for feeding interval computation
- [x] Create `src/lib/sync.ts` for offline/background sync
- [x] Create `app/(auth)/pair.tsx` for partner pairing

## P3 - Optional Polish

- [x] Finish cloud auth screens in `app/(auth)/login.tsx` and `register.tsx`
- [x] Create `src/lib/voice.ts` for voice logging

## UI Components To Recover Or Improve

- [x] `NightOverlay`

## Notes

- Mark items as completed with `x` as they are implemented.
- Keep this file updated before and after each coding step.
