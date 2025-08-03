import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Resume from '@/lib/db/models/Resume';
import { getServerAuthSession } from '@/lib/auth/auth-utils';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST() {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    await dbConnect();

    const userResumeCount = await Resume.countDocuments({ userId: session.user.id });
    
    if (userResumeCount > 0) {
      return NextResponse.json({
        message: 'User already has resumes',
        resumeCount: userResumeCount
      });
    }

    const dataPath = path.join(process.cwd(), 'data.json');
    const fileContents = await fs.readFile(dataPath, 'utf8');
    const resumeData = JSON.parse(fileContents);

    const resume = new Resume({ ...resumeData, userId: session.user.id });
    await resume.save();

    return NextResponse.json({
      message: 'User initialized with default resume',
      resumeId: resume._id
    }, { status: 201 });

  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize user' },
      { status: 500 }
    );
  }
}