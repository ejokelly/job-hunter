import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { SubscriptionManager } from '@/app/lib/subscription/subscription-manager';
import { MongoClient, ObjectId } from 'mongodb';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: (process.env.STRIPE_API_VERSION as any) || '2025-07-30.basil'
});

const client = new MongoClient(process.env.MONGODB_URI!);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log(`🔔 Received Stripe webhook: ${event.type}`);

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;
  const userEmail = subscription.metadata.userEmail;
  
  if (!userId && !userEmail) {
    console.error('No userId or userEmail in subscription metadata');
    return;
  }

  // Connect to database
  await client.connect();
  const db = client.db();

  // Find user by userId or email
  const user = userId ? 
    await db.collection('users').findOne({ _id: new ObjectId(userId) }) :
    await db.collection('users').findOne({ email: userEmail });
    
  if (!user) {
    console.error(`User not found: ${userId || userEmail}`);
    return;
  }

  // Get the price ID to determine subscription tier
  const priceId = subscription.items.data[0]?.price?.id;
  let subscriptionStatus: 'starter' | 'unlimited' | 'canceled' = 'starter';
  
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_UNLIMITED_PRICE_ID) {
    subscriptionStatus = 'unlimited';
  }

  console.log(`📈 Subscription update for user ${user._id}: ${subscriptionStatus} (${subscription.id})`);
  
  // Cancel any OTHER active subscriptions for this customer (after the new one is confirmed)
  if (subscription.status === 'active') {
    try {
      const allSubscriptions = await stripe.subscriptions.list({
        customer: subscription.customer as string,
        status: 'active',
        limit: 10
      });
      
      const otherSubscriptions = allSubscriptions.data.filter(sub => sub.id !== subscription.id);
      
      if (otherSubscriptions.length > 0) {
        console.log(`🗑️ Canceling ${otherSubscriptions.length} other subscriptions after successful upgrade`);
        
        for (const oldSub of otherSubscriptions) {
          await stripe.subscriptions.cancel(oldSub.id, {
            prorate: true
          });
          console.log(`✅ Canceled old subscription: ${oldSub.id}`);
        }
      }
    } catch (error) {
      console.error('Error canceling old subscriptions:', error);
    }
  }
  
  console.log(`✅ No database update needed - Stripe is the source of truth`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;
  const userEmail = subscription.metadata.userEmail;
  
  if (!userId && !userEmail) {
    console.error('No userId or userEmail in subscription metadata');
    return;
  }

  console.log(`📉 Subscription canceled: ${subscription.id} for ${userEmail || userId}`);
  console.log(`✅ No database update needed - Stripe is the source of truth`);
}

// Note: We no longer need to cancel other subscriptions since we're using 
// subscription modification with proration instead of creating new subscriptions