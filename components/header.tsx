'use client';

import { Sun, Moon, LogOut, User, FileText } from 'lucide-react';
import { useTheme } from './theme-provider';
import { useState, useEffect } from 'react';
import ActionButton from './action-button';
import Brand from './brand';

interface HeaderProps {
  title?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
}

export default function Header({ title, onBack, actions }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const [session, setSession] = useState<any>(null);

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
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center">
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
        
        {/* Theme Toggle - Center */}
        <div className="flex-1 flex justify-center">
          <div className="flex items-center theme-bg-tertiary rounded-full p-1">
            <button
              onClick={() => theme === 'dark' && toggleTheme()}
              className={`p-2 rounded-full transition-colors ${
                theme === 'light' 
                  ? 'theme-bg-primary shadow-sm text-yellow-500' 
                  : 'theme-text-tertiary hover:theme-text-secondary'
              }`}
            >
              <Sun className="w-4 h-4" />
            </button>
            <button
              onClick={() => theme === 'light' && toggleTheme()}
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
        
        <div className="flex items-center gap-4">
          {actions}
          
          {/* New Resume, Account and Sign Out */}
          {session && (
            <>
              <ActionButton
                onClick={() => window.location.href = '/resume/new'}
                variant="ghost"
                className="gap-2 text-sm"
              >
                <FileText className="w-4 h-4" />
                New Resume
              </ActionButton>
              <ActionButton
                onClick={() => window.location.href = '/account'}
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
      </div>
    </div>
  );
}