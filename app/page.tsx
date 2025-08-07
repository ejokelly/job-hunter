'use client';

import LoadingScreen from '@/pc/ui/loading-screen';
import Homepage from '@/pc/homepage/homepage';
import MobileHomepage from '@/mobile/homepage';
import { useAuth } from '@/app/providers/auth-provider';
import { useDevice } from '@/app/providers/device-provider';
import { useAuthRedirect } from '@/app/hooks/useAuthRedirect';
import { useSubscriptionCleanup } from '@/app/hooks/useSubscriptionCleanup';

export default function Home() {
  const { isLoading, isAuthenticated } = useAuth();
  const { isMobile, isLoading: deviceLoading } = useDevice();

  useAuthRedirect();
  useSubscriptionCleanup();

  if (isLoading || deviceLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    // Show appropriate homepage based on device type
    return isMobile ? <MobileHomepage /> : <Homepage />;
  }

  // This should not render due to useAuthRedirect, but just in case
  return <LoadingScreen />;
}
