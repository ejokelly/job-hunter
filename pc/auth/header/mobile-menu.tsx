'use client';

import { FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ActionButton from '../../ui/action-button';
import ThemeToggle from './theme-toggle';
import UserMenu from './user-menu';
import GuestMenu from './guest-menu';
import { useAuth } from '@/app/providers/auth-provider';
import { useUI } from '@/app/providers/ui-state-provider';
import posthog from 'posthog-js';

interface MobileMenuProps {
  onLoginClick?: () => void;
}

export default function MobileMenu({ onLoginClick }: MobileMenuProps) {
  const { user } = useAuth();
  const { isMobileMenuOpen, closeMobileMenu } = useUI();
  const router = useRouter();

  const handleNewResume = () => {
    posthog.capture('mobile_menu_clicked', { item: 'resume' });
    closeMobileMenu();
    router.push('/resume/new');
  };

  if (!isMobileMenuOpen) return null;

  return (
    <div className="md:hidden mt-4 pt-4 border-t theme-border-light relative z-[10000]">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-center">
          <ThemeToggle isMobile />
        </div>
        
        <GuestMenu onLoginClick={onLoginClick} isMobile />
        
        {user && (
          <ActionButton
            onClick={handleNewResume}
            variant="ghost"
            className="gap-2 text-sm justify-center"
          >
            <FileText className="w-4 h-4" />
            New Resume
          </ActionButton>
        )}
        
        <UserMenu isMobile />
      </div>
    </div>
  );
}