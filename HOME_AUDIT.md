# Home Screen Button Audit

## Summary

Full audit of every interactive element in `app/(app)/(tabs)/home.tsx` — behavior, styles, and issues found.

---

## Header

### Settings Button (gear icon)
- **Action**: Opens `showHomeCustomizer` modal
- **Style**: 44×44 circle, `borderRadius: 22`, border `BORDER`
- **Pressed**: bg → `BORDER_SOFT`, scale `0.92`
- **Icon**: `Ionicons settings-outline` size 18

### Baby Chip
- **Action**: Opens `showBabySwitcher` modal
- **Style**: Full-width row, `borderRadius: 14`, `paddingH: 14`, `paddingV: 10`
- **Pressed**: bg → `BORDER_SOFT`
- **Content**: Avatar initial + name + age/weight + chevron

---

## Zone 1 — Primary Actions

### Bottle Button
- **Action**: `startQuickTimer('bottle')` — launches fullscreen timer
- **Style**: `flex: 3`, h `58`, `borderRadius: 16`, bg `TEXT` (inverted)
- **Pressed**: bg + `D9`, scale `0.97`, `shadow` + `elevation: 5`
- **Content**: `BottleIcon` + label + `quickAmount` ml

### Breast Button
- **Action**: `startQuickTimer('breast', suggestedBreastSide)` — starts timer directly on alternated side
- **Style**: `flex: 2`, h `58`, `borderRadius: 16`, border `BORDER` 1.5px
- **Pressed**: bg `ACCENT+14`, border `ACCENT+80`, scale `0.97`
- **Content**: `BreastfeedingIcon` + label

### Today Stat Strip (3 items: Feeds / Sleep / Diapers)
- **Action**: `router.push('/history')` on each
- **Style**: Each `flex: 1`, `paddingV: 12`, divided by right border `BORDER`
- **Pressed**: bg → `BORDER_SOFT`

### Quick-add Grid (8 entry types)

| Type | Label | Color |
|------|-------|-------|
| `diaper` | Diaper | `#F59E0B` |
| `temperature` | Temperature | `#EF4444` |
| `vaccine` | Vaccine | `#22C55E` |
| `symptom` | Symptoms | `#EC4899` |
| `food` | Food | `#D97706` |
| `medication` | Medicine | `#06B6D4` |
| `measurement` | Measurement | `#8B5CF6` |
| `sleep` | Sleep | `#3B82F6` |

- **Action**: `router.push('/entry/{type}')`
- **Style**: `flex: 1`, `aspectRatio: 1` (square), `borderRadius: 16`
- **Pressed**: bg `color+12`, border `color+55`, scale `0.98`, shadow reduces

---

## Zone 2 — Alerts

### Urgent Alerts (0–2)
- **Action**: `haptics.selection()` + `router.push('/insights')`
- **Style**: Dark bg `rgba(15,23,42,0.58)`, left border 4px in tone color
- **Pressed**: bg darkens, scale `0.98`, opacity `0.9`

### Active Medication Banner
- **Action**: `router.push('/entry/medication')`
- **Style**: bg `BLUE+15`, left border 3px `BLUE`
- **Pressed**: bg `BLUE+25`, opacity `0.85`

### Pinned Vaccines (0–3 items)
- **Action**: `router.push('/entry/vaccine', { id })`
- **Pressed**: opacity `0.6`

---

## Zone 3 — Daily Overview

### Health Status Card
- **Action**: `router.push('/entry/temperature')`
- **Style**: `flex: 1`, `borderRadius: 12`, border `BORDER`
- **Pressed**: bg → `BORDER_SOFT`

### Food Status Card
- **Action**: `router.push('/entry/food')`
- **Style**: `flex: 1`, `borderRadius: 12`, border `BORDER`
- **Pressed**: bg → `BORDER_SOFT`

### Milk Progress Card
- Non-interactive display card

---

## Zone 4 — History

### Recent Entries (0–4 items)
- **Action**: `router.push('/entry/{type}', { id })`
- **Pressed**: bg → `BORDER_SOFT`, opacity `0.85`, `borderRadius: 8`

### Food History Card
- **Card container**: `View` (non-interactive)
- **Header row**: `Pressable` → `router.push('/entry/food')` + chevron icon
- **Each food item**: `Pressable` → `router.push('/entry/food', { id })`
- **Item bg**: today+allergy `rgba(231,76,60,0.06)`, today normal `GOLD+0A`, past transparent

### Growth Chart
- Non-interactive display card

### Missing Data Prompt
- Sleep chip → `router.push('/entry/sleep')`
- Diaper chip → `router.push('/entry/diaper')`

### Hydration (+250ml / +500ml)
- **Action**: Increments `hydration` state + persists via `setMomHydration`
- **Style**: h `36`, `borderRadius: 10`, `flex: 1`, border `BORDER`
- **Pressed**: bg `BLUE+22`, opacity `0.88`

---

## Modals

### NextFeedPicker — Side selection
| Button | Action | Color |
|--------|--------|-------|
| Left breast | `beginNextFeed('breast', 'left')` | `GOLD` |
| Right breast | `beginNextFeed('breast', 'right')` | `GREEN` |
| Both sides | `beginNextFeed('breast', 'both')` | `TEXT` |
| Close | `setShowNextFeedPicker(false)` | ghost |

### Home Customizer
| Button | Action |
|--------|--------|
| Toggle nextFeed/milkProgress/alerts | `updateDashboardMetric(key, !enabled)` |
| Breast mode | `setDefaultFeedingMode('breast')` + persist |
| Bottle mode | `setDefaultFeedingMode('bottle')` + persist |
| Restore all | `restoreHomeCustomization()` |
| Close | `setShowHomeCustomizer(false)` |

### Baby Switcher
| Button | Action |
|--------|--------|
| Baby item | `switchBaby(baby)` → updates active baby |
| Open Profile | `router.push('/profile')` |
| Close | `setShowBabySwitcher(false)` |

### Fullscreen Timer
- **Stop**: `setShowSaveSheet(true)` — shows save sheet

### Save Sheet
| Button | Action |
|--------|--------|
| Save | `saveQuickTimerEntry()` → creates entry, persists, resets |
| Cancel | Native `Alert` confirmation dialog |
| Confirm discard | Resets timer state, `quickAmount` → `150` |

---

## Issues Found & Fixed

| # | Issue | Fix Applied |
|---|-------|-------------|
| 1 | Urgent alerts only did `haptics.selection()` with no navigation — confusing tap with no result | Added `router.push('/insights')` after haptics |
| 2 | Food History had nested `Pressable` (outer card + inner items) — outer captured inner taps | Outer becomes `View`; header row becomes the Pressable with chevron |
| 3 | Recent entries had no visual color feedback on press, only opacity | Added `backgroundColor: BORDER_SOFT` + `borderRadius: 8` on press |
| 4 | Breast button always opened picker even when side could be inferred from last feed | Now calls `startQuickTimer('breast', suggestedBreastSide)` — alternates sides automatically |
| 5 | Stat strip (feeds/sleep/diapers) looked like interactive cards but had no press handler | Wrapped each in `Pressable` → `router.push('/history')` |
