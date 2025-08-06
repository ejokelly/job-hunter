
'use client';

import { useState } from 'react';
import Image from 'next/image';
import ResumeUpload from '../resume/resume-upload';
import ThreeDotsLoader from '../ui/three-dots-loader';

interface UploadSectionProps {
  onUploadSuccess?: (userData: any) => void;
  onUploadError?: (error: string) => void;
}

export default function UploadSection({ onUploadSuccess, onUploadError }: UploadSectionProps) {
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
    <section id="upload" className="h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 theme-upload-bg">
      <div className="max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="space-y-8">
            <div>
              <h2 className="text-4xl sm:text-5xl font-bold mb-6 leading-tight theme-upload-title">
                Start by uploading your resume
              </h2>
              <p className="text-xl leading-relaxed theme-upload-text">
                We&apos;ll extract all your experience and skills, then help you customize it for each job application.
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
                  <div className="theme-upload-card rounded-2xl p-8 border">
                    <ResumeUpload 
                      onUploadSuccess={handleUploadSuccess}
                      onUploadError={handleUploadError}
                      onFileSelected={() => setHasFileSelected(true)}
                    />
                  </div>
                </div>

                {/* Back Side - Processing */}
                <div 
                  className="absolute inset-0 w-full theme-upload-processing-bg rounded-2xl p-8 min-h-[300px] flex flex-col justify-center" 
                  style={{ 
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)'
                  }}
                >
                  <div className="text-center space-y-6">
                    <div className="w-20 h-20 mx-auto bg-blue-600 rounded-2xl flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="theme-upload-processing-title text-xl font-semibold mb-4">
                        Processing Your Resume
                      </p>
                      <p className="theme-upload-processing-text text-lg leading-relaxed mb-6">
                        We are currently extracting the data from your resume. Once that is done we can make it super easy to create a customized resume and cover letter for your job application!
                      </p>
                      <ThreeDotsLoader />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-md lg:max-w-full">
              <Image 
                alt="Example of a customized resume showing technical skills and experience" 
                width={500} 
                height={650} 
                className="w-full h-auto rounded-xl shadow-2xl border theme-border" 
                src="/screenshots/resume.png"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
