# Migration Map

| Source feature | Purpose | Target destination | Migration type | Priority | Complexity | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Home dashboard | Main summary and quick actions | Home screen | Merge | High | Medium | Keep hero, status cards, recent activity, and quick actions. |
| Breast/bottle feeds | Track feeding sessions and totals | Home + entry composer + history | Migrate and improve | High | High | Unify timer/manual flows into one composer. |
| Sleep sessions | Track naps and overnight sleep | Entry composer + history + insights | Merge | High | High | Preserve duration/timestamp logic and daily summaries. |
| Pump sessions | Track pumping duration and output | Entry composer + history | Migrate and improve | High | High | Keep timer/confirmation behavior, but isolate the state machine. |
| Diaper logs | Track pee/poop/vomit counts | Entry composer + history | Migrate as-is | Medium | Low | Convert to cleaner labels and a compact form. |
| Medication logs | Track medicine, dose, and notes | Entry composer + history | Migrate and improve | Medium | Medium | Preserve learned suggestions with normalized data. |
| Measurements | Track temp, weight, and height | Insights + entry composer + history | Extend target screen | Medium | Medium | Treat as growth module rather than hidden modal. |
| Milestones | Track important baby milestones | Insights + history + entry composer | Merge | Medium | Low | Keep as timeline items with icon/title/date. |
| History timeline | Browse and edit prior entries | History screen | Merge | High | Medium | Make this the canonical timeline view. |
| Stats reports | Trends, comparisons, and growth summaries | Insights screen | Extend target screen | High | Medium | Move chart/report logic into a browsable screen. |
| Profile and settings | Theme, profile, import/export, reset | Profile screen | Extend target screen | High | Medium | Consolidate preferences and admin actions. |
| Firebase persistence | Sync snapshot to Firestore | `src/lib/firebase.ts` + services | Create new target module | High | High | Replace anonymous snapshot-only sync with user-centric data. |
| Import/export utilities | Legacy JSON import and snapshot export | Profile screen | Rehome | Medium | Medium | Keep admin tools, but de-emphasize them. |
| Demo data loading | Provide sandbox data | Onboarding/profile | Merge | Low | Low | Useful for local testing and new-user onboarding. |
| Theme/background rotation | Visual personalization | Theme/profile preferences | Extend target screen | Low | Medium | Keep the polish, but simplify the controls. |

