import { ApplicantData } from '../data/data-loader';

export function createSummaryTitlePrompt(
  jobDescription: string,
  applicantData: ApplicantData
): string {
  return `Given this job description, create a tailored professional title and summary that showcases how this candidate exceeds the requirements.

Job Description:
${jobDescription}

Applicant Skills:
${JSON.stringify(applicantData.skills, null, 2)}

Applicant Experience:
${JSON.stringify(applicantData.experience, null, 2)}

Original Summary:
${applicantData.summary}

Return ONLY a JSON object with "title" and "summary" fields:
- title: A professional title that matches this specific job
- summary: Rewritten summary focused on this role, under 500 characters. Write in a professional but friendly, conversational tone that sounds natural and human. Highlight relevant experience and skills that match or exceed job requirements. Mention the candidate's background in modern development practices and emerging technologies like AI/ML when relevant. Avoid robotic language, keyword stuffing, or overly technical jargon.

Format: {"title": "Professional Title Here", "summary": "Tailored summary here..."}`;
}

export function createSkillsFilterPrompt(
  jobDescription: string,
  applicantSkills: Record<string, any>
): string {
  return `Given this job description, filter the skills to include relevant skills plus one additional skill per category that wasn't mentioned.

Job Description:
${jobDescription}

Original Skills:
${JSON.stringify(applicantSkills, null, 2)}

INSTRUCTIONS:
- Include skills that are mentioned in the job description or directly relevant to the role
- For each category that has matching skills, also include 1 additional skill that wasn't mentioned in the job posting
- Order the remaining skills by relevance (most relevant first, then the additional skill last)
- If a category has no relevant skills, remove the entire category
- Return ONLY valid JSON - no markdown, no explanation

Return ONLY the filtered skills object with relevant skills:`;
}

export function createExperienceReorderPrompt(
  jobDescription: string,
  experience: any[]
): string {
  return `Given this job description, reorder the bullet points within each work experience to prioritize relevance. Keep ALL jobs and ALL bullet points.

Job Description:
${jobDescription}

Work Experience:
${JSON.stringify(experience, null, 2)}

INSTRUCTIONS:
- Keep all 7 work experience entries in chronological order
- For each job, reorder bullet points to put most relevant first
- Keep ALL bullet points, just reorder them
- Return only the experience array JSON:`;
}