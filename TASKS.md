# AppLeo Task Tracker

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

## Next Up
- [x] Review and prune any stale tracker items that are already implemented

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
