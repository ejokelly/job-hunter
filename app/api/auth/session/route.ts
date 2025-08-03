import { NextRequest, NextResponse } from 'next/server'
import { CodewordAuth } from '@/lib/auth/codeword-auth'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session-token')?.value
    
    if (!sessionToken) {
      return NextResponse.json({ user: null })
    }
    
    const session = await CodewordAuth.getSession(sessionToken)
    
    return NextResponse.json(session || { user: null })
  } catch (error) {
    console.error('Error getting session:', error)
    return NextResponse.json({ user: null })
  }
}