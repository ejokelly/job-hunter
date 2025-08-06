import Anthropic from '@anthropic-ai/sdk'
import { UsageTracker } from '../tracking/usage-tracker'

let anthropicClient: Anthropic | null = null

export function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
  }
  return anthropicClient
}

export interface TrackedClaudeOptions {
  operation: string
  userId?: string
  sessionId?: string
  jobDescription?: string
  endpoint?: string
}

export class TrackedAnthropic {
  static async createMessage(
    prompt: string,
    options: TrackedClaudeOptions,
    maxTokens: number = 2000,
    model: string = 'claude-3-5-sonnet-20241022'
  ) {
    const startTime = Date.now()
    const client = getAnthropicClient()
    let success = false
    let error: string | undefined
    let inputTokens = 0
    let outputTokens = 0

    try {
      const message = await client.messages.create({
        model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      })

      success = true
      inputTokens = message.usage.input_tokens || 0
      outputTokens = message.usage.output_tokens || 0

      // Track usage
      await UsageTracker.trackUsage({
        userId: options.userId,
        sessionId: options.sessionId,
        endpoint: options.endpoint || 'messages',
        operation: options.operation,
        model,
        inputTokens,
        outputTokens,
        jobDescription: options.jobDescription,
        duration: Date.now() - startTime,
        success,
        error
      })

      return message
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error'
      success = false

      // Track failed usage (estimate input tokens)
      await UsageTracker.trackUsage({
        userId: options.userId,
        sessionId: options.sessionId,
        endpoint: options.endpoint || 'messages',
        operation: options.operation,
        model,
        inputTokens: this.estimateInputTokens(prompt),
        outputTokens: 0,
        jobDescription: options.jobDescription,
        duration: Date.now() - startTime,
        success,
        error
      })

      throw err
    }
  }

  // Rough estimation of input tokens (1 token ≈ 4 characters for English text)
  private static estimateInputTokens(prompt: string): number {
    return Math.ceil(prompt.length / 4)
  }

  // Helper to get session ID from request headers or cookies
  static getSessionId(request?: Request): string | undefined {
    if (!request) return undefined
    
    // Try to get from cookies
    const cookies = request.headers.get('cookie')
    if (cookies) {
      const sessionMatch = cookies.match(/session-token=([^;]+)/)
      if (sessionMatch) {
        return sessionMatch[1]
      }
    }
    
    return undefined
  }

  // Helper to get user ID from session
  static async getUserId(sessionId?: string): Promise<string | undefined> {
    if (!sessionId) return undefined
    
    try {
      // Import here to avoid circular dependencies
      const { CodewordAuth } = await import('../auth/codeword-auth')
      const session = await CodewordAuth.getSession(sessionId)
      return session?.user?.id
    } catch (error) {
      console.error('Error getting user ID from session:', error)
      return undefined
    }
  }
}

// Helper function to extract JSON from response (same as before)
export async function extractJsonFromResponse(message: any): Promise<any> {
  const content = message.content[0]
  if (content.type === 'text') {
    // Try to extract JSON from the response - handles various formats
    const jsonMatch = content.text.match(/\{[\s\S]*\}/) || content.text.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  }
  throw new Error('No JSON found in response')
}

// Backward compatibility function
export async function callClaude(
  prompt: string, 
  maxTokens: number = 2000,
  options: TrackedClaudeOptions = { operation: 'general' }
): Promise<any> {
  return TrackedAnthropic.createMessage(prompt, options, maxTokens)
}