import { MongoClient, ObjectId } from 'mongodb'
import Stripe from 'stripe'
import { getPricingData, getUpgradeInfo } from '../pricing'

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
  upgradePrice: number | null
  stripePriceId: string | null
  subscriptionExpires?: Date
  stripeSubscriptionId?: string
}

export class SubscriptionManager {
  private static async getDatabase() {
    const connection = await clientPromise
    return connection.db()
  }

  static async getSubscriptionStatus(userId: string, forceRefresh: boolean = false): Promise<SubscriptionStatus> {
    const db = await this.getDatabase()
    
    console.log('🚨 SUBSCRIPTION CHECK - Looking up user ID:', userId)
    
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) })
    if (!user) throw new Error('User not found')
    
    console.log('🚨 SUBSCRIPTION CHECK - Found user:', {
      id: user._id.toString(),
      email: user.email
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

    // Check Stripe - it's the source of truth (but can be cached in session)
    let subscriptionStatus: 'free' | 'starter' | 'unlimited' | 'canceled' = 'free'
    let stripeSubscriptionId: string | undefined = undefined
    let subscriptionExpires: Date | undefined = undefined

    console.log(`🔍 Stripe check - forceRefresh: ${forceRefresh}`);

    try {
      // Check Stripe for this specific user's email
      if (!user.email) {
        console.log(`❌ User ${userId} has no email, defaulting to free`)
      } else {
        console.log(`🔍 Checking Stripe for email: ${user.email}`)
        
        // Get ALL Stripe customers for this email and check ALL for active subscriptions
        const customers = await stripe.customers.list({ email: user.email, limit: 100 })
        console.log(`📊 STRIPE DEBUG - Found ${customers.data.length} customers for email: ${user.email}`)
        
        if (customers.data.length === 0) {
          console.log(`❌ No Stripe customer found for email: ${user.email}, using free tier`)
        } else {
          let foundActiveSubscription = false;
          
          // Check ALL customers for active subscriptions
          for (const customer of customers.data) {
            console.log(`🔍 Checking customer: ${customer.id}`)
            
            const subscriptions = await stripe.subscriptions.list({
              customer: customer.id,
              status: 'active',
              limit: 10
            })
            
            console.log(`📊 STRIPE DEBUG - Found ${subscriptions.data.length} active subscriptions for customer: ${customer.id}`)
            
            if (subscriptions.data.length > 0) {
              console.log(`📊 STRIPE DEBUG - Subscription details:`, subscriptions.data.map(sub => ({
                id: sub.id,
                status: sub.status,
                priceId: sub.items.data[0]?.price?.id,
                amount: sub.items.data[0]?.price?.unit_amount,
                created: new Date(sub.created * 1000).toISOString()
              })));
              
              // Get the highest tier subscription if multiple exist
              const activeSubscription = subscriptions.data.reduce((highest, current) => {
                const currentPriceId = current.items.data[0]?.price?.id;
                const highestPriceId = highest.items.data[0]?.price?.id;
                
                const getTierValue = (priceId: string): number => {
                  if (priceId === process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID) return 1;
                  if (priceId === process.env.NEXT_PUBLIC_STRIPE_UNLIMITED_PRICE_ID) return 2;
                  return 0;
                };
                
                return getTierValue(currentPriceId) > getTierValue(highestPriceId) ? current : highest;
              });
              
              const priceId = activeSubscription.items.data[0]?.price?.id
              stripeSubscriptionId = activeSubscription.id
              subscriptionExpires = new Date((activeSubscription as any).current_period_end * 1000)
              
              if (priceId === process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID) {
                subscriptionStatus = 'starter'
              } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_UNLIMITED_PRICE_ID) {
                subscriptionStatus = 'unlimited'
              }
              
              console.log(`✅ Found active subscription for user ${userId}: ${subscriptionStatus} (${activeSubscription.id}) on customer ${customer.id}`)
              foundActiveSubscription = true;
              break; // Found an active subscription, stop looking
            }
          }
          
          if (!foundActiveSubscription) {
            console.log(`❌ No active subscriptions found across ${customers.data.length} customers for user ${userId}, using free tier`)
          }
        }
      }
    } catch (error) {
      console.error('Error checking Stripe:', error)
      // Default to free on error
      subscriptionStatus = 'free'
    }
    
    // Get pricing data
    const pricingData = getPricingData();
    const currentTier = subscriptionStatus || 'free';
    const currentPlan = pricingData.plans[currentTier as keyof typeof pricingData.plans];
    
    // Determine monthly limit and access
    const monthlyLimit = currentPlan?.monthlyLimit || pricingData.plans.free.monthlyLimit;
    let canCreateResume = true;
    
    if (monthlyLimit !== null) {
      canCreateResume = monthlyCount < monthlyLimit;
    }
    
    // Override for disabled subscriptions
    if (process.env.DISABLE_SUBSCRIPTIONS === 'true') {
      canCreateResume = true;
    }
    
    // Simple upgrade logic - no complex JSON dependencies
    let upgradeToTier: string | null = null;
    let upgradePrice: number | null = null;
    let stripePriceId: string | null = null;
    
    if (currentTier === 'free') {
      upgradeToTier = 'starter';
      upgradePrice = 25;
      stripePriceId = process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID!;
    } else if (currentTier === 'starter') {
      upgradeToTier = 'unlimited';
      upgradePrice = 250;
      stripePriceId = process.env.NEXT_PUBLIC_STRIPE_UNLIMITED_PRICE_ID!;
    }
    
    console.log('🔍 Final subscription status:', {
      canCreateResume,
      monthlyCount,
      monthlyLimit,
      subscriptionStatus: currentTier,
      needsUpgrade: !canCreateResume,
      upgradeToTier,
      upgradePrice,
      stripePriceId,
      DISABLE_SUBSCRIPTIONS: process.env.DISABLE_SUBSCRIPTIONS
    });
    
    return {
      canCreateResume,
      monthlyCount,
      monthlyLimit: monthlyLimit || 0,
      subscriptionStatus: currentTier,
      needsUpgrade: !canCreateResume,
      upgradeToTier: upgradeToTier as 'starter' | 'unlimited' | null,
      upgradePrice,
      stripePriceId,
      subscriptionExpires,
      stripeSubscriptionId
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

  // Helper method to get subscription status from Stripe only (for session caching)
  static async getSubscriptionFromStripe(userEmail: string): Promise<{
    subscriptionStatus: 'free' | 'starter' | 'unlimited' | 'canceled',
    stripeSubscriptionId?: string,
    subscriptionExpires?: Date
  }> {
    try {
      console.log(`🔍 Checking Stripe for email: ${userEmail}`)
      
      // Get Stripe customer for this specific email
      const customers = await stripe.customers.list({ email: userEmail })
      if (customers.data.length === 0) {
        console.log(`❌ No Stripe customer found for email: ${userEmail}, using free tier`)
        return { subscriptionStatus: 'free' }
      }

      const stripeCustomer = customers.data[0]
      
      // Search for active subscriptions for this specific customer
      const subscriptions = await stripe.subscriptions.list({
        customer: stripeCustomer.id,
        status: 'active',
        limit: 10
      })
      
      if (subscriptions.data.length === 0) {
        console.log(`❌ No active subscriptions found for ${userEmail}, using free tier`)
        return { subscriptionStatus: 'free' }
      }

      // Get the highest tier subscription if multiple exist
      const activeSubscription = subscriptions.data.reduce((highest, current) => {
        const currentPriceId = current.items.data[0]?.price?.id;
        const highestPriceId = highest.items.data[0]?.price?.id;
        
        const getTierValue = (priceId: string): number => {
          if (priceId === process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID) return 1;
          if (priceId === process.env.NEXT_PUBLIC_STRIPE_UNLIMITED_PRICE_ID) return 2;
          return 0;
        };
        
        return getTierValue(currentPriceId) > getTierValue(highestPriceId) ? current : highest;
      });
      
      const priceId = activeSubscription.items.data[0]?.price?.id
      let subscriptionStatus: 'free' | 'starter' | 'unlimited' | 'canceled' = 'free'
      
      if (priceId === process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID) {
        subscriptionStatus = 'starter'
      } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_UNLIMITED_PRICE_ID) {
        subscriptionStatus = 'unlimited'
      }
      
      console.log(`✅ Found active subscription for ${userEmail}: ${subscriptionStatus} (${activeSubscription.id})`)
      
      return {
        subscriptionStatus,
        stripeSubscriptionId: activeSubscription.id,
        subscriptionExpires: new Date((activeSubscription as any).current_period_end * 1000)
      }
      
    } catch (error) {
      console.error('Error checking Stripe:', error)
      return { subscriptionStatus: 'free' }
    }
  }
}