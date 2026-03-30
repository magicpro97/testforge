import { generateText, type AIProviderType } from '@magicpro97/forge-core';
import type { AIMessage, AIResponse, AIProvider } from '../types/index.js';
import { getActiveProvider, loadConfig } from './config.js';

export async function sendAIRequest(
  messages: AIMessage[],
  providerOverride?: AIProvider
): Promise<AIResponse> {
  const active = await getActiveProvider();

  const provider = providerOverride ?? active?.provider;
  if (!provider) {
    throw new Error('No AI provider configured. Run: testforge config set openai.apiKey <key>');
  }

  let apiKey: string | undefined;
  let model: string | undefined;

  if (active && active.provider === provider) {
    apiKey = active.apiKey;
    model = active.model;
  } else {
    const config = await loadConfig();
    apiKey = config.providers[provider]?.apiKey;
    model = config.providers[provider]?.model;
  }

  if (!apiKey) {
    throw new Error(`No API key configured for ${provider}. Run: testforge config set ${provider}.apiKey <key>`);
  }

  return generateText(provider as AIProviderType, apiKey, messages, { model });
}

export function buildTestGenPrompt(sourceCode: string, filePath: string, framework: string): AIMessage[] {
  return [
    {
      role: 'system',
      content: `You are an expert test engineer. Generate comprehensive, well-structured unit tests. 
Output ONLY the test code, no explanations or markdown fences.
Follow best practices for the testing framework.
Cover edge cases, error handling, and happy paths.`,
    },
    {
      role: 'user',
      content: `Generate comprehensive unit tests for the following source file.

File: ${filePath}
Testing framework: ${framework}

Source code:
\`\`\`
${sourceCode}
\`\`\`

Generate complete, runnable test code with proper imports.`,
    },
  ];
}

export function buildE2EPrompt(description: string, framework: string): AIMessage[] {
  return [
    {
      role: 'system',
      content: `You are an expert E2E test engineer. Generate complete, runnable E2E test flows.
Output ONLY the test code, no explanations or markdown fences.
Follow best practices for the ${framework} testing framework.`,
    },
    {
      role: 'user',
      content: `Generate an E2E test flow for the following scenario using ${framework}:

${description}

Generate complete, runnable test code.`,
    },
  ];
}

export function buildFTUEPrompt(sourceCode: string, filePath: string, framework: string): AIMessage[] {
  return [
    {
      role: 'system',
      content: `You are an expert test engineer specializing in First-Time User Experience (FTUE) and onboarding flows.
Output ONLY the test code, no explanations or markdown fences.
Follow best practices for the ${framework} testing framework.`,
    },
    {
      role: 'user',
      content: `Generate end-to-end tests for a First-Time User Experience (FTUE) / onboarding flow.

The tests should cover:
1. SCREEN PROGRESSION: Verify each onboarding screen appears in correct order
2. SKIP FUNCTIONALITY: Test that skip button works on every screen and takes user to main app
3. PERMISSION DIALOGS: Test handling of permission requests (camera, notifications, location) - both grant and deny
4. VALUE DEMONSTRATION: Verify the "aha moment" screen shows key features
5. COMPLETION TRACKING: Test that completing onboarding marks it as done (not shown again)
6. BACK NAVIGATION: Test that back button works correctly between screens
7. PROGRESS INDICATOR: Verify progress dots/bar updates on each screen
8. DEEP LINK RESUME: Test that if user kills app mid-onboarding, they resume where they left off

File: ${filePath}
Testing framework: ${framework}

Source code:
\`\`\`
${sourceCode}
\`\`\`

Generate complete, runnable test code with proper imports.`,
    },
  ];
}

export function buildA11yPrompt(sourceCode: string, filePath: string, framework: string): AIMessage[] {
  return [
    {
      role: 'system',
      content: `You are an expert accessibility test engineer specializing in WCAG compliance and Fitts' Law.
Output ONLY the test code, no explanations or markdown fences.
Follow best practices for the ${framework} testing framework.`,
    },
    {
      role: 'user',
      content: `Generate accessibility tests for the given code/component.

The tests should verify:
1. CONTRAST RATIOS: All text meets WCAG AA standard (>= 4.5:1 normal text, >= 3:1 large text)
2. TOUCH TARGET SIZE: All interactive elements are at least 44x44pt (iOS) or 48x48dp (Android)
3. SCREEN READER LABELS: All buttons, images, and interactive elements have accessibility labels
4. FOCUS ORDER: Tab/focus order follows logical reading order (top to bottom, left to right)
5. KEYBOARD NAVIGATION: All functionality is accessible via keyboard/switch control
6. COLOR INDEPENDENCE: No information is conveyed by color alone
7. TEXT SCALING: UI handles dynamic type / font scaling up to 200% without truncation
8. MOTION: Animations respect reduced motion preferences
9. SEMANTIC MARKUP: Proper heading hierarchy and landmark roles

File: ${filePath}
Testing framework: ${framework}

Source code:
\`\`\`
${sourceCode}
\`\`\`

Generate complete, runnable test code with proper imports.`,
    },
  ];
}

export function buildStabilityPrompt(sourceCode: string, filePath: string, framework: string): AIMessage[] {
  return [
    {
      role: 'system',
      content: `You are an expert test engineer specializing in app stability and crash resilience testing.
Output ONLY the test code, no explanations or markdown fences.
Follow best practices for the ${framework} testing framework.`,
    },
    {
      role: 'user',
      content: `Generate stability and resilience tests for the application.

The tests should cover:
1. MEMORY PRESSURE: Test behavior under low memory conditions, verify no crashes
2. NETWORK LOSS: Test offline behavior - graceful degradation when network drops mid-operation
3. BACKGROUND/FOREGROUND: Test app suspend/resume cycle, verify state preservation
4. RAPID ROTATION: Test rapid orientation changes, verify no crashes or state loss
5. LOW STORAGE: Test behavior when device storage is nearly full
6. INTERRUPTED OPERATIONS: Test canceling long-running operations mid-execution
7. CONCURRENT ACCESS: Test multiple rapid taps/interactions simultaneously
8. STALE DATA: Test behavior when cached data is outdated or corrupt
9. TIMEZONE CHANGES: Test behavior when device timezone changes
10. LOCALE CHANGES: Test behavior when device language changes while app is running

File: ${filePath}
Testing framework: ${framework}

Source code:
\`\`\`
${sourceCode}
\`\`\`

Generate complete, runnable test code with proper imports.`,
    },
  ];
}

export function buildSuggestionPrompt(fileList: string): AIMessage[] {
  return [
    {
      role: 'system',
      content: `You are an expert test strategist. Analyze untested files and suggest which ones need tests most urgently.
Consider: code complexity, risk/impact, number of functions, and whether the file is a core module.
Output as JSON array with fields: file, priority (high/medium/low), reason, estimatedTests, functions.
Output ONLY valid JSON, no markdown fences or explanations.`,
    },
    {
      role: 'user',
      content: `Analyze these untested files and suggest which ones should be tested first, ordered by priority:

${fileList}

Return a JSON array of suggestions.`,
    },
  ];
}
