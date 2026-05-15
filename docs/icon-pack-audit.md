# Icon Pack Audit

## Goal

Improve the app icon identity without changing the existing `IconPack` consumer API.

## Context

- Existing packs: `soft`, `outline`, `classic`.
- Consumers already render pack glyphs through `useIconPack()` in food, diaper, sleep, home, history, and appearance settings.
- The picker in Appearance previews representative glyphs, so new packs only need to satisfy the existing contract.

## Constraints

- Keep the default `soft` pack unchanged.
- Avoid new dependencies.
- Keep glyphs as React Native SVG components where possible for consistent iOS, Android, and web rendering.
- Preserve the current `AsyncStorage` key and stored values.

## Findings

- `classic` uses native emoji, which is familiar but inconsistent across platforms.
- `outline` is visually calm, but thin strokes can lose legibility in dense cards and smaller preview sizes.
- `soft` has the strongest brand fit, but there was no high-contrast option that still renders consistently across platforms.
- The icon pack contract is centralized and simple enough to extend safely.

## Changes Made

- Added `bold`, a filled SVG pack focused on stronger contrast and compact-card readability.
- Registered `bold` in `ALL_PACKS` and the appearance picker list.
- Added persisted-value hydration support for the new `bold` id.
- Added localized names and descriptions in English, Spanish, French, and Dutch.

## Done When

- TypeScript accepts all icon pack ids and registered packs.
- The Appearance screen shows the new pack in the icon style picker.
- Existing packs continue to work without migration.

## Future Improvements

- Replace remaining literal emoji labels in forms and alerts with pack-aware glyphs where the UI currently mixes native emoji and SVG.
- Add a small icon snapshot or smoke screen to catch malformed SVG output.
- Consider moving repeated SVG helpers into a shared private utility if more packs are added.
