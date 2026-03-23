import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, basename, extname, join } from 'node:path';
import { existsSync } from 'node:fs';
import type { GenerateOptions, GenerateResult, E2EGenerateOptions, TestFramework } from '../types/index.js';
import { sendAIRequest, buildTestGenPrompt, buildE2EPrompt } from './ai.js';

const FRAMEWORK_DETECTORS: { check: string; framework: TestFramework }[] = [
  { check: 'vitest', framework: 'vitest' },
  { check: 'jest', framework: 'jest' },
  { check: 'pytest', framework: 'pytest' },
  { check: 'flutter_test', framework: 'flutter_test' },
  { check: 'playwright', framework: 'playwright' },
  { check: 'detox', framework: 'detox' },
];

export async function detectFramework(dir: string): Promise<TestFramework> {
  // Check package.json
  const pkgPath = join(dir, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const raw = await readFile(pkgPath, 'utf-8');
      const pkg = JSON.parse(raw);
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      for (const { check, framework } of FRAMEWORK_DETECTORS) {
        if (allDeps[check]) return framework;
      }
    } catch {
      // ignore
    }
  }

  // Check pubspec.yaml for Flutter
  if (existsSync(join(dir, 'pubspec.yaml'))) return 'flutter_test';

  // Check requirements.txt / setup.py for Python
  if (existsSync(join(dir, 'requirements.txt')) || existsSync(join(dir, 'setup.py'))) return 'pytest';

  // Default
  return 'jest';
}

function getTestFilePath(sourcePath: string, framework: TestFramework): string {
  const dir = dirname(sourcePath);
  const ext = extname(sourcePath);
  const name = basename(sourcePath, ext);

  switch (framework) {
    case 'pytest':
      return join(dir, `test_${name}.py`);
    case 'flutter_test':
      return join(dir.replace(/\blib\b/, 'test'), `${name}_test.dart`);
    case 'junit':
      return join(dir.replace(/\bmain\b/, 'test'), `${name}Test.kt`);
    case 'xctest':
      return join(dir.replace(/\bSources\b/, 'Tests'), `${name}Tests.swift`);
    default:
      return join(dir, `${name}.test${ext}`);
  }
}

function stripCodeFences(code: string): string {
  return code
    .replace(/^```[\w]*\n?/gm, '')
    .replace(/\n?```$/gm, '')
    .trim();
}

export async function generateTests(options: GenerateOptions): Promise<GenerateResult> {
  const { file, framework: userFramework, output, dryRun } = options;

  if (!existsSync(file)) {
    throw new Error(`Source file not found: ${file}`);
  }

  const sourceCode = await readFile(file, 'utf-8');
  const framework = userFramework ?? (await detectFramework(dirname(file)));
  const messages = buildTestGenPrompt(sourceCode, file, framework);

  const response = await sendAIRequest(messages, options.provider);
  const testCode = stripCodeFences(response.content);
  const testPath = output ?? getTestFilePath(file, framework);

  if (!dryRun) {
    await mkdir(dirname(testPath), { recursive: true });
    await writeFile(testPath, testCode, 'utf-8');
  }

  // Count approximate test functions
  const testMatches = testCode.match(/(?:it|test|def test_|testWidgets)\s*\(/g);
  const functionsCount = testMatches?.length ?? 0;

  return {
    testCode,
    testPath,
    framework,
    functionsCount,
  };
}

export async function generateE2ETests(options: E2EGenerateOptions): Promise<{ testCode: string; testPath: string }> {
  const framework = options.framework ?? 'playwright';
  const messages = buildE2EPrompt(options.description, framework);

  const response = await sendAIRequest(messages, options.provider);
  const testCode = stripCodeFences(response.content);

  const extMap: Record<string, string> = {
    playwright: '.spec.ts',
    detox: '.e2e.ts',
    maestro: '.yaml',
  };

  const slug = options.description
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const testPath = `e2e/${slug}${extMap[framework] ?? '.spec.ts'}`;

  const finalPath = options.output ?? testPath;
  await mkdir(dirname(finalPath), { recursive: true });
  await writeFile(finalPath, testCode, 'utf-8');

  return { testCode, testPath };
}
