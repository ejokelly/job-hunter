import { NextRequest, NextResponse } from 'next/server'
import { CodewordAuth } from '@/app/lib/auth/codeword-auth'
import { cookies } from 'next/headers'
import { PostHog } from 'posthog-node'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session-token')?.value
    
    if (sessionToken) {
      // Get user info before signing out for tracking
      const session = await CodewordAuth.getSession(sessionToken);
      await CodewordAuth.signOut(sessionToken)
      
      // Track logout event
      if (session) {
        try {
          // Only track on approved domains
          const host = request.headers.get('host');
          if (host?.includes('resumelove.app')) {
            const client = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
              host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
            });
            
            client.capture({
              distinctId: session.user.id,
              event: 'user_logged_out',
              properties: {
                method: 'manual'
              }
            });
            
            await client.shutdown();
          }
        } catch (trackingError) {
          console.error('PostHog tracking error:', trackingError);
        }
      }
    }
    
    // Clear session cookies
    const response = NextResponse.json({ success: true })
    response.cookies.delete('session-token')
    response.cookies.delete('user-session')
    
    return response
  } catch (error) {
    console.error('Error signing out:', error)
    return NextResponse.json({ error: 'Failed to sign out' }, { status: 500 })
  }
}