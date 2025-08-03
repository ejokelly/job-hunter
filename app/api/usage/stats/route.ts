import { NextRequest, NextResponse } from 'next/server'
import { UsageTracker } from '@/lib/tracking/usage-tracker'
import { getServerAuthSession } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerAuthSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const operation = searchParams.get('operation')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build filters
    const filters: any = {}
    if (userId) filters.userId = userId
    if (operation) filters.operation = operation
    if (startDate) filters.startDate = new Date(startDate)
    if (endDate) filters.endDate = new Date(endDate)

    const stats = await UsageTracker.getUsageStats(filters)

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error getting usage stats:', error)
    return NextResponse.json({ error: 'Failed to get usage stats' }, { status: 500 })
  }
}