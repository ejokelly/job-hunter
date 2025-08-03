import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const { email, token } = await request.json();

    if (!email || !token) {
      return NextResponse.json(
        { error: 'Email and token are required' },
        { status: 400 }
      );
    }

    // Connect to database
    const client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    const db = client.db();

    // Find and verify the token
    const verificationToken = await db.collection('verification_tokens').findOne({
      identifier: email,
      token,
      expires: { $gt: new Date() }
    });

    if (!verificationToken) {
      await client.close();
      return NextResponse.json(
        { error: 'Invalid or expired verification link' },
        { status: 400 }
      );
    }

    // Find the user
    const user = await db.collection('users').findOne({ email });

    if (!user) {
      await client.close();
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Mark email as verified and clean up the token
    await db.collection('users').updateOne(
      { email },
      { 
        $set: { 
          emailVerified: new Date(),
          updatedAt: new Date()
        }
      }
    );

    await db.collection('verification_tokens').deleteOne({
      identifier: email,
      token
    });

    await client.close();

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully'
    });

  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify email' },
      { status: 500 }
    );
  }
}