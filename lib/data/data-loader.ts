import fs from 'fs';
import path from 'path';

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

export function loadApplicantData(): ApplicantData {
  if (cachedData) {
    return cachedData;
  }

  const dataPath = path.join(process.cwd(), 'data.json');
  const rawData = fs.readFileSync(dataPath, 'utf8');
  cachedData = JSON.parse(rawData) as ApplicantData;
  
  return cachedData;
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

export function saveApplicantData(data: ApplicantData): void {
  const dataPath = path.join(process.cwd(), 'data.json');
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  
  // Clear cache so next load gets fresh data
  cachedData = null;
}

export function clearCache(): void {
  cachedData = null;
}