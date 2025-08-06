export function generateSkillVariations(skill: string): string[] {
  if (!skill) return [];
  
  const lowerSkill = skill.toLowerCase();
  const variations = new Set<string>();
  
  // Add the original skill
  variations.add(lowerSkill);
  
  // If skill ends with .js, add version without .js and with js
  if (lowerSkill.endsWith('.js')) {
    const withoutJs = lowerSkill.replace(/\.js$/, '');
    variations.add(withoutJs);
    variations.add(withoutJs + 'js');
  } else {
    // If skill doesn't end with .js, add .js and js versions
    variations.add(lowerSkill + '.js');
    variations.add(lowerSkill + 'js');
  }
  
  return Array.from(variations);
}

export function shouldBoldSkill(skillName: string, jobDescription: string): boolean {
  if (!skillName || !jobDescription) return false;
  
  const skillVariations = generateSkillVariations(skillName);
  const lowerJob = jobDescription.toLowerCase();
  
  return skillVariations.some(variation => {
    const escapedVariation = variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // For skills with special characters, use a more flexible boundary check
    const hasSpecialChars = /[+#]/.test(variation);
    
    if (hasSpecialChars) {
      // For skills like C++ or C#, use lookahead/lookbehind for boundaries
      const regex = new RegExp(`(?<![a-zA-Z0-9])${escapedVariation}(?![a-zA-Z0-9])`, 'i');
      return regex.test(lowerJob);
    } else {
      // Use word boundaries for normal skills
      const regex = new RegExp(`\\b${escapedVariation}\\b`, 'i');
      
      // Also check version without spaces
      const noSpaceVariation = variation.replace(/\s+/g, '');
      const noSpaceRegex = new RegExp(`\\b${noSpaceVariation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      
      return regex.test(lowerJob) || noSpaceRegex.test(lowerJob);
    }
  });
}

export function boldSkillsInText(text: string, allSkills: string[], jobDescription: string): string {
  if (!text || !allSkills.length) return text;
  
  let result = text;
  
  // Sort by length descending to match longer skills first
  const sortedSkills = [...allSkills].sort((a, b) => b.length - a.length);
  
  sortedSkills.forEach(skill => {
    if (shouldBoldSkill(skill, jobDescription)) {
      const skillVariations = generateSkillVariations(skill);
      
      skillVariations.forEach(variation => {
        // Skip if variation is already in strong tags
        if (result.includes(`<strong>${variation}</strong>`)) {
          return;
        }
        
        const escapedSkill = variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Handle special characters like C++ and C#
        const hasSpecialChars = /[+#]/.test(variation);
        const regex = hasSpecialChars 
          ? new RegExp(`(?<![a-zA-Z0-9])${escapedSkill}(?![a-zA-Z0-9])`, 'gi')
          : new RegExp(`\\b${escapedSkill}\\b`, 'gi');
        
        // Only replace if not already inside strong tags
        result = result.replace(regex, (match, offset, string) => {
          // Check if this match is already inside <strong> tags
          const beforeMatch = string.substring(0, offset);
          const afterMatch = string.substring(offset + match.length);
          
          const openTags = (beforeMatch.match(/<strong>/g) || []).length;
          const closeTags = (beforeMatch.match(/<\/strong>/g) || []).length;
          
          // If we're inside strong tags, don't replace
          if (openTags > closeTags) {
            return match;
          }
          
          return `<strong>${match}</strong>`;
        });
      });
    }
  });
  
  return result;
}