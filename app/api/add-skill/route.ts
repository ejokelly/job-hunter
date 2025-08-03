import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth/server-auth';
import dbConnect from '@/lib/db/mongodb';
import Resume from '@/lib/db/models/Resume';

export async function POST(request: NextRequest) {
  try {
    const { skill } = await request.json();

    if (!skill || typeof skill !== 'string') {
      return NextResponse.json({ error: 'Valid skill name is required' }, { status: 400 });
    }

    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await dbConnect();

    // Find user's resume
    const resume = await Resume.findOne({ userId: session.user.id }).sort({ updatedAt: -1 });
    if (!resume) {
      return NextResponse.json({ error: 'No resume found' }, { status: 404 });
    }

    // Check if skill already exists in main skills or pending skills
    const skillLower = skill.toLowerCase();
    
    const existsInMainSkills = Object.values(resume.skills || {}).some((category: any) =>
      Array.isArray(category) && category.some((existingSkill: any) => 
        existingSkill.name.toLowerCase() === skillLower
      )
    );
    
    const existsInPending = resume.pendingSkills?.some((existingSkill: any) => 
      existingSkill.name.toLowerCase() === skillLower
    );

    if (existsInMainSkills || existsInPending) {
      return NextResponse.json({ message: 'Skill already exists' });
    }

    // Add skill to pending skills - will be categorized during resume generation
    if (!resume.pendingSkills) {
      resume.pendingSkills = [];
    }

    resume.pendingSkills.push({
      name: skill,
      years: 2
    });

    // Mark the pendingSkills field as modified and save
    resume.markModified('pendingSkills');
    await resume.save();

    return NextResponse.json({ 
      message: 'Skill added to pending list - will be categorized during resume generation',
      skill: skill
    });

  } catch (error) {
    console.error('Error adding skill:', error);
    return NextResponse.json({ error: 'Failed to add skill' }, { status: 500 });
  }
}