import { NextRequest, NextResponse } from 'next/server';
import { loadApplicantData } from '@/lib/data/data-loader';
import { callClaude, extractJsonFromResponse } from '@/lib/ai/anthropic-client';
import { extractJobDetails } from '@/lib/ai/job-extraction';
import { generateResumeHTML } from '@/lib/generation/resume-html-generator';


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
    const summaryTitlePrompt = `Given this job description, create a tailored professional title and summary that showcases how this candidate exceeds the requirements.

Job Description:
${jobDescription}

Applicant Skills:
${JSON.stringify(applicantData.skills, null, 2)}

Applicant Experience:
${JSON.stringify(applicantData.experience, null, 2)}

Original Summary:
${applicantData.summary}

Return ONLY a JSON object with "title" and "summary" fields:
- title: A professional title that matches this specific job
- summary: Rewritten summary focused on this role, under 500 characters. MUST describe the candidate as an "AI Augmented" coder/developer and as "Cloud Native" with a "background in machine learning" (not describing the applications built, but the person's approach to development). Reference specific skills and experience that exceed job requirements.

Format: {"title": "Professional Title Here", "summary": "Tailored summary here..."}`;

    const summaryTitleMessage = await callClaude(summaryTitlePrompt, 800);

    let tailoredSummary = applicantData.summary;
    let tailoredTitle = applicantData.personalInfo.title;
    
    try {
      const parsed = await extractJsonFromResponse(summaryTitleMessage);
      tailoredSummary = parsed.summary || applicantData.summary;
      tailoredTitle = parsed.title || applicantData.personalInfo.title;
    } catch (parseError) {
      console.log('❌ Summary/title parsing failed:', parseError);
    }

    // Filter skills
    const skillsPrompt = `Given this job description, filter the skills to include relevant skills plus one additional skill per category that wasn't mentioned.

Job Description:
${jobDescription}

Original Skills:
${JSON.stringify(applicantData.skills, null, 2)}

INSTRUCTIONS:
- Include skills that are mentioned in the job description or directly relevant to the role
- For each category that has matching skills, also include 1 additional skill that wasn't mentioned in the job posting
- Order the remaining skills by relevance (most relevant first, then the additional skill last)
- If a category has no relevant skills, remove the entire category
- Return ONLY valid JSON - no markdown, no explanation

Return ONLY the filtered skills object with relevant skills:`;

    const skillsMessage = await callClaude(skillsPrompt, 3000);

    let tailoredSkills = applicantData.skills;
    try {
      tailoredSkills = await extractJsonFromResponse(skillsMessage);
    } catch (parseError) {
      console.log('❌ Skills parsing failed:', parseError);
      tailoredSkills = applicantData.skills;
    }

    // Reorder experience bullet points
    const experiencePrompt = `Given this job description, reorder the bullet points within each work experience to prioritize relevance. Keep ALL jobs and ALL bullet points.

Job Description:
${jobDescription}

Work Experience:
${JSON.stringify(applicantData.experience, null, 2)}

INSTRUCTIONS:
- Keep all 7 work experience entries in chronological order
- For each job, reorder bullet points to put most relevant first
- Keep ALL bullet points, just reorder them
- Return only the experience array JSON:`;

    const experienceMessage = await callClaude(experiencePrompt, 4000);

    let tailoredExperience = applicantData.experience;
    try {
      const jsonMatch = experienceMessage.content[0].type === 'text' ? 
        experienceMessage.content[0].text.match(/\[[\s\S]*\]/) : null;
      tailoredExperience = jsonMatch ? JSON.parse(jsonMatch[0]) : applicantData.experience;
    } catch (parseError) {
      console.log('❌ Experience parsing failed:', parseError);
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