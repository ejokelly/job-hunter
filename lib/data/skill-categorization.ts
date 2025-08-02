export function categorizeSkill(skill: string): string {
  const skillLower = skill.toLowerCase();
  
  // Language detection
  if (['javascript', 'typescript', 'python', 'java', 'c#', 'c++', 'c', 'ruby', 'php', 'go', 'rust', 'kotlin', 'swift', 'sql', 'html', 'css'].some(lang => skillLower.includes(lang))) {
    return 'languages';
  }
  
  // Frontend detection
  if (['react', 'vue', 'angular', 'svelte', 'tailwind', 'bootstrap', 'sass', 'scss', 'webpack', 'vite', 'rollup'].some(fe => skillLower.includes(fe))) {
    return 'frontend';
  }
  
  // Backend detection
  if (['node', 'express', 'django', 'flask', 'rails', 'spring', 'laravel', '.net', 'asp.net', 'fastapi', 'graphql', 'rest', 'api'].some(be => skillLower.includes(be))) {
    return 'backend';
  }
  
  // Testing detection
  if (['jest', 'cypress', 'selenium', 'pytest', 'rspec', 'mocha', 'chai', 'jasmine', 'karma', 'playwright', 'enzyme'].some(test => skillLower.includes(test))) {
    return 'testing';
  }
  
  // Database detection
  if (['postgres', 'mysql', 'mongodb', 'redis', 'sqlite', 'oracle', 'cassandra', 'dynamodb', 'elasticsearch'].some(db => skillLower.includes(db))) {
    return 'databases';
  }
  
  // Cloud/AWS detection
  if (['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'jenkins', 'gitlab', 'github actions', 'ci/cd'].some(cloud => skillLower.includes(cloud))) {
    if (['ec2', 's3', 'lambda', 'rds', 'cloudfront', 'sqs', 'sns', 'dynamodb', 'ecs', 'fargate'].some(aws => skillLower.includes(aws))) {
      return 'awsServices';
    } else {
      return 'cloudDevops';
    }
  }
  
  // AI/ML detection
  if (['machine learning', 'deep learning', 'tensorflow', 'pytorch', 'opencv', 'scikit', 'pandas', 'numpy', 'ai', 'neural'].some(ai => skillLower.includes(ai))) {
    return 'aiMl';
  }
  
  // Default category
  return 'tools';
}