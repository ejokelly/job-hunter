'use client';

import { useEffect } from 'react';
import { shouldCleanupSubscription, removeCleanupParams } from '../utils/url-utils';
import { performSubscriptionCleanup } from '../utils/subscription-utils';

export const useSubscriptionCleanup = () => {
  useEffect(() => {
    const handleCleanup = async () => {
      if (!shouldCleanupSubscription()) return;

      console.log('🧹 Triggering subscription cleanup after successful checkout');
      
      const result = await performSubscriptionCleanup();
      
      if (result.success) {
        removeCleanupParams();
      }
    };

    handleCleanup();
  }, []);
};