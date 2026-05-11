# Agent Aliases

## @plan

Use: Project Orchestrator  
File: `.agents/agents/01-project-orchestrator.md`

Purpose:
Understand the task, inspect relevant files, choose the right specialist, create a safe plan.

Use when:
- Task is broad.
- Task is risky.
- Multiple files may change.
- You are not sure where to start.

No edits unless explicitly requested.

---

## @audit

Use: Codebase Auditor  
File: `.agents/agents/02-codebase-auditor.md`

Purpose:
Audit architecture, duplicated logic, broken imports, risky files, dead code, and maintainability.

Use when:
- Project feels messy.
- Before a large refactor.
- Before publishing.
- Before adding big features.

No edits.

---

## @ui

Use: Frontend UI Engineer  
File: `.agents/agents/03-frontend-ui-engineer.md`

Purpose:
Improve layout, visual hierarchy, mobile UI, animations, accessibility, contrast, spacing, and usability.

Use when:
- UI looks wrong.
- There is overlap.
- Colors or contrast are broken.
- Animation feels bad.
- Mobile layout is inconsistent.

Preserve existing logic.

---

## @backend

Use: Backend API Engineer  
File: `.agents/agents/04-backend-api-engineer.md`

Purpose:
Fix API routes, payloads, uploads, render flows, server logs, validation, and error handling.

Use when:
- API fails.
- Server receives wrong body.
- Uploads fail.
- Render/status flow breaks.
- Logs are unclear.

---

## @debug

Use: Debugging Engineer  
File: `.agents/agents/05-debugging-engineer.md`

Purpose:
Find root cause before fixing.

Use when:
- There is a bug.
- Error message appears.
- Something works partially.
- Previous fix created a new issue.

---

## @build

Use: Build and Release Engineer  
File: `.agents/agents/06-build-release-engineer.md`

Purpose:
Validate dependencies, scripts, APK/build/release pipeline, logs, and output folders.

Use when:
- Building APK.
- Preparing release.
- Fixing npm/Vite/Expo/Android/Node build.
- Creating local automation.

---

## @docs

Use: Documentation Agent  
File: `.agents/agents/07-documentation-agent.md`

Purpose:
Create or update README, ARCHITECTURE, HOW_IT_WORKS, DEBUGGING, TESTING, RELEASE docs.

Use when:
- Project needs documentation.
- Feature needs explanation.
- You want onboarding docs.

---

## @live

Use: Live Tester Agent  
File: `.agents/agents/08-live-tester-agent.md`

Purpose:
Test the app like a real user.

Use when:
- Before release.
- After UI changes.
- After navigation/login/form changes.
- When the app may look okay but could be broken.

No edits unless requested.

---

## @security

Use: Security Reviewer  
File: `.agents/agents/09-security-reviewer.md`

Purpose:
Defensive security review before publishing, running scripts, or deploying.

Use when:
- Before publishing.
- Before deployment.
- Before running scripts in corporate environment.
- When EDR/security alerts are a concern.

No exploit code. No bypasses.
