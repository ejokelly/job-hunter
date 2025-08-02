import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { skill } = await request.json();

    if (!skill || typeof skill !== 'string') {
      return NextResponse.json({ error: 'Valid skill name is required' }, { status: 400 });
    }

    // Load current data
    const dataPath = path.join(process.cwd(), 'data.json');
    const applicantData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    // Determine the best category for this skill based on common patterns
    const skillLower = skill.toLowerCase();
    let targetCategory = 'tools'; // default category

    // Language detection
    if (['javascript', 'typescript', 'python', 'java', 'c#', 'c++', 'c', 'ruby', 'php', 'go', 'rust', 'kotlin', 'swift', 'sql', 'html', 'css'].some(lang => skillLower.includes(lang))) {
      targetCategory = 'languages';
    }
    // Frontend detection
    else if (['react', 'vue', 'angular', 'svelte', 'tailwind', 'bootstrap', 'sass', 'scss', 'webpack', 'vite', 'rollup'].some(fe => skillLower.includes(fe))) {
      targetCategory = 'frontend';
    }
    // Backend detection
    else if (['node', 'express', 'django', 'flask', 'rails', 'spring', 'laravel', '.net', 'asp.net', 'fastapi', 'graphql', 'rest', 'api'].some(be => skillLower.includes(be))) {
      targetCategory = 'backend';
    }
    // Testing detection
    else if (['jest', 'cypress', 'selenium', 'pytest', 'rspec', 'mocha', 'chai', 'jasmine', 'karma', 'playwright', 'enzyme'].some(test => skillLower.includes(test))) {
      targetCategory = 'testing';
    }
    // Database detection
    else if (['postgres', 'mysql', 'mongodb', 'redis', 'sqlite', 'oracle', 'cassandra', 'dynamodb', 'elasticsearch'].some(db => skillLower.includes(db))) {
      targetCategory = 'databases';
    }
    // Cloud/AWS detection
    else if (['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'jenkins', 'gitlab', 'github actions', 'ci/cd'].some(cloud => skillLower.includes(cloud))) {
      if (['ec2', 's3', 'lambda', 'rds', 'cloudfront', 'sqs', 'sns', 'dynamodb', 'ecs', 'fargate'].some(aws => skillLower.includes(aws))) {
        targetCategory = 'awsServices';
      } else {
        targetCategory = 'cloudDevops';
      }
    }
    // AI/ML detection
    else if (['machine learning', 'deep learning', 'tensorflow', 'pytorch', 'opencv', 'scikit', 'pandas', 'numpy', 'ai', 'neural'].some(ai => skillLower.includes(ai))) {
      targetCategory = 'aiMl';
    }

    // Check if skill already exists
    const skillExists = Object.values(applicantData.skills).some((category: any) =>
      category.some((existingSkill: any) => 
        existingSkill.name.toLowerCase() === skillLower
      )
    );

    if (skillExists) {
      return NextResponse.json({ message: 'Skill already exists' });
    }

    // Add skill to appropriate category with 2 years experience (new skill)
    if (!applicantData.skills[targetCategory]) {
      applicantData.skills[targetCategory] = [];
    }

    applicantData.skills[targetCategory].push({
      name: skill,
      years: 2
    });

    // Write back to file
    fs.writeFileSync(dataPath, JSON.stringify(applicantData, null, 2));

    return NextResponse.json({ 
      message: 'Skill added successfully',
      category: targetCategory,
      skill: skill
    });

  } catch (error) {
    console.error('Error adding skill:', error);
    return NextResponse.json({ error: 'Failed to add skill' }, { status: 500 });
  }
}