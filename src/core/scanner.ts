import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, basename, dirname, extname } from 'node:path';
import { existsSync } from 'node:fs';
import type { SourceFile, ScanResult } from '../types/index.js';

const SOURCE_EXTENSIONS = new Set(['.ts', '.js', '.py', '.dart', '.kt', '.swift']);

const IGNORE_DIRS = new Set([
  'node_modules', 'dist', 'build', '.git', '.next', '.nuxt',
  'coverage', '__pycache__', '.dart_tool', '.idea', '.vscode',
  'vendor', 'target', 'out', '.gradle',
]);

const TEST_PATTERNS: Record<string, (filePath: string) => string[]> = {
  '.ts': (f) => {
    const dir = dirname(f);
    const name = basename(f, '.ts');
    return [
      join(dir, `${name}.test.ts`),
      join(dir, `${name}.spec.ts`),
      join(dir, '__tests__', `${name}.test.ts`),
      join(dir, '__tests__', `${name}.spec.ts`),
    ];
  },
  '.js': (f) => {
    const dir = dirname(f);
    const name = basename(f, '.js');
    return [
      join(dir, `${name}.test.js`),
      join(dir, `${name}.spec.js`),
      join(dir, '__tests__', `${name}.test.js`),
      join(dir, '__tests__', `${name}.spec.js`),
    ];
  },
  '.py': (f) => {
    const dir = dirname(f);
    const name = basename(f, '.py');
    return [
      join(dir, `test_${name}.py`),
      join(dir, `${name}_test.py`),
      join(dir, 'tests', `test_${name}.py`),
    ];
  },
  '.dart': (f) => {
    const dir = dirname(f);
    const name = basename(f, '.dart');
    return [
      join(dir.replace(/\blib\b/, 'test'), `${name}_test.dart`),
      join(dir, `${name}_test.dart`),
    ];
  },
  '.kt': (f) => {
    const dir = dirname(f);
    const name = basename(f, '.kt');
    return [
      join(dir.replace(/\bmain\b/, 'test'), `${name}Test.kt`),
      join(dir, `${name}Test.kt`),
    ];
  },
  '.swift': (f) => {
    const dir = dirname(f);
    const name = basename(f, '.swift');
    return [
      join(dir.replace(/\bSources\b/, 'Tests'), `${name}Tests.swift`),
      join(dir, `${name}Tests.swift`),
    ];
  },
};

function isTestFile(filePath: string): boolean {
  const name = basename(filePath);
  return (
    name.includes('.test.') ||
    name.includes('.spec.') ||
    name.includes('_test.') ||
    name.startsWith('test_') ||
    name.endsWith('Test.kt') ||
    name.endsWith('Tests.swift')
  );
}

function getLanguage(ext: string): string {
  const map: Record<string, string> = {
    '.ts': 'typescript',
    '.js': 'javascript',
    '.py': 'python',
    '.dart': 'dart',
    '.kt': 'kotlin',
    '.swift': 'swift',
  };
  return map[ext] ?? 'unknown';
}

/** Regex-based function name extraction */
export function extractFunctions(content: string, language: string): string[] {
  const functions: string[] = [];

  switch (language) {
    case 'typescript':
    case 'javascript': {
      // function declarations
      const funcDecl = /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g;
      let m: RegExpExecArray | null;
      while ((m = funcDecl.exec(content)) !== null) functions.push(m[1]);

      // arrow functions / const assignments
      const arrowFunc = /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(/g;
      while ((m = arrowFunc.exec(content)) !== null) functions.push(m[1]);

      // class methods
      const classMethod = /(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*\w[^{]*)?\s*\{/g;
      while ((m = classMethod.exec(content)) !== null) {
        if (!['if', 'for', 'while', 'switch', 'catch', 'constructor'].includes(m[1])) {
          functions.push(m[1]);
        }
      }
      break;
    }
    case 'python': {
      const pyFunc = /def\s+(\w+)\s*\(/g;
      let m: RegExpExecArray | null;
      while ((m = pyFunc.exec(content)) !== null) {
        if (!m[1].startsWith('_')) functions.push(m[1]);
      }
      break;
    }
    case 'dart': {
      const dartFunc = /(?:\w+\s+)?(\w+)\s*\([^)]*\)\s*(?:async\s*)?\{/g;
      let m: RegExpExecArray | null;
      while ((m = dartFunc.exec(content)) !== null) {
        if (!['if', 'for', 'while', 'switch', 'catch'].includes(m[1])) {
          functions.push(m[1]);
        }
      }
      break;
    }
    case 'kotlin': {
      const ktFunc = /fun\s+(\w+)\s*\(/g;
      let m: RegExpExecArray | null;
      while ((m = ktFunc.exec(content)) !== null) functions.push(m[1]);
      break;
    }
    case 'swift': {
      const swiftFunc = /func\s+(\w+)\s*\(/g;
      let m: RegExpExecArray | null;
      while ((m = swiftFunc.exec(content)) !== null) functions.push(m[1]);
      break;
    }
  }

  return [...new Set(functions)];
}

async function walkDir(dir: string, rootDir: string): Promise<SourceFile[]> {
  const files: SourceFile[] = [];

  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.has(entry.name)) {
        files.push(...(await walkDir(fullPath, rootDir)));
      }
      continue;
    }

    const ext = extname(entry.name);
    if (!SOURCE_EXTENSIONS.has(ext)) continue;
    if (isTestFile(entry.name)) continue;

    const language = getLanguage(ext);
    const relativePath = relative(rootDir, fullPath);

    // Extract functions
    let functions: string[] = [];
    try {
      const content = await readFile(fullPath, 'utf-8');
      functions = extractFunctions(content, language);
    } catch {
      // Skip files that can't be read
    }

    // Check for test file
    const testPatternFn = TEST_PATTERNS[ext];
    let hasTest = false;
    let testPath: string | undefined;

    if (testPatternFn) {
      const candidates = testPatternFn(fullPath);
      for (const candidate of candidates) {
        if (existsSync(candidate)) {
          hasTest = true;
          testPath = relative(rootDir, candidate);
          break;
        }
      }
    }

    files.push({
      path: fullPath,
      relativePath,
      language,
      functions,
      hasTest,
      testPath,
    });
  }

  return files;
}

export async function scanDirectory(dir: string): Promise<ScanResult> {
  const files = await walkDir(dir, dir);
  const testedFiles = files.filter((f) => f.hasTest).length;
  const untestedFiles = files.length - testedFiles;
  const coveragePercent = files.length > 0 ? Math.round((testedFiles / files.length) * 100) : 100;

  return {
    totalFiles: files.length,
    testedFiles,
    untestedFiles,
    coveragePercent,
    files,
  };
}
