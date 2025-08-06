import { callClaude, extractJsonFromResponse } from './anthropic-client';
import { Logger } from '../utils/logger';

export interface JobDetails {
  title: string;
  company: string;
}

export async function extractJobDetails(jobDescription: string): Promise<JobDetails> {
  const prompt = `Extract the job title and company name from this job description. Return ONLY a JSON object with "title" and "company" fields. If company is not mentioned, use "Company".

Job Description:
${jobDescription}

Return format: {"title": "Senior Software Engineer", "company": "Google"}`;

  try {
    const message = await callClaude(prompt, 200);
    const jobDetails = await extractJsonFromResponse(message);
    
    return {
      title: jobDetails.title || 'Software Engineer',
      company: jobDetails.company || 'Company'
    };
  } catch (parseError) {
    Logger.error('Job details parsing failed', parseError);
    return {
      title: 'Software Engineer',
      company: 'Company'
    };
  }
}