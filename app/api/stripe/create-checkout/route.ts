import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth/server-auth'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: (process.env.STRIPE_API_VERSION as any) || '2025-07-30.basil'
})

// Helper function to check if the new price is an upgrade
function checkIfUpgrade(currentPriceId: string | undefined, newPriceId: string): boolean {
  if (!currentPriceId) return true; // No current subscription, so this is a new subscription
  
  // Define tier hierarchy: free < starter < unlimited
  const getTierValue = (priceId: string): number => {
    if (priceId === process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID) return 1;
    if (priceId === process.env.NEXT_PUBLIC_STRIPE_UNLIMITED_PRICE_ID) return 2;
    return 0; // free or unknown
  };
  
  const currentTierValue = getTierValue(currentPriceId);
  const newTierValue = getTierValue(newPriceId);
  
  return newTierValue > currentTierValue;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { priceId } = await request.json()
    
    console.log(`🚨 UPGRADE DEBUG - Received price ID: ${priceId}`)
    console.log(`🚨 UPGRADE DEBUG - User: ${session.user.email}`)
    
    if (!priceId) {
      return NextResponse.json({ error: 'Price ID is required' }, { status: 400 })
    }

    // Validate price ID is one of our valid ones
    const validPriceIds = [
      process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID!,
      process.env.NEXT_PUBLIC_STRIPE_UNLIMITED_PRICE_ID!
    ]
    
    console.log(`🚨 UPGRADE DEBUG - Valid price IDs:`, validPriceIds)
    
    if (!validPriceIds.includes(priceId)) {
      return NextResponse.json({ error: 'Invalid price ID' }, { status: 400 })
    }

    console.log(`🚨 UPGRADE DEBUG - Creating checkout session, cleanup will happen after success`);

    // Get or create customer (reuse existing customer by email)
    let customerId: string;
    const customers = await stripe.customers.list({ email: session.user.email });
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log(`📋 Using existing customer: ${customerId}`);
    } else {
      const customer = await stripe.customers.create({
        email: session.user.email,
        metadata: {
          userId: session.user.id
        }
      });
      customerId = customer.id;
      console.log(`📋 Created new customer: ${customerId}`);
    }

    // Create Stripe checkout session for new subscriptions
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/?success=true&cleanup=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/?canceled=true`,
      metadata: {
        userId: session.user.id,
        userEmail: session.user.email
      },
      subscription_data: {
        metadata: {
          userId: session.user.id,
          userEmail: session.user.email
        }
      }
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}