import { NextRequest, NextResponse } from 'next/server';
import { loadApplicantData } from '@/lib/data/data-loader';
import { callClaude, extractJsonFromResponse } from '@/lib/ai/anthropic-client';
import { extractJobDetails } from '@/lib/ai/job-extraction';
import { generateResumeHTML } from '@/lib/generation/resume-html-generator';
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

    // Combine all tailored data
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

    // Generate HTML content
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