# CI/CD Workflows

## Available Workflows

### Deploy (`deploy.yml`)
- Triggers on: Push to main branch
- Actions: Build → Export → Deploy to GitHub Pages
- Requires: Firebase environment secrets

### Build (`build.yml`)
- Triggers on: PR and push to main/develop
- Actions: Matrix test (Node 18 & 20)
- Artifacts: 5-day retention

### Lint (`lint.yml`)
- Triggers on: Push and PR
- Actions: Type check, security audit, secret scan

### PR (`pr.yml`)
- Triggers on: Pull request events
- Actions: Title validation, build check, comments

### Test (`test.yml`)
- Triggers on: Push and PR
- Actions: Linting, type checking, console detection

### Release (`release.yml`)
- Triggers on: Version bump in package.json
- Actions: Automatic release creation with tags

### Scheduled (`scheduled.yml`)
- Triggers on: Weekly (Sunday 00:00 UTC)
- Actions: Dependency check, health verification

Last updated: $(date -u +%Y-%m-%d\ %H:%M:%S)
