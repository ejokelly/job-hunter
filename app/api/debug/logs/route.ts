import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'

interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  timestamp: string
  source: 'client' | 'server'
  userId?: string
  sessionId?: string
  url?: string
  userAgent?: string
  metadata?: Record<string, any>
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { level, message, metadata = {} } = body

    if (!level || !message) {
      return NextResponse.json(
        { error: 'Level and message are required' },
        { status: 400 }
      )
    }

    const logEntry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      source: 'client',
      url: request.headers.get('referer') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      ...metadata
    }

    // Connect to database and store log
    const { db } = await connectToDatabase()
    await db.collection('debug_logs').insertOne(logEntry)

    // Also log to server console for immediate visibility
    const logLevel = level === 'error' ? console.error : 
                    level === 'warn' ? console.warn : 
                    level === 'info' ? console.info : console.log

    logLevel(`[CLIENT] ${message}`, metadata)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error storing debug log:', error)
    return NextResponse.json(
      { error: 'Failed to store log' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000)
    const level = searchParams.get('level')
    const source = searchParams.get('source')
    const userId = searchParams.get('userId')

    // Build query filter
    const filter: any = {}
    if (level) filter.level = level
    if (source) filter.source = source
    if (userId) filter.userId = userId

    const { db } = await connectToDatabase()
    const logs = await db.collection('debug_logs')
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray()

    return NextResponse.json({ logs })
  } catch (error) {
    console.error('Error fetching debug logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const olderThan = searchParams.get('olderThan') // ISO date string
    
    if (!olderThan) {
      return NextResponse.json(
        { error: 'olderThan parameter is required' },
        { status: 400 }
      )
    }

    const { db } = await connectToDatabase()
    const result = await db.collection('debug_logs').deleteMany({
      timestamp: { $lt: olderThan }
    })

    return NextResponse.json({ 
      deleted: result.deletedCount,
      message: `Deleted ${result.deletedCount} log entries older than ${olderThan}`
    })
  } catch (error) {
    console.error('Error deleting debug logs:', error)
    return NextResponse.json(
      { error: 'Failed to delete logs' },
      { status: 500 }
    )
  }
}