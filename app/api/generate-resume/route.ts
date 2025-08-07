import { NextRequest, NextResponse } from 'next/server';
import { loadApplicantData } from '@/app/lib/data/api-data-loader';
import { TrackedAnthropic, extractJsonFromResponse } from '@/app/lib/ai/tracked-anthropic';
import { extractJobDetails } from '@/app/lib/ai/job-extraction';
import { generateResumePDF } from '@/app/lib/utils/html-pdf-generator';
import { generatePDFFilename } from '@/app/lib/utils/filename-utils';
import { Logger } from '@/app/lib/utils/logger';
import { createSummaryTitlePrompt, createSkillsFilterPrompt, createExperienceReorderPrompt } from '@/app/lib/ai/prompt-templates';
import { getServerAuthSession } from '@/app/lib/auth/server-auth';
import dbConnect from '@/app/lib/db/mongodb';
import Resume from '@/app/lib/db/models/Resume';
import { SubscriptionManager } from '@/app/lib/subscription/subscription-manager';

async function categorizePendingSkills(userId: string, applicantData: any) {
  try {
    await dbConnect();
    const { ObjectId } = await import('mongodb');
    const userObjectId = new ObjectId(userId);
    const resume = await Resume.findOne({ userId: userObjectId }).sort({ updatedAt: -1 });
    
    if (!resume || !resume.pendingSkills || resume.pendingSkills.length === 0) {
      return;
    }
    
    Logger.info('Processing pending skills', resume.pendingSkills.map((s: any) => s.name));
    
    const existingCategories = Object.keys(resume.skills || {});
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

    const response = await TrackedAnthropic.createMessage(prompt, {
      operation: 'categorize-skills',
      userId,
      endpoint: 'generate-resume'
    }, 1000);
    const categorization = await extractJsonFromResponse(response);
    
    for (const item of categorization.categorizedSkills) {
      const { skill, category } = item;
      const pendingSkill = resume.pendingSkills.find((s: any) => s.name.toLowerCase() === skill.toLowerCase());
      
      if (pendingSkill) {
        if (!resume.skills[category]) {
          resume.skills[category] = [];
        }
        resume.skills[category].push({
          name: pendingSkill.name,
          years: pendingSkill.years
        });
        Logger.info(`Added "${pendingSkill.name}" to "${category}" category`);
      }
    }
    
    resume.pendingSkills = [];
    resume.markModified('skills');
    resume.markModified('pendingSkills');
    await resume.save();
    
    applicantData.skills = resume.skills.toObject ? resume.skills.toObject() : resume.skills;
    Logger.info('All pending skills have been categorized and merged');
    
  } catch (error) {
    Logger.error('Error categorizing pending skills', error);
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('🚀 RESUME GENERATION STARTED at', new Date().toISOString());
  
  try {
    const { jobDescription, isRegeneration = false } = await request.json();

    if (!jobDescription) {
      return NextResponse.json({ error: 'Job description is required' }, { status: 400 });
    }

    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Check subscription limits
    let subscriptionStatus;
    if (isRegeneration) {
      subscriptionStatus = await SubscriptionManager.checkAndIncrementRegenerationLimit(session.user.id, 'resume');
    } else {
      subscriptionStatus = await SubscriptionManager.checkAndIncrementLimit(session.user.id);
    }
    
    if (!subscriptionStatus.canCreateResume) {
      return NextResponse.json({ 
        error: 'Monthly resume limit exceeded',
        monthlyCount: subscriptionStatus.monthlyCount,
        monthlyLimit: subscriptionStatus.monthlyLimit,
        subscriptionStatus: subscriptionStatus.subscriptionStatus,
        needsUpgrade: subscriptionStatus.needsUpgrade,
        upgradeToTier: subscriptionStatus.upgradeToTier,
        upgradePrice: subscriptionStatus.upgradePrice,
        stripePriceId: subscriptionStatus.stripePriceId
      }, { status: 429 });
    }

    // Load and process data
    const applicantData = await loadApplicantData();
    await categorizePendingSkills(session.user.id, applicantData);
    const jobDetails = await extractJobDetails(jobDescription);

    // AI processing for tailoring
    const summaryTitlePrompt = createSummaryTitlePrompt(jobDescription, applicantData);
    const summaryTitleMessage = await TrackedAnthropic.createMessage(summaryTitlePrompt, {
      operation: 'tailor-summary-title',
      userId: session.user.id,
      jobDescription,
      endpoint: 'generate-resume'
    }, 800);

    let tailoredSummary = applicantData.summary;
    let tailoredTitle = applicantData.personalInfo.title;
    
    try {
      const parsed = await extractJsonFromResponse(summaryTitleMessage);
      tailoredSummary = parsed.summary || applicantData.summary;
      tailoredTitle = parsed.title || applicantData.personalInfo.title;
    } catch (parseError) {
      Logger.error('Summary/title parsing failed', parseError);
    }

    const skillsPrompt = createSkillsFilterPrompt(jobDescription, applicantData.skills);
    const skillsMessage = await TrackedAnthropic.createMessage(skillsPrompt, {
      operation: 'filter-skills',
      userId: session.user.id,
      jobDescription,
      endpoint: 'generate-resume'
    }, 3000);

    let tailoredSkills = applicantData.skills;
    try {
      tailoredSkills = await extractJsonFromResponse(skillsMessage);
    } catch (parseError) {
      Logger.error('Skills parsing failed', parseError);
      tailoredSkills = applicantData.skills;
    }

    const experiencePrompt = createExperienceReorderPrompt(jobDescription, applicantData.experience);
    const experienceMessage = await TrackedAnthropic.createMessage(experiencePrompt, {
      operation: 'reorder-experience',
      userId: session.user.id,
      jobDescription,
      endpoint: 'generate-resume'
    }, 4000);

    let tailoredExperience = applicantData.experience;
    try {
      const jsonMatch = experienceMessage.content[0].type === 'text' ? 
        experienceMessage.content[0].text.match(/\[[\s\S]*\]/) : null;
      tailoredExperience = jsonMatch ? JSON.parse(jsonMatch[0]) : applicantData.experience;
    } catch (parseError) {
      Logger.error('Experience parsing failed', parseError);
      tailoredExperience = applicantData.experience;
    }

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

    // Generate both HTML for preview and PDF for download
    const { generateResumeHTML } = await import('@/app/lib/generation/resume-html-generator');
    const htmlContent = generateResumeHTML(tailoredData, jobDescription);
    
    const resumePDF = await generateResumePDF(tailoredData, jobDescription);
    const resumeFilename = generatePDFFilename('resume', jobDetails, tailoredData.personalInfo.name);

    const totalDuration = Date.now() - startTime;
    console.log('🏁 RESUME GENERATION COMPLETED in', totalDuration, 'ms');

    // Return JSON with both preview data and PDF data
    return NextResponse.json({
      html: htmlContent,
      data: tailoredData,
      jobDetails,
      pdf: {
        buffer: Array.from(new Uint8Array(resumePDF)),
        filename: resumeFilename
      }
    });

  } catch (error) {
    const errorDuration = Date.now() - startTime;
    console.error('❌ RESUME GENERATION FAILED after', errorDuration, 'ms:', error);
    return NextResponse.json({ error: 'Failed to generate resume' }, { status: 500 });
  }
}