export function generateSkillVariations(skill: string): string[] {
  const lowerSkill = skill.toLowerCase();
  
  return [
    lowerSkill,
    lowerSkill.replace(/\.js$/i, ''), // React.js -> React
    lowerSkill.replace(/\.js$/i, 'js'), // React.js -> ReactJS
    lowerSkill + '.js', // React -> React.js
    lowerSkill + 'js' // React -> ReactJS
  ].filter(Boolean);
}

export function shouldBoldSkill(skillName: string, jobDescription: string): boolean {
  const skillVariations = generateSkillVariations(skillName);
  const lowerJob = jobDescription.toLowerCase();
  
  return skillVariations.some(variation => 
    lowerJob.includes(variation) || 
    lowerJob.includes(variation.replace(/\s+/g, '')) // Handle spaces
  );
}

export function boldSkillsInText(text: string, allSkills: string[], jobDescription: string): string {
  let result = text;
  
  // Sort by length descending to match longer skills first
  const sortedSkills = allSkills.sort((a, b) => b.length - a.length);
  
  sortedSkills.forEach(skill => {
    if (shouldBoldSkill(skill, jobDescription)) {
      const skillVariations = generateSkillVariations(skill);
      
      skillVariations.forEach(variation => {
        const escapedSkill = variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedSkill}\\b`, 'gi');
        result = result.replace(regex, `<strong>$&</strong>`);
      });
    }
  });
  
  return result;
}