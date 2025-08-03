import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const RESUME_PARSING_PROMPT = `Extract information from the provided resume text and return it as a JSON object matching the EXACT schema below.

CRITICAL REQUIREMENTS:
1. Return ONLY valid JSON - no text before or after, no markdown code blocks, no explanations
2. ALL fields must be present (use empty arrays [] or empty strings "" if no data)
3. Follow the exact field names and structure shown
4. For years: use numbers (1, 2, 5) or string "10+" for extensive experience
5. Extract ALL skills, technologies, and tools mentioned
6. AVOID DUPLICATES - if text appears multiple times, only include it once
7. Clean up any garbled or repeated text from PDF extraction

EXACT JSON SCHEMA TO MATCH:
{
  "personalInfo": {
    "name": "string",
    "phone": "string", 
    "email": "string",
    "location": "string",
    "github": "string",
    "linkedin": "string", 
    "title": "string"
  },
  "summary": "string",
  "skills": {
    "languages": [{"name": "string", "years": "string|number"}],
    "frontend": [{"name": "string", "years": "string|number"}],
    "backend": [{"name": "string", "years": "string|number"}],
    "testing": [{"name": "string", "years": "string|number"}],
    "aiMl": [{"name": "string", "years": "string|number"}],
    "awsServices": [{"name": "string", "years": "string|number"}],
    "cloudDevops": [{"name": "string", "years": "string|number"}],
    "databases": [{"name": "string", "years": "string|number"}],
    "tools": [{"name": "string", "years": "string|number"}],
    "specialties": [{"name": "string", "years": "string|number"}],
    "softSkills": [{"name": "string", "years": "string|number"}]
  },
  "experience": [
    {
      "role": "string",
      "company": "string", 
      "location": "string",
      "startDate": "string",
      "endDate": "string",
      "achievements": ["string"]
    }
  ],
  "education": [
    {
      "degree": "string",
      "institution": "string",
      "location": "string", 
      "graduationDate": "string",
      "coursework": ["string"],
      "capstone": "string"
    }
  ],
  "activities": ["string"]
}

SKILL CATEGORIZATION GUIDELINES:
- languages: Programming languages (JavaScript, Python, Java, etc.)
- frontend: UI frameworks and libraries (React, Vue, Angular, CSS frameworks)
- backend: Server frameworks and technologies (Node.js, Django, Rails, APIs)
- testing: Testing frameworks and tools (Jest, Pytest, Selenium)
- aiMl: AI/ML technologies (TensorFlow, PyTorch, OpenAI, LLMs)
- awsServices: Specific AWS services (EC2, S3, Lambda, etc.)
- cloudDevops: DevOps and infrastructure (Docker, Kubernetes, CI/CD)
- databases: Database technologies (PostgreSQL, MongoDB, Redis)
- tools: Development tools and platforms (Git, VS Code, Jira)
- specialties: Domain expertise (Real-time Systems, Blockchain, etc.)
- softSkills: Non-technical skills (Leadership, Communication, etc.)

For years of experience:
- If resume shows specific duration, calculate years (e.g., "2020-2023" = 3 years)
- If it's clearly extensive experience, use "10+"
- If recent or limited experience, use 2-4 years
- If no clear indication, use 2 years as default

Resume text to parse:

`;

export async function parseResumeWithClaude(resumeText: string) {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      temperature: 0,
      system: "You are an expert resume parser. You MUST return valid JSON that exactly matches the provided schema. Return ONLY the JSON object with no additional text, explanations, or markdown formatting.",
      messages: [
        {
          role: 'user',
          content: RESUME_PARSING_PROMPT + resumeText
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response format from Claude');
    }

    // Parse the JSON response
    let resumeData;
    try {
      resumeData = JSON.parse(content.text);
    } catch (parseError) {
      console.error('Failed to parse Claude response as JSON:', content.text);
      throw new Error('Claude returned invalid JSON');
    }

    return resumeData;
  } catch (error) {
    console.error('Error parsing resume with Claude:', error);
    throw new Error('Failed to parse resume with AI');
  }
}