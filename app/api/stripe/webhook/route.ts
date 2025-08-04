import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { SubscriptionManager } from '@/lib/subscription/subscription-manager'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
          const userId = session.metadata?.userId
          
          if (userId && subscription.items.data[0]) {
            const priceId = subscription.items.data[0].price.id
            const subscriptionTier = priceId === process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID ? 'starter' : 'unlimited'
            
            await SubscriptionManager.updateSubscription(
              userId,
              subscription.id,
              subscriptionTier,
              new Date(subscription.current_period_end * 1000)
            )
            
            console.log(`✅ Subscription activated for user ${userId}: ${subscriptionTier}`)
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.userId
        
        if (userId) {
          const priceId = subscription.items.data[0].price.id
          const subscriptionTier = priceId === process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID ? 'starter' : 'unlimited'
          
          await SubscriptionManager.updateSubscription(
            userId,
            subscription.id,
            subscriptionTier,
            new Date(subscription.current_period_end * 1000)
          )
          
          console.log(`🔄 Subscription updated for user ${userId}: ${subscriptionTier}`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.userId
        
        if (userId) {
          await SubscriptionManager.updateSubscription(
            userId,
            subscription.id,
            'canceled',
            new Date()
          )
          
          console.log(`❌ Subscription canceled for user ${userId}`)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
          const userId = subscription.metadata?.userId
          
          if (userId) {
            console.log(`💳 Payment failed for user ${userId}`)
            // Could send email notification here
          }
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}