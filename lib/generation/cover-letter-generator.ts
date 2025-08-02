import { ApplicantData } from '../data/data-loader';
import { callClaude } from '../ai/anthropic-client';
import { Logger } from '../utils/logger';

export interface CoverLetterContent {
  opening: string;
  body: string;
  closing: string;
}

export interface JobDetails {
  title: string;
  company: string;
}

export async function generateCoverLetterContent(
  applicantData: ApplicantData, 
  jobDescription: string,
  jobDetails: JobDetails
): Promise<CoverLetterContent> {
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

  const coverLetterMessage = await callClaude(coverLetterPrompt, 1000);

  let coverLetterContent: CoverLetterContent = {
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
    Logger.error('Cover letter parsing failed', parseError);
  }

  return coverLetterContent;
}