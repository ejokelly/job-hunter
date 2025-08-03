import { getServerSession } from 'next-auth'
import { NextAuthOptions } from 'next-auth'
import EmailProvider from 'next-auth/providers/email'
import { MongoClient } from 'mongodb'
import * as postmark from 'postmark'

const client = new MongoClient(process.env.MONGODB_URI!)
const clientPromise = client.connect()

// Simple MongoDB adapter without external dependencies
export const mongoAdapter = {
  async createUser(user: any) {
    const db = (await clientPromise).db()
    const result = await db.collection('users').insertOne({
      ...user,
      emailVerified: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    return { ...user, id: result.insertedId.toString() }
  },
  
  async getUser(id: string) {
    const db = (await clientPromise).db()
    const user = await db.collection('users').findOne({ _id: id })
    if (!user) return null
    return { ...user, id: user._id.toString() }
  },
  
  async getUserByEmail(email: string) {
    const db = (await clientPromise).db()
    const user = await db.collection('users').findOne({ email })
    if (!user) return null
    return { ...user, id: user._id.toString() }
  },
  
  async updateUser(user: any) {
    const db = (await clientPromise).db()
    await db.collection('users').updateOne(
      { _id: user.id },
      { 
        $set: { 
          ...user, 
          updatedAt: new Date() 
        } 
      }
    )
    return { ...user, id: user.id }
  },
  
  async createVerificationToken(token: any) {
    const db = (await clientPromise).db()
    await db.collection('verification_tokens').insertOne(token)
    return token
  },
  
  async useVerificationToken({ identifier, token }: any) {
    const db = (await clientPromise).db()
    const result = await db.collection('verification_tokens').findOneAndDelete({
      identifier,
      token,
      expires: { $gt: new Date() } // Only return non-expired tokens
    })
    if (!result.value) {
      console.log('Token not found or expired:', { identifier, token });
      return null;
    }
    return result.value
  },

  async getSessionAndUser(sessionToken: string) {
    const db = (await clientPromise).db()
    const session = await db.collection('sessions').findOne({ sessionToken })
    if (!session) return null
    
    const user = await db.collection('users').findOne({ _id: session.userId })
    if (!user) return null
    
    return {
      session: { ...session, id: session._id.toString() },
      user: { ...user, id: user._id.toString() }
    }
  },

  async createSession(session: any) {
    const db = (await clientPromise).db()
    const result = await db.collection('sessions').insertOne(session)
    return { ...session, id: result.insertedId.toString() }
  },

  async updateSession(session: any) {
    const db = (await clientPromise).db()
    await db.collection('sessions').updateOne(
      { sessionToken: session.sessionToken },
      { $set: session }
    )
    return session
  },

  async deleteSession(sessionToken: string) {
    const db = (await clientPromise).db()
    const result = await db.collection('sessions').findOneAndDelete({ sessionToken })
    return result.value
  },
}

export const authOptions: NextAuthOptions = {
  adapter: mongoAdapter as any,
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    EmailProvider({
      async sendVerificationRequest({ identifier: email, url, provider }) {
        const client = new postmark.ServerClient(process.env.POSTMARK_API_KEY!)
        
        await client.sendEmail({
          From: process.env.EMAIL_FROM!,
          To: email,
          Subject: 'Sign in to resume❤️',
          HtmlBody: `
            <h2>Sign in to resume❤️</h2>
            <p>Click the link below to sign in:</p>
            <p><a href="${url}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Sign In</a></p>
            <p>If you didn't request this email, you can safely ignore it.</p>
          `,
          TextBody: `Sign in to resume❤️\n\nClick this link to sign in: ${url}\n\nIf you didn't request this email, you can safely ignore it.`,
          MessageStream: "outbound"
        })
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session?.user) {
        session.user.id = user.id
      }
      return session
    },
  },
  events: {
    async createUser({ user }) {
      console.log('New user created:', user.email)
    },
  },
}

export async function getServerAuthSession() {
  return await getServerSession(authOptions)
}