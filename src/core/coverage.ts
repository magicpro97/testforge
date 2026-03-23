import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { CoverageReport, CoverageFile } from '../types/index.js';

/** Parse Istanbul JSON coverage report */
async function parseIstanbulJson(filePath: string): Promise<CoverageReport> {
  const raw = await readFile(filePath, 'utf-8');
  const data = JSON.parse(raw) as Record<string, {
    s: Record<string, number>;
    b: Record<string, number[]>;
    f: Record<string, number>;
    statementMap: Record<string, unknown>;
    branchMap: Record<string, unknown>;
    fnMap: Record<string, unknown>;
  }>;

  const files: CoverageFile[] = [];

  for (const [path, entry] of Object.entries(data)) {
    const stmtKeys = Object.keys(entry.s);
    const stmtCovered = stmtKeys.filter((k) => entry.s[k] > 0).length;

    const branchValues = Object.values(entry.b).flat();
    const branchCovered = branchValues.filter((v) => v > 0).length;

    const fnKeys = Object.keys(entry.f);
    const fnCovered = fnKeys.filter((k) => entry.f[k] > 0).length;

    // Approximate line coverage from statements
    const lineTotal = stmtKeys.length;
    const lineCovered = stmtCovered;

    const uncoveredLines = stmtKeys
      .filter((k) => entry.s[k] === 0)
      .map((k) => parseInt(k, 10))
      .filter((n) => !isNaN(n));

    files.push({
      path,
      statements: {
        total: stmtKeys.length,
        covered: stmtCovered,
        percent: stmtKeys.length > 0 ? Math.round((stmtCovered / stmtKeys.length) * 100) : 100,
      },
      branches: {
        total: branchValues.length,
        covered: branchCovered,
        percent: branchValues.length > 0 ? Math.round((branchCovered / branchValues.length) * 100) : 100,
      },
      functions: {
        total: fnKeys.length,
        covered: fnCovered,
        percent: fnKeys.length > 0 ? Math.round((fnCovered / fnKeys.length) * 100) : 100,
      },
      lines: {
        total: lineTotal,
        covered: lineCovered,
        percent: lineTotal > 0 ? Math.round((lineCovered / lineTotal) * 100) : 100,
      },
      uncoveredLines,
    });
  }

  const summary = {
    statements: calcAvg(files.map((f) => f.statements.percent)),
    branches: calcAvg(files.map((f) => f.branches.percent)),
    functions: calcAvg(files.map((f) => f.functions.percent)),
    lines: calcAvg(files.map((f) => f.lines.percent)),
  };

  return { summary, files };
}

/** Parse lcov.info format */
async function parseLcov(filePath: string): Promise<CoverageReport> {
  const raw = await readFile(filePath, 'utf-8');
  const files: CoverageFile[] = [];
  let current: Partial<CoverageFile> | null = null;

  for (const line of raw.split('\n')) {
    if (line.startsWith('SF:')) {
      current = {
        path: line.slice(3),
        statements: { total: 0, covered: 0, percent: 0 },
        branches: { total: 0, covered: 0, percent: 0 },
        functions: { total: 0, covered: 0, percent: 0 },
        lines: { total: 0, covered: 0, percent: 0 },
        uncoveredLines: [],
      };
    } else if (line.startsWith('FNF:') && current) {
      current.functions!.total = parseInt(line.slice(4), 10);
    } else if (line.startsWith('FNH:') && current) {
      current.functions!.covered = parseInt(line.slice(4), 10);
    } else if (line.startsWith('BRF:') && current) {
      current.branches!.total = parseInt(line.slice(4), 10);
    } else if (line.startsWith('BRH:') && current) {
      current.branches!.covered = parseInt(line.slice(4), 10);
    } else if (line.startsWith('LF:') && current) {
      current.lines!.total = parseInt(line.slice(3), 10);
      current.statements!.total = current.lines!.total;
    } else if (line.startsWith('LH:') && current) {
      current.lines!.covered = parseInt(line.slice(3), 10);
      current.statements!.covered = current.lines!.covered;
    } else if (line.startsWith('DA:') && current) {
      const [lineNum, hits] = line.slice(3).split(',').map(Number);
      if (hits === 0) current.uncoveredLines!.push(lineNum);
    } else if (line === 'end_of_record' && current) {
      // Calculate percentages
      for (const key of ['statements', 'branches', 'functions', 'lines'] as const) {
        const s = current[key]!;
        s.percent = s.total > 0 ? Math.round((s.covered / s.total) * 100) : 100;
      }
      files.push(current as CoverageFile);
      current = null;
    }
  }

  const summary = {
    statements: calcAvg(files.map((f) => f.statements.percent)),
    branches: calcAvg(files.map((f) => f.branches.percent)),
    functions: calcAvg(files.map((f) => f.functions.percent)),
    lines: calcAvg(files.map((f) => f.lines.percent)),
  };

  return { summary, files };
}

function calcAvg(values: number[]): number {
  if (values.length === 0) return 100;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

/** Auto-detect and parse coverage report */
export async function parseCoverageReport(dir: string): Promise<CoverageReport | null> {
  // Check common coverage report locations
  const candidates = [
    join(dir, 'coverage', 'coverage-final.json'),
    join(dir, 'coverage', 'lcov.info'),
    join(dir, '.nyc_output', 'coverage-final.json'),
    join(dir, 'coverage', 'lcov', 'lcov.info'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      if (candidate.endsWith('.json')) {
        return parseIstanbulJson(candidate);
      } else if (candidate.endsWith('lcov.info')) {
        return parseLcov(candidate);
      }
    }
  }

  return null;
}

/** Generate a coverage bar for terminal display */
export function coverageBar(percent: number, width = 30): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return bar;
}

/** Get color for coverage percentage */
export function coverageColor(percent: number): 'green' | 'yellow' | 'red' {
  if (percent >= 80) return 'green';
  if (percent >= 50) return 'yellow';
  return 'red';
}
