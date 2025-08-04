import { NextRequest, NextResponse } from 'next/server';
import { generateCoverLetterPDF } from '@/lib/generation/cover-letter-html-generator';
import { loadApplicantData } from '@/lib/data/api-data-loader';
import { extractJobDetails } from '@/lib/ai/job-extraction';
import { generateCoverLetterContent } from '@/lib/generation/cover-letter-generator';
import { generatePDFFilename } from '@/lib/utils/filename-utils';
import { Logger } from '@/lib/utils/logger';
import { SubscriptionManager } from '@/lib/subscription/subscription-manager';
import { getServerAuthSession } from '@/lib/auth/server-auth';

export async function POST(request: NextRequest) {
  try {
    const { jobDescription } = await request.json();

    if (!jobDescription) {
      return NextResponse.json({ error: 'Job description is required' }, { status: 400 });
    }

    // Check authentication
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check monthly resume limit
    const subscriptionStatus = await SubscriptionManager.checkAndIncrementLimit(session.user.id);
    
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

    // Load applicant data from database
    const applicantData = await loadApplicantData();

    // Extract job title and company name
    Logger.info('Extracting job details...');
    const jobDetails = await extractJobDetails(jobDescription);

    // Generate cover letter content
    Logger.info('Generating cover letter content...');
    const coverLetterContent = await generateCoverLetterContent(applicantData, jobDescription, jobDetails);

    // Generate cover letter PDF
    Logger.info('Generating cover letter PDF...');
    const coverLetterData = {
      personalInfo: applicantData.personalInfo,
      jobDetails,
      content: coverLetterContent
    };
    const coverLetterPDF = await generateCoverLetterPDF(coverLetterData);

    // Create filename
    const coverLetterFilename = generatePDFFilename('cover-letter', jobDetails);

    Logger.success('Cover letter PDF generated successfully');
    Logger.debug('Cover letter filename', coverLetterFilename);

    // Return cover letter as direct PDF download
    return new NextResponse(coverLetterPDF, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${coverLetterFilename}"`,
      },
    });

  } catch (error) {
    console.error('Error generating cover letter:', error);
    return NextResponse.json({ error: 'Failed to generate cover letter' }, { status: 500 });
  }
}