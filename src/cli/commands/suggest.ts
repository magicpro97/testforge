import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { resolve } from 'node:path';
import { scanDirectory } from '../../core/scanner.js';
import { sendAIRequest, buildSuggestionPrompt } from '../../core/ai.js';
import type { TestSuggestion, AIProvider } from '../../types/index.js';

export function registerSuggestCommand(program: Command): void {
  program
    .command('suggest')
    .description('AI suggest which tests to write first (by risk/impact)')
    .argument('[dir]', 'Directory to analyze', '.')
    .option('-p, --provider <provider>', 'AI provider (openai, gemini)')
    .option('-n, --limit <count>', 'Max suggestions', '10')
    .option('--json', 'Output as JSON')
    .action(async (dir: string, opts: { provider?: string; limit?: string; json?: boolean }) => {
      const spinner = ora('Analyzing codebase for test suggestions...').start();
      const targetDir = resolve(dir);

      try {
        // First scan for untested files
        spinner.text = 'Scanning for untested files...';
        const scanResult = await scanDirectory(targetDir);
        const untestedFiles = scanResult.files.filter((f) => !f.hasTest);

        if (untestedFiles.length === 0) {
          spinner.succeed('All files have tests! 🎉');
          return;
        }

        // Build file list summary for AI
        const fileList = untestedFiles
          .slice(0, 30) // Limit to avoid token overflow
          .map((f) => `- ${f.relativePath} (${f.language}, ${f.functions.length} functions: ${f.functions.slice(0, 5).join(', ')})`)
          .join('\n');

        spinner.text = 'AI analyzing test priorities...';
        const messages = buildSuggestionPrompt(fileList);
        const response = await sendAIRequest(messages, opts.provider as AIProvider | undefined);

        let suggestions: TestSuggestion[];
        try {
          suggestions = JSON.parse(response.content);
        } catch {
          // Try to extract JSON from response
          const jsonMatch = response.content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            suggestions = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('Failed to parse AI suggestions');
          }
        }

        const limit = parseInt(opts.limit ?? '10', 10);
        suggestions = suggestions.slice(0, limit);

        spinner.stop();

        if (opts.json) {
          console.log(JSON.stringify(suggestions, null, 2));
          return;
        }

        console.log();
        console.log(chalk.bold('💡 TestForge — Test Suggestions'));
        console.log(chalk.dim('─'.repeat(60)));
        console.log();

        const priorityColors = {
          high: chalk.red,
          medium: chalk.yellow,
          low: chalk.blue,
        };

        const priorityIcons = {
          high: '🔴',
          medium: '🟡',
          low: '🔵',
        };

        for (let i = 0; i < suggestions.length; i++) {
          const s = suggestions[i];
          const color = priorityColors[s.priority] ?? chalk.white;
          const icon = priorityIcons[s.priority] ?? '⚪';

          console.log(`  ${icon} ${chalk.bold(`#${i + 1}`)} ${color(s.file)}`);
          console.log(`     Priority: ${color(s.priority.toUpperCase())} | Est. tests: ${s.estimatedTests}`);
          console.log(`     ${chalk.dim(s.reason)}`);
          if (s.functions?.length > 0) {
            console.log(`     Functions: ${chalk.cyan(s.functions.join(', '))}`);
          }
          console.log();
        }

        console.log(chalk.dim('  Generate tests with:'));
        console.log(chalk.cyan(`    testforge gen <file>`));
        console.log();
      } catch (err) {
        spinner.fail('Suggestion generation failed');
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }
    });
}
