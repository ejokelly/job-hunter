import { NextRequest, NextResponse } from 'next/server';
import { generateResumePDF } from '@/lib/utils/html-pdf-generator';
import { loadApplicantData } from '@/lib/data/api-data-loader';
import { TrackedAnthropic, extractJsonFromResponse } from '@/lib/ai/tracked-anthropic';
import { extractJobDetails } from '@/lib/ai/job-extraction';
import { generatePDFFilename } from '@/lib/utils/filename-utils';
import { Logger } from '@/lib/utils/logger';
import { createSummaryTitlePrompt, createSkillsFilterPrompt, createExperienceReorderPrompt } from '@/lib/ai/prompt-templates';
import { SubscriptionManager } from '@/lib/subscription/subscription-manager';
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
    
    Logger.info('Processing pending skills', resume.pendingSkills.map((s: any) => s.name));
    
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

    const response = await TrackedAnthropic.createMessage(prompt, {
      operation: 'categorize-skills',
      userId,
      endpoint: 'generate-resume'
    }, 1000);
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
        
        Logger.info(`Added "${pendingSkill.name}" to "${category}" category`);
      }
    }
    
    // Clear pending skills and update applicantData
    resume.pendingSkills = [];
    resume.markModified('skills');
    resume.markModified('pendingSkills');
    await resume.save();
    
    // Update the applicantData object with new skills
    applicantData.skills = resume.skills.toObject ? resume.skills.toObject() : resume.skills;
    
    Logger.info('All pending skills have been categorized and merged');
    
  } catch (error) {
    Logger.error('Error categorizing pending skills', error);
    // Don't fail the whole operation if skill categorization fails
  }
}

export async function POST(request: NextRequest) {
  try {
    const { jobDescription } = await request.json();

    if (!jobDescription) {
      return NextResponse.json({ error: 'Job description is required' }, { status: 400 });
    }

    // Get session information for usage tracking
    const sessionId = TrackedAnthropic.getSessionId(request);
    const userId = await TrackedAnthropic.getUserId(sessionId);

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check monthly resume limit
    const subscriptionStatus = await SubscriptionManager.checkAndIncrementLimit(userId);
    
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

    // Get user session
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Load applicant data from database (which includes user's skills)
    const applicantData = await loadApplicantData();
    
    // Process pending skills using the same categorization logic as preview-resume
    await categorizePendingSkills(session.user.id, applicantData);

    // Step 0: Extract job title and company name
    Logger.step(0, 'Extracting job details...');
    const jobDetails = await extractJobDetails(jobDescription);
    Logger.stepComplete(0, 'Job details extracted', jobDetails);

    // Step 1: Tailor the summary and title
    Logger.step(1, 'Starting summary and title tailoring...');
    const summaryTitlePrompt = createSummaryTitlePrompt(jobDescription, applicantData);
    const summaryTitleMessage = await TrackedAnthropic.createMessage(summaryTitlePrompt, {
      operation: 'tailor-summary-title',
      userId,
      sessionId,
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
      Logger.stepError(1, 'Summary/title parsing failed', parseError);
    }
    
    Logger.stepComplete(1, 'Summary and title tailored');
    Logger.debug('Original title', applicantData.personalInfo.title);
    Logger.debug('Tailored title', tailoredTitle);
    Logger.debug('Tailored summary length', tailoredSummary.length);

    // Step 2: Reorder and filter skills
    Logger.step(2, 'Starting skills reordering...');
    const skillsPrompt = createSkillsFilterPrompt(jobDescription, applicantData.skills);
    const skillsMessage = await TrackedAnthropic.createMessage(skillsPrompt, {
      operation: 'filter-skills',
      userId,
      sessionId,
      jobDescription,
      endpoint: 'generate-resume'
    }, 3000);

    let tailoredSkills;
    try {
      const skillsContent = skillsMessage.content[0];
      if (skillsContent.type === 'text') {
        Logger.debug('Raw skills response', skillsContent.text);
      }
      tailoredSkills = await extractJsonFromResponse(skillsMessage);
      Logger.debug('JSON parsing', 'successful');
    } catch (parseError) {
      Logger.stepError(2, 'Skills parsing failed', parseError);
      Logger.debug('Failed content', skillsMessage.content[0]);
      tailoredSkills = applicantData.skills;
    }

    Logger.stepComplete(2, 'Skills reordered');
    Logger.debug('Original skills count', Object.entries(applicantData.skills).map(([cat, skills]: [string, any]) => `${cat}: ${skills.length}`));
    Logger.debug('Tailored skills count', Object.entries(tailoredSkills).map(([cat, skills]: [string, any]) => `${cat}: ${skills.length}`));
    Logger.debug('Tailored skills details', JSON.stringify(tailoredSkills, null, 2));

    // Step 3: Reorder experience bullet points
    Logger.step(3, 'Starting experience bullet point reordering...');
    const experiencePrompt = createExperienceReorderPrompt(jobDescription, applicantData.experience);
    const experienceMessage = await TrackedAnthropic.createMessage(experiencePrompt, {
      operation: 'reorder-experience',
      userId,
      sessionId,
      jobDescription,
      endpoint: 'generate-resume'
    }, 4000);

    let tailoredExperience;
    try {
      const expContent = experienceMessage.content[0];
      if (expContent.type === 'text') {
        const jsonMatch = expContent.text.match(/\[[\s\S]*\]/);
        tailoredExperience = jsonMatch ? JSON.parse(jsonMatch[0]) : applicantData.experience;
      }
    } catch (parseError) {
      Logger.stepError(3, 'Experience parsing failed', parseError);
      tailoredExperience = applicantData.experience;
    }

    Logger.stepComplete(3, 'Experience bullet points reordered');
    Logger.debug('Original jobs count', applicantData.experience.length);
    Logger.debug('Tailored jobs count', tailoredExperience.length);

    // Combine all tailored data
    Logger.info('Combining all tailored data...');
    const tailoredData = {
      ...applicantData,
      personalInfo: {
        ...applicantData.personalInfo,
        title: tailoredTitle
      },
      summary: tailoredSummary,
      skills: tailoredSkills,
      experience: tailoredExperience
    };

    Logger.success('ALL STEPS COMPLETE - Generating resume PDF...');

    // Generate resume PDF using HTML template
    const resumePDF = await generateResumePDF(tailoredData, jobDescription);

    // Create filename
    const resumeFilename = generatePDFFilename('resume', jobDetails);

    Logger.success('Resume PDF generated successfully');
    Logger.debug('Resume filename', resumeFilename);

    // Return resume as direct PDF download
    return new NextResponse(resumePDF, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${resumeFilename}"`,
      },
    });

  } catch (error) {
    console.error('Error generating resume:', error);
    return NextResponse.json({ error: 'Failed to generate resume' }, { status: 500 });
  }
}