import mongoose from 'mongoose';
import Resume from '../lib/db/models/Resume.js';
import { promises as fs } from 'fs';
import path from 'path';

async function testMigration() {
  try {
    const MONGODB_URI = 'mongodb+srv://jobhunterdb:Ck80ZyqbfRVvwyx2@jobhunterprod.3wkfazn.mongodb.net/JobHunterProd?retryWrites=true&w=majority&appName=JobHunterProd';
    
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const dataPath = path.join(process.cwd(), 'data.json');
    const fileContents = await fs.readFile(dataPath, 'utf8');
    const resumeData = JSON.parse(fileContents);

    const existingResume = await Resume.findOne({
      'personalInfo.email': resumeData.personalInfo.email
    });

    if (existingResume) {
      console.log('Resume already exists:', existingResume._id);
      return;
    }

    const resume = new Resume(resumeData);
    await resume.save();
    console.log('Migration successful! Resume ID:', resume._id);

    const resumes = await Resume.find({});
    console.log('Total resumes in database:', resumes.length);

  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testMigration();