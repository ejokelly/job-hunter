import { NextRequest, NextResponse } from 'next/server';
import { loadApplicantData, getAllSkillsFlat } from '@/app/lib/data/api-data-loader';
import { TrackedAnthropic, extractJsonFromResponse } from '@/app/lib/ai/tracked-anthropic';
import { getServerAuthSession } from '@/app/lib/auth/server-auth';
import { SubscriptionManager } from '@/app/lib/subscription/subscription-manager';

export async function POST(request: NextRequest) {
  try {
    const { jobDescription } = await request.json();

    if (!jobDescription) {
      return NextResponse.json({ error: 'Job description is required' }, { status: 400 });
    }

    // Check session
    const session = await getServerAuthSession();
    console.log('🔍 analyze-skills session check:', {
      session: !!session,
      user: !!session?.user,
      userId: session?.user?.id,
      email: session?.user?.email
    });
    if (!session?.user?.id) {
      console.error('🔍 No session found in analyze-skills');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check subscription limits BEFORE making API call
    // Create a session ID for this generation workflow
    const generationSessionId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('🔍 About to check subscription limits for user:', session.user.id, 'session:', generationSessionId);
    const subscriptionStatus = await SubscriptionManager.checkAndIncrementLimit(session.user.id, generationSessionId);
    
    console.log('🔍 Subscription status result:', {
      canCreateResume: subscriptionStatus.canCreateResume,
      monthlyCount: subscriptionStatus.monthlyCount,
      monthlyLimit: subscriptionStatus.monthlyLimit,
      needsUpgrade: subscriptionStatus.needsUpgrade
    });
    
    if (!subscriptionStatus.canCreateResume) {
      return NextResponse.json({ 
        error: `Resume limit exceeded`,
        monthlyCount: subscriptionStatus.monthlyCount,
        monthlyLimit: subscriptionStatus.monthlyLimit,
        subscriptionStatus: subscriptionStatus.subscriptionStatus,
        needsUpgrade: subscriptionStatus.needsUpgrade,
        upgradeToTier: subscriptionStatus.upgradeToTier,
        upgradePrice: subscriptionStatus.upgradePrice,
        stripePriceId: subscriptionStatus.stripePriceId
      }, { status: 429 });
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

    const message = await TrackedAnthropic.createMessage(prompt, {
      operation: 'analyze-skills',
      userId: session.user.id,
      jobDescription,
      endpoint: 'analyze-skills'
    }, 2000);

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