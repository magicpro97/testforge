import type { AIMessage, AIResponse, AIProvider } from '../types/index.js';
import { getActiveProvider } from './config.js';

async function callOpenAI(messages: AIMessage[], apiKey: string, model?: string): Promise<AIResponse> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model ?? 'gpt-4o-mini',
      messages,
      temperature: 0.3,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${errBody}`);
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
    usage?: { total_tokens: number };
  };

  return {
    content: data.choices[0]?.message?.content ?? '',
    tokensUsed: data.usage?.total_tokens,
  };
}

async function callGemini(messages: AIMessage[], apiKey: string, model?: string): Promise<AIResponse> {
  const geminiModel = model ?? 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;

  // Convert messages to Gemini format
  const systemInstruction = messages.find((m) => m.role === 'system');
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 4096,
    },
  };

  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction.content }] };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errBody}`);
  }

  const data = (await res.json()) as {
    candidates: { content: { parts: { text: string }[] } }[];
    usageMetadata?: { totalTokenCount: number };
  };

  return {
    content: data.candidates[0]?.content?.parts?.[0]?.text ?? '',
    tokensUsed: data.usageMetadata?.totalTokenCount,
  };
}

export async function sendAIRequest(
  messages: AIMessage[],
  providerOverride?: AIProvider
): Promise<AIResponse> {
  const active = await getActiveProvider();

  if (!active && !providerOverride) {
    throw new Error(
      'No AI provider configured. Run:\n  testforge config set openai.apiKey <key>\n  testforge config set defaultProvider openai'
    );
  }

  const provider = providerOverride ?? active!.provider;
  const apiKey = active?.apiKey ?? '';

  if (!apiKey) {
    throw new Error(`No API key configured for ${provider}. Run: testforge config set ${provider}.apiKey <key>`);
  }

  const model = active?.model;

  switch (provider) {
    case 'openai':
      return callOpenAI(messages, apiKey, model);
    case 'gemini':
      return callGemini(messages, apiKey, model);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

export function buildTestGenPrompt(sourceCode: string, filePath: string, framework: string): AIMessage[] {
  return [
    {
      role: 'system',
      content: `You are an expert test engineer. Generate comprehensive, well-structured unit tests. 
Output ONLY the test code, no explanations or markdown fences.
Follow best practices for the testing framework.
Cover edge cases, error handling, and happy paths.`,
    },
    {
      role: 'user',
      content: `Generate comprehensive unit tests for the following source file.

File: ${filePath}
Testing framework: ${framework}

Source code:
\`\`\`
${sourceCode}
\`\`\`

Generate complete, runnable test code with proper imports.`,
    },
  ];
}

export function buildE2EPrompt(description: string, framework: string): AIMessage[] {
  return [
    {
      role: 'system',
      content: `You are an expert E2E test engineer. Generate complete, runnable E2E test flows.
Output ONLY the test code, no explanations or markdown fences.
Follow best practices for the ${framework} testing framework.`,
    },
    {
      role: 'user',
      content: `Generate an E2E test flow for the following scenario using ${framework}:

${description}

Generate complete, runnable test code.`,
    },
  ];
}

export function buildSuggestionPrompt(fileList: string): AIMessage[] {
  return [
    {
      role: 'system',
      content: `You are an expert test strategist. Analyze untested files and suggest which ones need tests most urgently.
Consider: code complexity, risk/impact, number of functions, and whether the file is a core module.
Output as JSON array with fields: file, priority (high/medium/low), reason, estimatedTests, functions.
Output ONLY valid JSON, no markdown fences or explanations.`,
    },
    {
      role: 'user',
      content: `Analyze these untested files and suggest which ones should be tested first, ordered by priority:

${fileList}

Return a JSON array of suggestions.`,
    },
  ];
}
