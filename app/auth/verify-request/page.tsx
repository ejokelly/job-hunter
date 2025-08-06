'use client'

import { useRouter } from 'next/navigation'
import { CheckCircle } from 'lucide-react'
import ActionButton from '@/pc/ui/action-button'

export default function VerifyRequest() {
  const router = useRouter()

  return (
    <div className="min-h-screen theme-bg-gradient flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="theme-card rounded-lg p-8 text-center">
          <CheckCircle className="w-16 h-16 mx-auto mb-6 text-green-500" />
          
          <h1 className="text-2xl font-bold theme-text-primary mb-4">
            Check Your Email
          </h1>
          
          <p className="theme-text-secondary mb-6">
            We&apos;ve sent you a sign-in link. Please check your email and click the link to continue.
          </p>
          
          <div className="space-y-4">
            <p className="text-sm theme-text-tertiary">
              Make sure to check your spam folder if you don&apos;t see the email.
            </p>
            
            <ActionButton
              onClick={() => router.push('/auth/signin')}
              variant="secondary"
              className="w-full py-3 px-6 justify-center"
            >
              Back to Sign In
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