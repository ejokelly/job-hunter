'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Crown, Calendar, FileText, CreditCard, AlertTriangle, Palette } from 'lucide-react';
import Header from '@/components/header';
import ActionButton from '@/components/action-button';
import PageContainer from '@/components/page-container';
import { useTheme } from '@/components/theme-provider';
import Footer from '@/components/footer';

interface SubscriptionData {
  canCreateResume: boolean;
  monthlyCount: number;
  monthlyLimit: number;
  subscriptionStatus: 'free' | 'starter' | 'unlimited' | 'canceled';
  needsUpgrade: boolean;
  upgradeToTier: 'starter' | 'unlimited' | null;
  upgradePrice: number;
  stripePriceId: string | null;
  subscriptionExpires?: string;
  stripeSubscriptionId?: string;
}

export default function AccountPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [session, setSession] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accentColor, setAccentColor] = useState('#3b82f6');

  // Load session
  useEffect(() => {
    async function loadSession() {
      try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();
        setSession(data.user || null);
      } catch (error) {
        console.error('Error loading session:', error);
        setSession(null);
      } finally {
        setSessionLoading(false);
      }
    }
    
    loadSession();
  }, []);

  // Check session and redirect if not authenticated
  useEffect(() => {
    if (sessionLoading) return;
    
    if (!session) {
      router.push('/');
      return;
    }
  }, [session, sessionLoading, router]);

  // Load subscription data
  useEffect(() => {
    async function loadSubscriptionData() {
      if (!session?.id) return;
      
      try {
        const response = await fetch('/api/subscription/status');
        if (response.ok) {
          const data = await response.json();
          setSubscriptionData(data);
        }
      } catch (error) {
        console.error('Error loading subscription data:', error);
      } finally {
        setLoading(false);
      }
    }

    if (session) {
      loadSubscriptionData();
    }
  }, [session]);

  // Load saved accent color preference
  useEffect(() => {
    const savedAccentColor = localStorage.getItem('accentColor');
    if (savedAccentColor) {
      setAccentColor(savedAccentColor);
      document.documentElement.style.setProperty('--accent-color', savedAccentColor);
    }
  }, []);

  // Save accent color when it changes
  const handleAccentColorChange = (color: string) => {
    setAccentColor(color);
    document.documentElement.style.setProperty('--accent-color', color);
    localStorage.setItem('accentColor', color);
  };

  const handleUpgrade = async (stripePriceId: string) => {
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: stripePriceId })
      });
      
      const { url, error } = await response.json();
      
      if (error) {
        alert(`Error: ${error}`);
        return;
      }
      
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Something went wrong. Please try again.');
    }
  };

  const getSubscriptionStatusInfo = () => {
    if (!subscriptionData) return null;

    const { subscriptionStatus, subscriptionExpires } = subscriptionData;
    
    switch (subscriptionStatus) {
      case 'unlimited':
        return {
          title: 'Crazy Job Market Plan',
          icon: <Crown className="w-6 h-6 text-purple-600 dark:text-purple-400" />,
          color: 'bg-purple-50 border-purple-200 text-purple-800',
          description: 'Unlimited resume and cover letter generations',
          price: '$250/month',
          renewalDate: subscriptionExpires
        };
      case 'starter':
        return {
          title: 'Starter Plan',
          icon: <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
          color: 'bg-blue-50 border-blue-200 text-blue-800',
          description: '100 resume and cover letter generations per month',
          price: '$25/month',
          renewalDate: subscriptionExpires
        };
      case 'canceled':
        return {
          title: 'Subscription Canceled',
          icon: <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />,
          color: 'bg-amber-50 border-amber-200 text-amber-800',
          description: 'Your subscription has been canceled',
          price: 'Free tier',
          renewalDate: null
        };
      default:
        return {
          title: 'Free Plan',
          icon: <FileText className="w-6 h-6 text-gray-600 dark:text-gray-400" />,
          color: 'bg-gray-50 border-gray-200 text-gray-800',
          description: '10 resume generations per month',
          price: 'Free',
          renewalDate: null
        };
    }
  };

  const getUsageColor = () => {
    if (!subscriptionData) return 'theme-bg-accent';
    
    const { monthlyCount, monthlyLimit } = subscriptionData;
    const percentage = (monthlyCount / monthlyLimit) * 100;
    
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-amber-500';
    return 'theme-bg-accent';
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen theme-bg-gradient">
        <Header />
        <PageContainer>
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-color)] mx-auto mb-4"></div>
              <p className="theme-text-secondary">Loading account information...</p>
            </div>
          </div>
        </PageContainer>
      </div>
    );
  }

  const statusInfo = getSubscriptionStatusInfo();

  return (
    <div className="min-h-screen theme-bg-gradient">
      <Header />
      <PageContainer>

        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold theme-text-primary mb-8">Account Settings</h1>

          {/* Account Info */}
          <div className="theme-card rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold theme-text-primary mb-4">Account Information</h2>
            <div className="space-y-2">
              <p className="theme-text-secondary">
                <span className="font-medium">Email:</span> {session?.email}
              </p>
              <p className="theme-text-secondary">
                <span className="font-medium">Member since:</span> {new Date(session?.createdAt || Date.now()).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Preferences */}
          <div className="theme-card rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold theme-text-primary mb-4">Preferences</h2>
            
            <div className="space-y-6">
              {/* Theme Selection */}
              <div>
                <label className="block text-sm font-medium theme-text-secondary mb-3">Theme</label>
                <div className="flex gap-3">
                  <ActionButton
                    onClick={() => setTheme('light')}
                    variant={theme === 'light' ? 'primary' : 'ghost'}
                    className="flex-1"
                  >
                    ☀️ Light
                  </ActionButton>
                  <ActionButton
                    onClick={() => setTheme('dark')}
                    variant={theme === 'dark' ? 'primary' : 'ghost'}
                    className="flex-1"
                  >
                    🌙 Dark
                  </ActionButton>
                </div>
              </div>

              {/* Accent Color Selection */}
              <div>
                <label className="block text-sm font-medium theme-text-secondary mb-3">Accent Color</label>
                <div className="grid grid-cols-6 gap-2">
                  {[
                    { name: 'Blue', color: '#3b82f6' },
                    { name: 'Purple', color: '#8b5cf6' },
                    { name: 'Green', color: '#10b981' },
                    { name: 'Orange', color: '#f59e0b' },
                    { name: 'Red', color: '#ef4444' },
                    { name: 'Pink', color: '#ec4899' }
                  ].map((option) => (
                    <button
                      key={option.name}
                      onClick={() => handleAccentColorChange(option.color)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        accentColor === option.color 
                          ? 'border-gray-400 dark:border-gray-300 scale-110' 
                          : 'border-gray-200 dark:border-gray-600 hover:scale-105'
                      }`}
                      style={{ backgroundColor: option.color }}
                      title={option.name}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Subscription Status */}
          {statusInfo && (
            <div className="theme-card rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold theme-text-primary mb-4">Subscription Status</h2>
              
              <div className="rounded-xl p-6 theme-bg-tertiary theme-border border mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {statusInfo.icon}
                    <div>
                      <h3 className="text-lg font-bold theme-text-primary">{statusInfo.title}</h3>
                      <p className="text-sm theme-text-secondary mt-1">{statusInfo.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium theme-text-secondary">{statusInfo.price}</div>
                    {statusInfo.renewalDate && (
                      <div className="text-xs theme-text-tertiary mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Renews {new Date(statusInfo.renewalDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Usage Progress Bar */}
                <div className="border-t theme-border pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium theme-text-secondary">Usage This Month</span>
                    <span className="text-lg font-bold theme-text-primary">
                      {subscriptionData?.monthlyCount || 0} / {subscriptionData?.subscriptionStatus === 'unlimited' ? '∞' : subscriptionData?.monthlyLimit || 0}
                    </span>
                  </div>
                  
                  {subscriptionData?.subscriptionStatus !== 'unlimited' && (
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${getUsageColor()}`}
                        style={{ 
                          width: `${Math.min(((subscriptionData?.monthlyCount || 0) / (subscriptionData?.monthlyLimit || 1)) * 100, 100)}%` 
                        }}
                      ></div>
                    </div>
                  )}

                  <p className="text-xs theme-text-tertiary">
                    {subscriptionData?.subscriptionStatus === 'unlimited' 
                      ? '🎉 Unlimited generations - create as many resumes as you need!'
                      : (subscriptionData?.monthlyLimit || 0) - (subscriptionData?.monthlyCount || 0) > 0 
                      ? `${(subscriptionData?.monthlyLimit || 0) - (subscriptionData?.monthlyCount || 0)} generations remaining this month`
                      : 'Monthly limit reached'
                    }
                  </p>
                </div>
              </div>

              {/* Show starter plan for free users */}
              {subscriptionData?.subscriptionStatus === 'free' && (
                <ActionButton
                  onClick={() => handleUpgrade(process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || '')}
                  variant="primary"
                  className="w-full py-3"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to Starter Plan - $25/month
                </ActionButton>
              )}
              {/* Show both plans for canceled users */}
              {subscriptionData?.subscriptionStatus === 'canceled' && (
                <div className="space-y-3">
                  <ActionButton
                    onClick={() => handleUpgrade(process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || '')}
                    variant="primary"
                    className="w-full py-3"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Reactivate Starter Plan - $25/month
                  </ActionButton>
                  <ActionButton
                    onClick={() => handleUpgrade(process.env.NEXT_PUBLIC_STRIPE_UNLIMITED_PRICE_ID || '')}
                    variant="secondary"
                    className="w-full py-3"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Get Crazy Job Market Plan - $250/month
                  </ActionButton>
                </div>
              )}

              {/* Show upgrade button for starter users */}
              {subscriptionData?.subscriptionStatus === 'starter' && (
                <ActionButton
                  onClick={() => handleUpgrade(process.env.NEXT_PUBLIC_STRIPE_UNLIMITED_PRICE_ID || '')}
                  variant="primary"
                  className="w-full py-3"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to Crazy Job Market Plan - $250/month
                </ActionButton>
              )}
            </div>
          )}

        </div>
      </PageContainer>
      <Footer />
    </div>
  );
}