# Compact Task Template

Use this format when asking for work:

```txt
@alias
Goal:
Context:
Constraints:
Done when:
```

## Example: Debug

```txt
@debug
Goal: Fix render stuck at 50%.
Context: Frontend shows 50%, backend may already finish.
Constraints: Do not rewrite renderer.
Done when: render reaches 100%, logs show job lifecycle, build passes.
```

## Example: UI

```txt
@ui
Goal: Fix profile page overlap.
Context: Session cards overlap with the active devices section on mobile.
Constraints: Preserve navigation and existing state logic.
Done when: profile page is readable on mobile and desktop.
```

## Example: Security

```txt
@security
Goal: Review project before publishing.
Context: App may be deployed publicly.
Constraints: Defensive review only. No exploit payloads.
Done when: risks are classified and safe fixes are listed.
```
