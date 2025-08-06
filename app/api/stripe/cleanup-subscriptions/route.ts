import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth/server-auth';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: (process.env.STRIPE_API_VERSION as any) || '2025-07-30.basil'
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    console.log(`🧹 Cleaning up subscriptions for user: ${session.user.email}`);

    // Find the customer
    const customers = await stripe.customers.list({ email: session.user.email });
    if (customers.data.length === 0) {
      return NextResponse.json({ message: 'No customer found' });
    }

    const customerId = customers.data[0].id;
    
    // Get all active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 10
    });

    console.log(`🧹 Found ${subscriptions.data.length} active subscriptions`);

    if (subscriptions.data.length <= 1) {
      console.log(`✅ Only ${subscriptions.data.length} subscription(s), no cleanup needed`);
      return NextResponse.json({ 
        message: 'No cleanup needed',
        subscriptions: subscriptions.data.length 
      });
    }

    // Keep the most recent subscription (highest tier if same date)
    const sortedSubscriptions = subscriptions.data.sort((a, b) => {
      // Sort by creation date first (newest first)
      const dateSort = b.created - a.created;
      if (dateSort !== 0) return dateSort;
      
      // If same date, prefer higher tier
      const getTierValue = (priceId: string): number => {
        if (priceId === process.env.NEXT_PUBLIC_STRIPE_UNLIMITED_PRICE_ID) return 2;
        if (priceId === process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID) return 1;
        return 0;
      };
      
      const aPriceId = a.items.data[0]?.price?.id || '';
      const bPriceId = b.items.data[0]?.price?.id || '';
      
      return getTierValue(bPriceId) - getTierValue(aPriceId);
    });

    const keepSubscription = sortedSubscriptions[0];
    const cancelSubscriptions = sortedSubscriptions.slice(1);

    console.log(`🧹 Keeping subscription: ${keepSubscription.id}`);
    console.log(`🗑️ Canceling ${cancelSubscriptions.length} old subscriptions`);

    // Cancel old subscriptions
    for (const subscription of cancelSubscriptions) {
      await stripe.subscriptions.cancel(subscription.id, {
        prorate: true
      });
      console.log(`✅ Canceled subscription: ${subscription.id}`);
    }

    return NextResponse.json({
      message: 'Cleanup completed',
      kept: keepSubscription.id,
      canceled: cancelSubscriptions.map(sub => sub.id)
    });

  } catch (error) {
    console.error('Subscription cleanup error:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup subscriptions' },
      { status: 500 }
    );
  }
}