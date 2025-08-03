import { MongoClient, ObjectId } from 'mongodb'
import * as postmark from 'postmark'
import crypto from 'crypto'

const client = new MongoClient(process.env.MONGODB_URI!)
const clientPromise = client.connect()

// Simple in-memory cache to prevent duplicate token processing
const processingTokens = new Set<string>()

export interface User {
  _id?: ObjectId
  id: string
  email: string
  name?: string
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
}

export interface AuthToken {
  _id?: ObjectId
  email: string
  token: string
  expires: Date
  used: boolean
}

export class SimpleAuth {
  private static async getDatabase() {
    const connection = await clientPromise
    return connection.db()
  }

  static async sendMagicLink(email: string, callbackUrl: string = '/') {
    const db = await this.getDatabase()
    
    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    
    // Store token in database
    console.log('💾 Storing token in database:', { 
      email, 
      token: token.substring(0, 10) + '...', 
      expires, 
      expiresIn: `${Math.round((expires.getTime() - Date.now()) / 1000 / 60)} minutes`
    })
    await db.collection('auth_tokens').insertOne({
      email,
      token,
      expires,
      used: false
    })
    
    // Create magic link that goes to homepage with token parameters
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const magicLink = `${baseUrl}/?token=${token}&email=${encodeURIComponent(email)}`
    
    // Send email
    const postmarkClient = new postmark.ServerClient(process.env.POSTMARK_API_KEY!)
    
    await postmarkClient.sendEmail({
      From: process.env.EMAIL_FROM!,
      To: email,
      Subject: 'Sign in to resume❤️',
      HtmlBody: `
        <h2>Sign in to resume❤️</h2>
        <p>Click the link below to sign in:</p>
        <p><a href="${magicLink}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Sign In</a></p>
        <p>If you didn't request this email, you can safely ignore it.</p>
      `,
      TextBody: `Sign in to resume❤️\n\nClick this link to sign in: ${magicLink}\n\nIf you didn't request this email, you can safely ignore it.`,
      MessageStream: "outbound"
    })
    
    return { success: true }
  }

  static async verifyToken(token: string, email: string) {
    // Check if this token is already being processed
    const tokenKey = `${token}:${email}`
    console.log('🔄 Processing token check:', { tokenKey: tokenKey.substring(0, 20) + '...', isProcessing: processingTokens.has(tokenKey), setSize: processingTokens.size })
    
    if (processingTokens.has(tokenKey)) {
      console.log('🔄 Token is already being processed, rejecting duplicate request')
      throw new Error('Token verification already in progress')
    }
    
    // Mark token as being processed
    processingTokens.add(tokenKey)
    console.log('🔄 Token marked as processing, set size now:', processingTokens.size)
    
    try {
      const db = await this.getDatabase()
      
      // First, let's see what's in the database
      const tokenCount = await db.collection('auth_tokens').countDocuments()
      console.log('🔍 Total tokens in database:', tokenCount)
      
      // Find and mark token as used
      console.log('🔍 Looking for token:', { token: token.substring(0, 10) + '...', email, currentTime: new Date() })
    
    // Use findOneAndUpdate with returnDocument: 'after' to get the updated document
    // This is atomic and will only succeed once per token
    let authToken = await db.collection('auth_tokens').findOneAndUpdate(
      {
        token,
        email,
        expires: { $gt: new Date() },
        used: false
      },
      {
        $set: { 
          used: true,
          updatedAt: new Date()
        }
      },
      {
        returnDocument: 'after'  // Return the updated document
      }
    )
    
    console.log('🔍 FindOneAndUpdate result:', { 
      found: !!authToken, 
      hasValue: !!authToken?.value,
      fullResult: authToken,
      resultKeys: authToken ? Object.keys(authToken) : null
    })
    
    console.log('🔍 Token lookup result:', { found: !!authToken, hasValue: !!authToken?.value })
    
    // Check if the result is the document itself or wrapped in a value property
    const tokenDocument = authToken?.value || authToken
    
    if (!authToken || (!authToken.value && !authToken._id)) {
      // Let's also check what tokens exist for this email
      const allTokens = await db.collection('auth_tokens').find({ email }).toArray()
      console.log('🔍 All tokens for email:', allTokens.map(t => ({
        token: t.token.substring(0, 10) + '...',
        expires: t.expires,
        used: t.used,
        expired: t.expires < new Date()
      })))
      throw new Error('Invalid or expired token')
    }
    
    // Find or create user using the correct token document
    let user = await db.collection('users').findOne({ email })
    
    if (!user) {
      const result = await db.collection('users').insertOne({
        email,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      
      user = {
        _id: result.insertedId,
        email,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    } else {
      // Update email verified status
      await db.collection('users').updateOne(
        { _id: user._id },
        { 
          $set: { 
            emailVerified: true,
            updatedAt: new Date()
          }
        }
      )
    }
    
    // Create session token
    const sessionToken = crypto.randomBytes(32).toString('hex')
    const sessionExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    
    await db.collection('sessions').insertOne({
      sessionToken,
      userId: user._id,
      expires: sessionExpires
    })
    
      return {
        user: {
          id: user._id.toString(),
          email: user.email,
          emailVerified: user.emailVerified
        },
        sessionToken
      }
    } finally {
      // Remove from processing set
      processingTokens.delete(tokenKey)
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
        id: user._id.toString(),
        email: user.email,
        emailVerified: user.emailVerified
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