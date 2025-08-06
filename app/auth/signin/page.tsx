'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail } from 'lucide-react'
import ActionButton from '@/pc/ui/action-button'
import posthog from 'posthog-js'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleSendCode = async () => {
    if (!email.trim()) return
    
    setIsLoading(true)
    setMessage('')
    
    try {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const result = await response.json()

      if (response.ok) {
        setCodeSent(true)
        posthog.capture('sign_in_code_sent', { email })
      } else {
        setMessage(result.error || 'Error sending code. Please try again.')
      }
    } catch (error) {
      setMessage('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) return
    
    setIsVerifying(true)
    setMessage('')
    
    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email,
          code: verificationCode 
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        posthog.capture('sign_in_success', { email })
        // Redirect to home or dashboard
        window.location.href = '/'
      } else {
        setMessage(result.error || 'Invalid code. Please try again.')
      }
    } catch (error) {
      setMessage('Something went wrong. Please try again.')
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="min-h-screen theme-bg-gradient flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="theme-card rounded-lg p-8">
          {!codeSent ? (
            // Email input step
            <>
              <div className="text-center mb-8">
                <Mail className="w-12 h-12 mx-auto mb-4 theme-icon-primary" />
                <h1 className="text-2xl font-bold theme-text-primary mb-2">Sign In</h1>
                <p className="theme-text-secondary">
                  Enter your email to get a sign-in code
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && email.trim() && !isLoading) {
                        handleSendCode()
                      }
                    }}
                    className="w-full p-4 border theme-border rounded-lg theme-input focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter your email"
                    disabled={isLoading}
                  />
                </div>

                {message && (
                  <div className="p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
                    {message}
                  </div>
                )}

                <ActionButton
                  onClick={handleSendCode}
                  busy={isLoading}
                  disabled={!email.trim() || isLoading}
                  className="w-full py-4 justify-center"
                  variant="primary"
                >
                  {isLoading ? 'Sending Code...' : 'Send Code'}
                </ActionButton>
              </div>
            </>
          ) : (
            // Code verification step
            <>
              <div className="text-center mb-8">
                <Mail className="w-12 h-12 mx-auto mb-4 theme-icon-primary" />
                <h1 className="text-2xl font-bold theme-text-primary mb-2">Enter Your Code</h1>
                <p className="theme-text-secondary">
                  We sent a code to<br />
                  <span className="font-medium">{email}</span>
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && verificationCode.trim() && !isVerifying) {
                        handleVerifyCode()
                      }
                    }}
                    className="w-full p-4 border theme-border rounded-lg theme-input focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-center text-lg font-mono"
                    placeholder="happy-tiger"
                    disabled={isVerifying}
                    autoFocus
                  />
                </div>

                {message && (
                  <div className="p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
                    {message}
                  </div>
                )}

                <ActionButton
                  onClick={handleVerifyCode}
                  busy={isVerifying}
                  disabled={!verificationCode.trim() || isVerifying}
                  className="w-full py-4 justify-center"
                  variant="primary"
                >
                  {isVerifying ? 'Verifying...' : 'Sign In'}
                </ActionButton>

                <div className="flex gap-2">
                  <ActionButton
                    onClick={() => {
                      setCodeSent(false)
                      setVerificationCode('')
                      setMessage('')
                    }}
                    variant="ghost"
                    className="flex-1 py-2 justify-center text-sm"
                  >
                    Try Different Email
                  </ActionButton>
                  <ActionButton
                    onClick={handleSendCode}
                    variant="ghost"
                    className="flex-1 py-2 justify-center text-sm"
                    busy={isLoading}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Sending...' : 'Send New Code'}
                  </ActionButton>
                </div>
              </div>
            </>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/')}
              className="text-sm theme-text-tertiary hover:theme-text-secondary"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}