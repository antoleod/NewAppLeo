# Local Agent System

This folder contains reusable local agent prompts for this repository.

The goal is to reduce token usage by using short aliases instead of pasting long prompts repeatedly.

## Main aliases

- `@plan` — Project Orchestrator
- `@audit` — Codebase Auditor
- `@ui` — Frontend UI Engineer
- `@backend` — Backend API Engineer
- `@debug` — Debugging Engineer
- `@build` — Build and Release Engineer
- `@docs` — Documentation Agent
- `@live` — Live Tester Agent
- `@security` — Security Reviewer

## Recommended flow

For complex work:

```txt
@plan
? specialist agent
? @live
? @security
? final diff review
```

For simple bugs:

```txt
@debug
```

For visual issues:

```txt
@ui
```

For release:

```txt
@build
? @security
? @live
```

## Compact task format

```txt
@alias
Goal:
Context:
Constraints:
Done when:
```

Example:

```txt
@debug
Goal: Fix render stuck at 50%.
Context: Frontend shows 50%, backend may already finish.
Constraints: Do not rewrite renderer.
Done when: render reaches 100%, logs show job lifecycle, build passes.
```
