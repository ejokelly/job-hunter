import { NextRequest, NextResponse } from 'next/server'
import { CodewordAuth } from '@/lib/auth/codeword-auth'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json()
    
    if (!email || !code) {
      return NextResponse.json({ error: 'Email and code are required' }, { status: 400 })
    }
    
    console.log('🔍 Verifying codeword:', { email, code })
    
    const result = await CodewordAuth.verifyCode(email, code)
    
    // Set server-side session cookie (3 days)
    const cookieStore = await cookies()
    cookieStore.set('session-token', result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
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