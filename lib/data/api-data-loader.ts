import { IResume } from '@/lib/db/models/Resume';

export interface Skill {
  name: string;
  years: number | string;
}

export interface Experience {
  role: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  achievements: string[];
}

export interface Education {
  degree?: string;
  institution: string;
  location?: string;
  graduationDate?: string;
  coursework?: string[];
  capstone?: string;
}

export interface ApplicantData {
  _id?: string;
  personalInfo: {
    name: string;
    phone: string;
    email: string;
    location: string;
    title: string;
    github?: string;
    linkedin?: string;
  };
  summary: string;
  skills: Record<string, Skill[]>;
  experience: Experience[];
  education: Education[];
  activities?: Array<{
    role: string;
    period: string;
  }>;
}

let cachedData: ApplicantData | null = null;

export async function loadApplicantData(): Promise<ApplicantData> {
  if (cachedData) {
    return cachedData;
  }

  try {
    // Check if we're on the server or client
    if (typeof window === 'undefined') {
      // Server-side: use the database directly
      const dbConnect = (await import('@/lib/db/mongodb')).default;
      const Resume = (await import('@/lib/db/models/Resume')).default;
      
      await dbConnect();
      const resumes = await Resume.find({}).sort({ updatedAt: -1 });
      
      if (resumes.length === 0) {
        throw new Error('No resumes found');
      }

      const resume = resumes[0];
      cachedData = {
        _id: resume._id?.toString(),
        personalInfo: resume.personalInfo,
        summary: resume.summary,
        skills: resume.skills,
        experience: resume.experience,
        education: resume.education,
        activities: resume.activities?.map(activity => ({
          role: activity,
          period: ''
        })) || []
      };
    } else {
      // Client-side: use fetch
      const response = await fetch('/api/resumes');
      if (!response.ok) {
        throw new Error('Failed to fetch resumes');
      }
      
      const resumes: IResume[] = await response.json();
      
      if (resumes.length === 0) {
        throw new Error('No resumes found');
      }

      const resume = resumes[0];
      cachedData = {
        _id: resume._id,
        personalInfo: resume.personalInfo,
        summary: resume.summary,
        skills: resume.skills,
        experience: resume.experience,
        education: resume.education,
        activities: resume.activities?.map(activity => ({
          role: activity,
          period: ''
        })) || []
      };
    }
    
    return cachedData;
  } catch (error) {
    console.error('Error loading applicant data:', error);
    
    const fs = await import('fs');
    const path = await import('path');
    const dataPath = path.join(process.cwd(), 'data.json');
    const rawData = fs.readFileSync(dataPath, 'utf8');
    cachedData = JSON.parse(rawData) as ApplicantData;
    return cachedData;
  }
}

export async function saveApplicantData(data: ApplicantData): Promise<void> {
  try {
    if (typeof window === 'undefined') {
      // Server-side: use the database directly
      const dbConnect = (await import('@/lib/db/mongodb')).default;
      const Resume = (await import('@/lib/db/models/Resume')).default;
      
      await dbConnect();
      
      if (data._id) {
        await Resume.findByIdAndUpdate(data._id, data, { new: true, runValidators: true });
      } else {
        const resume = new Resume(data);
        await resume.save();
      }
    } else {
      // Client-side: use fetch
      const method = data._id ? 'PUT' : 'POST';
      const url = data._id ? `/api/resumes/${data._id}` : '/api/resumes';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to save resume');
      }
    }

    cachedData = null;
  } catch (error) {
    console.error('Error saving applicant data:', error);
    throw error;
  }
}

export function getAllSkillsFlat(applicantData: ApplicantData): string[] {
  const allSkills: string[] = [];
  Object.values(applicantData.skills).forEach((skillCategory) => {
    skillCategory.forEach((skill) => {
      allSkills.push(skill.name);
    });
  });
  return allSkills;
}

export function clearCache(): void {
  cachedData = null;
}