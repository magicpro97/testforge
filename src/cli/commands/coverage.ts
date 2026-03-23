import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { resolve } from 'node:path';
import { parseCoverageReport, coverageBar, coverageColor } from '../../core/coverage.js';

export function registerCoverageCommand(program: Command): void {
  program
    .command('coverage')
    .description('Show coverage summary in terminal')
    .argument('[dir]', 'Project directory with coverage data', '.')
    .option('--json', 'Output as JSON')
    .option('--min <percent>', 'Minimum coverage threshold', '0')
    .action(async (dir: string, opts: { json?: boolean; min?: string }) => {
      const spinner = ora('Parsing coverage report...').start();
      const targetDir = resolve(dir);

      try {
        const report = await parseCoverageReport(targetDir);

        if (!report) {
          spinner.fail('No coverage report found');
          console.log();
          console.log(chalk.dim('  Run your test suite with coverage enabled first:'));
          console.log(chalk.cyan('    npx jest --coverage'));
          console.log(chalk.cyan('    npx vitest --coverage'));
          console.log(chalk.cyan('    pytest --cov'));
          return;
        }

        spinner.stop();

        if (opts.json) {
          console.log(JSON.stringify(report, null, 2));
          return;
        }

        console.log();
        console.log(chalk.bold('📊 TestForge — Coverage Report'));
        console.log(chalk.dim('─'.repeat(60)));
        console.log();

        // Summary
        console.log(chalk.bold('  Summary:'));
        for (const [key, value] of Object.entries(report.summary)) {
          const color = coverageColor(value);
          const bar = coverageBar(value, 20);
          const colorFn = color === 'green' ? chalk.green : color === 'yellow' ? chalk.yellow : chalk.red;
          console.log(`    ${key.padEnd(12)} ${colorFn(bar)} ${colorFn(value + '%')}`);
        }
        console.log();

        // Per-file breakdown
        if (report.files.length > 0) {
          console.log(chalk.bold('  Files:'));
          console.log(chalk.dim(`    ${'File'.padEnd(40)} Stmts   Branch  Funcs   Lines`));
          console.log(chalk.dim('    ' + '─'.repeat(56)));

          const minThreshold = parseInt(opts.min ?? '0', 10);
          const sortedFiles = [...report.files].sort((a, b) => a.lines.percent - b.lines.percent);

          for (const file of sortedFiles) {
            const shortPath = file.path.length > 38 ? '...' + file.path.slice(-35) : file.path;
            const lineColor = coverageColor(file.lines.percent);
            const colorFn = lineColor === 'green' ? chalk.green : lineColor === 'yellow' ? chalk.yellow : chalk.red;

            if (file.lines.percent < minThreshold) {
              console.log(
                `    ${colorFn(shortPath.padEnd(40))} ${pad(file.statements.percent)}   ${pad(file.branches.percent)}   ${pad(file.functions.percent)}   ${pad(file.lines.percent)}`
              );
            } else {
              console.log(
                `    ${shortPath.padEnd(40)} ${pad(file.statements.percent)}   ${pad(file.branches.percent)}   ${pad(file.functions.percent)}   ${pad(file.lines.percent)}`
              );
            }
          }
          console.log();
        }
      } catch (err) {
        spinner.fail('Coverage parsing failed');
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }
    });
}

function pad(n: number): string {
  return (n + '%').padStart(5);
}
