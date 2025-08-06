'use client';

import Image from 'next/image';

export default function HeroSection() {
  return (
    <div className="h-screen relative overflow-hidden">
      <div className="absolute inset-0 z-0 theme-hero-bg">
        <div className="absolute inset-0 theme-hero-overlay"></div>
      </div>
      
      {/* Text Section - Better positioning */}
      <div className="flex items-start justify-center h-full relative z-10 pt-24 md:pt-32 lg:pt-40 xl:pt-48">
        <div className="text-left max-w-4xl lg:max-w-5xl xl:max-w-6xl px-4 sm:px-6 lg:px-8 xl:px-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight theme-hero-title px-2 sm:px-3">
            We take the hard work out of tailoring resumes for this Job Market!
          </h1>
        </div>
      </div>

      {/* Image Section - Constrained to container width */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-screen-xl z-10 overflow-hidden rounded-t-2xl shadow-2xl max-h-[40vh] lg:max-h-[35vh] xl:max-h-[45vh]">
        <Image 
          alt="Skill gap analysis showing matched and missing skills for job requirements" 
          width={904} 
          height={595} 
          className="w-full h-auto object-cover object-top" 
          src="/screenshots/skill-gap.png"
        />
      </div>
    </div>
  );
}