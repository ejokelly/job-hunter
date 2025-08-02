import { categorizeSkill } from '@/lib/data/skill-categorization';

describe('skill-categorization', () => {
  it('should categorize programming languages correctly', () => {
    expect(categorizeSkill('JavaScript')).toBe('languages');
    expect(categorizeSkill('TypeScript')).toBe('languages');
    expect(categorizeSkill('Python')).toBe('languages');
    expect(categorizeSkill('Java')).toBe('languages');
    expect(categorizeSkill('C#')).toBe('languages');
    expect(categorizeSkill('SQL')).toBe('languages');
  });

  it('should categorize frontend technologies correctly', () => {
    expect(categorizeSkill('React')).toBe('frontend');
    expect(categorizeSkill('Vue')).toBe('frontend');
    expect(categorizeSkill('Angular')).toBe('frontend');
    expect(categorizeSkill('Tailwind')).toBe('frontend');
    expect(categorizeSkill('Webpack')).toBe('frontend');
  });

  it('should categorize backend technologies correctly', () => {
    expect(categorizeSkill('Node')).toBe('backend');
    expect(categorizeSkill('Express')).toBe('backend');
    expect(categorizeSkill('Django')).toBe('backend');
    expect(categorizeSkill('GraphQL')).toBe('backend');
    expect(categorizeSkill('REST')).toBe('backend');
  });

  it('should categorize testing frameworks correctly', () => {
    expect(categorizeSkill('Jest')).toBe('testing');
    expect(categorizeSkill('Cypress')).toBe('testing');
    expect(categorizeSkill('Selenium')).toBe('testing');
    expect(categorizeSkill('Playwright')).toBe('testing');
  });

  it('should categorize databases correctly', () => {
    expect(categorizeSkill('Postgres')).toBe('databases');
    expect(categorizeSkill('MongoDB')).toBe('databases');
    expect(categorizeSkill('Redis')).toBe('databases');
    expect(categorizeSkill('MySQL')).toBe('databases');
  });

  it('should categorize cloud/devops tools correctly', () => {
    expect(categorizeSkill('Docker')).toBe('cloudDevops');
    expect(categorizeSkill('Kubernetes')).toBe('cloudDevops');
    expect(categorizeSkill('Terraform')).toBe('cloudDevops');
    expect(categorizeSkill('Jenkins')).toBe('cloudDevops');
  });

  it('should categorize AWS services correctly', () => {
    expect(categorizeSkill('Lambda')).toBe('awsServices');
    expect(categorizeSkill('S3')).toBe('awsServices');
    expect(categorizeSkill('EC2')).toBe('awsServices');
    expect(categorizeSkill('DynamoDB')).toBe('awsServices');
  });

  it('should categorize AI/ML technologies correctly', () => {
    expect(categorizeSkill('Machine Learning')).toBe('aiMl');
    expect(categorizeSkill('TensorFlow')).toBe('aiMl');
    expect(categorizeSkill('PyTorch')).toBe('aiMl');
    expect(categorizeSkill('Neural Networks')).toBe('aiMl');
  });

  it('should default to tools for unrecognized skills', () => {
    expect(categorizeSkill('Adobe Photoshop')).toBe('tools');
    expect(categorizeSkill('Microsoft Office')).toBe('tools');
    expect(categorizeSkill('Unknown Technology')).toBe('tools');
  });

  it('should be case insensitive', () => {
    expect(categorizeSkill('REACT')).toBe('frontend');
    expect(categorizeSkill('javascript')).toBe('languages');
    expect(categorizeSkill('DOCKER')).toBe('cloudDevops');
  });
});