'use client';

import { useRouter } from 'next/navigation';
import ActionButton from '../../ui/action-button';
import { useAuth } from '@/app/providers/auth-provider';
import posthog from 'posthog-js';

interface GuestMenuProps {
  onLoginClick?: () => void;
  isMobile?: boolean;
}

export default function GuestMenu({ onLoginClick, isMobile = false }: GuestMenuProps) {
  const { user } = useAuth();
  const router = useRouter();

  if (user) return null;

  const handleSignIn = () => {
    const eventName = isMobile ? 'mobile_login_clicked' : 'header_login_clicked';
    posthog.capture(eventName);
    if (onLoginClick) {
      onLoginClick();
    } else {
      // Fallback to redirect if no handler provided
      router.push('/auth/signin');
    }
  };

  const baseButtonClass = isMobile 
    ? "text-sm justify-center" 
    : "text-sm";

  return (
    <ActionButton
      onClick={handleSignIn}
      variant="ghost"
      className={`${baseButtonClass} whitespace-nowrap`}
    >
      Already signed up? Click here to log in.
    </ActionButton>
  );
}