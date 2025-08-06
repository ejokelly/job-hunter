'use client';

import Image from 'next/image';

export default function HeroSection() {
  return (
    <div className="h-screen flex items-start justify-center px-4 pt-20 sm:pt-24 md:pt-32 lg:pt-20 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 z-0 theme-hero-bg">
        <div className="absolute inset-0 theme-hero-overlay"></div>
      </div>
      
      <div className="max-w-4xl w-full text-center relative z-10">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 sm:mb-8 leading-tight px-2 theme-hero-title">
          Upload your resume, paste a job description, and get a customized resume and cover letter in minutes.
        </h1>
   
      </div>

      {/* Skill Gap Preview */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 z-20 w-full px-4">
        <div className="flex justify-center">
          <Image 
            alt="Skill gap analysis showing matched and missing skills for job requirements" 
            width={904} 
            height={595} 
            className="rounded-t-2xl shadow-2xl block" 
            src="/screenshots/skill-gap.png"
          />
        </div>
      </div>
    </div>
  );
}