import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import Resume from '@/lib/db/models/Resume';
import dbConnect from '@/lib/db/mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resumeId: string }> }
) {
  try {
    const { resumeId } = await params;
    
    if (!resumeId) {
      return NextResponse.json(
        { error: 'Resume ID is required' },
        { status: 400 }
      );
    }

    // Connect to database
    await dbConnect();
    const client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    const db = client.db();

    // Find the resume to get the userId
    const resume = await Resume.findById(resumeId);
    
    if (!resume) {
      await client.close();
      return NextResponse.json(
        { error: 'Resume not found' },
        { status: 404 }
      );
    }

    // Find the user and check verification status
    const { ObjectId } = await import('mongodb');
    const user = await db.collection('users').findOne({ 
      _id: new ObjectId(resume.userId)
    });

    await client.close();

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      emailVerified: !!user.emailVerified
    });

  } catch (error) {
    console.error('Check verification by resume error:', error);
    return NextResponse.json(
      { error: 'Failed to check verification status' },
      { status: 500 }
    );
  }
}