import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth/auth-utils';
import dbConnect from '@/lib/db/mongodb';
import Resume from '@/lib/db/models/Resume';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { agreedAt } = await request.json();

    if (!agreedAt) {
      return NextResponse.json({ error: 'Agreement timestamp is required' }, { status: 400 });
    }

    await dbConnect();
    const { ObjectId } = await import('mongodb');
    const userObjectId = new ObjectId(session.user.id);
    
    // Find user's resume
    const resume = await Resume.findOne({ userId: userObjectId });
    
    if (!resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    // Only update if not already agreed
    if (!resume.termsAgreedAt) {
      resume.termsAgreedAt = new Date(agreedAt);
      await resume.save();
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error saving terms agreement:', error);
    return NextResponse.json({ error: 'Failed to save terms agreement' }, { status: 500 });
  }
}