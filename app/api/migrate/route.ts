import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Resume from '@/lib/db/models/Resume';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST() {
  try {
    await dbConnect();

    const dataPath = path.join(process.cwd(), 'data.json');
    const fileContents = await fs.readFile(dataPath, 'utf8');
    const resumeData = JSON.parse(fileContents);

    const existingResume = await Resume.findOne({
      'personalInfo.email': resumeData.personalInfo.email
    });

    if (existingResume) {
      return NextResponse.json({
        message: 'Resume already exists',
        resumeId: existingResume._id
      });
    }

    const resume = new Resume(resumeData);
    await resume.save();

    return NextResponse.json({
      message: 'Data migrated successfully',
      resumeId: resume._id
    }, { status: 201 });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Failed to migrate data' },
      { status: 500 }
    );
  }
}