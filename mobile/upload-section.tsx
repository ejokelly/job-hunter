'use client';

import { useState } from 'react';
import Image from 'next/image';
import MobileResumeUpload from './resume-upload';

interface MobileUploadSectionProps {
  onUploadSuccess?: (userData: any) => void;
  onUploadError?: (error: string) => void;
}

export default function MobileUploadSection({ onUploadSuccess, onUploadError }: MobileUploadSectionProps) {
  const [hasFileSelected, setHasFileSelected] = useState(false);

  const handleUploadSuccess = (userData: any) => {
    if (onUploadSuccess) {
      onUploadSuccess(userData);
    }
  };

  const handleUploadError = (error: string) => {
    setHasFileSelected(false);
    if (onUploadError) {
      onUploadError(error);
    }
  };

  return (
    <div className="h-full theme-upload-bg">
      {/* Portrait Layout */}
      <div className="portrait:flex portrait:flex-col portrait:h-full landscape:hidden">
        {/* Text and Upload Section - Top */}
        <div className="flex-1 flex flex-col justify-center px-4 py-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-4 theme-upload-title">
              Start by uploading your resume
            </h2>
            <p className="theme-upload-text text-base leading-relaxed">
              We'll extract all your experience and skills, then help you customize it for each job application.
            </p>
          </div>

          <div className="relative">
            <div 
              className="w-full transition-transform duration-700"
              style={{ 
                transformStyle: 'preserve-3d',
                transform: hasFileSelected ? 'rotateY(180deg)' : 'rotateY(0deg)'
              }}
            >
              {/* Front Side - Upload Form */}
              <div className="w-full" style={{ backfaceVisibility: 'hidden' }}>
                <MobileResumeUpload
                  onUploadSuccess={handleUploadSuccess}
                  onUploadError={handleUploadError}
                  onFileSelected={() => setHasFileSelected(true)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Resume Preview Image - Bottom, full width and cut from bottom */}
        <div className="relative overflow-hidden -mx-4">
          <div className="w-screen relative left-1/2 transform -translate-x-1/2">
            <div className="relative h-48 overflow-hidden rounded-t-2xl shadow-2xl">
              <Image 
                alt="Example of a customized resume showing technical skills and experience" 
                width={500} 
                height={650} 
                className="w-full h-auto object-cover object-top" 
                src="/screenshots/resume.png"
                priority
                style={{
                  minHeight: '192px', // h-48 equivalent
                  objectFit: 'cover',
                  objectPosition: 'top'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Landscape Layout - Side by Side */}
      <div className="hidden landscape:flex landscape:h-full landscape:items-center landscape:px-6">
        <div className="flex items-center gap-8 w-full max-w-6xl mx-auto">
          {/* Text and Upload Section */}
          <div className="flex-1">
            <h2 className="text-3xl font-bold mb-4 theme-upload-title">
              Start by uploading your resume
            </h2>
            <p className="theme-upload-text text-lg leading-relaxed mb-6">
              We'll extract all your experience and skills, then help you customize it for each job application.
            </p>
            
            <MobileResumeUpload
              onUploadSuccess={handleUploadSuccess}
              onUploadError={handleUploadError}
              onFileSelected={() => setHasFileSelected(true)}
            />
          </div>

          {/* Image Section - Right side */}
          <div className="flex-1 max-w-md">
            <Image 
              alt="Skill gap analysis showing matched and missing skills for job requirements" 
              width={904} 
              height={595} 
              className="w-full h-auto rounded-xl shadow-2xl" 
              src="/screenshots/skill-gap.png"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  );
}