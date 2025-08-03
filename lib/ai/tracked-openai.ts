import OpenAI from 'openai'
import { UsageTracker } from '../tracking/usage-tracker'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export interface TrackedCompletionOptions {
  operation: string
  userId?: string
  sessionId?: string
  jobDescription?: string
  endpoint?: string
}

export class TrackedOpenAI {
  static async createChatCompletion(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    options: TrackedCompletionOptions,
    model: string = 'gpt-4o-mini'
  ) {
    const startTime = Date.now()
    let success = false
    let error: string | undefined
    let inputTokens = 0
    let outputTokens = 0

    try {
      const response = await openai.chat.completions.create({
        model,
        messages,
        temperature: 0.7,
      })

      success = true
      inputTokens = response.usage?.prompt_tokens || 0
      outputTokens = response.usage?.completion_tokens || 0

      // Track usage
      await UsageTracker.trackUsage({
        userId: options.userId,
        sessionId: options.sessionId,
        endpoint: options.endpoint || 'chat/completions',
        operation: options.operation,
        model,
        inputTokens,
        outputTokens,
        jobDescription: options.jobDescription,
        duration: Date.now() - startTime,
        success,
        error
      })

      return response
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error'
      success = false

      // Track failed usage (still uses input tokens)
      await UsageTracker.trackUsage({
        userId: options.userId,
        sessionId: options.sessionId,
        endpoint: options.endpoint || 'chat/completions',
        operation: options.operation,
        model,
        inputTokens: this.estimateInputTokens(messages),
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
  private static estimateInputTokens(messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]): number {
    const totalChars = messages.reduce((acc, msg) => {
      if (typeof msg.content === 'string') {
        return acc + msg.content.length
      }
      return acc
    }, 0)
    
    return Math.ceil(totalChars / 4)
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