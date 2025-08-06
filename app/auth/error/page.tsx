'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import ActionButton from '@/pc/ui/action-button'

const errorMessages: Record<string, string> = {
  Configuration: 'There was a configuration error. Please contact support.',
  AccessDenied: 'You do not have permission to sign in.',
  Verification: 'The sign in link is no longer valid. It may have expired.',
  Default: 'An error occurred during sign in. Please try again.',
}

export default function AuthError() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const error = searchParams.get('error') || 'Default'

  return (
    <div className="min-h-screen theme-bg-gradient flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="theme-card rounded-lg p-8 text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-6 text-red-500" />
          
          <h1 className="text-2xl font-bold theme-text-primary mb-4">
            Sign In Error
          </h1>
          
          <p className="theme-text-secondary mb-6">
            {errorMessages[error] || errorMessages.Default}
          </p>
          
          <div className="space-y-4">
            <ActionButton
              onClick={() => router.push('/auth/signin')}
              variant="primary"
              className="w-full py-3 px-6 justify-center"
            >
              Try Again
            </ActionButton>
            
            <button
              onClick={() => router.push('/')}
              className="block w-full text-sm theme-text-tertiary hover:theme-text-secondary"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}