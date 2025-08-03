import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

let isInitialized = false

export async function middleware(request: NextRequest) {
  // Skip middleware for public parse-resume endpoint
  if (request.nextUrl.pathname === '/api/parse-resume') {
    return NextResponse.next()
  }

  // Auto-initialize database
  if (!isInitialized && (
    request.nextUrl.pathname.startsWith('/api/resumes') ||
    request.nextUrl.pathname.startsWith('/api/add-skill') ||
    request.nextUrl.pathname.startsWith('/api/analyze-skills') ||
    request.nextUrl.pathname.startsWith('/api/generate-') ||
    request.nextUrl.pathname.startsWith('/api/preview-')
  )) {
    try {
      const response = await fetch(new URL('/api/setup', request.url), {
        method: 'POST',
      })
      
      if (response.ok) {
        isInitialized = true
      }
    } catch (error) {
      console.log('Auto-initialization failed:', error)
    }
  }

  // Protected API routes (parse-resume is public for sign-up flow)
  const protectedApiRoutes = [
    '/api/resumes',
    '/api/add-skill',
    '/api/analyze-skills',
    '/api/generate-resume',
    '/api/generate-cover-letter',
    '/api/preview-resume',
    '/api/preview-cover-letter'
  ]

  const isProtectedApiRoute = protectedApiRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )

  if (isProtectedApiRoute) {
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    })

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
  }

  // Protected pages - allow homepage for sign-up flow
  // Only redirect to sign-in if they're trying to access app functionality without auth
  const isAppPath = request.nextUrl.pathname === '/' && request.nextUrl.searchParams.get('mode') === 'app'
  
  if (isAppPath) {
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    })

    if (!token) {
      return NextResponse.redirect(new URL('/auth/signin', request.url))
    }
  }

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