import { NextRequest, NextResponse } from 'next/server'
import { UsageTracker } from '@/lib/tracking/usage-tracker'
import { getServerAuthSession } from '@/lib/auth/server-auth'
import { MongoClient } from 'mongodb'

const client = new MongoClient(process.env.MONGODB_URI!)
const clientPromise = client.connect()

async function getDatabase() {
  const connection = await clientPromise
  return connection.db()
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerAuthSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const db = await getDatabase()
    
    // Get current date ranges
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfYear = new Date(now.getFullYear(), 0, 1)

    // Get usage stats for different time periods
    const [todayStats, monthStats, yearStats, allTimeStats] = await Promise.all([
      UsageTracker.getUsageStats({ startDate: startOfDay }),
      UsageTracker.getUsageStats({ startDate: startOfMonth }),
      UsageTracker.getUsageStats({ startDate: startOfYear }),
      UsageTracker.getUsageStats({})
    ])

    // Get user counts
    const [totalUsers, activeUsersToday, activeUsersMonth] = await Promise.all([
      db.collection('users').countDocuments({}),
      db.collection('usage').distinct('userId', { 
        timestamp: { $gte: startOfDay },
        success: true 
      }).then((users: any[]) => users.length),
      db.collection('usage').distinct('userId', { 
        timestamp: { $gte: startOfMonth },
        success: true 
      }).then((users: any[]) => users.length)
    ])

    // Get resume generation counts
    const [resumesToday, resumesMonth, resumesYear, resumesAllTime] = await Promise.all([
      db.collection('usage').countDocuments({ 
        operation: { $in: ['tailor-summary-title', 'filter-skills', 'reorder-experience'] },
        timestamp: { $gte: startOfDay },
        success: true
      }),
      db.collection('usage').countDocuments({ 
        operation: { $in: ['tailor-summary-title', 'filter-skills', 'reorder-experience'] },
        timestamp: { $gte: startOfMonth },
        success: true
      }),
      db.collection('usage').countDocuments({ 
        operation: { $in: ['tailor-summary-title', 'filter-skills', 'reorder-experience'] },
        timestamp: { $gte: startOfYear },
        success: true
      }),
      db.collection('usage').countDocuments({ 
        operation: { $in: ['tailor-summary-title', 'filter-skills', 'reorder-experience'] },
        success: true
      })
    ])

    // Calculate average tokens per resume generation
    const avgTokensPerResume = allTimeStats.byOperation['tailor-summary-title'] ? 
      Math.round((
        (allTimeStats.byOperation['tailor-summary-title']?.tokens || 0) +
        (allTimeStats.byOperation['filter-skills']?.tokens || 0) +
        (allTimeStats.byOperation['reorder-experience']?.tokens || 0)
      ) / Math.max(1, resumesAllTime / 3)) : 0

    // Calculate average cost per resume
    const avgCostPerResume = allTimeStats.byOperation['tailor-summary-title'] ?
      (
        (allTimeStats.byOperation['tailor-summary-title']?.cost || 0) +
        (allTimeStats.byOperation['filter-skills']?.cost || 0) +
        (allTimeStats.byOperation['reorder-experience']?.cost || 0)
      ) / Math.max(1, resumesAllTime / 3) : 0

    // Get cover letter stats
    const coverLetterStats = allTimeStats.byOperation['generate-cover-letter-content'] || { calls: 0, tokens: 0, cost: 0 }

    const stats = {
      users: {
        total: totalUsers,
        activeToday: activeUsersToday,
        activeThisMonth: activeUsersMonth
      },
      resumes: {
        today: Math.round(resumesToday / 3), // Divide by 3 since each resume generates 3 operations
        month: Math.round(resumesMonth / 3),
        year: Math.round(resumesYear / 3),
        allTime: Math.round(resumesAllTime / 3),
        avgTokensPerResume,
        avgCostPerResume
      },
      coverLetters: {
        allTime: coverLetterStats.calls,
        avgTokensPerLetter: coverLetterStats.calls > 0 ? Math.round(coverLetterStats.tokens / coverLetterStats.calls) : 0,
        avgCostPerLetter: coverLetterStats.calls > 0 ? coverLetterStats.cost / coverLetterStats.calls : 0
      },
      tokens: {
        today: todayStats.totalTokens,
        month: monthStats.totalTokens,
        year: yearStats.totalTokens,
        allTime: allTimeStats.totalTokens
      },
      costs: {
        today: todayStats.totalCost,
        month: monthStats.totalCost,
        year: yearStats.totalCost,
        allTime: allTimeStats.totalCost
      },
      averages: {
        tokensPerCall: allTimeStats.avgTokensPerCall,
        costPerCall: allTimeStats.avgCostPerCall,
        successRate: allTimeStats.successRate
      },
      byOperation: allTimeStats.byOperation,
      byModel: allTimeStats.byModel,
      dailyStats: allTimeStats.dailyStats.slice(-30) // Last 30 days
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error getting admin stats:', error)
    return NextResponse.json({ error: 'Failed to get stats' }, { status: 500 })
  }
}