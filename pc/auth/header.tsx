'use client';

import { Menu, X, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ActionButton from '../ui/action-button';
import Brand from '../ui/brand';
import ThemeToggle from './header/theme-toggle';
import UserMenu from './header/user-menu';
import GuestMenu from './header/guest-menu';
import MobileMenu from './header/mobile-menu';
import { useAuth } from '@/app/providers/auth-provider';
import { useUI } from '@/app/providers/ui-state-provider';

interface HeaderProps {
  title?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  onLoginClick?: () => void;
}

export default function Header({ title, onBack, actions, onLoginClick }: HeaderProps) {
  const { user } = useAuth();
  const { isMobileMenuOpen, toggleMobileMenu } = useUI();
  const router = useRouter();

  const handleMobileNewResume = () => {
    console.log('New resume button clicked, navigating to /resume/new');
    router.push('/resume/new');
  };

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
            <GuestMenu onLoginClick={onLoginClick} />
            <UserMenu />
            {actions}
            <ThemeToggle />
          </div>

          {/* Mobile Actions */}
          <div className="md:hidden flex items-center gap-6">
            {user && (
              <button
                type="button"
                onClick={handleMobileNewResume}
                className="theme-text-primary hover:theme-text-secondary transition-colors"
                aria-label="Create new resume"
              >
                <FileText className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={toggleMobileMenu}
              className="theme-text-primary hover:theme-text-secondary transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        <MobileMenu onLoginClick={onLoginClick} />
      </div>
    </div>
  );
}