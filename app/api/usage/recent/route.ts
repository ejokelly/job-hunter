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
    const limit = parseInt(searchParams.get('limit') || '50')

    const recentUsage = await UsageTracker.getRecentUsage(limit)

    return NextResponse.json({ usage: recentUsage })
  } catch (error) {
    console.error('Error getting recent usage:', error)
    return NextResponse.json({ error: 'Failed to get recent usage' }, { status: 500 })
  }
}