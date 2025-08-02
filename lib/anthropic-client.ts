import Anthropic from '@anthropic-ai/sdk';

let anthropicClient: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropicClient;
}

export async function extractJsonFromResponse(message: any): Promise<any> {
  const content = message.content[0];
  if (content.type === 'text') {
    // Try to extract JSON from the response - handles various formats
    const jsonMatch = content.text.match(/\{[\s\S]*\}/) || content.text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  }
  throw new Error('No JSON found in response');
}

export async function callClaude(prompt: string, maxTokens: number = 2000): Promise<any> {
  const client = getAnthropicClient();
  const message = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });
  
  return message;
}