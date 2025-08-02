import { POST } from '@/app/api/add-skill/route';
import { NextRequest } from 'next/server';

// Mock the data loader and skill categorization
jest.mock('@/lib/data/data-loader', () => ({
  loadApplicantData: jest.fn(),
  saveApplicantData: jest.fn(),
}));

jest.mock('@/lib/data/skill-categorization', () => ({
  categorizeSkill: jest.fn(),
}));

const { loadApplicantData, saveApplicantData } = require('@/lib/data/data-loader');
const { categorizeSkill } = require('@/lib/data/skill-categorization');

describe('/api/add-skill', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock applicant data
    loadApplicantData.mockReturnValue({
      skills: {
        languages: [{ name: 'JavaScript', years: 5 }],
        frontend: [{ name: 'React', years: 3 }]
      }
    });
    
    categorizeSkill.mockReturnValue('languages');
  });

  it('should add a new skill successfully', async () => {
    const request = new NextRequest('http://localhost:3000/api/add-skill', {
      method: 'POST',
      body: JSON.stringify({ skill: 'TypeScript' })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Skill added successfully');
    expect(data.category).toBe('languages');
    expect(data.skill).toBe('TypeScript');
    expect(saveApplicantData).toHaveBeenCalled();
  });

  it('should handle missing skill parameter', async () => {
    const request = new NextRequest('http://localhost:3000/api/add-skill', {
      method: 'POST',
      body: JSON.stringify({})
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Valid skill name is required');
  });

  it('should handle invalid skill parameter', async () => {
    const request = new NextRequest('http://localhost:3000/api/add-skill', {
      method: 'POST',
      body: JSON.stringify({ skill: 123 })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Valid skill name is required');
  });

  it('should detect existing skills', async () => {
    const request = new NextRequest('http://localhost:3000/api/add-skill', {
      method: 'POST',
      body: JSON.stringify({ skill: 'JavaScript' })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Skill already exists');
    expect(saveApplicantData).not.toHaveBeenCalled();
  });

  it('should create new category if needed', async () => {
    categorizeSkill.mockReturnValue('newCategory');
    
    const mockData = {
      skills: {
        languages: [{ name: 'JavaScript', years: 5 }]
      }
    };
    loadApplicantData.mockReturnValue(mockData);

    const request = new NextRequest('http://localhost:3000/api/add-skill', {
      method: 'POST',
      body: JSON.stringify({ skill: 'Docker' })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.category).toBe('newCategory');
    expect(saveApplicantData).toHaveBeenCalledWith(
      expect.objectContaining({
        skills: expect.objectContaining({
          newCategory: [{ name: 'Docker', years: 2 }]
        })
      })
    );
  });
});