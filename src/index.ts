#!/usr/bin/env node

import { Command } from 'commander';
import { registerScanCommand } from './cli/commands/scan.js';
import { registerGenCommand } from './cli/commands/gen.js';
import { registerCoverageCommand } from './cli/commands/coverage.js';
import { registerSuggestCommand } from './cli/commands/suggest.js';
import { registerConfigCommand } from './cli/commands/config.js';

const program = new Command();

program
  .name('testforge')
  .description('🧪 AI Test Generator CLI — scan untested code, generate unit & E2E tests, coverage analysis')
  .version('1.0.0');

registerScanCommand(program);
registerGenCommand(program);
registerCoverageCommand(program);
registerSuggestCommand(program);
registerConfigCommand(program);

program.parse();
