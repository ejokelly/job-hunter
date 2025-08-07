import { NextRequest, NextResponse } from 'next/server';
import { generateCoverLetterPDF, generateCoverLetterHTML } from '@/app/lib/generation/cover-letter-html-generator';
import { loadApplicantData } from '@/app/lib/data/api-data-loader';
import { extractJobDetails } from '@/app/lib/ai/job-extraction';
import { generateCoverLetterContent } from '@/app/lib/generation/cover-letter-generator';
import { generatePDFFilename } from '@/app/lib/utils/filename-utils';
import { Logger } from '@/app/lib/utils/logger';
import { SubscriptionManager } from '@/app/lib/subscription/subscription-manager';
import { getServerAuthSession } from '@/app/lib/auth/server-auth';

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

    // Check subscription limits
    let subscriptionStatus;
    if (isRegeneration) {
      subscriptionStatus = await SubscriptionManager.checkAndIncrementRegenerationLimit(session.user.id, 'cover_letter');
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

    // Load applicant data from database
    const applicantData = await loadApplicantData();

    // Extract job title and company name
    Logger.info('Extracting job details...');
    const jobDetails = await extractJobDetails(jobDescription);

    // Generate cover letter content
    Logger.info('Generating cover letter content...');
    const coverLetterContent = await generateCoverLetterContent(applicantData, jobDescription, jobDetails);

    // Generate both HTML for preview and PDF for download
    Logger.info('Generating cover letter HTML and PDF...');
    const coverLetterData = {
      personalInfo: applicantData.personalInfo,
      jobDetails,
      content: coverLetterContent
    };
    
    const htmlContent = generateCoverLetterHTML(coverLetterData);
    const coverLetterPDF = await generateCoverLetterPDF(coverLetterData);

    // Create filename
    const coverLetterFilename = generatePDFFilename('cover-letter', jobDetails, applicantData.personalInfo.name);

    Logger.success('Cover letter HTML and PDF generated successfully');
    Logger.debug('Cover letter filename', coverLetterFilename);

    // Return JSON with both preview data and PDF data
    return NextResponse.json({
      html: htmlContent,
      data: coverLetterData,
      jobDetails,
      pdf: {
        buffer: Array.from(new Uint8Array(coverLetterPDF)),
        filename: coverLetterFilename
      }
    });

  } catch (error) {
    console.error('Error generating cover letter:', error);
    return NextResponse.json({ error: 'Failed to generate cover letter' }, { status: 500 });
  }
}