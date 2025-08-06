interface SubscriptionCleanupResult {
  success: boolean;
  data?: any;
  error?: string;
}

export const performSubscriptionCleanup = async (): Promise<SubscriptionCleanupResult> => {
  try {
    const response = await fetch('/api/stripe/cleanup-subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    console.log('✅ Subscription cleanup result:', data);
    
    return { success: true, data };
  } catch (error) {
    console.error('❌ Subscription cleanup failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};