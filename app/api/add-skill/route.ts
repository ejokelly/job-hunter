import { NextRequest, NextResponse } from 'next/server';
import { loadApplicantData, saveApplicantData } from '@/lib/data/data-loader';
import { categorizeSkill } from '@/lib/data/skill-categorization';

export async function POST(request: NextRequest) {
  try {
    const { skill } = await request.json();

    if (!skill || typeof skill !== 'string') {
      return NextResponse.json({ error: 'Valid skill name is required' }, { status: 400 });
    }

    // Load current data
    const applicantData = loadApplicantData();

    // Determine the best category for this skill
    const skillLower = skill.toLowerCase();
    const targetCategory = categorizeSkill(skill);

    // Check if skill already exists
    const skillExists = Object.values(applicantData.skills).some((category: any) =>
      category.some((existingSkill: any) => 
        existingSkill.name.toLowerCase() === skillLower
      )
    );

    if (skillExists) {
      return NextResponse.json({ message: 'Skill already exists' });
    }

    // Add skill to appropriate category with 2 years experience (new skill)
    if (!applicantData.skills[targetCategory]) {
      applicantData.skills[targetCategory] = [];
    }

    applicantData.skills[targetCategory].push({
      name: skill,
      years: 2
    });

    // Write back to file
    saveApplicantData(applicantData);

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