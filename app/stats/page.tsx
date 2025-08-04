'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/header'
import { BarChart, Users, FileText, DollarSign, Zap, TrendingUp } from 'lucide-react'

interface AdminStats {
  users: {
    total: number
    activeToday: number
    activeThisMonth: number
  }
  resumes: {
    today: number
    month: number
    year: number
    allTime: number
    avgTokensPerResume: number
    avgCostPerResume: number
  }
  coverLetters: {
    allTime: number
    avgTokensPerLetter: number
    avgCostPerLetter: number
  }
  tokens: {
    today: number
    month: number
    year: number
    allTime: number
  }
  costs: {
    today: number
    month: number
    year: number
    allTime: number
  }
  averages: {
    tokensPerCall: number
    costPerCall: number
    successRate: number
  }
  subscriptions: {
    total: number
    active: number
    free: number
    starter: number
    unlimited: number
    conversionRate: number
  }
  revenue: {
    mrr: number
    arr: number
    starterMRR: number
    unlimitedMRR: number
    avgRevenuePerUser: number
  }
  byOperation: Record<string, { calls: number; tokens: number; cost: number }>
  byModel: Record<string, { calls: number; tokens: number; cost: number }>
  dailyStats: Array<{ date: string; calls: number; tokens: number; cost: number }>
}

export default function StatsPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/admin/stats')
        if (!response.ok) {
          throw new Error('Failed to fetch stats')
        }
        const data = await response.json()
        setStats(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    // Initial fetch
    fetchStats()

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000)

    // Cleanup interval on unmount
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen theme-bg-gradient">
        <Header title="Usage Statistics" />
        <div className="max-w-7xl mx-auto p-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full border-4 border-[var(--accent-color)] border-t-transparent w-12 h-12 mx-auto mb-4"></div>
              <p className="theme-text-secondary">Loading statistics...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen theme-bg-gradient">
        <Header title="Usage Statistics" />
        <div className="max-w-7xl mx-auto p-8">
          <div className="theme-card rounded-lg p-8 text-center">
            <p className="theme-text-primary text-lg mb-4">Error loading statistics</p>
            <p className="theme-text-secondary">{error || 'Unknown error occurred'}</p>
          </div>
        </div>
      </div>
    )
  }

  const formatCurrency = (amount: number) => `$${amount.toFixed(4)}`
  const formatNumber = (num: number) => num.toLocaleString()

  return (
    <div className="min-h-screen theme-bg-gradient">
      <Header title="Usage Statistics" />
      
      <div className="max-w-7xl mx-auto p-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="theme-card rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium theme-text-secondary">Total Users</h3>
              <Users className="w-5 h-5 theme-text-tertiary" />
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-bold theme-text-primary">{formatNumber(stats.users.total)}</p>
              <p className="text-sm theme-text-secondary">
                {formatNumber(stats.users.activeToday)} active today, {formatNumber(stats.users.activeThisMonth)} this month
              </p>
            </div>
          </div>

          <div className="theme-card rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium theme-text-secondary">Resumes Generated</h3>
              <FileText className="w-5 h-5 theme-text-tertiary" />
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-bold theme-text-primary">{formatNumber(stats.resumes.allTime)}</p>
              <p className="text-sm theme-text-secondary">
                {formatNumber(stats.resumes.today)} today, {formatNumber(stats.resumes.month)} this month
              </p>
            </div>
          </div>

          <div className="theme-card rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium theme-text-secondary">Total Cost</h3>
              <DollarSign className="w-5 h-5 theme-text-tertiary" />
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-bold theme-text-primary">{formatCurrency(stats.costs.allTime)}</p>
              <p className="text-sm theme-text-secondary">
                {formatCurrency(stats.costs.today)} today, {formatCurrency(stats.costs.month)} this month
              </p>
            </div>
          </div>

          <div className="theme-card rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium theme-text-secondary">Token Usage</h3>
              <Zap className="w-5 h-5 theme-text-tertiary" />
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-bold theme-text-primary">{formatNumber(stats.tokens.allTime)}</p>
              <p className="text-sm theme-text-secondary">
                {formatNumber(stats.tokens.today)} today, {formatNumber(stats.tokens.month)} this month
              </p>
            </div>
          </div>
        </div>

        {/* Subscription & Revenue Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="theme-card rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium theme-text-secondary">Subscriptions</h3>
              <Users className="w-5 h-5 theme-text-tertiary" />
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-bold theme-text-primary">{formatNumber(stats.subscriptions.total)}</p>
              <p className="text-sm theme-text-secondary">
                {stats.subscriptions.conversionRate.toFixed(1)}% conversion rate
              </p>
            </div>
          </div>

          <div className="theme-card rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium theme-text-secondary">Monthly Revenue</h3>
              <DollarSign className="w-5 h-5 theme-text-tertiary" />
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-bold theme-text-primary">${formatNumber(stats.revenue.mrr)}</p>
              <p className="text-sm theme-text-secondary">
                ${stats.revenue.avgRevenuePerUser.toFixed(2)} ARPU
              </p>
            </div>
          </div>

          <div className="theme-card rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium theme-text-secondary">Annual Revenue</h3>
              <TrendingUp className="w-5 h-5 theme-text-tertiary" />
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-bold theme-text-primary">${formatNumber(stats.revenue.arr)}</p>
              <p className="text-sm theme-text-secondary">
                Projected ARR
              </p>
            </div>
          </div>

          <div className="theme-card rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium theme-text-secondary">Plan Distribution</h3>
              <BarChart className="w-5 h-5 theme-text-tertiary" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="theme-text-secondary">Free:</span>
                <span className="theme-text-primary">{formatNumber(stats.subscriptions.free)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="theme-text-secondary">Starter:</span>
                <span className="theme-text-primary">{formatNumber(stats.subscriptions.starter)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="theme-text-secondary">Unlimited:</span>
                <span className="theme-text-primary">{formatNumber(stats.subscriptions.unlimited)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Average Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="theme-card rounded-lg p-6">
            <h3 className="text-lg font-semibold theme-text-primary mb-4">Resume Generation</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="theme-text-secondary">Avg tokens per resume:</span>
                <span className="font-medium theme-text-primary">{formatNumber(stats.resumes.avgTokensPerResume)}</span>
              </div>
              <div className="flex justify-between">
                <span className="theme-text-secondary">Avg cost per resume:</span>
                <span className="font-medium theme-text-primary">{formatCurrency(stats.resumes.avgCostPerResume)}</span>
              </div>
            </div>
          </div>

          <div className="theme-card rounded-lg p-6">
            <h3 className="text-lg font-semibold theme-text-primary mb-4">Cover Letter Generation</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="theme-text-secondary">Avg tokens per letter:</span>
                <span className="font-medium theme-text-primary">{formatNumber(stats.coverLetters.avgTokensPerLetter)}</span>
              </div>
              <div className="flex justify-between">
                <span className="theme-text-secondary">Avg cost per letter:</span>
                <span className="font-medium theme-text-primary">{formatCurrency(stats.coverLetters.avgCostPerLetter)}</span>
              </div>
            </div>
          </div>

          <div className="theme-card rounded-lg p-6">
            <h3 className="text-lg font-semibold theme-text-primary mb-4">Overall Metrics</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="theme-text-secondary">Avg tokens (resume + cover letter):</span>
                <span className="font-medium theme-text-primary">
                  {formatNumber(stats.resumes.avgTokensPerResume + stats.coverLetters.avgTokensPerLetter)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="theme-text-secondary">Avg cost (resume + cover letter):</span>
                <span className="font-medium theme-text-primary">
                  {formatCurrency(stats.resumes.avgCostPerResume + stats.coverLetters.avgCostPerLetter)}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Operation Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="theme-card rounded-lg p-6">
            <h3 className="text-lg font-semibold theme-text-primary mb-4 flex items-center gap-2">
              <BarChart className="w-5 h-5" />
              By Operation
            </h3>
            <div className="space-y-3">
              {Object.entries(stats.byOperation).map(([operation, data]) => (
                <div key={operation} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium theme-text-secondary capitalize">
                      {operation.replace(/-/g, ' ')}
                    </span>
                    <span className="text-sm theme-text-primary">{formatNumber(data.calls)} calls</span>
                  </div>
                  <div className="flex justify-between text-xs theme-text-tertiary">
                    <span>{formatNumber(data.tokens)} tokens</span>
                    <span>{formatCurrency(data.cost)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="theme-card rounded-lg p-6">
            <h3 className="text-lg font-semibold theme-text-primary mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              By Model
            </h3>
            <div className="space-y-3">
              {Object.entries(stats.byModel).map(([model, data]) => (
                <div key={model} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium theme-text-secondary">{model}</span>
                    <span className="text-sm theme-text-primary">{formatNumber(data.calls)} calls</span>
                  </div>
                  <div className="flex justify-between text-xs theme-text-tertiary">
                    <span>{formatNumber(data.tokens)} tokens</span>
                    <span>{formatCurrency(data.cost)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Daily Stats */}
        <div className="theme-card rounded-lg p-6">
          <h3 className="text-lg font-semibold theme-text-primary mb-4">Daily Usage (Last 30 Days)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b theme-border-light">
                  <th className="text-left py-2 theme-text-secondary">Date</th>
                  <th className="text-right py-2 theme-text-secondary">Calls</th>
                  <th className="text-right py-2 theme-text-secondary">Tokens</th>
                  <th className="text-right py-2 theme-text-secondary">Cost</th>
                </tr>
              </thead>
              <tbody>
                {stats.dailyStats.slice(-10).map((day) => (
                  <tr key={day.date} className="border-b theme-border-light">
                    <td className="py-2 theme-text-primary">{day.date}</td>
                    <td className="py-2 text-right theme-text-primary">{formatNumber(day.calls)}</td>
                    <td className="py-2 text-right theme-text-primary">{formatNumber(day.tokens)}</td>
                    <td className="py-2 text-right theme-text-primary">{formatCurrency(day.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}