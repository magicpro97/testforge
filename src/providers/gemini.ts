import type { AIMessage, AIResponse } from '../types/index.js';

export async function callGemini(
  messages: AIMessage[],
  apiKey: string,
  model?: string
): Promise<AIResponse> {
  const geminiModel = model ?? 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;

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
