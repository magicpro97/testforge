import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig, setConfigValue, getConfigPath } from '../../core/config.js';

export function registerConfigCommand(program: Command): void {
  const configCmd = program
    .command('config')
    .description('Manage TestForge configuration');

  configCmd
    .command('set')
    .description('Set a configuration value')
    .argument('<key>', 'Config key (e.g., openai.apiKey, gemini.apiKey, defaultProvider)')
    .argument('<value>', 'Config value')
    .action(async (key: string, value: string) => {
      try {
        await setConfigValue(key, value);
        const maskedValue = key.includes('apiKey')
          ? (value.length >= 10 ? value.slice(0, 4) + '****' + value.slice(-4) : '****')
          : value;
        console.log(chalk.green(`✓ Set ${key} = ${maskedValue}`));
      } catch (err) {
        console.error(chalk.red(`✗ ${(err as Error).message}`));
        process.exit(1);
      }
    });

  configCmd
    .command('list')
    .description('Show current configuration')
    .action(async () => {
      try {
        const config = await loadConfig();

        console.log();
        console.log(chalk.bold('⚙️  TestForge Configuration'));
        console.log(chalk.dim('─'.repeat(40)));
        console.log(`  ${chalk.dim('Config file:')} ${getConfigPath()}`);
        console.log();

        console.log(`  ${chalk.bold('Default provider:')} ${config.defaultProvider ?? chalk.dim('(not set)')}`);
        console.log();

        for (const [name, provider] of Object.entries(config.providers)) {
          if (provider) {
            const maskedKey = provider.apiKey
              ? (provider.apiKey.length >= 10 ? provider.apiKey.slice(0, 4) + '****' + provider.apiKey.slice(-4) : '****')
              : chalk.dim('(not set)');
            console.log(`  ${chalk.bold(name)}:`);
            console.log(`    API Key: ${maskedKey}`);
            console.log(`    Model:   ${provider.model ?? chalk.dim('(default)')}`);
            console.log();
          }
        }

        if (Object.keys(config.providers).length === 0) {
          console.log(chalk.dim('  No providers configured.'));
          console.log();
          console.log(chalk.dim('  Get started:'));
          console.log(chalk.cyan('    testforge config set openai.apiKey sk-...'));
          console.log(chalk.cyan('    testforge config set defaultProvider openai'));
          console.log();
        }
      } catch (err) {
        console.error(chalk.red(`✗ ${(err as Error).message}`));
        process.exit(1);
      }
    });
}
