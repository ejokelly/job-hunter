import { NextRequest, NextResponse } from 'next/server';
import { generateCoverLetterHTML } from '@/lib/generation/cover-letter-html-generator';
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