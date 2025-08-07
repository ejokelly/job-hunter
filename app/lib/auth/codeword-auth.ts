import { MongoClient, ObjectId } from 'mongodb'
import * as postmark from 'postmark'
import crypto from 'crypto'

const client = new MongoClient(process.env.MONGODB_URI!)
const clientPromise = client.connect()

// Word lists for generating codewords (~5,000 combinations)
const adjectives = [
  'happy', 'bright', 'swift', 'calm', 'bold', 'wise', 'kind', 'brave', 'cool', 'warm',
  'quick', 'smart', 'neat', 'clean', 'fresh', 'sharp', 'smooth', 'clear', 'light', 'dark',
  'soft', 'hard', 'sweet', 'sour', 'loud', 'quiet', 'fast', 'slow', 'big', 'small',
  'tall', 'short', 'wide', 'thin', 'thick', 'deep', 'shallow', 'high', 'low', 'strong',
  'gentle', 'rough', 'smooth', 'bumpy', 'flat', 'round', 'square', 'narrow', 'broad', 'tiny',
  'huge', 'massive', 'mini', 'giant', 'micro', 'vast', 'slim', 'wide', 'dense', 'loose',
  'tight', 'free', 'busy', 'idle', 'active', 'lazy', 'eager', 'tired', 'alert', 'sleepy'
]

const nouns = [
  'tiger', 'eagle', 'river', 'mountain', 'forest', 'ocean', 'storm', 'flower', 'cloud', 'star',
  'moon', 'sun', 'wind', 'fire', 'water', 'earth', 'tree', 'bird', 'fish', 'rock',
  'wave', 'sand', 'snow', 'rain', 'lightning', 'thunder', 'rainbow', 'meadow', 'valley', 'peak',
  'lake', 'pond', 'stream', 'creek', 'beach', 'shore', 'cliff', 'cave', 'hill', 'field',
  'garden', 'park', 'bridge', 'path', 'road', 'trail', 'gate', 'door', 'window', 'roof',
  'wall', 'floor', 'chair', 'table', 'book', 'pen', 'cup', 'plate', 'spoon', 'fork',
  'knife', 'bowl', 'glass', 'bottle', 'box', 'bag', 'hat', 'coat', 'shoe', 'sock',
  'shirt', 'pants', 'dress', 'belt', 'watch', 'ring', 'key', 'coin', 'card', 'phone'
]

function generateCodeword(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  return `${adjective}-${noun}`
}

export interface User {
  _id?: ObjectId
  id: string
  email: string
  name?: string
  emailVerified: boolean
  subscriptionStatus: 'free' | 'starter' | 'unlimited' | 'canceled'
  subscriptionId?: string
  subscriptionExpires?: Date
  weeklyResumeCount: number
  monthlyResumeCount: number
  lastResumeDate: Date
  lastWeeklyReset: Date
  lastMonthlyReset: Date
  createdAt: Date
  updatedAt: Date
}

export interface AuthCode {
  _id?: ObjectId
  email: string
  code: string
  expires: Date
  used: boolean
  createdAt: Date
}

export class CodewordAuth {
  private static async getDatabase() {
    const connection = await clientPromise
    const db = connection.db()
    
    // Ensure unique index on email field - prevents duplicate emails at database level
    try {
      await db.collection('users').createIndex({ email: 1 }, { unique: true });
    } catch (error) {
      // Index might already exist, that's fine
      console.log('Email unique index already exists or failed to create:', error);
    }
    
    return db
  }

  static async sendCodeword(email: string) {
    const db = await this.getDatabase()
    
    // Normalize email
    const normalizedEmail = email.toLowerCase().trim().replace(/\s+/g, '');
    
    // Generate codeword and set 10-minute expiration
    const code = generateCodeword()
    const expires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    
    console.log('💾 Storing codeword:', { email: normalizedEmail, code, expires })
    
    // Store code in database
    await db.collection('auth_codes').insertOne({
      email: normalizedEmail,
      code,
      expires,
      used: false,
      createdAt: new Date()
    })
    
    // Send email with codeword
    const postmarkClient = new postmark.ServerClient(process.env.POSTMARK_API_KEY!)
    
    await postmarkClient.sendEmail({
      From: process.env.EMAIL_FROM!,
      To: email,
      Subject: 'Your sign-in code for resume❤️',
      HtmlBody: `
        <h2>Your sign-in code</h2>
        <p>Enter this code to sign in to resume❤️:</p>
        <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center;">
          <h1 style="font-size: 32px; letter-spacing: 2px; margin: 0; color: #333;">${code}</h1>
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this code, you can safely ignore this email.</p>
      `,
      TextBody: `Your sign-in code for resume❤️: ${code}\\n\\nThis code will expire in 10 minutes.\\n\\nIf you didn't request this code, you can safely ignore this email.`,
      MessageStream: "outbound"
    })
    
    return { success: true, code } // Return code for development/testing
  }

  private static async findOrCreateUser(email: string, name: string) {
    const db = await this.getDatabase()
    
    // Normalize email to prevent duplicates from slight variations
    const normalizedEmail = email.toLowerCase().trim().replace(/\s+/g, '');
    
    // Use findOneAndUpdate with upsert to prevent duplicate creation
    const result = await db.collection('users').findOneAndUpdate(
      { email: normalizedEmail }, // Find by normalized email
      {
        $setOnInsert: {
          email: normalizedEmail,
          name,
          emailVerified: null,
          createdAt: new Date(),
        },
        $set: {
          updatedAt: new Date()
        }
      },
      { 
        upsert: true, 
        returnDocument: 'after' 
      }
    )
    
    return result
  }

  static async createSession(userId: any) {
    const db = await this.getDatabase()
    
    // Create session
    const sessionToken = crypto.randomBytes(32).toString('hex')
    const sessionExpires = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
    
    await db.collection('sessions').insertOne({
      sessionToken,
      userId,
      expires: sessionExpires,
      createdAt: new Date()
    })
    
    return { sessionToken, expires: sessionExpires }
  }

  static async verifyCode(email: string, code: string) {
    const db = await this.getDatabase()
    
    console.log('🔍 Verifying code:', { email, code })
    
    // Find and mark code as used (atomic operation)
    const authCode = await db.collection('auth_codes').findOneAndUpdate(
      {
        email,
        code: code.toLowerCase(), // Case insensitive
        expires: { $gt: new Date() },
        used: false
      },
      {
        $set: { 
          used: true,
          usedAt: new Date()
        }
      },
      {
        returnDocument: 'after'
      }
    )
    
    if (!authCode) {
      console.log('❌ Invalid or expired code')
      throw new Error('Invalid or expired code')
    }
    
    console.log('✅ Code verified successfully')
    
    // Extract name from email for new users
    const nameFromEmail = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    
    // Find or create user (with additional fields for verifyCode)
    let user = await db.collection('users').findOne({ email })
    
    if (!user) {
      const result = await db.collection('users').insertOne({
        email,
        name: nameFromEmail,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      
      user = {
        _id: result.insertedId,
        email,
        name: nameFromEmail,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    } else {
      // Update email verified status
      await db.collection('users').updateOne(
        { _id: user!._id },
        { 
          $set: { 
            emailVerified: true,
            updatedAt: new Date()
          }
        }
      )
    }
    
    // Create session
    const { sessionToken, expires: sessionExpires } = await this.createSession(user!._id)
    
    return {
      user: {
        id: user!._id.toString(),
        email: user!.email,
        emailVerified: user!.emailVerified
      },
      sessionToken,
      expires: sessionExpires
    }
  }

  static async signIn(email: string, name: string) {
    // Find or create user
    const user = await this.findOrCreateUser(email, name)
    
    // Create session
    const { sessionToken, expires: sessionExpires } = await this.createSession(user!._id)
    
    return {
      user: {
        id: user!._id.toString(),
        email: user!.email,
        name: user!.name,
        emailVerified: user!.emailVerified
      },
      sessionToken,
      expires: sessionExpires
    }
  }

  static async getSession(sessionToken: string) {
    if (!sessionToken) return null
    
    const db = await this.getDatabase()
    
    const session = await db.collection('sessions').findOne({
      sessionToken,
      expires: { $gt: new Date() }
    })
    
    if (!session) return null
    
    const user = await db.collection('users').findOne({ _id: new ObjectId(session.userId) })
    
    if (!user) return null
    
    return {
      user: {
        id: user!._id.toString(),
        email: user!.email,
        emailVerified: user!.emailVerified
      },
      expires: session.expires
    }
  }

  static async signOut(sessionToken: string) {
    const db = await this.getDatabase()
    
    await db.collection('sessions').deleteOne({ sessionToken })
    
    return { success: true }
  }
}