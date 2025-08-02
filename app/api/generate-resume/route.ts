import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { generateResumePDF } from '@/lib/html-pdf-generator';
import fs from 'fs';
import path from 'path';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { jobDescription } = await request.json();

    if (!jobDescription) {
      return NextResponse.json({ error: 'Job description is required' }, { status: 400 });
    }

    // Load applicant data
    const dataPath = path.join(process.cwd(), 'data.json');
    const applicantData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    // Step 0: Extract job title and company name
    console.log('🔄 STEP 0: Extracting job details...');
    const jobDetailsPrompt = `Extract the job title and company name from this job description. Return ONLY a JSON object with "title" and "company" fields. If company is not mentioned, use "Company".

Job Description:
${jobDescription}

Return format: {"title": "Senior Software Engineer", "company": "Google"}`;

    const jobDetailsMessage = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 200,
      messages: [{ role: 'user', content: jobDetailsPrompt }],
    });

    let jobDetails = { title: 'Software Engineer', company: 'Company' };
    try {
      const detailsContent = jobDetailsMessage.content[0];
      if (detailsContent.type === 'text') {
        const jsonMatch = detailsContent.text.match(/\{[^}]*\}/);
        jobDetails = jsonMatch ? JSON.parse(jsonMatch[0]) : jobDetails;
      }
    } catch (parseError) {
      console.log('❌ STEP 0 ERROR - Job details parsing failed:', parseError);
    }

    console.log('✅ STEP 0 COMPLETE - Job details extracted:', jobDetails);

    // Step 1: Tailor the summary and title
    console.log('🔄 STEP 1: Starting summary and title tailoring...');
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
- title: A professional title that matches this specific job (e.g., "Senior React Developer", "Full Stack Engineer", "AI/ML Specialist")
- summary: Rewritten summary focused on this role, under 500 characters. MUST describe the candidate as an "AI Augmented" coder/developer and as "Cloud Native" with a "background in machine learning" (not describing the applications built, but the person's approach to development). Reference specific skills and experience that exceed job requirements.

Format: {"title": "Professional Title Here", "summary": "Tailored summary here..."}`;

    const summaryTitleMessage = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 800,
      messages: [{ role: 'user', content: summaryTitlePrompt }],
    });

    let tailoredSummary = applicantData.summary;
    let tailoredTitle = applicantData.personalInfo.title;
    
    try {
      const stContent = summaryTitleMessage.content[0];
      if (stContent.type === 'text') {
        const jsonMatch = stContent.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          tailoredSummary = parsed.summary || applicantData.summary;
          tailoredTitle = parsed.title || applicantData.personalInfo.title;
        }
      }
    } catch (parseError) {
      console.log('❌ STEP 1 ERROR - Summary/title parsing failed:', parseError);
    }
    
    console.log('✅ STEP 1 COMPLETE - Summary and title tailored');
    console.log('Original title:', applicantData.personalInfo.title);
    console.log('Tailored title:', tailoredTitle);
    console.log('Tailored summary length:', tailoredSummary.length);

    // Step 2: Reorder and filter skills
    console.log('🔄 STEP 2: Starting skills reordering...');
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
- Use double quotes for all JSON keys and values

Return ONLY the filtered skills object with relevant skills:`;

    const skillsMessage = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 3000,
      messages: [{ role: 'user', content: skillsPrompt }],
    });

    let tailoredSkills;
    try {
      const skillsContent = skillsMessage.content[0];
      if (skillsContent.type === 'text') {
        console.log('🔍 Raw skills response:', skillsContent.text);
        const jsonMatch = skillsContent.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          console.log('🔍 JSON match found:', jsonMatch[0]);
          tailoredSkills = JSON.parse(jsonMatch[0]);
        } else {
          console.log('❌ No JSON match found in skills response');
          tailoredSkills = applicantData.skills;
        }
      } else {
        tailoredSkills = applicantData.skills;
      }
    } catch (parseError) {
      console.log('❌ STEP 2 ERROR - Skills parsing failed:', parseError);
      console.log('❌ Failed content:', skillsMessage.content[0]);
      tailoredSkills = applicantData.skills;
    }

    console.log('✅ STEP 2 COMPLETE - Skills reordered');
    console.log('Original skills count:', Object.entries(applicantData.skills).map(([cat, skills]: [string, any]) => `${cat}: ${skills.length}`));
    console.log('Tailored skills count:', Object.entries(tailoredSkills).map(([cat, skills]: [string, any]) => `${cat}: ${skills.length}`));
    console.log('Tailored skills details:', JSON.stringify(tailoredSkills, null, 2));

    // Step 3: Reorder experience bullet points
    console.log('🔄 STEP 3: Starting experience bullet point reordering...');
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

    const experienceMessage = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      messages: [{ role: 'user', content: experiencePrompt }],
    });

    let tailoredExperience;
    try {
      const expContent = experienceMessage.content[0];
      if (expContent.type === 'text') {
        const jsonMatch = expContent.text.match(/\[[\s\S]*\]/);
        tailoredExperience = jsonMatch ? JSON.parse(jsonMatch[0]) : applicantData.experience;
      }
    } catch (parseError) {
      console.log('❌ STEP 3 ERROR - Experience parsing failed:', parseError);
      tailoredExperience = applicantData.experience;
    }

    console.log('✅ STEP 3 COMPLETE - Experience bullet points reordered');
    console.log('Original jobs count:', applicantData.experience.length);
    console.log('Tailored jobs count:', tailoredExperience.length);

    // Combine all tailored data
    console.log('🔄 Combining all tailored data...');
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

    console.log('✅ ALL STEPS COMPLETE - Generating resume PDF...');

    // Generate resume PDF using HTML template
    const resumePDF = await generateResumePDF(tailoredData, jobDescription);

    // Create filename
    const sanitizedTitle = jobDetails.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const sanitizedCompany = jobDetails.company.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const resumeFilename = `ej-okelly-${sanitizedTitle}-${sanitizedCompany}-resume.pdf`;

    console.log('✅ Resume PDF generated successfully');
    console.log('Resume filename:', resumeFilename);

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