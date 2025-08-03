import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth/auth-utils';
import dbConnect from '@/lib/db/mongodb';
import Resume from '@/lib/db/models/Resume';

export async function GET() {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await dbConnect();
    const { ObjectId } = await import('mongodb');
    const userObjectId = new ObjectId(session.user.id);
    
    const resume = await Resume.findOne({ userId: userObjectId }).sort({ updatedAt: -1 });
    
    if (!resume) {
      return NextResponse.json({ error: 'No resume found' }, { status: 404 });
    }

    return NextResponse.json({ resumeId: resume._id.toString() });

  } catch (error) {
    console.error('Error getting user resume ID:', error);
    return NextResponse.json({ error: 'Failed to get resume ID' }, { status: 500 });
  }
}