import { NextRequest, NextResponse } from 'next/server'
import { CodewordAuth } from '@/app/lib/auth/codeword-auth'
import { cookies } from 'next/headers'
import { PostHog } from 'posthog-node'

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json()
    
    if (!email || !code) {
      return NextResponse.json({ error: 'Email and code are required' }, { status: 400 })
    }
    
    console.log('🔍 Verifying codeword:', { email, code })
    
    const result = await CodewordAuth.verifyCode(email, code)
    
    // Track login/signup event
    try {
      // Only track on approved domains
      const host = request.headers.get('host');
      if (host?.includes('resumelove.app')) {
        const client = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
          host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
        });
        
        client.capture({
          distinctId: result.user.id,
          event: 'user_logged_in',
          properties: {
            email: email,
            method: 'email_code',
            $set: {
              email: email
            }
          }
        });
        
        await client.shutdown();
      }
    } catch (trackingError) {
      console.error('PostHog tracking error:', trackingError);
    }
    
    // Set server-side session cookie (3 days)
    const cookieStore = await cookies()
    cookieStore.set('session-token', result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 3 * 24 * 60 * 60 // 3 days
    })
    
    // Also set a client-side cookie for persistence
    const response = NextResponse.json({ 
      success: true, 
      user: result.user 
    })
    
    response.cookies.set('user-session', 'true', {
      httpOnly: false, // Client can read this
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 3 * 24 * 60 * 60 // 3 days
    })
    
    return response
    
  } catch (error) {
    console.error('Error verifying codeword:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Invalid code' 
    }, { status: 400 })
  }
}