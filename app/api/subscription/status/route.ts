import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth/server-auth'
import { SubscriptionManager } from '@/lib/subscription/subscription-manager'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    console.log('🔍 Getting subscription status for user:', session.user.id, 'email:', session.user.email)
    
    const status = await SubscriptionManager.getSubscriptionStatus(session.user.id)
    
    console.log('🔍 Subscription status result:', status)
    
    return NextResponse.json(status)
  } catch (error) {
    console.error('Error getting subscription status:', error)
    return NextResponse.json({ error: 'Failed to get subscription status' }, { status: 500 })
  }
}