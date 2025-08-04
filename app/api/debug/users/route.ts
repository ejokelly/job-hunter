import { NextRequest, NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'

const client = new MongoClient(process.env.MONGODB_URI!)
const clientPromise = client.connect()

export async function GET(request: NextRequest) {
  try {
    const db = (await clientPromise).db()
    
    // Get all users with their subscription info
    const users = await db.collection('users')
      .find({}, { 
        projection: { 
          email: 1, 
          subscriptionStatus: 1, 
          subscriptionExpires: 1,
          subscriptionId: 1,
          stripeSubscriptionId: 1,
          createdAt: 1
        } 
      })
      .limit(10)
      .toArray()
    
    console.log('👥 All users in database:', users)
    
    // Get subscription counts
    const totalUsers = await db.collection('users').countDocuments({})
    const freeUsers = await db.collection('users').countDocuments({ subscriptionStatus: 'free' })
    const starterUsers = await db.collection('users').countDocuments({ subscriptionStatus: 'starter' })
    const unlimitedUsers = await db.collection('users').countDocuments({ subscriptionStatus: 'unlimited' })
    const nullStatus = await db.collection('users').countDocuments({ subscriptionStatus: null })
    const undefinedStatus = await db.collection('users').countDocuments({ subscriptionStatus: { $exists: false } })
    
    const stats = {
      totalUsers,
      freeUsers,
      starterUsers,
      unlimitedUsers,
      nullStatus,
      undefinedStatus,
      users: users.map(u => ({
        ...u,
        _id: u._id.toString()
      }))
    }
    
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to get users' }, { status: 500 })
  }
}