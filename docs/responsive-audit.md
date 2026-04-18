# Responsive Audit

Date: 2026-04-19
Scope: `app/(app)/(tabs)` screens and shared UI primitives

## Summary

The app has a reasonable base for responsive behavior:

- Shared page width is capped at `1100px`
- Many content groups use `flexWrap`
- Several dense datasets already fall back to horizontal scroll

The main responsive issues are not structural breakage at the page shell level. They are concentrated in reusable primitives and dense card layouts that become cramped on narrow mobile widths and under localized text expansion.

## Findings

### 1. High: `Segment` is width-fragile on small screens

Files:
- [src/components/ui.tsx](c:/Users/X1/Documents/NewAppLeo/src/components/ui.tsx:581)
- [src/components/ui.tsx](c:/Users/X1/Documents/NewAppLeo/src/components/ui.tsx:588)
- [app/(app)/(tabs)/profile.tsx](c:/Users/X1/Documents/NewAppLeo/app/(app)/(tabs)/profile.tsx:279)
- [app/(app)/(tabs)/profile.tsx](c:/Users/X1/Documents/NewAppLeo/app/(app)/(tabs)/profile.tsx:386)

Why it matters:

- `Segment` uses a fixed single row with `flexDirection: 'row'`
- Every option uses `flex: 1`
- Some label sets are long, for example theme presets and theme mode

Risk:

- Labels compress excessively
- Text wraps awkwardly or gets clipped depending on device width and font scaling
- This is amplified in French, Dutch, and English variants

Recommendation:

- Allow wrapping for the segment container on narrow widths
- Provide a stacked mobile variant for groups with 3+ long labels
- Consider reducing label length for dense settings rows

### 2. High: the history chart is effectively fixed-width and not mobile-native

Files:
- [app/(app)/(tabs)/history.tsx](c:/Users/X1/Documents/NewAppLeo/app/(app)/(tabs)/history.tsx:134)
- [app/(app)/(tabs)/history.tsx](c:/Users/X1/Documents/NewAppLeo/app/(app)/(tabs)/history.tsx:242)

Why it matters:

- `WeightChart` hardcodes `width = 320`
- Axis labels and absolute-positioned internals depend on that width

Risk:

- The chart does not scale with available viewport width
- On larger screens it looks undersized
- On smaller screens it leaves little room for labels and can feel cramped rather than responsive

Recommendation:

- Compute chart width from `useWindowDimensions()` or `onLayout`
- Keep a mobile minimum width, but scale up on tablet and desktop
- Revisit label positioning once width is dynamic

### 3. High: history day-summary cards force a dense 2-column layout too early

Files:
- [app/(app)/(tabs)/history.tsx](c:/Users/X1/Documents/NewAppLeo/app/(app)/(tabs)/history.tsx:523)

Why it matters:

- Cards use `flexBasis: '48%'` and `minWidth: 220`
- On widths near common phones, these cards alternate between squeezed two-column and uneven wrapping

Risk:

- Readability drops on narrow mobile widths
- Long detail strings like medication names overflow visually or create very tall uneven cards

Recommendation:

- Switch to single column below a mobile breakpoint
- Use two columns only when the container has enough width

### 4. Medium: OMS table is desktop-friendly but weak on handheld ergonomics

Files:
- [app/(app)/(tabs)/history.tsx](c:/Users/X1/Documents/NewAppLeo/app/(app)/(tabs)/history.tsx:583)

Why it matters:

- The fallback is horizontal scroll with `minWidth: 900`

Risk:

- Functionally usable, but poor for frequent mobile use
- The user must pan horizontally to compare values

Recommendation:

- Keep horizontal scroll for now
- Add a mobile condensed version or card-per-row alternative for key values

### 5. Medium: top heading layout can become cramped if an action is added on smaller widths

Files:
- [src/components/ui.tsx](c:/Users/X1/Documents/NewAppLeo/src/components/ui.tsx:524)

Why it matters:

- `Heading` uses a row layout by default
- It does not change direction at narrow widths

Risk:

- Current screens mostly avoid the problem
- Any future heading with long subtitle plus action button will compress badly on mobile

Recommendation:

- Add a breakpoint to stack heading content vertically below a narrow width

### 6. Medium: profile action clouds scale poorly with many toggles

Files:
- [app/(app)/(tabs)/profile.tsx](c:/Users/X1/Documents/NewAppLeo/app/(app)/(tabs)/profile.tsx:467)
- [app/(app)/(tabs)/profile.tsx](c:/Users/X1/Documents/NewAppLeo/app/(app)/(tabs)/profile.tsx:507)

Why it matters:

- Dashboard personalization and module visibility render many buttons in a wrapping flow

Risk:

- On mobile the section becomes visually noisy and tall
- Button labels like `Hide smartSignals` are not user-facing polished copy and wrap unpredictably

Recommendation:

- Replace button clouds with switch rows or 2-column settings list
- Use localized labels instead of raw setting keys

### 7. Medium: insights cards are mostly safe, but lower breakpoints are implicit rather than controlled

Files:
- [app/(app)/(tabs)/insights.tsx](c:/Users/X1/Documents/NewAppLeo/app/(app)/(tabs)/insights.tsx:121)
- [app/(app)/(tabs)/insights.tsx](c:/Users/X1/Documents/NewAppLeo/app/(app)/(tabs)/insights.tsx:161)
- [app/(app)/(tabs)/insights.tsx](c:/Users/X1/Documents/NewAppLeo/app/(app)/(tabs)/insights.tsx:180)

Why it matters:

- Summary cards use `flexBasis: '48%'`
- The two analysis panels depend on `minWidth: 260`

Risk:

- This works acceptably today, but the layout behavior is emergent rather than deliberate
- Any copy growth or larger font scale can destabilize it

Recommendation:

- Introduce explicit layout modes for mobile, tablet, desktop

### 8. Low: home screen relies heavily on percentage cards and chips, which is acceptable but fragile under translation growth

Files:
- [app/(app)/(tabs)/home.tsx](c:/Users/X1/Documents/NewAppLeo/app/(app)/(tabs)/home.tsx:212)
- [app/(app)/(tabs)/home.tsx](c:/Users/X1/Documents/NewAppLeo/app/(app)/(tabs)/home.tsx:770)
- [app/(app)/(tabs)/home.tsx](c:/Users/X1/Documents/NewAppLeo/app/(app)/(tabs)/home.tsx:787)
- [app/(app)/(tabs)/home.tsx](c:/Users/X1/Documents/NewAppLeo/app/(app)/(tabs)/home.tsx:930)

Why it matters:

- Home uses many wrapped quick-action grids and stat cards with `flexBasis` plus `minWidth`

Risk:

- Short French labels are currently helping
- Longer translations or accessibility font scaling can push the layout into uneven wrapping

Recommendation:

- Define mobile-first card counts explicitly
- Example: 1 column under `400`, 2 columns from `400-767`, denser compositions only above tablet

## What is working well

- [src/components/ui.tsx](c:/Users/X1/Documents/NewAppLeo/src/components/ui.tsx:508) keeps a shared `maxWidth: 1100`, which prevents desktop layouts from stretching too far
- [src/components/ui.tsx](c:/Users/X1/Documents/NewAppLeo/src/components/ui.tsx:503) uses `ScrollView` with `flexGrow`, which helps pages fill vertically without obvious collapse
- Many dense regions already use `flexWrap`, reducing hard overflows
- The tab shell is visually compact and should hold up reasonably across phone and tablet widths

## Suggested next pass

1. Make `Segment` adaptive for narrow widths
2. Convert `WeightChart` to dynamic width
3. Add shared breakpoint helpers with `useWindowDimensions()`
4. Normalize card grids to explicit mobile/tablet/desktop modes
5. Replace profile toggle button clouds with structured setting rows

## Verification gaps

This audit was static. I did not run live viewport checks because the local install/runtime was not available in this environment.
