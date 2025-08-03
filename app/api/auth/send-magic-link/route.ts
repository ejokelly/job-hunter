import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth/simple-auth'

export async function POST(request: NextRequest) {
  try {
    const { email, callbackUrl } = await request.json()
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }
    
    await SimpleAuth.sendMagicLink(email, callbackUrl || '/')
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending magic link:', error)
    return NextResponse.json({ error: 'Failed to send magic link' }, { status: 500 })
  }
}