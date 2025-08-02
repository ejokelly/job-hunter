import { NextRequest, NextResponse } from 'next/server';
import { generateResumePDF } from '@/lib/utils/html-pdf-generator';
import { loadApplicantData } from '@/lib/data/data-loader';
import { callClaude, extractJsonFromResponse } from '@/lib/ai/anthropic-client';
import { extractJobDetails } from '@/lib/ai/job-extraction';
import { generatePDFFilename } from '@/lib/utils/filename-utils';
import { Logger } from '@/lib/utils/logger';
import { createSummaryTitlePrompt, createSkillsFilterPrompt, createExperienceReorderPrompt } from '@/lib/ai/prompt-templates';

export async function POST(request: NextRequest) {
  try {
    const { jobDescription } = await request.json();

    if (!jobDescription) {
      return NextResponse.json({ error: 'Job description is required' }, { status: 400 });
    }

    // Load applicant data
    const applicantData = loadApplicantData();

    // Step 0: Extract job title and company name
    Logger.step(0, 'Extracting job details...');
    const jobDetails = await extractJobDetails(jobDescription);
    Logger.stepComplete(0, 'Job details extracted', jobDetails);

    // Step 1: Tailor the summary and title
    Logger.step(1, 'Starting summary and title tailoring...');
    const summaryTitlePrompt = createSummaryTitlePrompt(jobDescription, applicantData);
    const summaryTitleMessage = await callClaude(summaryTitlePrompt, 800);

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
    const skillsMessage = await callClaude(skillsPrompt, 3000);

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
    const experienceMessage = await callClaude(experiencePrompt, 4000);

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