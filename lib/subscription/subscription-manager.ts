import { MongoClient, ObjectId } from 'mongodb'
import Stripe from 'stripe'

const client = new MongoClient(process.env.MONGODB_URI!)
const clientPromise = client.connect()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: (process.env.STRIPE_API_VERSION as any) || '2025-07-30.basil'
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
    
    console.log('🚨 SUBSCRIPTION CHECK - Looking up user ID:', userId)
    
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) })
    if (!user) throw new Error('User not found')
    
    console.log('🚨 SUBSCRIPTION CHECK - Found user:', {
      id: user._id.toString(),
      email: user.email,
      subscriptionStatus: user.subscriptionStatus,
      stripeSubscriptionId: user.stripeSubscriptionId,
      subscriptionExpires: user.subscriptionExpires
    })

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
        // CRITICAL FIX: Only check Stripe for this specific user's email
        if (!user.email) {
          console.log(`❌ User ${userId} has no email, skipping Stripe check`)
          return {
            canCreateResume: subscriptionStatus === 'free' ? monthlyCount < parseInt(process.env.FREE_MONTHLY_LIMIT!) : true,
            subscriptionStatus,
            monthlyCount,
            monthlyLimit: subscriptionStatus === 'free' ? parseInt(process.env.FREE_MONTHLY_LIMIT!) : parseInt(process.env.STARTER_MONTHLY_LIMIT!),
            needsUpgrade: false
          }
        }

        console.log(`🔍 Checking Stripe ONLY for email: ${user.email}`)
        
        // Get Stripe customer for this specific email
        const customers = await stripe.customers.list({ email: user.email })
        if (customers.data.length === 0) {
          console.log(`❌ No Stripe customer found for email: ${user.email}`)
          // Skip Stripe sync if no customer exists
          return {
            canCreateResume: subscriptionStatus === 'free' ? monthlyCount < parseInt(process.env.FREE_MONTHLY_LIMIT!) : true,
            subscriptionStatus,
            monthlyCount,
            monthlyLimit: subscriptionStatus === 'free' ? parseInt(process.env.FREE_MONTHLY_LIMIT!) : parseInt(process.env.STARTER_MONTHLY_LIMIT!),
            needsUpgrade: false
          }
        }

        const stripeCustomer = customers.data[0]
        
        // Search for active subscriptions for this specific customer
        const subscriptions = await stripe.subscriptions.list({
          customer: stripeCustomer.id,
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
              
              // Set next check date for future validation
              nextCheckDate = new Date(Date.now() + 24 * 60 * 60 * 1000) // Check again tomorrow
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
          
          // Set next check date for future validation
          nextCheckDate = new Date(Date.now() + 24 * 60 * 60 * 1000) // Check again tomorrow
          
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
                  new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : user.subscriptionExpires // Default to 30 days from now
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
    let monthlyLimit = parseInt(process.env.FREE_MONTHLY_LIMIT!)
    
    if (process.env.FORCE_SUBSCRIPTION_AFTER) {
      monthlyLimit = parseInt(process.env.FORCE_SUBSCRIPTION_AFTER)
    }
    
    if (subscriptionStatus === 'starter' && isActive) {
      monthlyLimit = parseInt(process.env.STARTER_MONTHLY_LIMIT!)
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