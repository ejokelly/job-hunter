import { NextRequest } from 'next/server';
import { POST } from '@/app/api/generate-resume/route';
import { generateResumePDF } from '@/app/lib/utils/html-pdf-generator';
import { loadApplicantData } from '@/app/lib/data/data-loader';
import { callClaude, extractJsonFromResponse } from '@/app/lib/ai/anthropic-client';
import { extractJobDetails } from '@/app/lib/ai/job-extraction';
import { generatePDFFilename } from '@/app/lib/utils/filename-utils';
import { createSummaryTitlePrompt, createSkillsFilterPrompt, createExperienceReorderPrompt } from '@/app/lib/ai/prompt-templates';

jest.mock('@/app/lib/utils/html-pdf-generator');
jest.mock('@/app/lib/data/data-loader');
jest.mock('@/app/lib/ai/anthropic-client');
jest.mock('@/app/lib/ai/job-extraction');
jest.mock('@/app/lib/utils/filename-utils');
jest.mock('@/app/lib/ai/prompt-templates');
jest.mock('@/app/lib/utils/logger');

const mockGenerateResumePDF = generateResumePDF as jest.MockedFunction<typeof generateResumePDF>;
const mockLoadApplicantData = loadApplicantData as jest.MockedFunction<typeof loadApplicantData>;
const mockCallClaude = callClaude as jest.MockedFunction<typeof callClaude>;
const mockExtractJsonFromResponse = extractJsonFromResponse as jest.MockedFunction<typeof extractJsonFromResponse>;
const mockExtractJobDetails = extractJobDetails as jest.MockedFunction<typeof extractJobDetails>;
const mockGeneratePDFFilename = generatePDFFilename as jest.MockedFunction<typeof generatePDFFilename>;
const mockCreateSummaryTitlePrompt = createSummaryTitlePrompt as jest.MockedFunction<typeof createSummaryTitlePrompt>;
const mockCreateSkillsFilterPrompt = createSkillsFilterPrompt as jest.MockedFunction<typeof createSkillsFilterPrompt>;
const mockCreateExperienceReorderPrompt = createExperienceReorderPrompt as jest.MockedFunction<typeof createExperienceReorderPrompt>;

const mockApplicantData = {
  personalInfo: {
    name: "EJ O'Kelly",
    phone: "(619) 394-6221",
    email: "hello+ej@whytilt.com",
    location: "San Francisco, CA",
    github: "https://github.com/ejokelly",
    linkedin: "https://linkedin/idontuseit",
    title: "Software Engineer & AI Specialist"
  },
  summary: "I build full-stack systems that push technical boundaries, specializing in React.js and Next.js applications from real-time trading platforms to AI-powered testing frameworks.",
  skills: {
    languages: [
      { name: "JavaScript", years: "10+" },
      { name: "TypeScript", years: "10+" },
      { name: "Python", years: 8 }
    ],
    frontend: [
      { name: "React.js", years: "10+" },
      { name: "Next.js", years: 7 },
      { name: "Vue.js", years: 4 }
    ],
    backend: [
      { name: "Node.js", years: "10+" },
      { name: "Express.js", years: "10+" },
      { name: "FastAPI", years: 3 }
    ]
  },
  experience: [
    {
      role: "Software Architect",
      company: "Tilt",
      location: "Austin, TX",
      startDate: "2023",
      endDate: "Present",
      achievements: [
        "Built AI-powered testing framework replacing complex headless testing systems",
        "Created vision-action model that navigates web interfaces like human QA workers"
      ]
    },
    {
      role: "Engineer III - Team Lead",
      company: "Voxbird",
      location: "San Diego, CA",
      startDate: "2020",
      endDate: "2023",
      achievements: [
        "Engineered advanced voice synthesis system solving cadence replication problems",
        "Built real-time voice processing handling complex speech patterns"
      ]
    }
  ]
};

const mockJobDetails = {
  title: "Senior React Developer",
  company: "TechCorp"
};

const mockTailoredSummary = "Experienced React.js developer with expertise in building scalable web applications and AI-powered solutions.";
const mockTailoredTitle = "Senior React Developer & AI Specialist";

const mockTailoredSkills = {
  languages: [
    { name: "JavaScript", years: "10+" },
    { name: "TypeScript", years: "10+" }
  ],
  frontend: [
    { name: "React.js", years: "10+" },
    { name: "Next.js", years: 7 }
  ]
};

const mockTailoredExperience = [
  {
    role: "Software Architect",
    company: "Tilt",
    location: "Austin, TX",
    startDate: "2023",
    endDate: "Present",
    achievements: [
      "Created vision-action model that navigates web interfaces like human QA workers",
      "Built AI-powered testing framework replacing complex headless testing systems"
    ]
  }
];

describe('/api/generate-resume', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadApplicantData.mockReturnValue(mockApplicantData);
    mockExtractJobDetails.mockResolvedValue(mockJobDetails);
    mockGeneratePDFFilename.mockReturnValue('EJ_OKelly_TechCorp_Senior_React_Developer_Resume.pdf');
    mockCreateSummaryTitlePrompt.mockReturnValue('summary prompt');
    mockCreateSkillsFilterPrompt.mockReturnValue('skills prompt');
    mockCreateExperienceReorderPrompt.mockReturnValue('experience prompt');
  });

  describe('POST', () => {
    it('should generate tailored resume PDF with all steps successful', async () => {
      const jobDescription = 'We are looking for a Senior React Developer with TypeScript experience to join our team at TechCorp.';
      const mockPDFBuffer = Buffer.from('mock pdf content');

      // Mock all Claude responses
      mockCallClaude
        .mockResolvedValueOnce('{"summary": "' + mockTailoredSummary + '", "title": "' + mockTailoredTitle + '"}')
        .mockResolvedValueOnce({ content: [{ type: 'text', text: JSON.stringify(mockTailoredSkills) }] })
        .mockResolvedValueOnce({ content: [{ type: 'text', text: JSON.stringify(mockTailoredExperience) }] });

      mockExtractJsonFromResponse
        .mockResolvedValueOnce({ summary: mockTailoredSummary, title: mockTailoredTitle })
        .mockResolvedValueOnce(mockTailoredSkills);

      mockGenerateResumePDF.mockResolvedValue(mockPDFBuffer);

      const request = new NextRequest('http://localhost:3000/api/generate-resume', {
        method: 'POST',
        body: JSON.stringify({ jobDescription })
      });

      const response = await POST(request);
      const responseBuffer = Buffer.from(await response.arrayBuffer());

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/pdf');
      expect(response.headers.get('Content-Disposition')).toContain('attachment; filename="EJ_OKelly_TechCorp_Senior_React_Developer_Resume.pdf"');
      expect(responseBuffer).toEqual(mockPDFBuffer);

      // Verify all dependencies were called correctly
      expect(mockLoadApplicantData).toHaveBeenCalledTimes(1);
      expect(mockExtractJobDetails).toHaveBeenCalledWith(jobDescription);
      expect(mockCallClaude).toHaveBeenCalledTimes(3);
      expect(mockGenerateResumePDF).toHaveBeenCalledWith(
        expect.objectContaining({
          personalInfo: expect.objectContaining({
            title: mockTailoredTitle
          }),
          summary: mockTailoredSummary,
          skills: mockTailoredSkills,
          experience: mockTailoredExperience
        }),
        jobDescription
      );
    });

    it('should return 400 error when job description is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/generate-resume', {
        method: 'POST',
        body: JSON.stringify({})
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Job description is required' });
      expect(mockLoadApplicantData).not.toHaveBeenCalled();
    });

    it('should use fallback values when summary/title parsing fails', async () => {
      const jobDescription = 'React developer position';
      const mockPDFBuffer = Buffer.from('mock pdf content');

      mockCallClaude
        .mockResolvedValueOnce('invalid json response')
        .mockResolvedValueOnce({ content: [{ type: 'text', text: JSON.stringify(mockTailoredSkills) }] })
        .mockResolvedValueOnce({ content: [{ type: 'text', text: JSON.stringify(mockTailoredExperience) }] });

      mockExtractJsonFromResponse
        .mockRejectedValueOnce(new Error('JSON parse error'))
        .mockResolvedValueOnce(mockTailoredSkills);

      mockGenerateResumePDF.mockResolvedValue(mockPDFBuffer);

      const request = new NextRequest('http://localhost:3000/api/generate-resume', {
        method: 'POST',
        body: JSON.stringify({ jobDescription })
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockGenerateResumePDF).toHaveBeenCalledWith(
        expect.objectContaining({
          personalInfo: expect.objectContaining({
            title: mockApplicantData.personalInfo.title // Should use original title
          }),
          summary: mockApplicantData.summary // Should use original summary
        }),
        jobDescription
      );
    });

    it('should use fallback values when skills parsing fails', async () => {
      const jobDescription = 'React developer position';
      const mockPDFBuffer = Buffer.from('mock pdf content');

      mockCallClaude
        .mockResolvedValueOnce('{"summary": "' + mockTailoredSummary + '", "title": "' + mockTailoredTitle + '"}')
        .mockResolvedValueOnce({ content: [{ type: 'text', text: 'invalid json' }] })
        .mockResolvedValueOnce({ content: [{ type: 'text', text: JSON.stringify(mockTailoredExperience) }] });

      mockExtractJsonFromResponse
        .mockResolvedValueOnce({ summary: mockTailoredSummary, title: mockTailoredTitle })
        .mockRejectedValueOnce(new Error('Skills JSON parse error'));

      mockGenerateResumePDF.mockResolvedValue(mockPDFBuffer);

      const request = new NextRequest('http://localhost:3000/api/generate-resume', {
        method: 'POST',
        body: JSON.stringify({ jobDescription })
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockGenerateResumePDF).toHaveBeenCalledWith(
        expect.objectContaining({
          skills: mockApplicantData.skills // Should use original skills
        }),
        jobDescription
      );
    });

    it('should handle experience parsing edge case with JSON extraction', async () => {
      const jobDescription = 'React developer position';
      const mockPDFBuffer = Buffer.from('mock pdf content');

      const experienceResponseWithJSON = {
        content: [{
          type: 'text',
          text: `Here are the reordered achievements: ${JSON.stringify(mockTailoredExperience)}`
        }]
      };

      mockCallClaude
        .mockResolvedValueOnce('{"summary": "' + mockTailoredSummary + '", "title": "' + mockTailoredTitle + '"}')
        .mockResolvedValueOnce({ content: [{ type: 'text', text: JSON.stringify(mockTailoredSkills) }] })
        .mockResolvedValueOnce(experienceResponseWithJSON);

      mockExtractJsonFromResponse
        .mockResolvedValueOnce({ summary: mockTailoredSummary, title: mockTailoredTitle })
        .mockResolvedValueOnce(mockTailoredSkills);

      mockGenerateResumePDF.mockResolvedValue(mockPDFBuffer);

      const request = new NextRequest('http://localhost:3000/api/generate-resume', {
        method: 'POST',
        body: JSON.stringify({ jobDescription })
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockGenerateResumePDF).toHaveBeenCalledWith(
        expect.objectContaining({
          experience: mockTailoredExperience // Should extract JSON from response
        }),
        jobDescription
      );
    });

    it('should use fallback when experience parsing completely fails', async () => {
      const jobDescription = 'React developer position';
      const mockPDFBuffer = Buffer.from('mock pdf content');

      mockCallClaude
        .mockResolvedValueOnce('{"summary": "' + mockTailoredSummary + '", "title": "' + mockTailoredTitle + '"}')
        .mockResolvedValueOnce({ content: [{ type: 'text', text: JSON.stringify(mockTailoredSkills) }] })
        .mockResolvedValueOnce({ content: [{ type: 'text', text: 'no valid json here' }] });

      mockExtractJsonFromResponse
        .mockResolvedValueOnce({ summary: mockTailoredSummary, title: mockTailoredTitle })
        .mockResolvedValueOnce(mockTailoredSkills);

      mockGenerateResumePDF.mockResolvedValue(mockPDFBuffer);

      const request = new NextRequest('http://localhost:3000/api/generate-resume', {
        method: 'POST',
        body: JSON.stringify({ jobDescription })
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockGenerateResumePDF).toHaveBeenCalledWith(
        expect.objectContaining({
          experience: mockApplicantData.experience // Should use original experience
        }),
        jobDescription
      );
    });

    it('should handle PDF generation failure', async () => {
      const jobDescription = 'React developer position';

      mockCallClaude
        .mockResolvedValueOnce('{"summary": "' + mockTailoredSummary + '", "title": "' + mockTailoredTitle + '"}')
        .mockResolvedValueOnce({ content: [{ type: 'text', text: JSON.stringify(mockTailoredSkills) }] })
        .mockResolvedValueOnce({ content: [{ type: 'text', text: JSON.stringify(mockTailoredExperience) }] });

      mockExtractJsonFromResponse
        .mockResolvedValueOnce({ summary: mockTailoredSummary, title: mockTailoredTitle })
        .mockResolvedValueOnce(mockTailoredSkills);

      mockGenerateResumePDF.mockRejectedValue(new Error('PDF generation failed'));

      const request = new NextRequest('http://localhost:3000/api/generate-resume', {
        method: 'POST',
        body: JSON.stringify({ jobDescription })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to generate resume' });
    });

    it('should handle Claude API failures gracefully', async () => {
      const jobDescription = 'React developer position';

      mockCallClaude.mockRejectedValue(new Error('Claude API error'));

      const request = new NextRequest('http://localhost:3000/api/generate-resume', {
        method: 'POST',
        body: JSON.stringify({ jobDescription })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to generate resume' });
    });

    it('should correctly use ground truth data for tailoring', async () => {
      const jobDescription = 'Looking for a JavaScript expert with React.js and Node.js experience at Innovative Tech Solutions.';
      const mockPDFBuffer = Buffer.from('mock pdf content');

      // Verify the original data matches our ground truth from data.json
      expect(mockApplicantData.personalInfo.name).toBe("EJ O'Kelly");
      expect(mockApplicantData.personalInfo.email).toBe("hello+ej@whytilt.com");
      expect(mockApplicantData.skills.languages).toContainEqual({ name: "JavaScript", years: "10+" });
      expect(mockApplicantData.skills.frontend).toContainEqual({ name: "React.js", years: "10+" });
      expect(mockApplicantData.skills.backend).toContainEqual({ name: "Node.js", years: "10+" });

      mockCallClaude
        .mockResolvedValueOnce('{"summary": "JavaScript expert with React.js expertise", "title": "Senior JavaScript Developer"}')
        .mockResolvedValueOnce({ content: [{ type: 'text', text: JSON.stringify(mockTailoredSkills) }] })
        .mockResolvedValueOnce({ content: [{ type: 'text', text: JSON.stringify(mockTailoredExperience) }] });

      mockExtractJsonFromResponse
        .mockResolvedValueOnce({ summary: "JavaScript expert with React.js expertise", title: "Senior JavaScript Developer" })
        .mockResolvedValueOnce(mockTailoredSkills);

      mockGenerateResumePDF.mockResolvedValue(mockPDFBuffer);

      const request = new NextRequest('http://localhost:3000/api/generate-resume', {
        method: 'POST',
        body: JSON.stringify({ jobDescription })
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockLoadApplicantData).toHaveBeenCalledTimes(1);
      expect(mockCreateSummaryTitlePrompt).toHaveBeenCalledWith(jobDescription, mockApplicantData);
      expect(mockCreateSkillsFilterPrompt).toHaveBeenCalledWith(jobDescription, mockApplicantData.skills);
      expect(mockCreateExperienceReorderPrompt).toHaveBeenCalledWith(jobDescription, mockApplicantData.experience);
    });

    it('should generate correct filename from job details', async () => {
      const jobDescription = 'Senior React Developer at TechCorp';
      const mockPDFBuffer = Buffer.from('mock pdf content');

      mockCallClaude
        .mockResolvedValueOnce('{"summary": "test", "title": "test"}')
        .mockResolvedValueOnce({ content: [{ type: 'text', text: JSON.stringify(mockTailoredSkills) }] })
        .mockResolvedValueOnce({ content: [{ type: 'text', text: JSON.stringify(mockTailoredExperience) }] });

      mockExtractJsonFromResponse
        .mockResolvedValueOnce({ summary: "test", title: "test" })
        .mockResolvedValueOnce(mockTailoredSkills);

      mockGenerateResumePDF.mockResolvedValue(mockPDFBuffer);

      const request = new NextRequest('http://localhost:3000/api/generate-resume', {
        method: 'POST',
        body: JSON.stringify({ jobDescription })
      });

      await POST(request);

      expect(mockGeneratePDFFilename).toHaveBeenCalledWith('resume', mockJobDetails);
    });

    it('should handle malformed request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/generate-resume', {
        method: 'POST',
        body: 'invalid json'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to generate resume' });
    });
  });
});