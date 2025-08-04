import { NextRequest, NextResponse } from 'next/server';
import { generateCoverLetterHTML } from '@/lib/generation/cover-letter-html-generator';
import { loadApplicantData } from '@/lib/data/data-loader';
import { extractJobDetails } from '@/lib/ai/job-extraction';
import { generateCoverLetterContent } from '@/lib/generation/cover-letter-generator';
import { SubscriptionManager } from '@/lib/subscription/subscription-manager';
import { getServerAuthSession } from '@/lib/auth/server-auth';

export async function POST(request: NextRequest) {
  try {
    const { jobDescription, isRegeneration = false } = await request.json();

    if (!jobDescription) {
      return NextResponse.json({ error: 'Job description is required' }, { status: 400 });
    }

    // Check authentication
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    let subscriptionStatus;
    if (isRegeneration) {
      // Individual regeneration - count as 1 generation
      subscriptionStatus = await SubscriptionManager.checkAndIncrementRegenerationLimit(session.user.id, 'cover_letter');
    } else {
      // Part of initial workflow - don't count (analyze-skills already counted)
      subscriptionStatus = await SubscriptionManager.getSubscriptionStatus(session.user.id);
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

    // Load applicant data
    const applicantData = loadApplicantData();

    // Extract job title and company name
    const jobDetails = await extractJobDetails(jobDescription);

    // Generate cover letter content
    const coverLetterContent = await generateCoverLetterContent(applicantData, jobDescription, jobDetails);

    // Generate cover letter HTML
    const coverLetterData = {
      personalInfo: applicantData.personalInfo,
      jobDetails,
      content: coverLetterContent
    };
    
    const htmlContent = generateCoverLetterHTML(coverLetterData);

    // Return HTML for preview
    return NextResponse.json({
      html: htmlContent,
      data: coverLetterData,
      jobDetails
    });

  } catch (error) {
    console.error('Error generating cover letter preview:', error);
    return NextResponse.json({ error: 'Failed to generate cover letter preview' }, { status: 500 });
  }
}