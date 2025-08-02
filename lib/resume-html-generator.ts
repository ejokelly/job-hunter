import { ApplicantData, getAllSkillsFlat } from './data-loader';
import { boldSkillsInText, shouldBoldSkill } from './skill-matching';

export function generateResumeHTML(data: ApplicantData, jobDescription: string): string {
  const allSkills = getAllSkillsFlat(data);

  // Generate skills HTML with bolding
  const skillsHTML = Object.entries(data.skills)
    .filter(([, skillList]) => skillList && skillList.length > 0)
    .map(([category, skillList]) => `
      <div class="flex mb-2">
        <div class="w-20 text-xs font-bold flex-shrink-0 mr-4">
          ${category.charAt(0).toUpperCase() + category.slice(1).replace(/([A-Z])/g, ' $1')}
        </div>
        <div class="text-xs flex-1">
          ${skillList.map(skill => {
            const shouldBold = shouldBoldSkill(skill.name, jobDescription);
            return shouldBold ? `<strong>${skill.name} (${skill.years})</strong>` : `${skill.name} (${skill.years})`;
          }).join(', ')}
        </div>
      </div>
    `).join('');

  // Generate first 3 jobs HTML
  const firstThreeJobsHTML = data.experience.slice(0, 3).map((exp) => `
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
        ${exp.achievements.map(achievement => 
          `<li class="text-xs">• ${boldSkillsInText(achievement, allSkills, jobDescription)}</li>`
        ).join('')}
      </ul>
    </div>
  `).join('');

  // Generate remaining jobs HTML for page 2
  const remainingJobsHTML = data.experience.slice(3).map((exp) => `
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
        ${exp.achievements.map(achievement => 
          `<li class="text-xs">• ${boldSkillsInText(achievement, allSkills, jobDescription)}</li>`
        ).join('')}
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
      ${data.activities.map(activity => `
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
      <div class="min-h-screen p-8 page-break">
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
          <p class="text-sm text-justify leading-relaxed">${boldSkillsInText(data.summary, allSkills, jobDescription)}</p>
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
      <div class="p-8 page-break">
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
      ` : `
        <!-- Divider -->
        <div class="flex justify-center mb-6">
          <hr class="w-11/12 border-t border-gray-300" />
        </div>

        <!-- Education on Page 1 if no second page needed -->
        <div class="mb-6">
          <h3 class="text-xs font-bold uppercase mb-4 text-gray-800">Education</h3>
          <div class="space-y-2">
            ${educationHTML}
          </div>
        </div>
        ${activitiesHTML}
      `}
    </div>
  `;
}