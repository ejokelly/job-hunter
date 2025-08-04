import { MongoClient, ObjectId } from 'mongodb'

const client = new MongoClient(process.env.MONGODB_URI!)
const clientPromise = client.connect()

export interface SubscriptionStatus {
  canCreateResume: boolean
  monthlyCount: number
  monthlyLimit: number
  subscriptionStatus: 'free' | 'starter' | 'unlimited' | 'canceled'
  needsUpgrade: boolean
  upgradeToTier: 'starter' | 'unlimited' | null
  upgradePrice: number
  stripePriceId: string | null
}

export class SubscriptionManager {
  private static async getDatabase() {
    const connection = await clientPromise
    return connection.db()
  }

  // Check if user can create a resume and increment count if they can
  static async checkAndIncrementDailyLimit(userId: string): Promise<SubscriptionStatus> {
    const db = await this.getDatabase()
    
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) })
    
    if (!user) {
      throw new Error('User not found')
    }

    const today = new Date()
    const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    
    // Calculate start of current week (Sunday)
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    
    const lastWeeklyReset = user.lastWeeklyReset ? new Date(user.lastWeeklyReset) : new Date('1970-01-01')
    const lastMonthlyReset = user.lastMonthlyReset ? new Date(user.lastMonthlyReset) : new Date('1970-01-01')
    const lastMonthString = `${lastMonthlyReset.getFullYear()}-${String(lastMonthlyReset.getMonth() + 1).padStart(2, '0')}`

    let weeklyCount = user.weeklyResumeCount || 0
    let monthlyCount = user.monthlyResumeCount || 0
    
    // Reset weekly count if it's a new week
    if (startOfWeek > lastWeeklyReset) {
      weeklyCount = 0
    }
    
    // Reset monthly count if it's a new month
    if (thisMonth !== lastMonthString) {
      monthlyCount = 0
    }

    const subscriptionStatus = user.subscriptionStatus || 'free'
    const isActive = !user.subscriptionExpires || new Date(user.subscriptionExpires) > today
    
    // Check if subscriptions are disabled via env variable
    const subscriptionsDisabled = process.env.DISABLE_SUBSCRIPTIONS === 'true'
    const forceSubscriptionAfter = process.env.FORCE_SUBSCRIPTION_AFTER ? parseInt(process.env.FORCE_SUBSCRIPTION_AFTER) : null
    
    console.log('🔒 Subscription check:', {
      userId,
      subscriptionsDisabled,
      forceSubscriptionAfter,
      subscriptionStatus,
      weeklyCount,
      effectiveWeeklyLimit: forceSubscriptionAfter && subscriptionStatus === 'free' ? forceSubscriptionAfter : 15,
      isActive
    })
    
    // If subscriptions are disabled, allow unlimited access
    if (subscriptionsDisabled) {
      return {
        canCreateResume: true,
        weeklyCount,
        weeklyLimit: 999,
        monthlyCount,
        monthlyLimit: 999,
        subscriptionStatus,
        needsUpgrade: false,
        upgradeToTier: null,
        upgradePrice: 0,
        stripePriceId: null
      }
    }
    
    // If force subscription is set, override free tier limit
    let effectiveWeeklyLimit = 15
    if (forceSubscriptionAfter !== null && subscriptionStatus === 'free') {
      effectiveWeeklyLimit = forceSubscriptionAfter
    }
    
    // Determine limits based on subscription tier
    let weeklyLimit, monthlyLimit, canCreateResume, needsUpgrade, upgradeToTier, upgradePrice, stripePriceId
    
    switch (subscriptionStatus) {
      case 'free':
        weeklyLimit = effectiveWeeklyLimit
        monthlyLimit = 999 // Not applicable for free tier
        canCreateResume = weeklyCount < weeklyLimit
        needsUpgrade = !canCreateResume
        upgradeToTier = 'starter'
        upgradePrice = 25
        stripePriceId = process.env.STRIPE_STARTER_PRICE_ID! // Starter plan
        break
        
      case 'starter':
        if (!isActive) {
          // Expired starter subscription - treat as free
          weeklyLimit = 999
          monthlyLimit = effectiveMonthlyLimit
          canCreateResume = monthlyCount < monthlyLimit
          needsUpgrade = !canCreateResume
          upgradeToTier = 'starter'
          upgradePrice = 25
          stripePriceId = process.env.STRIPE_STARTER_PRICE_ID! // Starter plan
        } else {
          weeklyLimit = 999 // No weekly limit for starter
          monthlyLimit = 100
          canCreateResume = monthlyCount < monthlyLimit
          needsUpgrade = !canCreateResume
          upgradeToTier = 'unlimited'
          upgradePrice = 250
          stripePriceId = process.env.STRIPE_UNLIMITED_PRICE_ID! // Unlimited plan
        }
        break
        
      case 'unlimited':
        if (!isActive) {
          // Expired unlimited subscription - treat as free
          weeklyLimit = effectiveWeeklyLimit
          monthlyLimit = 999
          canCreateResume = weeklyCount < weeklyLimit
          needsUpgrade = !canCreateResume
          upgradeToTier = 'starter'
          upgradePrice = 25
          stripePriceId = process.env.STRIPE_STARTER_PRICE_ID! // Starter plan
        } else {
          weeklyLimit = 999
          monthlyLimit = 999
          canCreateResume = true
          needsUpgrade = false
          upgradeToTier = null
          upgradePrice = 0
          stripePriceId = null
        }
        break
        
      default:
        // Canceled or unknown - treat as free
        weeklyLimit = 999
        monthlyLimit = effectiveMonthlyLimit
        canCreateResume = monthlyCount < monthlyLimit
        needsUpgrade = !canCreateResume
        upgradeToTier = 'starter'
        upgradePrice = 25
        stripePriceId = process.env.STRIPE_STARTER_PRICE_ID! // Starter plan
    }

    console.log('🔒 Final subscription decision:', {
      weeklyCount,
      weeklyLimit,
      canCreateResume,
      needsUpgrade,
      subscriptionStatus
    })

    if (canCreateResume) {
      // Increment the counts and update dates
      const updateFields: any = {
        lastResumeDate: today,
        updatedAt: new Date()
      }
      
      // Update weekly count for free users or if it's a new week
      if (subscriptionStatus === 'free' || startOfWeek > lastWeeklyReset) {
        updateFields.weeklyResumeCount = weeklyCount + 1
        updateFields.lastWeeklyReset = startOfWeek
      }
      
      // Update monthly count for starter users or if it's a new month
      if (subscriptionStatus === 'starter' || thisMonth !== lastMonthString) {
        updateFields.monthlyResumeCount = monthlyCount + 1
        updateFields.lastMonthlyReset = today
      }
      
      await db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        { $set: updateFields }
      )
      
      weeklyCount += 1
      monthlyCount += 1
    }

    return {
      canCreateResume,
      weeklyCount,
      weeklyLimit,
      monthlyCount,
      monthlyLimit,
      subscriptionStatus,
      needsUpgrade,
      upgradeToTier,
      upgradePrice,
      stripePriceId
    }
  }

  // Get current subscription status without incrementing count
  static async getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    const db = await this.getDatabase()
    
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) })
    
    if (!user) {
      throw new Error('User not found')
    }

    const today = new Date()
    
    // Calculate start of current month
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    
    // Count actual resume generations from database this month
    const monthlyCount = await db.collection('resumes').countDocuments({
      userId: new ObjectId(userId),
      createdAt: { $gte: startOfMonth }
    })

    const subscriptionStatus = user.subscriptionStatus || 'free'
    const isActive = !user.subscriptionExpires || new Date(user.subscriptionExpires) > today
    
    // Check if subscriptions are disabled via env variable
    const subscriptionsDisabled = process.env.DISABLE_SUBSCRIPTIONS === 'true'
    const forceSubscriptionAfter = process.env.FORCE_SUBSCRIPTION_AFTER ? parseInt(process.env.FORCE_SUBSCRIPTION_AFTER) : null
    
    console.log('🔒 getSubscriptionStatus env check:', {
      userId,
      subscriptionsDisabled,
      forceSubscriptionAfter,
      subscriptionStatus,
      monthlyCount,
      FORCE_SUBSCRIPTION_AFTER_RAW: process.env.FORCE_SUBSCRIPTION_AFTER
    })
    
    // If subscriptions are disabled, allow unlimited access
    if (subscriptionsDisabled) {
      return {
        canCreateResume: true,
        weeklyCount,
        weeklyLimit: 999,
        monthlyCount,
        monthlyLimit: 999,
        subscriptionStatus,
        needsUpgrade: false,
        upgradeToTier: null,
        upgradePrice: 0,
        stripePriceId: null
      }
    }
    
    // If force subscription is set, override free tier limit
    let effectiveMonthlyLimit = 10
    if (forceSubscriptionAfter !== null && subscriptionStatus === 'free') {
      effectiveMonthlyLimit = forceSubscriptionAfter
    }
    
    console.log('🔒 Monthly limit calculation:', {
      effectiveMonthlyLimit,
      forceSubscriptionAfter,
      subscriptionStatus,
      monthlyCount
    })
    
    // Determine limits based on subscription tier
    let weeklyLimit, monthlyLimit, canCreateResume, needsUpgrade, upgradeToTier, upgradePrice, stripePriceId
    
    switch (subscriptionStatus) {
      case 'free':
        weeklyLimit = 999 // No weekly limit for free users
        monthlyLimit = effectiveMonthlyLimit
        canCreateResume = monthlyCount < monthlyLimit
        needsUpgrade = !canCreateResume
        upgradeToTier = 'starter'
        upgradePrice = 25
        stripePriceId = process.env.STRIPE_STARTER_PRICE_ID!
        break
        
      case 'starter':
        if (!isActive) {
          // Expired starter subscription - treat as free
          weeklyLimit = 999
          monthlyLimit = effectiveMonthlyLimit
          canCreateResume = monthlyCount < monthlyLimit
          needsUpgrade = !canCreateResume
          upgradeToTier = 'starter'
          upgradePrice = 25
          stripePriceId = process.env.STRIPE_STARTER_PRICE_ID!
        } else {
          weeklyLimit = 999 // No weekly limit for starter
          monthlyLimit = 100
          canCreateResume = monthlyCount < monthlyLimit
          needsUpgrade = !canCreateResume
          upgradeToTier = 'unlimited'
          upgradePrice = 250
          stripePriceId = process.env.STRIPE_UNLIMITED_PRICE_ID!
        }
        break
        
      case 'unlimited':
        if (!isActive) {
          // Expired unlimited subscription - treat as free
          weeklyLimit = effectiveWeeklyLimit
          monthlyLimit = 999
          canCreateResume = weeklyCount < weeklyLimit
          needsUpgrade = !canCreateResume
          upgradeToTier = 'starter'
          upgradePrice = 25
          stripePriceId = process.env.STRIPE_STARTER_PRICE_ID!
        } else {
          weeklyLimit = 999
          monthlyLimit = 999
          canCreateResume = true
          needsUpgrade = false
          upgradeToTier = null
          upgradePrice = 0
          stripePriceId = null
        }
        break
        
      default:
        // Canceled or unknown - treat as free
        weeklyLimit = 999
        monthlyLimit = effectiveMonthlyLimit
        canCreateResume = monthlyCount < monthlyLimit
        needsUpgrade = !canCreateResume
        upgradeToTier = 'starter'
        upgradePrice = 25
        stripePriceId = process.env.STRIPE_STARTER_PRICE_ID!
    }

    return {
      canCreateResume,
      weeklyCount,
      weeklyLimit,
      monthlyCount,
      monthlyLimit,
      subscriptionStatus,
      needsUpgrade,
      upgradeToTier,
      upgradePrice,
      stripePriceId
    }
  }

  // Get current usage without incrementing
  static async getDailyUsage(userId: string): Promise<SubscriptionStatus> {
    const db = await this.getDatabase()
    
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) })
    
    if (!user) {
      throw new Error('User not found')
    }

    const today = new Date()
    const todayString = today.toISOString().split('T')[0] // YYYY-MM-DD
    const lastResumeDate = user.lastResumeDate ? new Date(user.lastResumeDate) : new Date('1970-01-01')
    const lastResumeDateString = lastResumeDate.toISOString().split('T')[0]

    let dailyCount = user.dailyResumeCount || 0
    
    // Reset count if it's a new day
    if (todayString !== lastResumeDateString) {
      dailyCount = 0
    }

    const subscriptionStatus = user.subscriptionStatus || 'free'
    const isSubscribed = subscriptionStatus === 'premium' && 
      (!user.subscriptionExpires || new Date(user.subscriptionExpires) > today)
    
    const dailyLimit = isSubscribed ? 999 : 10 // Effectively unlimited for premium users
    const canCreateResume = dailyCount < dailyLimit

    return {
      canCreateResume,
      dailyCount,
      dailyLimit,
      subscriptionStatus,
      isSubscribed
    }
  }

  // Update user's subscription status (for when they subscribe)
  static async updateSubscription(
    userId: string, 
    subscriptionId: string, 
    subscriptionStatus: 'premium' | 'canceled',
    subscriptionExpires?: Date
  ): Promise<void> {
    const db = await this.getDatabase()
    
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          subscriptionStatus,
          subscriptionId,
          subscriptionExpires,
          updatedAt: new Date()
        }
      }
    )
  }

  // Get all subscription stats for admin
  static async getSubscriptionStats() {
    const db = await this.getDatabase()
    
    const stats = await db.collection('users').aggregate([
      {
        $group: {
          _id: '$subscriptionStatus',
          count: { $sum: 1 }
        }
      }
    ]).toArray()

    const result = {
      free: 0,
      premium: 0,
      canceled: 0
    }

    stats.forEach(stat => {
      if (result.hasOwnProperty(stat._id)) {
        result[stat._id as keyof typeof result] = stat.count
      }
    })

    // Get today's resume generation attempts
    const today = new Date()
    const todayString = today.toISOString().split('T')[0]
    
    const todayUsage = await db.collection('users').aggregate([
      {
        $match: {
          lastResumeDate: {
            $gte: new Date(todayString),
            $lt: new Date(todayString + 'T23:59:59.999Z')
          }
        }
      },
      {
        $group: {
          _id: null,
          totalResumesToday: { $sum: '$dailyResumeCount' },
          activeUsersToday: { $sum: 1 }
        }
      }
    ]).toArray()

    return {
      ...result,
      totalResumesToday: todayUsage[0]?.totalResumesToday || 0,
      activeUsersToday: todayUsage[0]?.activeUsersToday || 0
    }
  }
}