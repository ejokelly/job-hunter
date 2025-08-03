import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-utils';

export async function POST(request: NextRequest) {
  try {
    const { userId, email, name } = await request.json();

    // Since we use MongoDB adapter, create database session instead of JWT
    const { MongoClient } = await import('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    const db = client.db();

    // Create session token
    const sessionToken = crypto.randomUUID();
    const sessionExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Insert session into database
    await db.collection('sessions').insertOne({
      sessionToken,
      userId: new (await import('mongodb')).ObjectId(userId),
      expires: sessionExpires
    });

    await client.close();

    // Create response and set session token cookie
    const response = NextResponse.json({ success: true });
    
    // Set the session token cookie (not JWT for database sessions)
    response.cookies.set('next-auth.session-token', sessionToken, {
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
      sameSite: 'lax',
      secure: false, // for localhost
      httpOnly: false // Allow client-side access for debugging
    });

    console.log('🔥 Database session created with token:', sessionToken);

    return response;

  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}