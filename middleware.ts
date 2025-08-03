import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

let isInitialized = false

export async function middleware(request: NextRequest) {
  // Skip middleware for public parse-resume endpoint
  if (request.nextUrl.pathname === '/api/parse-resume') {
    return NextResponse.next()
  }


  // Let individual routes handle their own authentication since we use database sessions


  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/api/resumes/:path*',
    '/api/add-skill',
    '/api/analyze-skills',
    '/api/generate-resume',
    '/api/generate-cover-letter',
    '/api/preview-resume',
    '/api/preview-cover-letter',
    '/api/parse-resume'
  ],
}