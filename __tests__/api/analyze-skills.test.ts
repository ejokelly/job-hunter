import { POST } from '@/app/api/analyze-skills/route';
import { NextRequest } from 'next/server';

// Mock the AI client
jest.mock('@/lib/ai/anthropic-client', () => ({
  callClaude: jest.fn(),
  extractJsonFromResponse: jest.fn(),
}));

// Mock the data loader
jest.mock('@/lib/data/data-loader', () => ({
  loadApplicantData: jest.fn(),
  getAllSkillsFlat: jest.fn(),
}));

const { callClaude, extractJsonFromResponse } = require('@/lib/ai/anthropic-client');
const { loadApplicantData, getAllSkillsFlat } = require('@/lib/data/data-loader');

describe('/api/analyze-skills', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock applicant data
    loadApplicantData.mockReturnValue({
      skills: {
        languages: [{ name: 'JavaScript', years: 5 }],
        frontend: [{ name: 'React', years: 3 }]
      }
    });
    
    getAllSkillsFlat.mockReturnValue(['JavaScript', 'React']);
  });

  it('should analyze skills successfully', async () => {
    const mockAnalysis = {
      matchingSkills: ['JavaScript', 'React'],
      missingSkills: ['Python', 'Node.js']
    };

    callClaude.mockResolvedValue({
      content: [{ type: 'text', text: 'mock response' }]
    });
    extractJsonFromResponse.mockResolvedValue(mockAnalysis);

    const request = new NextRequest('http://localhost:3000/api/analyze-skills', {
      method: 'POST',
      body: JSON.stringify({
        jobDescription: 'We need JavaScript, React, Python, and Node.js experience'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.matchingSkills).toEqual(['JavaScript', 'React']);
    expect(data.missingSkills).toEqual(['Python', 'Node.js']);
  });

  it('should handle missing job description', async () => {
    const request = new NextRequest('http://localhost:3000/api/analyze-skills', {
      method: 'POST',
      body: JSON.stringify({})
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Job description is required');
  });

  it('should handle AI parsing errors gracefully', async () => {
    callClaude.mockResolvedValue({
      content: [{ type: 'text', text: 'invalid json' }]
    });
    extractJsonFromResponse.mockRejectedValue(new Error('Parse error'));

    const request = new NextRequest('http://localhost:3000/api/analyze-skills', {
      method: 'POST',
      body: JSON.stringify({
        jobDescription: 'Test job description'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.matchingSkills).toEqual([]);
    expect(data.missingSkills).toEqual(['Unable to analyze - please try again']);
  });
});