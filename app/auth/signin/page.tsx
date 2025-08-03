'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail } from 'lucide-react'
import ActionButton from '@/components/action-button'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/auth/send-magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          callbackUrl: '/'
        }),
      })

      if (response.ok) {
        setMessage('Check your email for a sign-in link!')
      } else {
        setMessage('Error sending email. Please try again.')
      }
    } catch (error) {
      setMessage('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen theme-bg-gradient flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="theme-card rounded-lg p-8">
          <div className="text-center mb-8">
            <Mail className="w-12 h-12 mx-auto mb-4 theme-icon-primary" />
            <h1 className="text-2xl font-bold theme-text-primary mb-2">Sign In</h1>
            <p className="theme-text-secondary">
              Enter your email to receive a sign-in link
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium theme-text-secondary mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full p-3 border theme-border rounded-lg theme-input focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="your@email.com"
              />
            </div>

            {message && (
              <div className={`p-3 rounded-lg text-sm ${
                message.includes('Check your email') 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {message}
              </div>
            )}

            <ActionButton
              onClick={() => handleSubmit(new Event('submit') as any)}
              busy={isLoading}
              disabled={!email || isLoading}
              className="w-full py-3 px-6 justify-center"
              variant="primary"
            >
              {isLoading ? 'Sending...' : 'Send Sign-In Link'}
            </ActionButton>
          </form>

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