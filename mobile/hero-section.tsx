'use client';

import Image from 'next/image';

export default function MobileHeroSection() {
  return (
    <div className="h-full flex flex-col theme-hero-bg">
      <div className="theme-hero-overlay flex-1 flex flex-col">
        {/* Portrait Layout */}
        <div className="portrait:flex portrait:flex-col portrait:h-full landscape:hidden">
          {/* Text Section - Top half */}
          <div className="flex-1 flex items-center justify-center px-4 py-8">
            <div className="text-left max-w-xs">
              <h1 className="leading-tight theme-hero-title">
                <div className="text-4xl font-black mb-2">
                  We take the hard work out
                </div>
                <div className="text-2xl font-medium">
                  of tailoring resumes for todays job market
                </div>
              </h1>
            </div>
          </div>

          {/* Image Section - Bottom half, full width and cut from bottom */}
          <div className="flex-1 relative overflow-hidden -mx-4">
            <div className="w-screen relative left-1/2 transform -translate-x-1/2">
              <div className="relative h-full overflow-hidden rounded-t-2xl shadow-2xl">
                <Image 
                  alt="Example of a customized resume showing technical skills and experience" 
                  width={500} 
                  height={650} 
                  className="w-full h-full object-cover object-top" 
                  src="/screenshots/resume.png"
                  priority
                />
              </div>
            </div>
          </div>
        </div>

        {/* Landscape Layout: Side-by-side */}
        <div className="hidden landscape:flex landscape:h-full landscape:items-center landscape:px-6">
          <div className="flex items-center gap-8 w-full max-w-4xl mx-auto">
            {/* Text - Left side */}
            <div className="flex-1">
              <h1 className="leading-tight theme-hero-title mb-4">
                <div className="text-5xl font-black mb-2">
                  We take the hard work out
                </div>
                <div className="text-3xl font-medium">
                  of tailoring resumes for todays job market
                </div>
              </h1>
              <p className="theme-text-secondary text-lg">
                Upload your resume and we'll help you customize it for each job application.
              </p>
            </div>
            
            {/* Image - Right side */}
            <div className="flex-1 max-w-xs">
              <Image 
                alt="Skill gap analysis showing matched and missing skills" 
                width={904} 
                height={595} 
                className="w-full h-auto rounded-xl shadow-xl" 
                src="/screenshots/skill-gap.png"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}