'use client';

import { Sun, Moon, User, LogOut } from 'lucide-react';
import { useTheme } from './theme-provider';
import { useSession, signOut } from 'next-auth/react';
import ActionButton from './action-button';
import Brand from './brand';

interface HeaderProps {
  title?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
}

export default function Header({ title, onBack, actions }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { data: session } = useSession();

  return (
    <div className="theme-header shadow-sm border-b theme-border-light">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
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
        
        <div className="flex items-center gap-4">
          {actions}
          
          {/* User Info */}
          {session && (
            <div className="flex items-center gap-2 theme-text-secondary text-sm">
              <User className="w-4 h-4" />
              <span>{session.user?.email}</span>
            </div>
          )}
          
          {/* Theme Toggle */}
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
          
          {/* Sign Out - Always rightmost */}
          {session && (
            <ActionButton
              onClick={() => signOut()}
              variant="ghost"
              className="gap-2 text-sm"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </ActionButton>
          )}
        </div>
      </div>
    </div>
  );
}