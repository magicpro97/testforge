import type { AIMessage, AIResponse } from '../types/index.js';

export async function callOpenAI(
  messages: AIMessage[],
  apiKey: string,
  model?: string
): Promise<AIResponse> {
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
