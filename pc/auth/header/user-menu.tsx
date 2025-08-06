'use client';

import { LogOut, User, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ActionButton from '../../ui/action-button';
import { useAuth } from '@/app/providers/auth-provider';
import posthog from 'posthog-js';

interface UserMenuProps {
  isMobile?: boolean;
}

export default function UserMenu({ isMobile = false }: UserMenuProps) {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    posthog.capture('user_signed_out');
    await signOut();
    router.push('/');
  };

  const handleNavigation = (path: string, item: string) => {
    const eventName = isMobile ? 'mobile_menu_clicked' : 'header_menu_clicked';
    posthog.capture(eventName, { item });
    router.push(path);
  };

  if (!user) return null;

  const menuItems = [
    {
      icon: FileText,
      label: 'New Resume',
      path: '/resume/new',
      eventKey: 'resume'
    },
    {
      icon: User,
      label: 'Account',
      path: '/account',
      eventKey: 'account'
    }
  ];

  const baseButtonClass = isMobile 
    ? "gap-2 text-sm justify-center" 
    : "gap-2 text-sm";

  return (
    <>
      {menuItems.map((item) => (
        <ActionButton
          key={item.eventKey}
          onClick={() => handleNavigation(item.path, item.eventKey)}
          variant="ghost"
          className={baseButtonClass}
        >
          <item.icon className="w-4 h-4" />
          {item.label}
        </ActionButton>
      ))}
      
      <ActionButton
        onClick={handleSignOut}
        variant="ghost"
        className={baseButtonClass}
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </ActionButton>
    </>
  );
}