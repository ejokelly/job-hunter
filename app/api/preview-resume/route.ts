import { NextRequest, NextResponse } from 'next/server';
import { loadApplicantData } from '@/lib/data/api-data-loader';
import { callClaude, extractJsonFromResponse } from '@/lib/ai/anthropic-client';
import { extractJobDetails } from '@/lib/ai/job-extraction';
import { generateResumeHTML } from '@/lib/generation/resume-html-generator';
import { Logger } from '@/lib/utils/logger';
import { createSummaryTitlePrompt, createSkillsFilterPrompt, createExperienceReorderPrompt } from '@/lib/ai/prompt-templates';
import { getServerAuthSession } from '@/lib/auth/server-auth';
import dbConnect from '@/lib/db/mongodb';
import Resume from '@/lib/db/models/Resume';

async function categorizePendingSkills(userId: string, applicantData: any) {
  try {
    await dbConnect();
    const resume = await Resume.findOne({ userId }).sort({ updatedAt: -1 });
    
    if (!resume || !resume.pendingSkills || resume.pendingSkills.length === 0) {
      return; // No pending skills to process
    }
    
    console.log('🔄 Processing pending skills:', resume.pendingSkills.map((s: any) => s.name));
    
    // Get existing categories
    const existingCategories = Object.keys(resume.skills || {});
    
    // Use Claude to categorize all pending skills at once
    const skillsList = resume.pendingSkills.map((skill: any) => skill.name).join(', ');
    const categoriesString = existingCategories.length > 0 ? existingCategories.join(', ') : 'No existing categories';
    
    const prompt = `I have these skills that need to be categorized: ${skillsList}

Existing skill categories: ${categoriesString}

For each skill, determine the best category. If an existing category fits well, use it. If not, suggest a new appropriate category name.

Respond with JSON in this format:
{
  "categorizedSkills": [
    {"skill": "React", "category": "frontend"},
    {"skill": "Docker", "category": "devops"}
  ]
}`;

    const response = await callClaude(prompt, 1000);
    const categorization = await extractJsonFromResponse(response);
    
    // Merge skills into appropriate categories
    for (const item of categorization.categorizedSkills) {
      const { skill, category } = item;
      const pendingSkill = resume.pendingSkills.find((s: any) => s.name.toLowerCase() === skill.toLowerCase());
      
      if (pendingSkill) {
        // Initialize category if it doesn't exist
        if (!resume.skills[category]) {
          resume.skills[category] = [];
        }
        
        // Add skill to category
        resume.skills[category].push({
          name: pendingSkill.name,
          years: pendingSkill.years
        });
        
        console.log(`✅ Added "${pendingSkill.name}" to "${category}" category`);
      }
    }
    
    // Clear pending skills and update applicantData
    resume.pendingSkills = [];
    resume.markModified('skills');
    resume.markModified('pendingSkills');
    await resume.save();
    
    // Update the applicantData object with new skills
    applicantData.skills = resume.skills.toObject ? resume.skills.toObject() : resume.skills;
    
    console.log('🎉 All pending skills have been categorized and merged');
    
  } catch (error) {
    console.error('Error categorizing pending skills:', error);
    // Don't fail the whole operation if skill categorization fails
  }
}

export async function POST(request: NextRequest) {
  try {
    const { jobDescription } = await request.json();

    if (!jobDescription) {
      return NextResponse.json({ error: 'Job description is required' }, { status: 400 });
    }

    // Check session
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Load applicant data from database
    const applicantData = await loadApplicantData();
    
    console.log('🔍 Resume personalInfo:', JSON.stringify(applicantData.personalInfo, null, 2));
    
    // Process pending skills - categorize and merge them before generation
    await categorizePendingSkills(session.user.id, applicantData);

    // Extract job title and company name
    const jobDetails = await extractJobDetails(jobDescription);

    // Tailor the summary and title
    const summaryTitlePrompt = createSummaryTitlePrompt(jobDescription, applicantData);
    const summaryTitleMessage = await callClaude(summaryTitlePrompt, 800);

    let tailoredSummary = applicantData.summary;
    let tailoredTitle = applicantData.personalInfo.title;
    
    try {
      const parsed = await extractJsonFromResponse(summaryTitleMessage);
      tailoredSummary = parsed.summary || applicantData.summary;
      tailoredTitle = parsed.title || applicantData.personalInfo.title;
    } catch (parseError) {
      Logger.error('Summary/title parsing failed', parseError);
    }

    // Filter skills
    const skillsPrompt = createSkillsFilterPrompt(jobDescription, applicantData.skills);
    const skillsMessage = await callClaude(skillsPrompt, 3000);

    let tailoredSkills = applicantData.skills;
    try {
      tailoredSkills = await extractJsonFromResponse(skillsMessage);
    } catch (parseError) {
      Logger.error('Skills parsing failed', parseError);
      tailoredSkills = applicantData.skills;
    }

    // Reorder experience bullet points
    const experiencePrompt = createExperienceReorderPrompt(jobDescription, applicantData.experience);
    const experienceMessage = await callClaude(experiencePrompt, 4000);

    let tailoredExperience = applicantData.experience;
    try {
      const jsonMatch = experienceMessage.content[0].type === 'text' ? 
        experienceMessage.content[0].text.match(/\[[\s\S]*\]/) : null;
      tailoredExperience = jsonMatch ? JSON.parse(jsonMatch[0]) : applicantData.experience;
    } catch (parseError) {
      Logger.error('Experience parsing failed', parseError);
      tailoredExperience = applicantData.experience;
    }

    // Combine all tailored data and convert Mongoose documents to plain objects
    const tailoredData = {
      ...applicantData,
      personalInfo: {
        ...(applicantData.personalInfo as any).toObject ? (applicantData.personalInfo as any).toObject() : applicantData.personalInfo,
        title: tailoredTitle
      },
      summary: tailoredSummary,
      skills: tailoredSkills,
      experience: tailoredExperience
    };

    // Generate HTML content
    console.log('🔍 Data passed to generateResumeHTML personalInfo:', JSON.stringify(tailoredData.personalInfo, null, 2));
    const htmlContent = generateResumeHTML(tailoredData, jobDescription);

    // Return both HTML and data for preview
    return NextResponse.json({
      html: htmlContent,
      data: tailoredData,
      jobDetails
    });

  } catch (error) {
    console.error('Error generating preview:', error);
    return NextResponse.json({ error: 'Failed to generate preview' }, { status: 500 });
  }
}