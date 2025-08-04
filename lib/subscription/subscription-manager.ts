import { MongoClient, ObjectId } from 'mongodb'
import Stripe from 'stripe'

const client = new MongoClient(process.env.MONGODB_URI!)
const clientPromise = client.connect()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20'
})

export interface SubscriptionStatus {
  canCreateResume: boolean
  monthlyCount: number
  monthlyLimit: number
  subscriptionStatus: 'free' | 'starter' | 'unlimited' | 'canceled'
  needsUpgrade: boolean
  upgradeToTier: 'starter' | 'unlimited' | null
  upgradePrice: number
  stripePriceId: string | null
  subscriptionExpires?: Date
  stripeSubscriptionId?: string
}

export class SubscriptionManager {
  private static async getDatabase() {
    const connection = await clientPromise
    return connection.db()
  }

  static async getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    const db = await this.getDatabase()
    
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) })
    if (!user) throw new Error('User not found')

    // Count resumes created this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    
    // Count generation sessions (not individual API calls) from database this month
    const monthlyCount = await db.collection('generation_sessions').countDocuments({
      userId: new ObjectId(userId),
      createdAt: { $gte: startOfMonth }
    })

    let subscriptionStatus = user.subscriptionStatus || 'free'
    let isActive = !user.subscriptionExpires || new Date(user.subscriptionExpires) > new Date()
    
    const now = new Date()
    const needsStripeCheck = !user.nextStripeCheck || now >= user.nextStripeCheck
    
    // Only check Stripe if we need to (haven't checked recently or near renewal)
    if (needsStripeCheck) {
      console.log(`🔍 Checking Stripe for user ${userId} (last check: ${user.lastStripeCheck || 'never'})`)
      
      try {
        // Search for any active subscriptions for this user's email
        const subscriptions = await stripe.subscriptions.list({
          customer: user.email ? (await stripe.customers.list({ email: user.email })).data[0]?.id : undefined,
          status: 'active',
          limit: 10
        })
        
        let foundActiveSubscription = false
        let nextCheckDate = new Date(now.getTime() + 24 * 60 * 60 * 1000) // Default: check again in 24 hours
        
        // If user has a stored subscription ID, check it first
        if (user.stripeSubscriptionId) {
          try {
            const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId)
            if (subscription.status === 'active') {
              foundActiveSubscription = true
              isActive = true
              const priceId = subscription.items.data[0]?.price?.id
              if (priceId === process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID) {
                subscriptionStatus = 'starter'
              } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_UNLIMITED_PRICE_ID) {
                subscriptionStatus = 'unlimited'
              }
              
              // Set next check to 3 days before renewal
              const renewalDate = new Date(subscription.current_period_end * 1000)
              nextCheckDate = new Date(renewalDate.getTime() - 3 * 24 * 60 * 60 * 1000)
            }
          } catch (error) {
            console.error('Error checking stored subscription:', error)
          }
        }
        
        // If no stored subscription or it's not active, check all subscriptions for this customer
        if (!foundActiveSubscription && subscriptions.data.length > 0) {
          const activeSubscription = subscriptions.data[0] // Take the first active subscription
          const priceId = activeSubscription.items.data[0]?.price?.id
          
          isActive = true
          foundActiveSubscription = true
          
          if (priceId === process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID) {
            subscriptionStatus = 'starter'
          } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_UNLIMITED_PRICE_ID) {
            subscriptionStatus = 'unlimited'
          }
          
          // Set next check to 3 days before renewal
          const renewalDate = new Date(activeSubscription.current_period_end * 1000)
          nextCheckDate = new Date(renewalDate.getTime() - 3 * 24 * 60 * 60 * 1000)
          
          console.log(`✅ Found new subscription for user ${userId}: ${subscriptionStatus} (${activeSubscription.id})`)
        }
        
        // Update database with check timestamps
        await db.collection('users').updateOne(
          { _id: new ObjectId(userId) },
          {
            $set: {
              lastStripeCheck: now,
              nextStripeCheck: nextCheckDate,
              ...(foundActiveSubscription && {
                subscriptionStatus,
                stripeSubscriptionId: foundActiveSubscription ? 
                  (user.stripeSubscriptionId || subscriptions.data[0]?.id) : user.stripeSubscriptionId,
                subscriptionExpires: foundActiveSubscription ? 
                  new Date((user.stripeSubscriptionId ? 
                    (await stripe.subscriptions.retrieve(user.stripeSubscriptionId)).current_period_end :
                    subscriptions.data[0]?.current_period_end || 0) * 1000) : user.subscriptionExpires
              }),
              updatedAt: now
            }
          }
        )
        
        console.log(`📅 Next Stripe check for user ${userId}: ${nextCheckDate.toISOString()}`)
        
      } catch (error) {
        console.error('Error syncing with Stripe:', error)
        // Update next check to retry in 1 hour on error
        await db.collection('users').updateOne(
          { _id: new ObjectId(userId) },
          {
            $set: {
              lastStripeCheck: now,
              nextStripeCheck: new Date(now.getTime() + 60 * 60 * 1000), // Retry in 1 hour
              updatedAt: now
            }
          }
        )
      }
    } else {
      console.log(`⏭️ Skipping Stripe check for user ${userId} (next check: ${user.nextStripeCheck})`)
    }
    
    // Determine monthly limit from environment variables
    let monthlyLimit = parseInt(process.env.FREE_MONTHLY_LIMIT || '10')
    
    if (process.env.FORCE_SUBSCRIPTION_AFTER) {
      monthlyLimit = parseInt(process.env.FORCE_SUBSCRIPTION_AFTER)
    }
    
    if (subscriptionStatus === 'starter' && isActive) {
      monthlyLimit = parseInt(process.env.STARTER_MONTHLY_LIMIT || '100')
    }
    let canCreateResume = monthlyCount < monthlyLimit
    
    if (subscriptionStatus === 'unlimited' && isActive) {
      canCreateResume = true // No limit on unlimited
    }
    if (process.env.DISABLE_SUBSCRIPTIONS === 'true') {
      canCreateResume = true // No limit when disabled
    }
    
    return {
      canCreateResume,
      monthlyCount,
      monthlyLimit,
      subscriptionStatus,
      needsUpgrade: !canCreateResume,
      upgradeToTier: subscriptionStatus === 'starter' ? 'unlimited' : 'starter',
      upgradePrice: subscriptionStatus === 'starter' ? 250 : 25,
      stripePriceId: subscriptionStatus === 'starter' ? 
        process.env.NEXT_PUBLIC_STRIPE_UNLIMITED_PRICE_ID! : 
        process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID!,
      subscriptionExpires: user.subscriptionExpires,
      stripeSubscriptionId: user.stripeSubscriptionId
    }
  }

  // Check limits and potentially start a new generation session
  static async checkAndIncrementLimit(userId: string, sessionId?: string): Promise<SubscriptionStatus> {
    const status = await this.getSubscriptionStatus(userId)
    
    if (status.canCreateResume && sessionId) {
      // Check if this session already exists (to avoid double counting)
      const db = await this.getDatabase()
      const existingSession = await db.collection('generation_sessions').findOne({
        userId: new ObjectId(userId),
        sessionId: sessionId
      })
      
      if (!existingSession) {
        // Create new generation session
        await db.collection('generation_sessions').insertOne({
          userId: new ObjectId(userId),
          sessionId: sessionId,
          createdAt: new Date(),
          type: 'full_generation' // full generation vs individual regeneration
        })
        
        // Update counts for return value
        status.monthlyCount += 1
        status.canCreateResume = status.monthlyCount < status.monthlyLimit
        status.needsUpgrade = !status.canCreateResume
      }
    }
    
    return status
  }

  // For individual regenerations (count as 1 generation each)
  static async checkAndIncrementRegenerationLimit(userId: string, type: 'resume' | 'cover_letter'): Promise<SubscriptionStatus> {
    const status = await this.getSubscriptionStatus(userId)
    
    if (status.canCreateResume) {
      // Record individual regeneration
      const db = await this.getDatabase()
      await db.collection('generation_sessions').insertOne({
        userId: new ObjectId(userId),
        sessionId: `regen_${type}_${Date.now()}`,
        createdAt: new Date(),
        type: 'regeneration',
        regenerationType: type
      })
      
      // Update counts for return value
      status.monthlyCount += 1
      status.canCreateResume = status.monthlyCount < status.monthlyLimit
      status.needsUpgrade = !status.canCreateResume
    }
    
    return status
  }

  static async updateSubscription(
    userId: string,
    stripeSubscriptionId: string,
    subscriptionStatus: 'starter' | 'unlimited' | 'canceled',
    subscriptionExpires?: Date
  ): Promise<void> {
    const db = await this.getDatabase()
    
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          subscriptionStatus,
          stripeSubscriptionId,
          subscriptionExpires,
          updatedAt: new Date()
        }
      }
    )
    
    console.log(`Updated subscription for user ${userId}: ${subscriptionStatus}`)
  }
}