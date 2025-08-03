import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth/auth-utils';
import { MongoClient } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Connect to database
    const client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    const db = client.db();

    // Find the user and check verification status
    const user = await db.collection('users').findOne({ 
      email: session.user.email 
    });

    await client.close();

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('User emailVerified field:', user.emailVerified);
    
    return NextResponse.json({
      emailVerified: !!user.emailVerified,
      rawEmailVerified: user.emailVerified
    });

  } catch (error) {
    console.error('Check verification error:', error);
    return NextResponse.json(
      { error: 'Failed to check verification status' },
      { status: 500 }
    );
  }
}