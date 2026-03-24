# Target Audit

## Current Architecture

- The target workspace is a built Expo web export, not an editable source tree.
- `index.html` mounts `#root` and loads the generated Metro bundle from `_expo/static/js/web/AppEntry-*.js`.
- The app root wraps safe area handling, gesture handling, theme/state providers, and only renders the navigator after startup work completes.
- Navigation is already structured around a bottom-tab pattern plus a pre-navigation onboarding gate.

## Current Screens / Modules

- `LoadingScreen`
- `OnboardingScreen`
- `HomeScreen`
- `HistoryScreen`
- `InsightsScreen`
- `ProfileScreen`
- `Screen`, `Card`, `AppButton`, `AppInput`, `SectionHeader`, `EmptyState`, `FilterChip`, `TimelineCard`

## Strengths

- Clear product IA: onboarding, dashboard, timeline, insights, and profile are separated cleanly.
- Good reuse of UI primitives and theme tokens.
- Mobile-first layout patterns are already present.
- The data model is normalized enough to support multiple activity types.
- Local persistence, demo data, and import/export workflows already exist.

## Gaps

- No editable source tree is present in the target workspace.
- No Firebase auth, registration/login screens, or protected routes exist yet.
- No username/PIN authentication flow exists.
- Persistence is local-first; there is no user-centric backend model yet.
- There are no visible scripts or tests in the checked-in artifact.

## Constraints To Respect

- Preserve the current product model and screen separation.
- Keep the `leo-care` identity and current IA where possible.
- Do not break the current snapshot schema when rebuilding the source tree.
- Layer Firebase and auth onto the current model rather than replacing it.

## Bottom Line

- The target is a polished, compiled Expo/React Native Web app.
- It is missing the source tree and the auth/backend foundation required for the next phase.
- The best path is to reconstruct the editable app source, then add Firebase, auth, and the legacy feature set on top of the current IA.
