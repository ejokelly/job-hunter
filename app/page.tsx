'use client';

import LoadingScreen from '@/pc/ui/loading-screen';
import Homepage from '@/pc/homepage/homepage';
import ComingSoon from '@/mobile/coming-soon';
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

  // Show mobile coming soon page for touch devices
  if (isMobile) {
    return <ComingSoon />;
  }

  if (!isAuthenticated) {
    return <Homepage />;
  }

  // This should not render due to useAuthRedirect, but just in case
  return <LoadingScreen />;
}
