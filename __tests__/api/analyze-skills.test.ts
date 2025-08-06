import { NextRequest } from 'next/server';
import { POST } from '@/app/api/analyze-skills/route';
import { loadApplicantData, getAllSkillsFlat } from '@/app/lib/data/data-loader';
import { callClaude, extractJsonFromResponse } from '@/app/lib/ai/anthropic-client';

jest.mock('@/app/lib/data/data-loader');
jest.mock('@/app/lib/ai/anthropic-client');

const mockLoadApplicantData = loadApplicantData as jest.MockedFunction<typeof loadApplicantData>;
const mockGetAllSkillsFlat = getAllSkillsFlat as jest.MockedFunction<typeof getAllSkillsFlat>;
const mockCallClaude = callClaude as jest.MockedFunction<typeof callClaude>;
const mockExtractJsonFromResponse = extractJsonFromResponse as jest.MockedFunction<typeof extractJsonFromResponse>;

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
    ],
    testing: [
      { name: "Jest", years: 8 },
      { name: "pytest", years: 6 }
    ]
  }
};

const mockAllSkills = [
  'JavaScript', 'TypeScript', 'Python', 'React.js', 'Next.js', 'Vue.js',
  'Node.js', 'Express.js', 'FastAPI', 'Jest', 'pytest'
];

describe('/api/analyze-skills', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadApplicantData.mockReturnValue(mockApplicantData);
    mockGetAllSkillsFlat.mockReturnValue(mockAllSkills);
  });

  describe('POST', () => {
    it('should analyze skills and return matching and missing skills', async () => {
      const jobDescription = 'We are looking for a React.js developer with TypeScript and Node.js experience. Knowledge of GraphQL and Docker is required.';
      
      const mockAnalysis = {
        matchingSkills: ['React.js', 'TypeScript', 'Node.js'],
        missingSkills: ['GraphQL', 'Docker']
      };

      mockCallClaude.mockResolvedValue('{"matchingSkills": ["React.js", "TypeScript", "Node.js"], "missingSkills": ["GraphQL", "Docker"]}');
      mockExtractJsonFromResponse.mockResolvedValue(mockAnalysis);

      const request = new NextRequest('http://localhost:3000/api/analyze-skills', {
        method: 'POST',
        body: JSON.stringify({ jobDescription })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockAnalysis);
      expect(mockLoadApplicantData).toHaveBeenCalledTimes(1);
      expect(mockGetAllSkillsFlat).toHaveBeenCalledWith(mockApplicantData);
      expect(mockCallClaude).toHaveBeenCalledWith(
        expect.stringContaining('Analyze this job description'),
        2000
      );
    });

    it('should return 400 error when job description is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/analyze-skills', {
        method: 'POST',
        body: JSON.stringify({})
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Job description is required' });
      expect(mockLoadApplicantData).not.toHaveBeenCalled();
    });

    it('should return 400 error when job description is empty string', async () => {
      const request = new NextRequest('http://localhost:3000/api/analyze-skills', {
        method: 'POST',
        body: JSON.stringify({ jobDescription: '' })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Job description is required' });
    });

    it('should handle Claude API errors gracefully', async () => {
      const jobDescription = 'We need a React developer';
      
      mockCallClaude.mockRejectedValue(new Error('Claude API error'));

      const request = new NextRequest('http://localhost:3000/api/analyze-skills', {
        method: 'POST',
        body: JSON.stringify({ jobDescription })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to analyze skills' });
    });

    it('should handle JSON parsing errors from Claude response', async () => {
      const jobDescription = 'We need a React developer';
      
      mockCallClaude.mockResolvedValue('Invalid JSON response');
      mockExtractJsonFromResponse.mockRejectedValue(new Error('JSON parse error'));

      const request = new NextRequest('http://localhost:3000/api/analyze-skills', {
        method: 'POST',
        body: JSON.stringify({ jobDescription })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        matchingSkills: [],
        missingSkills: ['Unable to analyze - please try again']
      });
    });

    it('should correctly identify all matching skills from ground truth data', async () => {
      const jobDescription = 'Looking for a full-stack developer with JavaScript, TypeScript, React.js, Next.js, Node.js, Express.js, and Jest testing experience.';
      
      const expectedMatching = ['JavaScript', 'TypeScript', 'React.js', 'Next.js', 'Node.js', 'Express.js', 'Jest'];
      const mockAnalysis = {
        matchingSkills: expectedMatching,
        missingSkills: []
      };

      mockCallClaude.mockResolvedValue(JSON.stringify(mockAnalysis));
      mockExtractJsonFromResponse.mockResolvedValue(mockAnalysis);

      const request = new NextRequest('http://localhost:3000/api/analyze-skills', {
        method: 'POST',
        body: JSON.stringify({ jobDescription })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.matchingSkills).toEqual(expectedMatching);
      expect(data.missingSkills).toEqual([]);
    });

    it('should identify missing skills not in candidate profile', async () => {
      const jobDescription = 'We need React.js, Angular, Kubernetes, and AWS expertise.';
      
      const mockAnalysis = {
        matchingSkills: ['React.js'],
        missingSkills: ['Angular', 'Kubernetes', 'AWS']
      };

      mockCallClaude.mockResolvedValue(JSON.stringify(mockAnalysis));
      mockExtractJsonFromResponse.mockResolvedValue(mockAnalysis);

      const request = new NextRequest('http://localhost:3000/api/analyze-skills', {
        method: 'POST',
        body: JSON.stringify({ jobDescription })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.matchingSkills).toContain('React.js');
      expect(data.missingSkills).toEqual(expect.arrayContaining(['Angular', 'Kubernetes', 'AWS']));
    });

    it('should pass correct prompt structure to Claude', async () => {
      const jobDescription = 'React developer needed';
      
      mockCallClaude.mockResolvedValue('{"matchingSkills": [], "missingSkills": []}');
      mockExtractJsonFromResponse.mockResolvedValue({ matchingSkills: [], missingSkills: [] });

      const request = new NextRequest('http://localhost:3000/api/analyze-skills', {
        method: 'POST',
        body: JSON.stringify({ jobDescription })
      });

      await POST(request);

      const calledPrompt = mockCallClaude.mock.calls[0][0];
      expect(calledPrompt).toContain('Analyze this job description and compare it to the candidate\'s skills');
      expect(calledPrompt).toContain('Job Description:\nReact developer needed');
      expect(calledPrompt).toContain('Candidate\'s Current Skills:');
      expect(calledPrompt).toContain('JavaScript, TypeScript, Python');
      expect(calledPrompt).toContain('Return your analysis as JSON in this exact format');
      expect(calledPrompt).toContain('"matchingSkills": ["skill1", "skill2"]');
    });

    it('should handle malformed request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/analyze-skills', {
        method: 'POST',
        body: 'invalid json'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to analyze skills' });
    });

    it('should validate response structure from Claude', async () => {
      const jobDescription = 'React developer position';
      
      const validAnalysis = {
        matchingSkills: ['React.js'],
        missingSkills: ['Angular']
      };

      mockCallClaude.mockResolvedValue(JSON.stringify(validAnalysis));
      mockExtractJsonFromResponse.mockResolvedValue(validAnalysis);

      const request = new NextRequest('http://localhost:3000/api/analyze-skills', {
        method: 'POST',
        body: JSON.stringify({ jobDescription })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('matchingSkills');
      expect(data).toHaveProperty('missingSkills');
      expect(Array.isArray(data.matchingSkills)).toBe(true);
      expect(Array.isArray(data.missingSkills)).toBe(true);
    });
  });
});