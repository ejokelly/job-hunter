import mongoose, { Schema, Document } from 'mongoose';

export interface ISkill {
  name: string;
  years: string | number;
}

export interface IPersonalInfo {
  name: string;
  phone: string;
  email: string;
  location: string;
  github: string;
  linkedin: string;
  title: string;
}

export interface ISkills {
  languages: ISkill[];
  frontend: ISkill[];
  backend: ISkill[];
  testing: ISkill[];
  aiMl: ISkill[];
  awsServices: ISkill[];
  cloudDevops: ISkill[];
  databases: ISkill[];
  tools: ISkill[];
  specialties: ISkill[];
  softSkills: ISkill[];
}

export interface IExperience {
  role: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  achievements: string[];
}

export interface IEducation {
  degree: string;
  institution: string;
  location: string;
  graduationDate: string;
  coursework: string[];
  capstone?: string;
}

export interface IResume extends Document {
  userId: string;
  personalInfo: IPersonalInfo;
  summary: string;
  skills: ISkills;
  experience: IExperience[];
  education: IEducation[];
  activities: string[];
  createdAt: Date;
  updatedAt: Date;
}

const SkillSchema = new Schema({
  name: { type: String, required: true },
  years: { type: Schema.Types.Mixed, required: true }
});

const PersonalInfoSchema = new Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  location: { type: String, required: true },
  github: { type: String, required: true },
  linkedin: { type: String, required: true },
  title: { type: String, required: true }
});

const SkillsSchema = new Schema({
  languages: [SkillSchema],
  frontend: [SkillSchema],
  backend: [SkillSchema],
  testing: [SkillSchema],
  aiMl: [SkillSchema],
  awsServices: [SkillSchema],
  cloudDevops: [SkillSchema],
  databases: [SkillSchema],
  tools: [SkillSchema],
  specialties: [SkillSchema],
  softSkills: [SkillSchema]
});

const ExperienceSchema = new Schema({
  role: { type: String, required: true },
  company: { type: String, required: true },
  location: { type: String, required: true },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  achievements: [{ type: String }]
});

const EducationSchema = new Schema({
  degree: { type: String, required: true },
  institution: { type: String, required: true },
  location: { type: String, required: true },
  graduationDate: { type: String, required: true },
  coursework: [{ type: String }],
  capstone: { type: String }
});

const ResumeSchema = new Schema({
  userId: { type: String, required: true, index: true },
  personalInfo: { type: PersonalInfoSchema, required: true },
  summary: { type: String, required: true },
  skills: { type: SkillsSchema, required: true },
  experience: [ExperienceSchema],
  education: [EducationSchema],
  activities: [{ type: String }]
}, {
  timestamps: true
});

export default mongoose.models.Resume || mongoose.model<IResume>('Resume', ResumeSchema);