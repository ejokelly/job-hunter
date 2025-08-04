import { NextRequest, NextResponse } from 'next/server'
import { CodewordAuth } from '@/lib/auth/codeword-auth'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }
    
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }
    
    console.log('📧 Sending codeword to:', email)
    
    try {
      const result = await CodewordAuth.sendCodeword(email)
      console.log('✅ Codeword sent successfully:', result)
      
      return NextResponse.json({ 
        success: true,
        message: 'Codeword sent to your email'
      })
    } catch (sendError) {
      console.error('❌ Failed to send codeword:', sendError)
      return NextResponse.json({ 
        error: 'Failed to send email. Please try again.',
        details: sendError instanceof Error ? sendError.message : 'Unknown error'
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('Error sending codeword:', error)
    return NextResponse.json({ error: 'Failed to send codeword' }, { status: 500 })
  }
}