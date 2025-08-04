'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, Crown, Check } from 'lucide-react'
import ActionButton from './action-button'

interface SubscriptionStatus {
  canCreateResume: boolean
  monthlyCount: number
  monthlyLimit: number
  subscriptionStatus: 'free' | 'starter' | 'unlimited' | 'canceled'
  needsUpgrade: boolean
  upgradeToTier: 'starter' | 'unlimited' | null
  upgradePrice: number | null
  stripePriceId: string | null
}

interface SubscriptionLimitWarningProps {
  className?: string
}

export default function SubscriptionLimitWarning({ className = '' }: SubscriptionLimitWarningProps) {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStatus() {
      try {
        const response = await fetch('/api/subscription/status')
        if (response.ok) {
          const data = await response.json()
          setStatus(data)
        }
      } catch (error) {
        console.error('Error fetching subscription status:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStatus()
  }, [])

  if (loading || !status) {
    return null
  }

  // Show current subscription status
  if (status.subscriptionStatus === 'unlimited') {
    return (
      <div className={`theme-card rounded-lg p-4 border-green-200 bg-green-50 dark:bg-green-900/20 ${className}`}>
        <div className="flex items-center gap-3">
          <Crown className="w-5 h-5 text-green-600" />
          <div>
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              Crazy Job Market Plan Active
            </p>
            <p className="text-xs text-green-600 dark:text-green-300">
              Unlimited resume generations
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (status.subscriptionStatus === 'starter') {
    return (
      <div className={`theme-card rounded-lg p-4 border-blue-200 bg-blue-50 dark:bg-blue-900/20 ${className}`}>
        <div className="flex items-center gap-3">
          <Check className="w-5 h-5 text-blue-600" />
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Starter Plan Active
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-300">
              {status.monthlyCount}/{status.monthlyLimit} resumes used this month
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Show warning when approaching or exceeding limits
  if (status.needsUpgrade) {
    const planName = status.upgradeToTier === 'starter' ? 'Starter' : 'Crazy Job Market'
    const planPrice = status.upgradePrice
    
    return (
      <div className={`theme-card rounded-lg p-4 border-amber-200 bg-amber-50 dark:bg-amber-900/20 ${className}`}>
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
              {status.canCreateResume 
                ? `Monthly Limit Approaching (${status.monthlyCount}/${status.monthlyLimit})`
                : `Monthly Limit Reached (${status.monthlyCount}/${status.monthlyLimit})`
              }
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
              {status.canCreateResume
                ? `You have ${status.monthlyLimit - status.monthlyCount} resume${status.monthlyLimit - status.monthlyCount === 1 ? '' : 's'} remaining this month.`
                : `Upgrade to ${planName} for ${status.upgradeToTier === 'unlimited' ? 'unlimited' : '100'} resume generations per month.`
              }
            </p>
            <ActionButton
              onClick={async () => {
                if (!status.stripePriceId) return
                
                try {
                  const response = await fetch('/api/stripe/create-checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ priceId: status.stripePriceId })
                  })
                  
                  const { url, error } = await response.json()
                  
                  if (error) {
                    alert(`Error: ${error}`)
                    return
                  }
                  
                  if (url) {
                    window.location.href = url
                  }
                } catch (error) {
                  console.error('Checkout error:', error)
                  alert('Something went wrong. Please try again.')
                }
              }}
              variant="primary"
              className="text-xs py-2 px-4"
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade to {planName} - ${planPrice}/month
            </ActionButton>
          </div>
        </div>
      </div>
    )
  }

  // Show info about remaining uses
  if (status.monthlyCount > 0) {
    return (
      <div className={`theme-card rounded-lg p-3 border-blue-200 bg-blue-50 dark:bg-blue-900/20 ${className}`}>
        <div className="flex items-center gap-3">
          <Check className="w-4 h-4 text-blue-600" />
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {status.monthlyCount}/{status.monthlyLimit} monthly resumes used
            <span className="ml-2 text-xs text-blue-600 dark:text-blue-300">
              ({status.monthlyLimit - status.monthlyCount} remaining)
            </span>
          </p>
        </div>
      </div>
    )
  }

  return null
}

// Modal component for when limit is exceeded during generation
interface LimitExceededModalProps {
  isOpen: boolean
  onClose: () => void
  limitData: {
    monthlyCount?: number
    monthlyLimit?: number
    subscriptionStatus?: string
    upgradeToTier?: string
    upgradePrice?: number
    stripePriceId?: string
  }
}

export function LimitExceededModal({ isOpen, onClose, limitData }: LimitExceededModalProps) {
  if (!isOpen) return null

  console.log('🔍 LimitExceededModal limitData:', JSON.stringify(limitData, null, 2));

  // HARDCODE FOR FREE USERS - FUCK THE API
  const isFreeTier = !limitData.subscriptionStatus || limitData.subscriptionStatus === 'free'
  const planName = isFreeTier ? 'Starter' : 'Crazy Job Market'  
  const planPrice = isFreeTier ? 25 : 250
  const realStripePriceId = isFreeTier ? 'price_1RsBWuDPG7USFCYcy3ZudU39' : 'price_1RsBXqDPG7USFCYcNF2P2uZF'
  const currentCount = limitData.monthlyCount
  const currentLimit = limitData.monthlyLimit

  // Calculate when they get more free uses (next month)
  const getNextResetDate = () => {
    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    nextMonth.setDate(1)
    return nextMonth.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  }

  return (
    <div className="fixed inset-0 theme-overlay flex items-center justify-center z-[9999] p-4">
      <div className="theme-card rounded-lg max-w-lg w-full p-8 shadow-2xl">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/20 mb-6">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
          
          <h3 className="text-xl font-semibold theme-text-primary mb-3">
            Monthly Resume Limit Reached
          </h3>
          
          <p className="theme-text-secondary mb-2 text-base">
            You&apos;ve used all {currentLimit} free resume generations for this month.
          </p>
          
          <p className="theme-text-tertiary mb-6 text-sm">
            Your next {currentLimit} free uses will be available on {getNextResetDate()}.
          </p>

          <div className="theme-bg-tertiary border theme-border rounded-lg p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Crown className="w-6 h-6 text-indigo-600" />
              <span className="font-semibold text-lg theme-text-primary">{planName} Plan</span>
            </div>
            <ul className="space-y-2 mb-4">
              {isFreeTier ? (
                <>
                  <li className="flex items-center gap-2 theme-text-secondary">
                    <span className="text-green-500">✓</span> 100 resumes per month
                  </li>
                  <li className="flex items-center gap-2 theme-text-secondary">
                    <span className="text-green-500">✓</span> 100 cover letters per month
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-center gap-2 theme-text-secondary">
                    <span className="text-green-500">✓</span> Unlimited resume generations
                  </li>
                  <li className="flex items-center gap-2 theme-text-secondary">
                    <span className="text-green-500">✓</span> Unlimited cover letters
                  </li>
                </>
              )}
            </ul>
            <div className="text-left">
              <span className="text-3xl font-bold theme-text-primary">${planPrice}</span>
              <span className="text-base theme-text-secondary">/month</span>
            </div>
          </div>

          <ActionButton
            onClick={async () => {
              if (!realStripePriceId) return
              
              try {
                const response = await fetch('/api/stripe/create-checkout', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ priceId: realStripePriceId })
                })
                
                const { url, error } = await response.json()
                
                if (error) {
                  alert(`Error: ${error}`)
                  return
                }
                
                if (url) {
                  window.location.href = url
                }
              } catch (error) {
                console.error('Checkout error:', error)
                alert('Something went wrong. Please try again.')
              }
            }}
            variant="primary"
            className="w-full py-3 text-base mb-4"
          >
            <Crown className="w-5 h-5 mr-2" />
            Upgrade to {planName}
          </ActionButton>
          
          {/* Stripe Logo */}
          <div className="flex justify-end">
            <img 
              src="/stripe-light.svg" 
              alt="Stripe" 
              className="h-6 opacity-50 block dark:hidden"
            />
            <img 
              src="/stripe-dark.svg" 
              alt="Stripe" 
              className="h-6 opacity-50 hidden dark:block"
            />
          </div>
        </div>
      </div>
    </div>
  )
}