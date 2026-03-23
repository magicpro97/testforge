import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { scanDirectory } from '../../core/scanner.js';
import { resolve } from 'node:path';

export function registerScanCommand(program: Command): void {
  program
    .command('scan')
    .description('Scan for untested code and show coverage gaps')
    .argument('[dir]', 'Directory to scan', '.')
    .option('-l, --language <lang>', 'Filter by language (ts, js, py, dart, kt, swift)')
    .option('--json', 'Output as JSON')
    .action(async (dir: string, opts: { language?: string; json?: boolean }) => {
      const spinner = ora('Scanning for untested code...').start();
      const targetDir = resolve(dir);

      try {
        const result = await scanDirectory(targetDir);

        // Filter by language if specified
        let files = result.files;
        if (opts.language) {
          const langMap: Record<string, string> = {
            ts: 'typescript', js: 'javascript', py: 'python',
            dart: 'dart', kt: 'kotlin', swift: 'swift',
          };
          const lang = langMap[opts.language] ?? opts.language;
          files = files.filter((f) => f.language === lang);
        }

        spinner.stop();

        if (opts.json) {
          console.log(JSON.stringify({ ...result, files }, null, 2));
          return;
        }

        // Header
        console.log();
        console.log(chalk.bold('🧪 TestForge — Scan Results'));
        console.log(chalk.dim('─'.repeat(50)));
        console.log();

        // Summary
        const coverageColor = result.coveragePercent >= 80 ? chalk.green : result.coveragePercent >= 50 ? chalk.yellow : chalk.red;
        console.log(`  ${chalk.bold('Total files:')}     ${result.totalFiles}`);
        console.log(`  ${chalk.bold('Tested:')}          ${chalk.green(result.testedFiles.toString())}`);
        console.log(`  ${chalk.bold('Untested:')}        ${chalk.red(result.untestedFiles.toString())}`);
        console.log(`  ${chalk.bold('Coverage:')}        ${coverageColor(result.coveragePercent + '%')}`);
        console.log();

        // Untested files
        const untestedFiles = files.filter((f) => !f.hasTest);
        if (untestedFiles.length > 0) {
          console.log(chalk.bold.red(`  ✗ Untested files (${untestedFiles.length}):`));
          for (const f of untestedFiles) {
            const fns = f.functions.length > 0
              ? chalk.dim(` — ${f.functions.length} functions: ${f.functions.slice(0, 3).join(', ')}${f.functions.length > 3 ? '...' : ''}`)
              : '';
            console.log(`    ${chalk.red('●')} ${f.relativePath}${fns}`);
          }
          console.log();
        }

        // Tested files
        const testedFiles = files.filter((f) => f.hasTest);
        if (testedFiles.length > 0) {
          console.log(chalk.bold.green(`  ✓ Tested files (${testedFiles.length}):`));
          for (const f of testedFiles) {
            console.log(`    ${chalk.green('●')} ${f.relativePath} ${chalk.dim(`→ ${f.testPath}`)}`);
          }
          console.log();
        }

      } catch (err) {
        spinner.fail('Scan failed');
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }
    });
}
