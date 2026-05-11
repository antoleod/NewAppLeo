# Prompt Router

Use this router to choose the correct local agent.

## Router rules

If the task is broad, risky, or multi-step:
Use `@plan`.

If the task is about architecture, structure, dead code, duplicated logic, or technical debt:
Use `@audit`.

If the task is visual, mobile, animation, layout, overlap, color, or accessibility:
Use `@ui`.

If the task is server-side, API, upload, render, payload, validation, or logs:
Use `@backend`.

If the task has an error message or broken behavior:
Use `@debug`.

If the task is about APK, Vite, Expo, npm scripts, release, logs, or packaging:
Use `@build`.

If the task is about README, architecture docs, usage docs, or troubleshooting:
Use `@docs`.

If the task is about testing as a real user:
Use `@live`.

If the task is about publishing, deployment, scripts, secrets, dependencies, auth, uploads, API exposure, or EDR compatibility:
Use `@security`.

## Recommended chains

### New feature

```txt
@plan
@ui or @backend
@live
@security
```

### Bug

```txt
@debug
@live
```

### Release

```txt
@build
@security
@live
```

### Big cleanup

```txt
@audit
@plan
@debug or @ui or @backend
```

### Corporate script

```txt
@security
@build
```

## Compact request format

```txt
@alias
Goal:
Context:
Constraints:
Done when:
```
