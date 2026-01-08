# Pre-commit Hooks Setup

## Overview
This repository uses Husky and lint-staged to enforce code quality standards before commits.

## Code Quality Standards
- **Max Complexity**: 10 (cyclomatic complexity)
- **Max Lines per File**: 600
- **Max Lines per Function**: 100
- **Max Depth**: 4 levels
- **Max Parameters**: 5
- **Max Nested Callbacks**: 3

## Tools Enforced
1. **ESLint**: TypeScript/React linting with complexity rules

## Installation

### First Time Setup
```bash
# Install dependencies (includes husky and lint-staged)
npm install

# Husky hooks are automatically installed via the "prepare" script
```

### Manual Hook Installation (if needed)
```bash
# Reinstall husky hooks
npm run prepare
```

## What Happens on Commit
Before each commit, ESLint runs automatically on all staged `.ts` and `.tsx` files.

**If any errors are found (including complexity violations), the commit will be blocked.**

## Manual Linting
```bash
# Check all files
npm run lint

# Auto-fix issues where possible
npm run lint -- --fix
```

## Bypassing Hooks (NOT Recommended)
```bash
# Only use in emergencies
git commit --no-verify -m "message"
```

## Common Violations

### File too long (> 600 lines)
Split the file into smaller, focused modules.

### Function too complex (complexity > 10)
Refactor the function into smaller helper functions.

### Function too long (> 100 lines)
Break down into smaller, single-responsibility functions.

## Troubleshooting

### Hooks not running
```bash
# Reinstall husky
rm -rf .husky
npm run prepare
```

### ESLint errors on valid code
Check `.eslint.config.js` and discuss with the team before modifying rules.
