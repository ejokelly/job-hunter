import { MongoClient } from 'mongodb'

const client = new MongoClient(process.env.MONGODB_URI!)
const clientPromise = client.connect()

export interface UsageEvent {
  _id?: string
  userId?: string
  sessionId?: string
  endpoint: string
  operation: string
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCost: number
  jobDescription?: string
  timestamp: Date
  duration?: number
  success: boolean
  error?: string
}

export interface UsageStats {
  totalCalls: number
  totalTokens: number
  totalCost: number
  avgTokensPerCall: number
  avgCostPerCall: number
  successRate: number
  byOperation: Record<string, {
    calls: number
    tokens: number
    cost: number
  }>
  byModel: Record<string, {
    calls: number
    tokens: number
    cost: number
  }>
  dailyStats: Array<{
    date: string
    calls: number
    tokens: number
    cost: number
  }>
}

export class UsageTracker {
  private static async getDatabase() {
    const connection = await clientPromise
    return connection.db()
  }

  // Token pricing per 1K tokens (OpenAI and Anthropic pricing)
  private static getTokenCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = {
      // OpenAI models
      'gpt-4o': { input: 0.0025, output: 0.01 },
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
      
      // Anthropic Claude models (official pricing - base input/output tokens)
      'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 }, // $3/MTok input, $15/MTok output
      'claude-3-5-haiku-20241022': { input: 0.0008, output: 0.004 }, // $0.80/MTok input, $4/MTok output
      'claude-3-opus-20240229': { input: 0.015, output: 0.075 }, // $15/MTok input, $75/MTok output
      'claude-haiku-3': { input: 0.00025, output: 0.00125 }, // $0.25/MTok input, $1.25/MTok output
      'claude-sonnet-4': { input: 0.003, output: 0.015 }, // $3/MTok input, $15/MTok output
      'claude-opus-4': { input: 0.015, output: 0.075 } // $15/MTok input, $75/MTok output
    }
    
    const modelPricing = pricing[model as keyof typeof pricing] || pricing['claude-3-5-sonnet-20241022']
    return (inputTokens / 1000) * modelPricing.input + (outputTokens / 1000) * modelPricing.output
  }

  static async trackUsage(event: Omit<UsageEvent, 'timestamp' | 'estimatedCost' | 'totalTokens'>): Promise<void> {
    try {
      const db = await this.getDatabase()
      
      const totalTokens = event.inputTokens + event.outputTokens
      const estimatedCost = this.getTokenCost(event.model, event.inputTokens, event.outputTokens)
      
      const { _id, ...eventData } = event
      const usageEvent = {
        ...eventData,
        totalTokens,
        estimatedCost,
        timestamp: new Date()
      }

      await db.collection('usage').insertOne(usageEvent)
      
      console.log(`📊 Usage tracked: ${event.operation} - ${totalTokens} tokens - $${estimatedCost.toFixed(4)}`)
    } catch (error) {
      console.error('Error tracking usage:', error)
      // Don't throw - we don't want usage tracking to break the actual functionality
    }
  }

  static async getUsageStats(filters?: {
    userId?: string
    startDate?: Date
    endDate?: Date
    operation?: string
  }): Promise<UsageStats> {
    try {
      const db = await this.getDatabase()
      
      const match: any = {}
      if (filters?.userId) match.userId = filters.userId
      if (filters?.operation) match.operation = filters.operation
      if (filters?.startDate || filters?.endDate) {
        match.timestamp = {}
        if (filters.startDate) match.timestamp.$gte = filters.startDate
        if (filters.endDate) match.timestamp.$lte = filters.endDate
      }

      const pipeline = [
        { $match: match },
        {
          $group: {
            _id: null,
            totalCalls: { $sum: 1 },
            totalTokens: { $sum: '$totalTokens' },
            totalCost: { $sum: '$estimatedCost' },
            successfulCalls: { $sum: { $cond: ['$success', 1, 0] } },
            byOperation: {
              $push: {
                operation: '$operation',
                tokens: '$totalTokens',
                cost: '$estimatedCost'
              }
            },
            byModel: {
              $push: {
                model: '$model',
                tokens: '$totalTokens',
                cost: '$estimatedCost'
              }
            },
            dailyData: {
              $push: {
                date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
                tokens: '$totalTokens',
                cost: '$estimatedCost'
              }
            }
          }
        }
      ]

      const result = await db.collection('usage').aggregate(pipeline).toArray()
      
      if (result.length === 0) {
        return {
          totalCalls: 0,
          totalTokens: 0,
          totalCost: 0,
          avgTokensPerCall: 0,
          avgCostPerCall: 0,
          successRate: 0,
          byOperation: {},
          byModel: {},
          dailyStats: []
        }
      }

      const data = result[0]
      
      // Process operation stats
      const byOperation: Record<string, any> = {}
      data.byOperation.forEach((item: any) => {
        if (!byOperation[item.operation]) {
          byOperation[item.operation] = { calls: 0, tokens: 0, cost: 0 }
        }
        byOperation[item.operation].calls += 1
        byOperation[item.operation].tokens += item.tokens
        byOperation[item.operation].cost += item.cost
      })

      // Process model stats
      const byModel: Record<string, any> = {}
      data.byModel.forEach((item: any) => {
        if (!byModel[item.model]) {
          byModel[item.model] = { calls: 0, tokens: 0, cost: 0 }
        }
        byModel[item.model].calls += 1
        byModel[item.model].tokens += item.tokens
        byModel[item.model].cost += item.cost
      })

      // Process daily stats
      const dailyMap: Record<string, any> = {}
      data.dailyData.forEach((item: any) => {
        if (!dailyMap[item.date]) {
          dailyMap[item.date] = { date: item.date, calls: 0, tokens: 0, cost: 0 }
        }
        dailyMap[item.date].calls += 1
        dailyMap[item.date].tokens += item.tokens
        dailyMap[item.date].cost += item.cost
      })
      
      const dailyStats = Object.values(dailyMap).sort((a: any, b: any) => 
        a.date.localeCompare(b.date)
      )

      return {
        totalCalls: data.totalCalls,
        totalTokens: data.totalTokens,
        totalCost: data.totalCost,
        avgTokensPerCall: data.totalCalls > 0 ? data.totalTokens / data.totalCalls : 0,
        avgCostPerCall: data.totalCalls > 0 ? data.totalCost / data.totalCalls : 0,
        successRate: data.totalCalls > 0 ? data.successfulCalls / data.totalCalls : 0,
        byOperation,
        byModel,
        dailyStats
      }
    } catch (error) {
      console.error('Error getting usage stats:', error)
      throw error
    }
  }

  static async getRecentUsage(limit: number = 50): Promise<UsageEvent[]> {
    try {
      const db = await this.getDatabase()
      
      const events = await db.collection('usage')
        .find({})
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray()

      return events.map(event => ({
        ...event,
        _id: event._id.toString()
      })) as UsageEvent[]
    } catch (error) {
      console.error('Error getting recent usage:', error)
      throw error
    }
  }
}