import { NextRequest, NextResponse } from 'next/server';
import { generateCoverLetterPDF } from '@/lib/generation/cover-letter-html-generator';
import { loadApplicantData } from '@/lib/data/data-loader';
import { extractJobDetails } from '@/lib/ai/job-extraction';
import { generateCoverLetterContent } from '@/lib/generation/cover-letter-generator';

export async function POST(request: NextRequest) {
  try {
    const { jobDescription } = await request.json();

    if (!jobDescription) {
      return NextResponse.json({ error: 'Job description is required' }, { status: 400 });
    }

    // Load applicant data
    const applicantData = loadApplicantData();

    // Extract job title and company name
    console.log('🔄 Extracting job details...');
    const jobDetails = await extractJobDetails(jobDescription);

    // Generate cover letter content
    console.log('🔄 Generating cover letter content...');
    const coverLetterContent = await generateCoverLetterContent(applicantData, jobDescription, jobDetails);

    // Generate cover letter PDF
    console.log('🔄 Generating cover letter PDF...');
    const coverLetterData = {
      personalInfo: applicantData.personalInfo,
      jobDetails,
      content: coverLetterContent
    };
    const coverLetterPDF = await generateCoverLetterPDF(coverLetterData);

    // Create filename
    const sanitizedTitle = jobDetails.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const sanitizedCompany = jobDetails.company.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const coverLetterFilename = `ej-okelly-${sanitizedTitle}-${sanitizedCompany}-cover-letter.pdf`;

    console.log('✅ Cover letter PDF generated successfully');
    console.log('Cover letter filename:', coverLetterFilename);

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