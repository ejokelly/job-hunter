import { generateSkillVariations, shouldBoldSkill, boldSkillsInText } from '@/lib/utils/skill-matching';

describe('skill-matching utilities', () => {
  describe('generateSkillVariations', () => {
    it('should generate basic variations for a simple skill', () => {
      const variations = generateSkillVariations('React');
      
      expect(variations).toContain('react');
      expect(variations).toContain('react.js');
      expect(variations).toContain('reactjs');
      expect(variations.length).toBeGreaterThan(2);
    });

    it('should handle skills ending with .js correctly', () => {
      const variations = generateSkillVariations('React.js');
      
      expect(variations).toContain('react.js');
      expect(variations).toContain('react'); // .js removed
      expect(variations).toContain('reactjs'); // .js replaced with js
      expect(variations).not.toContain('react.js.js'); // Should not double-add .js
      expect(variations.length).toBe(3); // Only 3 unique variations
    });

    it('should handle skills ending with .JS (uppercase)', () => {
      const variations = generateSkillVariations('Vue.JS');
      
      expect(variations).toContain('vue.js');
      expect(variations).toContain('vue'); // .JS removed
      expect(variations).toContain('vuejs'); // .JS replaced with js
    });

    it('should handle TypeScript correctly', () => {
      const variations = generateSkillVariations('TypeScript');
      
      expect(variations).toContain('typescript');
      expect(variations).toContain('typescript.js');
      expect(variations).toContain('typescriptjs');
    });

    it('should handle Node.js correctly', () => {
      const variations = generateSkillVariations('Node.js');
      
      expect(variations).toContain('node.js');
      expect(variations).toContain('node'); // .js removed
      expect(variations).toContain('nodejs'); // .js replaced with js
    });

    it('should handle empty string gracefully', () => {
      const variations = generateSkillVariations('');
      
      expect(variations).toHaveLength(0); // Should return empty array
    });

    it('should handle skills with mixed case', () => {
      const variations = generateSkillVariations('JavaScript');
      
      expect(variations).toContain('javascript');
      expect(variations).toContain('javascript.js');
      expect(variations).toContain('javascriptjs');
    });

    it('should filter out falsy variations', () => {
      const variations = generateSkillVariations('test');
      
      variations.forEach(variation => {
        expect(variation).toBeTruthy();
      });
    });

    it('should handle special characters in skill names', () => {
      const variations = generateSkillVariations('C++');
      
      expect(variations).toContain('c++');
      expect(variations).toContain('c++.js');
      expect(variations).toContain('c++js');
    });
  });

  describe('shouldBoldSkill', () => {
    it('should return true when skill is found in job description', () => {
      const jobDescription = 'We need a React developer with JavaScript experience';
      
      expect(shouldBoldSkill('React', jobDescription)).toBe(true);
      expect(shouldBoldSkill('JavaScript', jobDescription)).toBe(true);
    });

    it('should return false when skill is not found in job description', () => {
      const jobDescription = 'We need a Python developer with Django experience';
      
      expect(shouldBoldSkill('React', jobDescription)).toBe(false);
      expect(shouldBoldSkill('JavaScript', jobDescription)).toBe(false);
    });

    it('should handle case insensitive matching', () => {
      const jobDescription = 'We need REACT and javascript developers';
      
      expect(shouldBoldSkill('React', jobDescription)).toBe(true);
      expect(shouldBoldSkill('JavaScript', jobDescription)).toBe(true);
    });

    it('should match skill variations', () => {
      const jobDescription = 'We need React.js and nodejs experience';
      
      expect(shouldBoldSkill('React', jobDescription)).toBe(true); // Should match React.js
      expect(shouldBoldSkill('Node.js', jobDescription)).toBe(true); // Should match nodejs
    });

    it('should handle skills with spaces in job description', () => {
      const jobDescription = 'We need React JS and Node JS experience';
      
      expect(shouldBoldSkill('React.js', jobDescription)).toBe(true); // Should match "React JS"
      expect(shouldBoldSkill('Node.js', jobDescription)).toBe(true); // Should match "Node JS"
    });

    it('should not match partial words', () => {
      const jobDescription = 'We need reactive programming experience';
      
      expect(shouldBoldSkill('React', jobDescription)).toBe(false); // Should not match "reactive"
    });

    it('should handle empty job description', () => {
      expect(shouldBoldSkill('React', '')).toBe(false);
    });

    it('should handle empty skill name', () => {
      const jobDescription = 'We need React developers';
      
      expect(shouldBoldSkill('', jobDescription)).toBe(false);
    });

    it('should match skills mentioned in different formats', () => {
      const jobDescription = 'Experience with ReactJS, Node.js, and typescript required';
      
      expect(shouldBoldSkill('React.js', jobDescription)).toBe(true); // Should match ReactJS
      expect(shouldBoldSkill('Node', jobDescription)).toBe(true); // Should match Node.js
      expect(shouldBoldSkill('TypeScript', jobDescription)).toBe(true); // Should match typescript
    });

    it('should handle special characters in job descriptions', () => {
      const jobDescription = 'Experience with C++ and C# programming languages';
      
      expect(shouldBoldSkill('C++', jobDescription)).toBe(true);
      expect(shouldBoldSkill('C#', jobDescription)).toBe(true);
    });
  });

  describe('boldSkillsInText', () => {
    const mockSkills = ['React.js', 'JavaScript', 'Node.js', 'TypeScript', 'Python'];
    
    it('should bold matching skills in text', () => {
      const text = 'I have experience with React.js and JavaScript development.';
      const jobDescription = 'We need React and JavaScript developers';
      
      const result = boldSkillsInText(text, mockSkills, jobDescription);
      
      expect(result).toContain('<strong>React.js</strong>');
      expect(result).toContain('<strong>JavaScript</strong>');
      expect(result).not.toContain('<strong>Python</strong>'); // Python not in job description
    });

    it('should not bold skills not mentioned in job description', () => {
      const text = 'I have experience with React.js, Python, and Django.';
      const jobDescription = 'We need React developers';
      
      const result = boldSkillsInText(text, mockSkills, jobDescription);
      
      expect(result).toContain('<strong>React.js</strong>');
      expect(result).not.toContain('<strong>Python</strong>');
      expect(result).toContain('Python'); // Should still be present, just not bolded
    });

    it('should handle multiple occurrences of the same skill', () => {
      const text = 'React is great. I love React development and React components.';
      const jobDescription = 'We need React developers';
      
      const result = boldSkillsInText(text, ['React'], jobDescription);
      
      const matches = result.match(/<strong>React<\/strong>/g);
      expect(matches).toHaveLength(3); // All three instances should be bolded
    });

    it('should sort skills by length to avoid partial matches', () => {
      const text = 'I work with JavaScript and JS frameworks.';
      const jobDescription = 'We need JavaScript and JS experience';
      const skills = ['JS', 'JavaScript']; // Shorter skill first
      
      const result = boldSkillsInText(text, skills, jobDescription);
      
      // JavaScript should be bolded as a whole word, not broken up by JS
      expect(result).toContain('<strong>JavaScript</strong>');
      expect(result).toContain('<strong>JS</strong>');
      expect(result).not.toContain('<strong>Java</strong>Script>'); // Should not partially match
    });

    it('should handle case insensitive matching in text', () => {
      const text = 'I have REACT and javascript experience.';
      const jobDescription = 'We need React and JavaScript developers';
      
      const result = boldSkillsInText(text, mockSkills, jobDescription);
      
      expect(result).toContain('<strong>REACT</strong>');
      expect(result).toContain('<strong>javascript</strong>');
    });

    it('should escape special regex characters in skill names', () => {
      const text = 'I program in C++ and C#.';
      const jobDescription = 'We need C++ and C# developers';
      const skills = ['C++', 'C#'];
      
      const result = boldSkillsInText(text, skills, jobDescription);
      
      expect(result).toContain('<strong>C++</strong>');
      expect(result).toContain('<strong>C#</strong>');
    });

    it('should only match whole words using word boundaries', () => {
      const text = 'I use reactive programming and React.js.';
      const jobDescription = 'We need React developers';
      const skills = ['React'];
      
      const result = boldSkillsInText(text, skills, jobDescription);
      
      expect(result).toContain('reactive'); // Should not be bolded
      expect(result).toContain('<strong>React</strong>.js');
    });

    it('should handle empty text', () => {
      const result = boldSkillsInText('', mockSkills, 'We need React developers');
      
      expect(result).toBe('');
    });

    it('should handle empty skills array', () => {
      const text = 'I have React experience.';
      const jobDescription = 'We need React developers';
      
      const result = boldSkillsInText(text, [], jobDescription);
      
      expect(result).toBe(text); // Text should remain unchanged
    });

    it('should handle skill variations correctly', () => {
      const text = 'I work with ReactJS and nodejs daily.';
      const jobDescription = 'We need React.js and Node.js experience';
      
      const result = boldSkillsInText(text, mockSkills, jobDescription);
      
      expect(result).toContain('<strong>ReactJS</strong>');
      expect(result).toContain('<strong>nodejs</strong>');
    });

    it('should preserve original text formatting', () => {
      const text = 'I have experience with React.js,\nJavaScript, and other technologies.';
      const jobDescription = 'We need React and JavaScript developers';
      
      const result = boldSkillsInText(text, mockSkills, jobDescription);
      
      expect(result).toContain('\n'); // Newlines should be preserved
      expect(result).toContain(','); // Punctuation should be preserved
      expect(result).toContain('<strong>React.js</strong>');
      expect(result).toContain('<strong>JavaScript</strong>');
    });

    it('should handle overlapping skill names correctly', () => {
      const text = 'I use Java and JavaScript for development.';
      const jobDescription = 'We need Java and JavaScript developers';
      const skills = ['Java', 'JavaScript']; // JavaScript contains Java
      
      const result = boldSkillsInText(text, skills, jobDescription);
      
      // Both should be bolded correctly without interference
      expect(result).toContain('<strong>Java</strong> and <strong>JavaScript</strong>');
      expect(result).not.toContain('<strong><strong>'); // No nested bolding
    });

    it('should work with real-world ground truth data', () => {
      const text = 'Software Engineer with 10+ years of JavaScript and React.js experience, specializing in Node.js backend development.';
      const jobDescription = 'We are looking for a React.js developer with JavaScript and Node.js experience.';
      const realSkills = ['JavaScript', 'TypeScript', 'React.js', 'Node.js', 'Python'];
      
      const result = boldSkillsInText(text, realSkills, jobDescription);
      
      expect(result).toContain('<strong>JavaScript</strong>');
      expect(result).toContain('<strong>React.js</strong>');
      expect(result).toContain('<strong>Node.js</strong>');
      expect(result).not.toContain('<strong>Python</strong>'); // Not in job description
      expect(result).not.toContain('<strong>TypeScript</strong>'); // Not in job description
    });
  });
});