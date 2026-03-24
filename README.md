# 🧪 TestForge

**AI-powered test generation from your terminal**

Scan untested code, generate unit & E2E tests, and visualize coverage — all from the CLI.

## Features

- 🔍 **Scan** — Detect untested files and functions across your codebase
- 🤖 **Generate** — AI-generate unit tests for any file (Jest, Vitest, pytest, Flutter)
- 🎭 **E2E** — Generate Playwright/Detox/Maestro test flows from natural language
- 📊 **Coverage** — Terminal-friendly coverage visualization
- 💡 **Suggest** — AI-prioritized test recommendations by risk/impact
- ⚡ **Multi-language** — TypeScript, JavaScript, Python, Dart, Kotlin, Swift

## Quick Start

```bash
# Install globally
npm install -g @magicpro97/testforge

# Configure AI provider
testforge config set openai.apiKey sk-your-key
testforge config set defaultProvider openai

# Scan for untested code
testforge scan ./src

# Generate tests for a file
testforge gen src/utils.ts

# Generate E2E test from description
testforge gen:e2e "user logs in, adds item to cart, checks out"

# View coverage
testforge coverage .

# Get AI suggestions on what to test first
testforge suggest ./src
```

## Commands

### `testforge scan [dir]`
Scan for untested code and show coverage gaps.

```bash
testforge scan ./src
testforge scan ./src --language ts
testforge scan . --json
```

### `testforge gen <file>`
AI-generate unit tests for a specific file.

```bash
testforge gen src/utils.ts
testforge gen src/api.ts --framework vitest
testforge gen src/helpers.py --provider gemini
testforge gen src/utils.ts --dry-run    # Preview without writing
testforge gen src/utils.ts -o tests/utils.test.ts
```

### `testforge gen:e2e "description"`
Generate E2E test flows from natural language descriptions.

```bash
testforge gen:e2e "user signs up with email and verifies account"
testforge gen:e2e "add product to cart and checkout" --framework detox
testforge gen:e2e "navigate to settings and change password" --framework maestro
```

### `testforge coverage [dir]`
Show coverage summary in terminal. Parses Istanbul/lcov coverage reports.

```bash
testforge coverage .
testforge coverage . --json
testforge coverage . --min 80
```

### `testforge suggest [dir]`
AI-powered suggestions for which tests to write first, prioritized by risk and impact.

```bash
testforge suggest ./src
testforge suggest . --limit 5
testforge suggest . --json
```

### `testforge config`
Manage AI provider configuration.

```bash
testforge config set openai.apiKey sk-your-key
testforge config set openai.model gpt-4o
testforge config set gemini.apiKey AIza...
testforge config set defaultProvider openai
testforge config list
```

## Supported Languages

| Language   | Extensions       | Test Patterns                     |
|------------|-----------------|-----------------------------------|
| TypeScript | `.ts`           | `*.test.ts`, `*.spec.ts`         |
| JavaScript | `.js`           | `*.test.js`, `*.spec.js`         |
| Python     | `.py`           | `test_*.py`, `*_test.py`        |
| Dart       | `.dart`         | `*_test.dart`                    |
| Kotlin     | `.kt`           | `*Test.kt`                       |
| Swift      | `.swift`         | `*Tests.swift`                   |

## AI Providers

- **OpenAI** — GPT-4o-mini (default), GPT-4o, or any compatible model
- **Gemini** — Gemini 2.0 Flash (default) or other Gemini models

## Requirements

- Node.js 20+
- An OpenAI or Gemini API key

## License

MIT © [magicpro97](https://github.com/magicpro97)
