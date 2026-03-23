import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { resolve } from 'node:path';
import { generateTests, generateE2ETests, detectFramework } from '../../core/generator.js';
import type { AIProvider, TestFramework } from '../../types/index.js';

export function registerGenCommand(program: Command): void {
  program
    .command('gen')
    .description('AI-generate unit tests for a file')
    .argument('<file>', 'Source file to generate tests for')
    .option('-f, --framework <framework>', 'Testing framework (jest, vitest, pytest, flutter_test)')
    .option('-p, --provider <provider>', 'AI provider (openai, gemini)')
    .option('-o, --output <path>', 'Output test file path')
    .option('--dry-run', 'Preview generated tests without writing')
    .action(async (file: string, opts: { framework?: string; provider?: string; output?: string; dryRun?: boolean }) => {
      const spinner = ora('Generating unit tests...').start();
      const filePath = resolve(file);

      try {
        const result = await generateTests({
          file: filePath,
          framework: opts.framework as TestFramework | undefined,
          provider: opts.provider as AIProvider | undefined,
          output: opts.output ? resolve(opts.output) : undefined,
          dryRun: opts.dryRun,
        });

        spinner.succeed('Tests generated!');
        console.log();
        console.log(chalk.bold('🧪 Generated Tests'));
        console.log(chalk.dim('─'.repeat(50)));
        console.log(`  ${chalk.bold('Framework:')}   ${result.framework}`);
        console.log(`  ${chalk.bold('Tests:')}       ${result.functionsCount} test cases`);
        console.log(`  ${chalk.bold('Output:')}      ${opts.dryRun ? chalk.yellow('(dry run — not written)') : chalk.green(result.testPath)}`);
        console.log();

        if (opts.dryRun) {
          console.log(chalk.dim('─'.repeat(50)));
          console.log(result.testCode);
          console.log(chalk.dim('─'.repeat(50)));
        }
      } catch (err) {
        spinner.fail('Test generation failed');
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }
    });

  // E2E subcommand
  program
    .command('gen:e2e')
    .description('Generate E2E test flow from natural language description')
    .argument('<description>', 'Description of the E2E test flow')
    .option('-f, --framework <framework>', 'E2E framework (playwright, detox, maestro)', 'playwright')
    .option('-p, --provider <provider>', 'AI provider (openai, gemini)')
    .option('-o, --output <path>', 'Output test file path')
    .action(async (description: string, opts: { framework?: string; provider?: string; output?: string }) => {
      const spinner = ora('Generating E2E test flow...').start();

      try {
        const result = await generateE2ETests({
          description,
          framework: opts.framework as 'playwright' | 'detox' | 'maestro' | undefined,
          provider: opts.provider as AIProvider | undefined,
          output: opts.output ? resolve(opts.output) : undefined,
        });

        spinner.succeed('E2E tests generated!');
        console.log();
        console.log(chalk.bold('🎭 Generated E2E Test Flow'));
        console.log(chalk.dim('─'.repeat(50)));
        console.log(`  ${chalk.bold('Framework:')}   ${opts.framework ?? 'playwright'}`);
        console.log(`  ${chalk.bold('Output:')}      ${chalk.green(result.testPath)}`);
        console.log();
        console.log(chalk.dim('─'.repeat(50)));
        console.log(result.testCode);
        console.log(chalk.dim('─'.repeat(50)));
      } catch (err) {
        spinner.fail('E2E generation failed');
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }
    });
}
