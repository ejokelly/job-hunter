import { sanitizeFilename, generatePDFFilename } from '@/lib/utils/filename-utils';

describe('filename-utils', () => {
  describe('sanitizeFilename', () => {
    it('should replace special characters with dashes', () => {
      expect(sanitizeFilename('Senior Software Engineer')).toBe('senior-software-engineer');
      expect(sanitizeFilename('Full-Stack Developer @ Google')).toBe('full-stack-developer---google');
      expect(sanitizeFilename('React/Node.js Developer')).toBe('react-node-js-developer');
    });

    it('should convert to lowercase', () => {
      expect(sanitizeFilename('SENIOR DEVELOPER')).toBe('senior-developer');
      expect(sanitizeFilename('CamelCase')).toBe('camelcase');
    });

    it('should handle empty string', () => {
      expect(sanitizeFilename('')).toBe('');
    });
  });

  describe('generatePDFFilename', () => {
    const jobDetails = {
      title: 'Senior Software Engineer',
      company: 'Google Inc.'
    };

    it('should generate resume filename correctly', () => {
      const filename = generatePDFFilename('resume', jobDetails);
      expect(filename).toBe('ej-okelly-senior-software-engineer-google-inc--resume.pdf');
    });

    it('should generate cover letter filename correctly', () => {
      const filename = generatePDFFilename('cover-letter', jobDetails);
      expect(filename).toBe('ej-okelly-senior-software-engineer-google-inc--cover-letter.pdf');
    });

    it('should handle special characters in job details', () => {
      const specialJobDetails = {
        title: 'Full-Stack Developer',
        company: 'Tech@Startup'
      };
      
      const filename = generatePDFFilename('resume', specialJobDetails);
      expect(filename).toBe('ej-okelly-full-stack-developer-tech-startup-resume.pdf');
    });
  });
});