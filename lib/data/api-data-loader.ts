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

export async function loadApplicantData(userId?: string): Promise<ApplicantData> {
  if (cachedData && !userId) {
    return cachedData;
  }

  try {
    // Check if we're on the server or client
    if (typeof window === 'undefined') {
      // Server-side: use the database directly
      const dbConnect = (await import('@/lib/db/mongodb')).default;
      const Resume = (await import('@/lib/db/models/Resume')).default;
      const { getServerAuthSession } = await import('@/lib/auth/server-auth');
      
      await dbConnect();
      
      let finalUserId = userId;
      if (!finalUserId) {
        const session = await getServerAuthSession();
        if (!session?.user?.id) {
          throw new Error('No user session found');
        }
        finalUserId = session.user.id;
      }
      
      console.log('🔍 Looking for resume with userId:', finalUserId);
      const { ObjectId } = await import('mongodb');
      const userObjectId = new ObjectId(finalUserId);
      let resume = await Resume.findOne({ userId: userObjectId }).sort({ updatedAt: -1 });
      console.log('🔍 Found resume:', !!resume, resume?._id);
      
      if (!resume) {
        console.log('🔍 No resume found, checking all resumes...');
        const allResumes = await Resume.find({}).limit(5);
        console.log('🔍 All resumes userIds:', allResumes.map(r => ({ userId: r.userId, name: r.personalInfo?.name })));
        
        // Auto-create resume from default data.json for new users
        const fs = await import('fs');
        const path = await import('path');
        const dataPath = path.join(process.cwd(), 'data.json');
        const rawData = fs.readFileSync(dataPath, 'utf8');
        const defaultData = JSON.parse(rawData);
        
        resume = new Resume({ ...defaultData, userId: userObjectId });
        await resume.save();
        console.log('Auto-created resume for user:', finalUserId);
      }

      const resumeData = {
        _id: resume._id?.toString(),
        personalInfo: resume.personalInfo,
        summary: resume.summary,
        skills: resume.skills,
        experience: resume.experience,
        education: resume.education,
        activities: resume.activities?.map((activity: any) => ({
          role: activity,
          period: ''
        })) || []
      };

      if (!userId) {
        cachedData = resumeData;
      }
      
      return resumeData;
    } else {
      // Client-side: use fetch (user-specific data)
      const response = await fetch('/api/resumes');
      if (!response.ok) {
        throw new Error('Failed to fetch resumes');
      }
      
      const resumes: IResume[] = await response.json();
      
      if (resumes.length === 0) {
        throw new Error('No resumes found');
      }

      const resume = resumes[0];
      const resumeData = {
        _id: resume._id?.toString(),
        personalInfo: resume.personalInfo,
        summary: resume.summary,
        skills: resume.skills,
        experience: resume.experience,
        education: resume.education,
        activities: resume.activities?.map((activity: any) => ({
          role: activity,
          period: ''
        })) || []
      };

      cachedData = resumeData;
      return resumeData;
    }
  } catch (error) {
    console.error('Error loading applicant data:', error);
    
    // Fallback to data.json only if no user context
    if (!userId && typeof window === 'undefined') {
      const fs = await import('fs');
      const path = await import('path');
      const dataPath = path.join(process.cwd(), 'data.json');
      const rawData = fs.readFileSync(dataPath, 'utf8');
      cachedData = JSON.parse(rawData) as ApplicantData;
      return cachedData;
    }
    
    throw error;
  }
}

export async function saveApplicantData(data: ApplicantData, userId?: string): Promise<void> {
  try {
    if (typeof window === 'undefined') {
      // Server-side: use the database directly
      const dbConnect = (await import('@/lib/db/mongodb')).default;
      const Resume = (await import('@/lib/db/models/Resume')).default;
      const { getServerAuthSession } = await import('@/lib/auth/server-auth');
      
      await dbConnect();
      
      let finalUserId = userId;
      if (!finalUserId) {
        const session = await getServerAuthSession();
        if (!session?.user?.id) {
          throw new Error('No user session found');
        }
        finalUserId = session.user.id;
      }
      
      if (data._id) {
        await Resume.findOneAndUpdate(
          { _id: data._id, userId: finalUserId }, 
          data, 
          { new: true, runValidators: true }
        );
      } else {
        const resume = new Resume({ ...data, userId: finalUserId });
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