# Job Hunter - AI-Powered Resume & Cover Letter Generator

A sophisticated web application that leverages AI to create tailored resumes and cover letters that match job descriptions perfectly. Built with Next.js, TypeScript, and the Anthropic Claude API.

![Job Hunter](https://img.shields.io/badge/Next.js-15.4.5-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0-38B2AC?style=flat-square&logo=tailwind-css)
![Claude AI](https://img.shields.io/badge/Claude-AI-orange?style=flat-square)
![Built in](https://img.shields.io/badge/Built%20in-1%20Day-green?style=flat-square)
![Tests](https://img.shields.io/badge/Tests-53%20Passing-brightgreen?style=flat-square)

## 🧪 Testing & Quality Assurance for Hiring Managers

This application includes a **comprehensive test suite with 53 tests** demonstrating professional testing practices:

### Unit & Integration Test Coverage
- **🔧 Utility Functions**: 32 tests covering `skill-matching.ts` with edge cases, regex handling, and special characters (C++, C#)
- **🌐 API Routes**: 21 tests for `/analyze-skills` and `/generate-resume` endpoints with full error handling
- **📊 Ground Truth Validation**: All tests use real candidate data from `data.json` for realistic scenarios
- **🛡️ Error Handling**: Comprehensive testing of API failures, JSON parsing errors, and malformed inputs

### Testing Highlights
```bash
npm test
# ✅ 53 tests passing across 3 test suites
# ✅ 100% pass rate with comprehensive mocking
# ✅ Found and fixed critical bugs during test development
```

**Test-Driven Development**: During testing, we discovered and fixed several critical bugs in the source code, including:
- Skill variation generation creating invalid duplicates
- Partial word matching issues (reactive vs react)
- Nested HTML tag problems in text highlighting

### Full Integration Testing with Tilt
Complete end-to-end functionality has been validated through **Tilt** ([whytilt.com](https://whytilt.com)), a Vision/Action model I developed for semantic usability and functional testing. Unlike traditional headless testing that fights with ever-changing DOM structures, Tilt performs true semantic testing by understanding and interacting with websites exactly like a human user would - no brittle selectors or element hunting required. This represents simulation testing at its finest, providing confidence that all user workflows function perfectly in real-world scenarios.

## 🏆 Built in One Day with Claude Code

This entire application was built from scratch in a single day using [Claude Code](https://claude.ai/code), demonstrating the powerful synergy between AI pair programming and experienced developers. The rapid development was made possible by:

- **AI-Augmented Development**: Leveraging Claude Code for intelligent code generation and problem-solving
- **Developer Expertise**: 10+ years of React experience guiding architectural decisions and best practices
- **Iterative Refinement**: Real-time collaboration between human creativity and AI capabilities
- **Modern Tooling**: Next.js, TypeScript, and Tailwind CSS enabling rapid, type-safe development

This project showcases how experienced developers can leverage AI tools to dramatically accelerate development while maintaining production-quality code standards.

## 🚀 Key Features

### Intelligent Document Generation
- **AI-Powered Customization**: Uses Anthropic's Claude API to intelligently tailor resumes and cover letters to specific job descriptions
- **Skills Filtering**: Automatically filters and prioritizes skills based on job requirements
- **Experience Optimization**: Reorders work experience bullet points to highlight the most relevant achievements
- **No Fabrication**: Strictly uses only the applicant's actual experience - this is a filter, not a generator

### Advanced UI/UX
- **Real-Time Preview**: Side-by-side preview of both resume and cover letter before generation
- **Skill Gap Analysis**: Identifies missing skills and allows instant addition to your profile
- **Optimistic Updates**: Immediate UI feedback when adding skills, with background API synchronization
- **Individual Regeneration**: Separate regenerate buttons for resume and cover letter

### Technical Excellence
- **TypeScript Throughout**: Full type safety across the entire codebase
- **Modern React Patterns**: Uses React hooks, suspense boundaries, and optimized rendering
- **Responsive Design**: Tailwind CSS ensures perfect display on all devices
- **PDF Generation**: HTML-to-PDF conversion using Puppeteer for pixel-perfect documents

## 🏗️ Architecture

### Three-Prompt AI System
The application uses a sophisticated three-prompt architecture for optimal results:

1. **Summary & Title Generation**: Creates a tailored professional title and summary that showcases how the candidate exceeds requirements
2. **Skills Filtering**: Intelligently selects relevant skills while including one non-matching skill per category to avoid over-optimization
3. **Experience Prioritization**: Reorders bullet points within each role to highlight the most relevant achievements

### Tech Stack
- **Frontend**: Next.js 15.4.5 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI Integration**: Anthropic Claude API (claude-3-5-sonnet)
- **PDF Generation**: Puppeteer
- **State Management**: React useState with optimistic updates

## 📁 Project Structure

```
job-hunter/
├── app/
│   ├── api/
│   │   ├── analyze-skills/      # Skill gap analysis endpoint
│   │   ├── generate-resume/     # Resume PDF generation
│   │   ├── generate-cover-letter/ # Cover letter PDF generation
│   │   ├── preview-resume/      # Resume preview generation
│   │   └── preview-cover-letter/ # Cover letter preview generation
│   ├── layout.tsx              # App layout with metadata
│   └── page.tsx                # Main application UI
├── components/
│   └── ActionButton.tsx        # Reusable button component
├── lib/
│   ├── html-pdf-generator.ts   # Resume PDF generation logic
│   └── cover-letter-html-generator.ts # Cover letter PDF generation
└── data.json                   # Applicant data store
```

## 🎯 Key Implementation Details

### Skill Matching & Bolding
The application implements intelligent skill matching with variations handling:
```typescript
// Handles variations like "React.js" vs "React" vs "ReactJS"
const skillVariations = [
  skill,
  skill.replace(/\.js$/i, ''),
  skill.replace(/\.js$/i, 'JS'),
  skill + '.js',
  skill + 'JS'
];
```

### Optimistic UI Updates
Skills are added instantly in the UI while the API call happens in the background:
```typescript
// Immediate UI update
setSkillGapReport({
  ...skillGapReport,
  missingSkills: skillGapReport.missingSkills.filter(s => s !== skill),
  matchingSkills: [...skillGapReport.matchingSkills, skill]
});

// Background API call with error handling
const response = await fetch('/api/add-skill', {...});
```

### Professional Document Formatting
- Clean, ATS-friendly layout
- Consistent typography using Inter font
- Section dividers at 88% width for visual separation
- Two-page support with proper page breaks
- Skills bolding in summary, skills section, and work experience

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Anthropic API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/job-hunter.git
cd job-hunter
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
echo "ANTHROPIC_API_KEY=your_api_key_here" > .env.local
```

4. Update applicant data:
Edit `data.json` with your personal information, skills, and experience.

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## 🔧 Configuration

### Customizing Applicant Data
The `data.json` file contains all applicant information:
```json
{
  "personalInfo": {
    "name": "Your Name",
    "email": "email@example.com",
    ...
  },
  "skills": {
    "languages": [...],
    "frontend": [...],
    ...
  },
  "experience": [...],
  "education": [...]
}
```

### AI Behavior Customization
The AI prompts can be customized in the API routes to adjust generation behavior:
- Enforce specific formatting rules
- Add industry-specific requirements
- Adjust tone and style

## 🎨 Design Decisions

### Why HTML-to-PDF over React PDF?
After extensive testing, we chose Puppeteer-based HTML-to-PDF generation because:
- Better control over formatting and page breaks
- Consistent rendering across different environments
- Easier to debug and style with standard CSS
- Native text selection in generated PDFs

### Two-Stage Workflow
The analyze → generate workflow ensures users:
1. See what skills they're missing before generating documents
2. Can add missing skills instantly
3. Have full control over the generation process

## 🔒 Security & Best Practices

- **No Data Fabrication**: The AI is strictly instructed to use only provided information
- **Environment Variables**: API keys are never exposed in the codebase
- **Type Safety**: Full TypeScript coverage prevents runtime errors
- **Error Boundaries**: Graceful error handling throughout the application

## 📈 Performance Optimizations

- **Parallel API Calls**: Resume and cover letter generate simultaneously
- **Optimistic Updates**: Instant UI feedback for better UX
- **Efficient Re-renders**: React state updates are batched when possible
- **Build Optimization**: Next.js automatic code splitting and lazy loading

## 🤝 Contributing

This project showcases modern web development practices and AI integration. While it's primarily a portfolio piece, suggestions and feedback are welcome!

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Built with [Claude Code](https://claude.ai/code) - AI pair programming at its finest
- Powered by [Anthropic's Claude API](https://www.anthropic.com/)
- UI components styled with [Tailwind CSS](https://tailwindcss.com/)

---

*This project demonstrates expertise in modern web development, AI integration, and user-centric design. Built in a single day, it showcases how experienced developers can leverage AI tools like Claude Code to build sophisticated, production-ready applications at unprecedented speed without compromising quality. The result is a testament to both the developer's decade of experience and the transformative power of AI-augmented development.*