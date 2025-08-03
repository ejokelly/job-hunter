import { NextRequest, NextResponse } from 'next/server';
import { loadApplicantData, getAllSkillsFlat } from '@/lib/data/data-loader';
import { callClaude, extractJsonFromResponse } from '@/lib/ai/anthropic-client';
import { getServerAuthSession } from '@/lib/auth/auth-utils';

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

    // Load applicant data using session
    const applicantData = await loadApplicantData();
    const allSkills = getAllSkillsFlat(applicantData);

    const prompt = `Analyze this job description and compare it to the candidate's skills.

Job Description:
${jobDescription}

Candidate's Current Skills:
${allSkills.join(', ')}

Please identify:
1. Skills mentioned in the job description that the candidate already has (matching skills)
2. Skills mentioned in the job description that the candidate is missing (missing skills)

Return your analysis as JSON in this exact format:
{
  "matchingSkills": ["skill1", "skill2"],
  "missingSkills": ["skill3", "skill4"]
}

Focus on technical skills, tools, frameworks, and programming languages. Be specific and use the exact terminology from the job description.`;

    const message = await callClaude(prompt, 2000);

    let analysis;
    try {
      analysis = await extractJsonFromResponse(message);
    } catch (parseError) {
      console.error('Error parsing Anthropic response:', parseError);
      analysis = {
        matchingSkills: [],
        missingSkills: ['Unable to analyze - please try again']
      };
    }

    return NextResponse.json(analysis);

  } catch (error) {
    console.error('Error analyzing skills:', error);
    return NextResponse.json({ error: 'Failed to analyze skills' }, { status: 500 });
  }
}