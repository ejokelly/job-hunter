'use client';

import ActionButton from '../../ui/action-button';
import ThemeToggle from './theme-toggle';
import UserMenu from './user-menu';
import GuestMenu from './guest-menu';
import { useAuth } from '@/app/providers/auth-provider';
import { useUI } from '@/app/providers/ui-state-provider';

interface MobileMenuProps {
  onLoginClick?: () => void;
}

export default function MobileMenu({ onLoginClick }: MobileMenuProps) {
  const { user } = useAuth();
  const { isMobileMenuOpen } = useUI();

  if (!isMobileMenuOpen) return null;

  return (
    <div className="md:hidden mt-4 pt-4 border-t theme-border-light relative z-[10000]">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-center">
          <ThemeToggle isMobile />
        </div>
        
        <GuestMenu onLoginClick={onLoginClick} isMobile />
        
        
        <UserMenu isMobile />
      </div>
    </div>
  );
}