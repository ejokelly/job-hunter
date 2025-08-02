import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { jobDescription } = await request.json();

    if (!jobDescription) {
      return NextResponse.json({ error: 'Job description is required' }, { status: 400 });
    }

    // Load applicant data
    const dataPath = path.join(process.cwd(), 'data.json');
    const applicantData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    // Get all skills from applicant data
    const allSkills: string[] = [];
    Object.values(applicantData.skills).forEach((skillCategory: any) => {
      skillCategory.forEach((skill: any) => {
        allSkills.push(skill.name);
      });
    });

    const prompt = `Analyze this job description and compare it to the candidate's skills.

Job Description:
${jobDescription}

Candidate's Current Skills:
${allSkills.join(', ')}

Please identify:
1. Skills mentioned in the job description that the candidate already has (matching skills)
2. Skills mentioned in the job description that the candidate is missing (missing skills)

Return your analysis as JSON in this exact format:
{
  "matchingSkills": ["skill1", "skill2"],
  "missingSkills": ["skill3", "skill4"]
}

Focus on technical skills, tools, frameworks, and programming languages. Be specific and use the exact terminology from the job description.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    let analysis;
    try {
      const content = message.content[0];
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } else {
        throw new Error('Unexpected response type from Anthropic');
      }
    } catch (parseError) {
      console.error('Error parsing Anthropic response:', parseError);
      analysis = {
        matchingSkills: [],
        missingSkills: ['Unable to analyze - please try again']
      };
    }

    return NextResponse.json(analysis);

  } catch (error) {
    console.error('Error analyzing skills:', error);
    return NextResponse.json({ error: 'Failed to analyze skills' }, { status: 500 });
  }
}