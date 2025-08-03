import { NextRequest, NextResponse } from 'next/server';
import { categorizeSkill } from '@/lib/data/skill-categorization';
import { getServerAuthSession } from '@/lib/auth/auth-utils';
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

    // Determine the best category for this skill
    const skillLower = skill.toLowerCase();
    const targetCategory = categorizeSkill(skill);

    // Check if skill already exists
    const skillExists = Object.values(resume.skills).some((category: any) =>
      category.some((existingSkill: any) => 
        existingSkill.name.toLowerCase() === skillLower
      )
    );

    if (skillExists) {
      return NextResponse.json({ message: 'Skill already exists' });
    }

    // Add skill to appropriate category with 2 years experience (new skill)
    if (!resume.skills[targetCategory]) {
      resume.skills[targetCategory] = [];
    }

    resume.skills[targetCategory].push({
      name: skill,
      years: 2
    });

    // Mark the skills field as modified and save
    resume.markModified('skills');
    await resume.save();

    return NextResponse.json({ 
      message: 'Skill added successfully',
      category: targetCategory,
      skill: skill
    });

  } catch (error) {
    console.error('Error adding skill:', error);
    return NextResponse.json({ error: 'Failed to add skill' }, { status: 500 });
  }
}