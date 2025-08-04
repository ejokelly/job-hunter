import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth/server-auth'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: (process.env.STRIPE_API_VERSION as any) || '2025-07-30.basil'
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { priceId } = await request.json()
    
    if (!priceId) {
      return NextResponse.json({ error: 'Price ID is required' }, { status: 400 })
    }

    // Validate price ID is one of our valid ones
    const validPriceIds = [
      process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID!,
      process.env.NEXT_PUBLIC_STRIPE_UNLIMITED_PRICE_ID!
    ]
    
    if (!validPriceIds.includes(priceId)) {
      return NextResponse.json({ error: 'Invalid price ID' }, { status: 400 })
    }

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer_email: session.user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/?success=true`,
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