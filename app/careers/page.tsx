'use client';

import Header from '@/pc/auth/header';
import Footer from '@/pc/layout/footer';

const jobs = [
  {
    title: "Head of Design",
    type: "Founder position with profit sharing",
    location: "Remote",
    description: "Join our founding team and lead the design vision for resumelove. You'll shape the entire user experience, from our core resume builder to new product features. This is a unique opportunity to build a design-driven company from the ground up.",
    responsibilities: [
      "Lead all design initiatives and establish design principles",
      "Create user-centered designs for web and mobile platforms",
      "Collaborate closely with founders on product strategy",
      "Build and optimize user flows for resume creation",
      "Design marketing materials and brand assets",
      "Conduct user research and usability testing",
      "Mentor future design team members"
    ],
    requirements: [
      "3+ years of product design experience",
      "Strong portfolio showcasing web application design",
      "Experience with Figma, Sketch, or similar design tools",
      "Understanding of user research and design thinking",
      "Excellent communication and collaboration skills",
      "Startup or early-stage company experience preferred",
      "Passion for helping people advance their careers"
    ],
    compensation: "Equity-based compensation with profit sharing as founding team member"
  },
  {
    title: "Jr. Software Developer",
    type: "Intern position - Work experience",
    location: "Remote",
    description: "Perfect opportunity for new developers to gain real-world experience building a production application used by thousands of job seekers. You'll work directly with experienced developers and learn modern web development practices.",
    responsibilities: [
      "Contribute to front-end development using React/Next.js",
      "Help implement new features for the resume builder",
      "Write and maintain component tests",
      "Participate in code reviews and learn best practices",
      "Debug and fix issues reported by users",
      "Assist with mobile-responsive design implementation",
      "Learn about intelligent automation and prompt engineering"
    ],
    requirements: [
      "Basic knowledge of JavaScript/TypeScript and React",
      "Understanding of HTML, CSS, and web fundamentals",
      "Familiarity with Git version control",
      "Eagerness to learn and take feedback",
      "Strong problem-solving skills",
      "Ability to work independently and meet deadlines",
      "Portfolio of personal projects or coursework"
    ],
    compensation: "Unpaid internship with potential for future paid opportunities and strong portfolio development"
  },
  {
    title: "Social Media Manager",
    type: "Intern position - Work experience", 
    location: "Remote",
    description: "Help build our social media presence and connect with job seekers across platforms. You'll create engaging content, manage our community, and develop strategies to grow our audience of career-focused professionals.",
    responsibilities: [
      "Create and schedule content across Twitter, LinkedIn, TikTok, and Instagram",
      "Develop social media strategy and content calendar",
      "Engage with our community and respond to comments/messages",
      "Create graphics and short-form video content",
      "Track analytics and report on social media performance",
      "Collaborate on influencer partnerships and collaborations",
      "Research trends in career advice and job search content"
    ],
    requirements: [
      "Strong understanding of social media platforms and best practices",
      "Experience creating content (graphics, videos, or writing)",
      "Knowledge of social media scheduling tools (Buffer, Later, etc.)",
      "Basic graphic design skills (Canva, Photoshop, or Figma)",
      "Excellent written communication skills",
      "Understanding of professional networking and career content",
      "Creative mindset with attention to current trends"
    ],
    compensation: "Unpaid internship with potential for future paid opportunities and portfolio development"
  }
];

export default function CareersPage() {
  return (
    <div className="min-h-screen theme-bg-gradient">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold theme-text-primary mb-6">
            Join Our Team
          </h1>
          <p className="text-xl theme-text-secondary max-w-2xl mx-auto leading-relaxed">
            Help us build the future of resume creation and career advancement. We&apos;re looking for passionate individuals who want to make a real impact.
          </p>
        </div>

        <div className="space-y-12">
          {jobs.map((job, index) => (
            <div key={index} className="theme-card rounded-xl p-8 shadow-lg">
              <div className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                  <h2 className="text-2xl font-bold theme-text-primary">{job.title}</h2>
                  <div className="flex flex-col sm:items-end">
                    <span className="text-sm theme-text-secondary">{job.location}</span>
                    <span className="text-sm font-medium theme-text-accent">{job.type}</span>
                  </div>
                </div>
                <p className="theme-text-secondary leading-relaxed">{job.description}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold theme-text-primary mb-4">Key Responsibilities</h3>
                  <ul className="space-y-2">
                    {job.responsibilities.map((responsibility, idx) => (
                      <li key={idx} className="theme-text-secondary flex items-start">
                        <span className="theme-text-accent mr-2">•</span>
                        {responsibility}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold theme-text-primary mb-4">Requirements</h3>
                  <ul className="space-y-2">
                    {job.requirements.map((requirement, idx) => (
                      <li key={idx} className="theme-text-secondary flex items-start">
                        <span className="theme-text-accent mr-2">•</span>
                        {requirement}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t theme-border">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div className="mb-4 sm:mb-0">
                    <h4 className="font-semibold theme-text-primary mb-2">Compensation</h4>
                    <p className="theme-text-secondary text-sm">{job.compensation}</p>
                  </div>
                  <div className="flex space-x-3">
                    <a 
                      href="mailto:careers@resumelove.app" 
                      className="px-6 py-3 theme-btn-primary rounded-lg font-medium transition-colors"
                    >
                      Apply Now
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center theme-card rounded-xl p-8">
          <h2 className="text-2xl font-bold theme-text-primary mb-4">Don&apos;t See a Perfect Fit?</h2>
          <p className="theme-text-secondary mb-6 max-w-2xl mx-auto">
            We&apos;re always interested in hearing from talented individuals who are passionate about helping people advance their careers. Send us your resume and tell us how you&apos;d like to contribute!
          </p>
          <a 
            href="mailto:careers@resumelove.app" 
            className="inline-block px-6 py-3 theme-btn-secondary rounded-lg font-medium transition-colors"
          >
            Get In Touch
          </a>
        </div>
      </main>

      <Footer />
    </div>
  );
}