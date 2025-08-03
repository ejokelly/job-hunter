import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { userId, email, name } = await request.json();

    const sessionToken = randomUUID();
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const { MongoClient, ObjectId } = await import('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    const db = client.db();

    // Insert session into MongoDB sessions collection
    await db.collection('sessions').insertOne({
      sessionToken,
      userId: new ObjectId(userId),
      expires
    });

    await client.close();

    // Set the session token cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set('session-token', sessionToken, {
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    console.log('🔥 Database session created:', sessionToken);
    return response;

  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}