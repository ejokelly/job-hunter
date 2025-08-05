'use client';

import { Sun, Moon, LogOut, User, FileText, Menu, X } from 'lucide-react';
import { useTheme } from './theme-provider';
import { useState, useEffect } from 'react';
import ActionButton from './action-button';
import Brand from './brand';
import posthog from 'posthog-js';

interface HeaderProps {
  title?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
}

export default function Header({ title, onBack, actions }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const [session, setSession] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Load session on component mount
  useEffect(() => {
    async function loadSession() {
      try {
        const response = await fetch('/api/auth/session')
        const data = await response.json()
        console.log('Header session loaded:', data)
        setSession(data.user || null)
      } catch (error) {
        console.error('Error loading session:', error)
        setSession(null)
      }
    }
    
    loadSession()
  }, [])

  // Poll for session changes every 5 seconds (simple but effective)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/auth/session')
        const data = await response.json()
        const currentUser = data.user || null
        
        // Only update if session actually changed
        if ((currentUser && !session) || (!currentUser && session) || 
            (currentUser && session && currentUser.id !== session.id)) {
          console.log('Header session changed:', currentUser)
          setSession(currentUser)
        }
      } catch (error) {
        // Ignore polling errors
      }
    }, 5000) // Check every 5 seconds

    return () => clearInterval(interval)
  }, [session])

  const handleSignOut = async () => {
    posthog.capture('user_signed_out');
    try {
      await fetch('/api/auth/signout', { method: 'POST' })
      setSession(null)
      window.location.href = '/'
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <div className="theme-header shadow-sm border-b theme-border-light">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <ActionButton 
                onClick={onBack}
                variant="ghost"
                className="gap-2"
              >
                ← Back
              </ActionButton>
            )}
            <h1 className="text-xl theme-text-primary">
              {title ? title : <Brand />}
            </h1>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            {/* Theme Toggle - Center */}
            <div className="flex items-center theme-bg-tertiary rounded-full p-1">
              <button
                onClick={() => {
                  if (theme === 'dark') {
                    posthog.capture('theme_toggle_clicked', { from: 'dark', to: 'light' });
                    toggleTheme();
                  }
                }}
                className={`p-2 rounded-full transition-colors ${
                  theme === 'light' 
                    ? 'theme-bg-primary shadow-sm text-yellow-500' 
                    : 'theme-text-tertiary hover:theme-text-secondary'
                }`}
              >
                <Sun className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (theme === 'light') {
                    posthog.capture('theme_toggle_clicked', { from: 'light', to: 'dark' });
                    toggleTheme();
                  }
                }}
                className={`p-2 rounded-full transition-colors ${
                  theme === 'dark' 
                    ? 'theme-bg-primary shadow-sm text-blue-400' 
                    : 'theme-text-tertiary hover:theme-text-secondary'
                }`}
              >
                <Moon className="w-4 h-4" />
              </button>
            </div>

            {actions}
            
            {/* Login Link for non-logged-in users */}
            {!session && (
              <ActionButton
                onClick={() => {
                  posthog.capture('header_login_clicked');
                  // Redirect to sign-in page or trigger login flow
                  window.location.href = '/auth/signin';
                }}
                variant="ghost"
                className="text-sm whitespace-nowrap"
              >
                Already signed up? Click here to log in.
              </ActionButton>
            )}
            
            {/* New Resume, Account and Sign Out */}
            {session && (
              <>
                <ActionButton
                  onClick={() => {
                    posthog.capture('header_menu_clicked', { item: 'new_resume' });
                    window.location.href = '/resume/new';
                  }}
                  variant="ghost"
                  className="gap-2 text-sm"
                >
                  <FileText className="w-4 h-4" />
                  New Resume
                </ActionButton>
                <ActionButton
                  onClick={() => {
                    posthog.capture('header_menu_clicked', { item: 'account' });
                    window.location.href = '/account';
                  }}
                  variant="ghost"
                  className="gap-2 text-sm"
                >
                  <User className="w-4 h-4" />
                  Account
                </ActionButton>
                <ActionButton
                  onClick={handleSignOut}
                  variant="ghost"
                  className="gap-2 text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </ActionButton>
              </>
            )}
          </div>

          {/* Mobile Actions */}
          <div className="md:hidden flex items-center gap-2">
            {/* Always show New Resume on mobile */}
            {session && (
              <ActionButton
                onClick={() => window.location.href = '/resume/new'}
                variant="ghost"
                className="gap-1 text-xs px-2 py-1"
              >
                <FileText className="w-3 h-3" />
                New Resume
              </ActionButton>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="theme-text-primary hover:theme-text-accent transition-colors p-2"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t theme-border-light relative z-[10000]">
            <div className="flex flex-col gap-4">
              {/* Theme Toggle for Mobile */}
              <div className="flex items-center justify-center">
                <div className="flex items-center theme-bg-tertiary rounded-full p-1">
                  <button
                    onClick={() => {
                      if (theme === 'dark') {
                        posthog.capture('mobile_theme_toggle_clicked', { from: 'dark', to: 'light' });
                        toggleTheme();
                      }
                    }}
                    className={`p-2 rounded-full transition-colors ${
                      theme === 'light' 
                        ? 'theme-bg-primary shadow-sm text-yellow-500' 
                        : 'theme-text-tertiary hover:theme-text-secondary'
                    }`}
                  >
                    <Sun className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (theme === 'light') {
                        posthog.capture('mobile_theme_toggle_clicked', { from: 'light', to: 'dark' });
                        toggleTheme();
                      }
                    }}
                    className={`p-2 rounded-full transition-colors ${
                      theme === 'dark' 
                        ? 'theme-bg-primary shadow-sm text-blue-400' 
                        : 'theme-text-tertiary hover:theme-text-secondary'
                    }`}
                  >
                    <Moon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {actions}
              
              {/* Mobile Navigation Items */}
              {!session && (
                <ActionButton
                  onClick={() => {
                    posthog.capture('mobile_login_clicked');
                    setIsMobileMenuOpen(false);
                    window.location.href = '/auth/signin';
                  }}
                  variant="ghost"
                  className="text-sm justify-center"
                >
                  Already signed up? Click here to log in.
                </ActionButton>
              )}
              
              {session && (
                <>
                  <ActionButton
                    onClick={() => {
                      posthog.capture('mobile_menu_clicked', { item: 'account' });
                      setIsMobileMenuOpen(false);
                      window.location.href = '/account';
                    }}
                    variant="ghost"
                    className="gap-2 text-sm justify-center"
                  >
                    <User className="w-4 h-4" />
                    Account
                  </ActionButton>
                  <ActionButton
                    onClick={() => {
                      posthog.capture('mobile_menu_clicked', { item: 'sign_out' });
                      setIsMobileMenuOpen(false);
                      handleSignOut();
                    }}
                    variant="ghost"
                    className="gap-2 text-sm justify-center"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </ActionButton>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}