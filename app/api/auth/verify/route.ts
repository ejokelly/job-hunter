import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth/simple-auth'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { token, email } = await request.json()
    console.log('🔍 Verify API called with:', { token: token?.substring(0, 10) + '...', email })
    
    if (!token || !email) {
      console.error('❌ Missing token or email:', { token: !!token, email: !!email })
      return NextResponse.json({ error: 'Missing token or email' }, { status: 400 })
    }
    
    console.log('🔄 Attempting to verify token...')
    const result = await SimpleAuth.verifyToken(token, email)
    console.log('✅ Token verified successfully:', { userId: result.user.id, email: result.user.email })
    
    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set('session-token', result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 // 30 days
    })
    
    return NextResponse.json({ 
      success: true, 
      user: result.user 
    })
    
  } catch (error) {
    console.error('❌ Error verifying token:', error)
    return NextResponse.json({ error: 'Invalid or expired token', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 400 })
  }
}