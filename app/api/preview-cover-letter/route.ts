import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { generateCoverLetterHTML } from '@/lib/cover-letter-html-generator';
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

    // Extract job title and company name
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
      console.log('❌ Job details parsing failed:', parseError);
    }

    // Generate cover letter content
    const coverLetterPrompt = `Write a punchy, direct cover letter. CRITICAL: ONLY use information that exists in the provided data. DO NOT make up ANY experiences, skills, or achievements.

Job: ${jobDetails.title} at ${jobDetails.company}

Job Description:
${jobDescription}

Applicant Skills:
${JSON.stringify(applicantData.skills, null, 2)}

Applicant Experience:
${JSON.stringify(applicantData.experience, null, 2)}

STRICT RULES:
- ONLY reference skills that are in the skills list above
- ONLY reference experiences from the experience list above
- ONLY use achievements/bullet points that are written in the experience
- NO fabrication - if they don't have experience with something, don't claim they do
- Be direct: "I built X" not "I have experience building X"
- Max 2-3 sentences per paragraph
- If the job asks for skills the applicant doesn't have, focus on related skills they DO have

Write 3 SHORT paragraphs:
1. Opening: Why THIS role interests them based on their ACTUAL experience
2. Body: 1-2 REAL examples from their experience that match the job
3. Closing: Direct next step

Return only the paragraphs separated by ||| like this:
Opening|||Body|||Closing`;

    const coverLetterMessage = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      messages: [{ role: 'user', content: coverLetterPrompt }],
    });

    let coverLetterContent = {
      opening: "I am writing to express my interest in this position.",
      body: "My experience aligns well with your requirements.",
      closing: "I look forward to hearing from you."
    };

    try {
      const clContent = coverLetterMessage.content[0];
      if (clContent.type === 'text') {
        const paragraphs = clContent.text.split('|||');
        if (paragraphs.length >= 3) {
          coverLetterContent = {
            opening: paragraphs[0].trim(),
            body: paragraphs[1].trim(),
            closing: paragraphs[2].trim()
          };
        }
      }
    } catch (parseError) {
      console.log('❌ Cover letter parsing failed:', parseError);
    }

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