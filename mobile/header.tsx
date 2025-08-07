'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/app/providers/auth-provider';
import { useUI } from '@/app/providers/ui-state-provider';

interface MobileHeaderProps {
  title?: string;
  onBack?: () => void;
}

export default function MobileHeader({ title, onBack }: MobileHeaderProps) {
  const { user } = useAuth();
  const { openLoginModal } = useUI();
  const router = useRouter();

  const handleSignOut = async () => {
    // Implementation will be added
    router.push('/');
  };

  return (
    <div className="theme-header shadow-sm border-b theme-border-light">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left side - Back button or Logo */}
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="theme-text-primary hover:theme-text-secondary transition-colors"
              >
                ← Back
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">❤</span>
              </div>
              <h1 className="text-lg font-semibold theme-text-primary">
                {title || 'resumelove'}
              </h1>
            </div>
          </div>
          
          {/* Right side - Sign In */}
          {!user ? (
            <button
              onClick={() => openLoginModal()}
              className="theme-text-primary hover:theme-text-secondary transition-colors font-medium"
            >
              Sign In
            </button>
          ) : null}
        </div>

      </div>
    </div>
  );
}