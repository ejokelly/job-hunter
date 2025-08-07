'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers/auth-provider';
import posthog from 'posthog-js';

export const useAuthRedirect = () => {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      posthog.capture('new_resume_accessed', {
        method: 'auto_redirect_after_login'
      });
      router.push('/resume/new');
    }
  }, [user, isLoading, router]);
};