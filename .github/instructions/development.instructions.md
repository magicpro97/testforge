---
applyTo: "**/*.ts"
---

# TestForge Development Instructions

This is the **TestForge CLI** project — an AI-powered test generator that scans codebases for untested code, generates unit and E2E tests, and visualizes coverage.

## Architecture

### Core (`src/core/`)
- `config.ts` — Config management at `~/.testforge/config.json`
- `scanner.ts` — Scans projects for untested source files
- `generator.ts` — AI-powered test generation (unit tests)
- `e2e-generator.ts` — AI-powered E2E test generation
- `coverage.ts` — Coverage analysis from Istanbul/lcov reports
- `suggester.ts` — AI test suggestions and prioritization
- `frameworks.ts` — Test framework detection (Jest, Vitest, pytest, etc.)

### CLI Commands (`src/cli/commands/`)
- `scan.ts` — Scan directory for untested files
- `gen.ts` — Generate unit tests for a source file
- `gen-e2e.ts` — Generate E2E tests from scenario descriptions
- `coverage.ts` — Coverage visualization and gap analysis
- `suggest.ts` — AI-powered test suggestions
- `config.ts` — AI provider configuration

### Types (`src/types/`)
- `index.ts` — TypeScript interfaces for scan results, test config, coverage data

## Adding a New Command

1. Create `src/cli/commands/<name>.ts` exporting a `create<Name>Command()` function returning a Commander `Command`
2. Register in `src/index.ts` with `program.addCommand()`
3. Use the spinner + try/catch error handling pattern

## Adding a New Test Framework

1. Add framework detection logic in `src/core/frameworks.ts`
2. Add framework-specific test template generation in `src/core/generator.ts`
3. Update the `--framework` option choices in `gen.ts` command

## Conventions

- ESM modules (`"type": "module"` in package.json)
- All imports use `.js` extension (TypeScript ESM requirement)
- Dynamic imports for chalk/ora (ESM-only packages): `const chalk = (await import('chalk')).default`
- Node.js 20+ required
- AI providers: OpenAI and Gemini for test generation
- No external HTTP dependencies — use built-in `fetch`
- Supports multiple languages: TypeScript, JavaScript, Python, Dart, Kotlin, Swift

## Build & Run

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript (tsc)
npm run dev          # Build and run
node dist/index.js   # Run CLI directly
```

## Testing

```bash
npm run build
node dist/index.js --version
node dist/index.js --help
node dist/index.js scan --help
node dist/index.js gen --help
node dist/index.js coverage --help
node dist/index.js suggest --help
```

## CI/CD

- GitHub CI builds on push (`.github/workflows/ci.yml`)
- npm publish is automatic via GitHub Release (`.github/workflows/publish.yml`)
- NPM_TOKEN stored as GitHub repo secret — never commit tokens
