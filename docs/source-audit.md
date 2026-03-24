# Source Audit

## App Shell / Home Dashboard

- **Purpose**: main landing surface with Leo summary, milk status, quick actions, recent history, and access to stats/settings/profile.
- **Current implementation notes**: built from a single HTML shell plus imperative DOM updates in `js/app.js`; global state is shared across hundreds of functions.
- **Business logic summary**: aggregates today’s feeds, sleep, and diaper activity, computes progress/status text, and surfaces next-action hints.
- **UI/UX problems**: dense layout, too many controls on one screen, modal-heavy interaction model, and duplicated labels/copy.
- **Technical problems**: hard to test, hard to isolate, and tightly coupled to mutable global variables.
- **Migration recommendation**: **MERGE WITH EXISTING TARGET FEATURE**.

## Feeding Flow

- **Purpose**: track breastfeeding and bottle feeds, including duration, side, amount, timing, and notes.
- **Current implementation notes**: breast/bottle panes exist in the main shell, plus a reusable manual composer and feed-specific timer helpers.
- **Business logic summary**: breastfeeding stores duration and side; bottle feeding stores amount and optional start/end timestamps; today’s totals drive status cards and timing hints.
- **UI/UX problems**: the flow is split across multiple controls and special cases, making it hard to discover.
- **Technical problems**: repeated parsing/normalization, multiple representations of the same concept, and complex edit/create branching.
- **Migration recommendation**: **MIGRATE AND IMPROVE**.

## Sleep Flow

- **Purpose**: track naps and overnight sleep sessions with start/end timestamps, duration, notes, and tags.
- **Current implementation notes**: implemented as a modal with timer and manual entry modes.
- **Business logic summary**: duration is derived from timestamps and rolled into the daily summary and stats.
- **UI/UX problems**: the timer/manual split is not obvious and competes with other actions.
- **Technical problems**: timer state and persistence logic are scattered through globals.
- **Migration recommendation**: **MERGE WITH EXISTING TARGET FEATURE**.

## Pump Flow

- **Purpose**: track pumping sessions, elapsed time, and extracted milk amount with a confirmation step.
- **Current implementation notes**: focused overlay/card, live timer, milestone alerts, and a confirm modal.
- **Business logic summary**: creates sessions with start/end timestamps, duration, and optional amount.
- **UI/UX problems**: too many states for one activity and the save sequence is easy to miss.
- **Technical problems**: timer flags and confirm logic are tightly intertwined.
- **Migration recommendation**: **MIGRATE AND IMPROVE**.

## Diaper / Elimination Flow

- **Purpose**: log pee, poop, and vomit counts with notes and a timestamp.
- **Current implementation notes**: dedicated modal plus daily summary card.
- **Business logic summary**: count-based records are aggregated into daily totals.
- **UI/UX problems**: simple but buried among the rest of the app.
- **Technical problems**: minimal validation and repeated entry-building logic.
- **Migration recommendation**: **MIGRATE AS-IS**.

## Medication Flow

- **Purpose**: record medication name, dose, and notes, with a learned suggestion list.
- **Current implementation notes**: select input plus “other” field and local learned list.
- **Business logic summary**: selected medication is saved as an entry and new names are appended to a local library.
- **UI/UX problems**: fragile “other” branch and inconsistent labeling.
- **Technical problems**: local-only name learning and weak normalization.
- **Migration recommendation**: **MIGRATE AND IMPROVE**.

## Measurements / Growth

- **Purpose**: capture temperature, weight, and height, and visualize growth history.
- **Current implementation notes**: dedicated measurements modal plus growth section in stats.
- **Business logic summary**: latest measurements and deltas are computed from stored data.
- **UI/UX problems**: useful but hidden and not clearly grouped as a growth module.
- **Technical problems**: repeated formatting/parsing and no typed schema.
- **Migration recommendation**: **EXTEND EXISTING TARGET FEATURE**.

## Milestones

- **Purpose**: store baby milestones with title, date, icon, and notes.
- **Current implementation notes**: handled through the manual entry modal and surfaced in timeline/stats.
- **Business logic summary**: milestone records are first-class timeline items.
- **UI/UX problems**: low discoverability and not distinct enough from other log types.
- **Technical problems**: coupled to the large entry editor.
- **Migration recommendation**: **MERGE WITH EXISTING TARGET FEATURE**.

## History / Timeline / Filtering

- **Purpose**: browse history, filter by type/date range, edit entries, and delete selected items.
- **Current implementation notes**: range picker, timeline list, swipe/long-press selection, undo, and manual add flow.
- **Business logic summary**: entries are normalized into one sortable timeline grouped by day.
- **UI/UX problems**: crowded and hard to learn, but the timeline concept is strong.
- **Technical problems**: repeated renderer logic and localStorage filter state.
- **Migration recommendation**: **MERGE WITH EXISTING TARGET FEATURE**.

## Statistics / Reports

- **Purpose**: compare today/yesterday, show weekly trends, custom-range breakdowns, growth summaries, and exports.
- **Current implementation notes**: modal-based stats with chart canvases and summaries.
- **Business logic summary**: computes feed counts, bottle totals, averages, weekly trends, and growth deltas from the snapshot.
- **UI/UX problems**: overloaded modal rather than a browsable analytics screen.
- **Technical problems**: aggregation and chart logic are spread across many helpers.
- **Migration recommendation**: **EXTEND EXISTING TARGET FEATURE**.

## Profile / Settings / Theme / Background

- **Purpose**: manage caregiver/baby profile, theme mode, module visibility, background image, import/export, and reset.
- **Current implementation notes**: theme auto-switching, action visibility toggles, hero rotation, background upload, and profile editing are all handled imperatively.
- **Business logic summary**: profile data drives greeting, age calculations, goals, and onboarding.
- **UI/UX problems**: powerful but scattered; profile is not a clean first-class screen.
- **Technical problems**: many localStorage keys, hard-coded paths, and mixed concerns.
- **Migration recommendation**: **EXTEND EXISTING TARGET FEATURE**.

## Firebase / Persistence / Import-Export

- **Purpose**: sync to Firestore, import legacy JSON, export snapshots, and run a sync demo.
- **Current implementation notes**: anonymous Firebase auth, shared document ID, snapshot-based persistence, and import merge utilities.
- **Business logic summary**: `persistence.js` and `importer.js` orchestrate remote snapshot storage and merges.
- **UI/UX problems**: sync and admin utilities are not part of the product flow.
- **Technical problems**: permissive rules, anonymous-only auth, and a document-centric data model.
- **Migration recommendation**: **CREATE NEW TARGET MODULE**.

## Legacy Utilities

- **Purpose**: demo data loading, backup/export, and sync test pages.
- **Current implementation notes**: standalone import page and backup helpers.
- **Business logic summary**: operational support around the main snapshot.
- **UI/UX problems**: useful for power users but not polished.
- **Technical problems**: browser-specific, loosely coupled, and hard to extend cleanly.
- **Migration recommendation**: **DEPRECATE OR REHOME**.
