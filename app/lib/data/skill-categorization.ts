import { callClaude } from '@/app/lib/ai/anthropic-client';

export async function categorizeSkill(skill: string, existingCategories: string[] = []): Promise<string> {
  // If there are existing categories, try to match with intelligent processing
  if (existingCategories.length > 0) {
    const prompt = `Given the skill "${skill}" and these existing categories: ${existingCategories.join(', ')}, 
    which category would be the best fit? If none fit well, suggest a new category name.
    
    Respond with just the category name (either existing or new), nothing else.`;
    
    try {
      const response = await callClaude(prompt, 100);
      const category = response.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Check if it matches an existing category (case insensitive)
      const matchingCategory = existingCategories.find(cat => 
        cat.toLowerCase().replace(/[^a-z0-9]/g, '') === category
      );
      
      return matchingCategory || category;
    } catch (error) {
      console.error('Error categorizing skill with intelligent processing:', error);
    }
  }
  
  // Fallback to basic categorization
  const skillLower = skill.toLowerCase();
  
  if (['javascript', 'typescript', 'python', 'java', 'c#', 'c++', 'c', 'ruby', 'php', 'go', 'rust', 'kotlin', 'swift', 'sql', 'html', 'css'].some(lang => skillLower.includes(lang))) {
    return 'languages';
  }
  
  if (['react', 'vue', 'angular', 'svelte', 'tailwind', 'bootstrap', 'sass', 'scss', 'webpack', 'vite', 'rollup'].some(fe => skillLower.includes(fe))) {
    return 'frontend';
  }
  
  if (['node', 'express', 'django', 'flask', 'rails', 'spring', 'laravel', '.net', 'asp.net', 'fastapi', 'graphql', 'rest', 'api'].some(be => skillLower.includes(be))) {
    return 'backend';
  }
  
  if (['jest', 'cypress', 'selenium', 'pytest', 'rspec', 'mocha', 'chai', 'jasmine', 'karma', 'playwright', 'enzyme'].some(test => skillLower.includes(test))) {
    return 'testing';
  }
  
  if (['postgres', 'mysql', 'mongodb', 'redis', 'sqlite', 'oracle', 'cassandra', 'dynamodb', 'elasticsearch'].some(db => skillLower.includes(db))) {
    return 'databases';
  }
  
  if (['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'jenkins', 'gitlab', 'github actions', 'ci/cd'].some(cloud => skillLower.includes(cloud))) {
    return 'cloud';
  }
  
  if (['machine learning', 'deep learning', 'tensorflow', 'pytorch', 'opencv', 'scikit', 'pandas', 'numpy', 'artificial intelligence', 'neural'].some(ml => skillLower.includes(ml))) {
    return 'machine-learning';
  }
  
  return 'tools';
}