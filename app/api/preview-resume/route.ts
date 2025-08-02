import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function generateResumeHTML(data: any, jobDescription: string): string {
  // Create a list of all skills for matching
  const allSkills = Object.values(data.skills)
    .flat()
    .map((skill: any) => skill.name.toLowerCase())
    .sort((a, b) => b.length - a.length); // Sort by length descending to match longer skills first

  // Function to bold skills in text
  function boldSkillsInText(text: string): string {
    let result = text;
    allSkills.forEach(skill => {
      // Handle variations like "React.js" vs "React" vs "ReactJS"
      const skillVariations = [
        skill,
        skill.replace(/\.js$/i, ''), // React.js -> React
        skill.replace(/\.js$/i, 'JS'), // React.js -> ReactJS
        skill + '.js', // React -> React.js
        skill + 'JS' // React -> ReactJS
      ];
      
      skillVariations.forEach(variation => {
        const escapedSkill = variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedSkill}\\b`, 'gi');
        result = result.replace(regex, `<strong>$&</strong>`);
      });
    });
    return result;
  }
  // Create a function to determine if a skill should be bolded (matches job description)
  function shouldBoldSkill(skillName: string, jobDescription: string): boolean {
    const lowerSkill = skillName.toLowerCase();
    const lowerJob = jobDescription.toLowerCase();
    
    // Check for exact matches and common variations
    const skillVariations = [
      lowerSkill,
      lowerSkill.replace(/\.js$/i, ''), // React.js -> React
      lowerSkill.replace(/\.js$/i, 'js'), // React.js -> ReactJS
      lowerSkill + '.js', // React -> React.js
      lowerSkill + 'js' // React -> ReactJS
    ];
    
    return skillVariations.some(variation => 
      lowerJob.includes(variation) || 
      lowerJob.includes(variation.replace(/\s+/g, '')) // Handle spaces
    );
  }

  // Generate skills HTML
  const skillsHTML = Object.entries(data.skills)
    .filter(([, skillList]: [string, any]) => skillList && skillList.length > 0)
    .map(([category, skillList]: [string, any]) => `
      <div class="flex mb-2">
        <div class="w-20 text-xs font-bold flex-shrink-0 mr-4">
          ${category.charAt(0).toUpperCase() + category.slice(1).replace(/([A-Z])/g, ' $1')}
        </div>
        <div class="text-xs flex-1">
          ${skillList.map((skill: any) => {
            const shouldBold = shouldBoldSkill(skill.name, jobDescription);
            return shouldBold ? `<strong>${skill.name} (${skill.years})</strong>` : `${skill.name} (${skill.years})`;
          }).join(', ')}
        </div>
      </div>
    `).join('');

  // Generate first 3 jobs HTML
  const firstThreeJobsHTML = data.experience.slice(0, 3).map((exp: any) => `
    <div class="mb-4">
      <div class="flex justify-between items-start mb-2">
        <div>
          <div class="text-xs font-bold">${exp.role}</div>
          <div class="text-xs italic text-gray-600">${exp.company}</div>
        </div>
        <div class="text-right">
          <div class="text-xs text-gray-600">${exp.startDate} — ${exp.endDate}</div>
          <div class="text-xs text-gray-600">${exp.location}</div>
        </div>
      </div>
      <ul class="ml-4 space-y-1">
        ${exp.achievements.map((achievement: string) => `<li class="text-xs">• ${boldSkillsInText(achievement)}</li>`).join('')}
      </ul>
    </div>
  `).join('');

  // Generate remaining jobs HTML for page 2
  const remainingJobsHTML = data.experience.slice(3).map((exp: any) => `
    <div class="mb-4">
      <div class="flex justify-between items-start mb-2">
        <div>
          <div class="text-xs font-bold">${exp.role}</div>
          <div class="text-xs italic text-gray-600">${exp.company}</div>
        </div>
        <div class="text-right">
          <div class="text-xs text-gray-600">${exp.startDate} — ${exp.endDate}</div>
          <div class="text-xs text-gray-600">${exp.location}</div>
        </div>
      </div>
      <ul class="ml-4 space-y-1">
        ${exp.achievements.map((achievement: string) => `<li class="text-xs">• ${boldSkillsInText(achievement)}</li>`).join('')}
      </ul>
    </div>
  `).join('');

  // Generate education HTML
  const educationHTML = data.education.map((edu: any) => `
    <div class="mb-4">
      <div class="flex justify-between mb-1">
        <div class="text-xs font-bold">${edu.degree}</div>
        <div class="text-xs text-gray-600">${edu.graduationDate}</div>
      </div>
      <div class="text-xs text-gray-600 mb-2">${edu.institution}, ${edu.location}</div>
      ${edu.coursework ? `<div class="text-xs mb-2"><span class="font-bold">Key Coursework:</span> ${edu.coursework.join(', ')}</div>` : ''}
      ${edu.capstone ? `<div class="text-xs"><span class="font-bold">Capstone Project:</span> ${edu.capstone}</div>` : ''}
    </div>
  `).join('');

  // Generate activities HTML
  const activitiesHTML = data.activities && data.activities.length > 0 ? `
    <div class="mb-6">
      <h3 class="text-xs font-bold uppercase mb-4 text-gray-800">Activities</h3>
      ${data.activities.map((activity: any) => `
        <div class="flex justify-between mb-2">
          <div class="text-xs">${activity.role}</div>
          <div class="text-xs text-gray-600">${activity.period}</div>
        </div>
      `).join('')}
    </div>
  ` : '';

  return `
    <div class="max-w-4xl mx-auto bg-white text-black font-sans text-sm leading-tight">
      <!-- Page 1 -->
      <div class="min-h-screen p-8 border-b-2 border-gray-300">
        <!-- Header -->
        <div class="flex justify-between items-start mb-2">
          <div class="text-xs space-y-1">
            <div>${data.personalInfo.phone}</div>
            <div>${data.personalInfo.location}</div>
            <div>${data.personalInfo.email}</div>
          </div>
          <div class="text-center">
            <h1 class="text-2xl font-bold mb-0">${data.personalInfo.name}</h1>
            <h2 class="text-sm text-gray-600 mt-1">${data.personalInfo.title}</h2>
          </div>
          <div class="text-xs space-y-1 text-right">
            ${data.personalInfo.github ? `<div>${data.personalInfo.github}</div>` : ''}
            ${data.personalInfo.linkedin ? `<div>${data.personalInfo.linkedin}</div>` : ''}
          </div>
        </div>

        <!-- Summary -->
        <div class="mb-6 mt-4">
          <h3 class="text-xs font-bold uppercase mb-3 text-gray-800">Professional Summary</h3>
          <p class="text-sm text-justify leading-relaxed">${boldSkillsInText(data.summary)}</p>
        </div>

        <!-- Divider -->
        <div class="flex justify-center mb-6">
          <hr class="w-11/12 border-t border-gray-300" />
        </div>

        <!-- Skills -->
        <div class="mb-6 mt-2">
          <h3 class="text-xs font-bold uppercase mb-4 text-gray-800">Technical Skills</h3>
          <div class="space-y-2">
            ${skillsHTML}
          </div>
        </div>

        <!-- Divider -->
        <div class="flex justify-center mb-6">
          <hr class="w-11/12 border-t border-gray-300" />
        </div>

        <!-- Work Experience - First 3 jobs -->
        <div class="mb-6 mt-2">
          <h3 class="text-xs font-bold uppercase mb-4 text-gray-800">Work Experience</h3>
          <div class="space-y-4">
            ${firstThreeJobsHTML}
          </div>
        </div>
      </div>

      ${data.experience.length > 3 ? `
      <!-- Page 2 -->
      <div class="min-h-screen p-8">
        <!-- Work Experience Continued -->
        <div class="mb-6">
          <h3 class="text-xs font-bold uppercase mb-4 text-gray-800">Work Experience (Continued)</h3>
          <div class="space-y-4">
            ${remainingJobsHTML}
          </div>
        </div>

        <!-- Divider -->
        <div class="flex justify-center mb-6">
          <hr class="w-11/12 border-t border-gray-300" />
        </div>

        <!-- Education -->
        <div class="mb-6">
          <h3 class="text-xs font-bold uppercase mb-4 text-gray-800">Education</h3>
          <div class="space-y-2">
            ${educationHTML}
          </div>
        </div>

        ${activitiesHTML}
      </div>
      ` : ''}
    </div>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const { jobDescription } = await request.json();

    if (!jobDescription) {
      return NextResponse.json({ error: 'Job description is required' }, { status: 400 });
    }

    // Load applicant data
    const dataPath = path.join(process.cwd(), 'data.json');
    const applicantData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    // Extract job title and company name
    const jobDetailsPrompt = `Extract the job title and company name from this job description. Return ONLY a JSON object with "title" and "company" fields.

Job Description:
${jobDescription}

Return format: {"title": "Senior Software Engineer", "company": "Google"}`;

    const jobDetailsMessage = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 200,
      messages: [{ role: 'user', content: jobDetailsPrompt }],
    });

    let jobDetails = { title: 'Software Engineer', company: 'Company' };
    try {
      const detailsContent = jobDetailsMessage.content[0];
      if (detailsContent.type === 'text') {
        const jsonMatch = detailsContent.text.match(/\{[^}]*\}/);
        jobDetails = jsonMatch ? JSON.parse(jsonMatch[0]) : jobDetails;
      }
    } catch (parseError) {
      console.log('❌ Job details parsing failed:', parseError);
    }

    // Tailor the summary and title
    const summaryTitlePrompt = `Given this job description, create a tailored professional title and summary that showcases how this candidate exceeds the requirements.

Job Description:
${jobDescription}

Applicant Skills:
${JSON.stringify(applicantData.skills, null, 2)}

Applicant Experience:
${JSON.stringify(applicantData.experience, null, 2)}

Original Summary:
${applicantData.summary}

Return ONLY a JSON object with "title" and "summary" fields:
- title: A professional title that matches this specific job
- summary: Rewritten summary focused on this role, under 500 characters. MUST describe the candidate as an "AI Augmented" coder/developer and as "Cloud Native" with a "background in machine learning" (not describing the applications built, but the person's approach to development). Reference specific skills and experience that exceed job requirements.

Format: {"title": "Professional Title Here", "summary": "Tailored summary here..."}`;

    const summaryTitleMessage = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 800,
      messages: [{ role: 'user', content: summaryTitlePrompt }],
    });

    let tailoredSummary = applicantData.summary;
    let tailoredTitle = applicantData.personalInfo.title;
    
    try {
      const stContent = summaryTitleMessage.content[0];
      if (stContent.type === 'text') {
        const jsonMatch = stContent.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          tailoredSummary = parsed.summary || applicantData.summary;
          tailoredTitle = parsed.title || applicantData.personalInfo.title;
        }
      }
    } catch (parseError) {
      console.log('❌ Summary/title parsing failed:', parseError);
    }

    // Filter skills
    const skillsPrompt = `Given this job description, filter the skills to include relevant skills plus one additional skill per category that wasn't mentioned.

Job Description:
${jobDescription}

Original Skills:
${JSON.stringify(applicantData.skills, null, 2)}

INSTRUCTIONS:
- Include skills that are mentioned in the job description or directly relevant to the role
- For each category that has matching skills, also include 1 additional skill that wasn't mentioned in the job posting
- Order the remaining skills by relevance (most relevant first, then the additional skill last)
- If a category has no relevant skills, remove the entire category
- Return ONLY valid JSON - no markdown, no explanation

Return ONLY the filtered skills object with relevant skills:`;

    const skillsMessage = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 3000,
      messages: [{ role: 'user', content: skillsPrompt }],
    });

    let tailoredSkills = applicantData.skills;
    try {
      const skillsContent = skillsMessage.content[0];
      if (skillsContent.type === 'text') {
        const jsonMatch = skillsContent.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          tailoredSkills = JSON.parse(jsonMatch[0]);
        }
      }
    } catch (parseError) {
      console.log('❌ Skills parsing failed:', parseError);
      tailoredSkills = applicantData.skills;
    }

    // Reorder experience bullet points
    const experiencePrompt = `Given this job description, reorder the bullet points within each work experience to prioritize relevance. Keep ALL jobs and ALL bullet points.

Job Description:
${jobDescription}

Work Experience:
${JSON.stringify(applicantData.experience, null, 2)}

INSTRUCTIONS:
- Keep all 7 work experience entries in chronological order
- For each job, reorder bullet points to put most relevant first
- Keep ALL bullet points, just reorder them
- Return only the experience array JSON:`;

    const experienceMessage = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      messages: [{ role: 'user', content: experiencePrompt }],
    });

    let tailoredExperience = applicantData.experience;
    try {
      const expContent = experienceMessage.content[0];
      if (expContent.type === 'text') {
        const jsonMatch = expContent.text.match(/\[[\s\S]*\]/);
        tailoredExperience = jsonMatch ? JSON.parse(jsonMatch[0]) : applicantData.experience;
      }
    } catch (parseError) {
      console.log('❌ Experience parsing failed:', parseError);
      tailoredExperience = applicantData.experience;
    }

    // Combine all tailored data
    const tailoredData = {
      ...applicantData,
      personalInfo: {
        ...applicantData.personalInfo,
        title: tailoredTitle
      },
      summary: tailoredSummary,
      skills: tailoredSkills,
      experience: tailoredExperience
    };

    // Generate HTML content
    const htmlContent = generateResumeHTML(tailoredData, jobDescription);

    // Return both HTML and data for preview
    return NextResponse.json({
      html: htmlContent,
      data: tailoredData,
      jobDetails
    });

  } catch (error) {
    console.error('Error generating preview:', error);
    return NextResponse.json({ error: 'Failed to generate preview' }, { status: 500 });
  }
}