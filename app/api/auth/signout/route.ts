import { NextRequest, NextResponse } from 'next/server'
import { CodewordAuth } from '@/lib/auth/codeword-auth'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session-token')?.value
    
    if (sessionToken) {
      await CodewordAuth.signOut(sessionToken)
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