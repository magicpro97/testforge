// ===== AI Provider Types =====

export type AIProvider = 'openai' | 'gemini';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
}

export interface TestForgeConfig {
  providers: Partial<Record<AIProvider, { apiKey: string; model?: string }>>;
  defaultProvider?: AIProvider;
}

// ===== Scanner Types =====

export interface SourceFile {
  path: string;
  relativePath: string;
  language: string;
  functions: string[];
  hasTest: boolean;
  testPath?: string;
}

export interface ScanResult {
  totalFiles: number;
  testedFiles: number;
  untestedFiles: number;
  coveragePercent: number;
  files: SourceFile[];
}

// ===== Generator Types =====

export type TestFramework = 'jest' | 'vitest' | 'pytest' | 'flutter_test' | 'junit' | 'xctest' | 'playwright' | 'detox' | 'maestro';

export interface GenerateOptions {
  file: string;
  framework?: TestFramework;
  provider?: AIProvider;
  output?: string;
  dryRun?: boolean;
}

export interface E2EGenerateOptions {
  description: string;
  framework?: 'playwright' | 'detox' | 'maestro';
  provider?: AIProvider;
  output?: string;
}

export interface GenerateResult {
  testCode: string;
  testPath: string;
  framework: TestFramework;
  functionsCount: number;
}

// ===== Coverage Types =====

export interface CoverageFile {
  path: string;
  statements: { total: number; covered: number; percent: number };
  branches: { total: number; covered: number; percent: number };
  functions: { total: number; covered: number; percent: number };
  lines: { total: number; covered: number; percent: number };
  uncoveredLines: number[];
}

export interface CoverageReport {
  summary: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  files: CoverageFile[];
}

// ===== Suggestion Types =====

export interface TestSuggestion {
  file: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  estimatedTests: number;
  functions: string[];
}

// ===== AI Message Types =====

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  tokensUsed?: number;
}
