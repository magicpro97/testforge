import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import type { TestForgeConfig, AIProvider } from '../types/index.js';

const CONFIG_DIR = join(homedir(), '.testforge');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

function defaultConfig(): TestForgeConfig {
  return {
    providers: {},
    defaultProvider: undefined,
  };
}

export async function loadConfig(): Promise<TestForgeConfig> {
  try {
    if (!existsSync(CONFIG_PATH)) {
      return defaultConfig();
    }
    const raw = await readFile(CONFIG_PATH, 'utf-8');
    return { ...defaultConfig(), ...JSON.parse(raw) };
  } catch {
    return defaultConfig();
  }
}

export async function saveConfig(config: TestForgeConfig): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

export async function setConfigValue(key: string, value: string): Promise<void> {
  const config = await loadConfig();

  if (key === 'defaultProvider') {
    if (value !== 'openai' && value !== 'gemini') {
      throw new Error(`Invalid provider: ${value}. Must be "openai" or "gemini".`);
    }
    config.defaultProvider = value as AIProvider;
  } else if (key.startsWith('openai.') || key.startsWith('gemini.')) {
    const [provider, field] = key.split('.') as [AIProvider, string];
    if (!config.providers[provider]) {
      config.providers[provider] = { apiKey: '' };
    }
    if (field === 'apiKey') {
      config.providers[provider]!.apiKey = value;
    } else if (field === 'model') {
      config.providers[provider]!.model = value;
    } else {
      throw new Error(`Unknown config field: ${key}`);
    }
  } else {
    throw new Error(
      `Unknown config key: ${key}. Use "defaultProvider", "openai.apiKey", "openai.model", "gemini.apiKey", or "gemini.model".`
    );
  }

  await saveConfig(config);
}

export async function getActiveProvider(): Promise<{ provider: AIProvider; apiKey: string; model?: string } | null> {
  const config = await loadConfig();
  const providerName = config.defaultProvider;

  if (!providerName) {
    // Try to find any configured provider
    for (const name of ['openai', 'gemini'] as AIProvider[]) {
      const p = config.providers[name];
      if (p?.apiKey) {
        return { provider: name, apiKey: p.apiKey, model: p.model };
      }
    }
    return null;
  }

  const p = config.providers[providerName];
  if (!p?.apiKey) return null;
  return { provider: providerName, apiKey: p.apiKey, model: p.model };
}

export function getConfigPath(): string {
  return CONFIG_PATH;
}
