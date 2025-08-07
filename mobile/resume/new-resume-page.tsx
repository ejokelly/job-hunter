'use client';

import { useState } from 'react';
import PreviewPane from '@/pc/resume/preview-pane';
import ActionButton from '@/pc/ui/action-button';

interface PreviewData {
  html: string;
  data: any;
  jobDetails: {
    title: string;
    company: string;
  };
}

interface MobileNewResumePageProps {
  previewData: PreviewData | null;
  coverLetterData: PreviewData | null;
  handleRegenerateResume: () => void;
  handleRegenerateCoverLetter: () => void;
  handleGenerateCoverLetter: () => void;
  isRegeneratingResume: boolean;
  isRegeneratingCoverLetter: boolean;
  isGeneratingCoverLetter: boolean;
  isGenerating: boolean;
}

export default function MobileNewResumePage({
  previewData,
  coverLetterData,
  handleRegenerateResume,
  handleRegenerateCoverLetter,
  handleGenerateCoverLetter,
  isRegeneratingResume,
  isRegeneratingCoverLetter,
  isGeneratingCoverLetter,
  isGenerating
}: MobileNewResumePageProps) {
  const [activeTab, setActiveTab] = useState<'resume' | 'cover-letter'>('resume');

  return (
    <div className="flex-1 flex flex-col p-4 theme-bg-gradient">
      {/* Mobile Tabs - show when resume exists */}
      {previewData && (
        <div className="mb-4">
          <div className="flex border-b theme-border-light">
            <button
              onClick={() => setActiveTab('resume')}
              className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'resume'
                  ? 'border-[var(--accent-color)] theme-text-accent'
                  : 'border-transparent theme-text-secondary hover:theme-text-primary'
              }`}
            >
              Resume
            </button>
            <button
              onClick={() => {
                setActiveTab('cover-letter');
                // Generate cover letter if it doesn't exist
                if (!coverLetterData) {
                  handleGenerateCoverLetter();
                }
              }}
              className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'cover-letter'
                  ? 'border-[var(--accent-color)] theme-text-accent'
                  : 'border-transparent theme-text-secondary hover:theme-text-primary'
              }`}
            >
              Cover Letter
            </button>
          </div>
        </div>
      )}

      {/* Mobile Content */}
      <div className="flex-1 overflow-auto relative">
        {activeTab === 'resume' && (
          isGenerating && !previewData ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="flex justify-center space-x-2 mb-6">
                  <div className="w-4 h-4 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-4 h-4 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-4 h-4 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <p className="theme-text-tertiary text-lg">Generating resume...</p>
              </div>
            </div>
          ) : (
            <div className="theme-card rounded-lg overflow-hidden relative">
              <div className="theme-bg-tertiary px-4 py-1 border-b theme-border-light flex justify-between items-center">
                <div className="flex-1"></div>
                <div className="flex gap-1">
                  <button
                    onClick={handleRegenerateResume}
                    disabled={isRegeneratingResume}
                    className="p-1 theme-text-secondary hover:theme-text-primary disabled:opacity-50 transition-colors"
                  >
                    {isRegeneratingResume ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div 
                className={`overflow-auto transition-opacity duration-300 ${
                  isRegeneratingResume ? 'opacity-30' : 'opacity-100'
                }`}
                style={{ 
                  transform: 'scale(0.6)',
                  transformOrigin: 'top center',
                  width: '166.67%', // Compensate for 0.6 scale
                  marginLeft: '-33.33%', // Center the scaled content
                  height: '166.67%' // Compensate for 0.6 scale
                }}
              >
                {previewData && (
                  <div dangerouslySetInnerHTML={{ __html: previewData.html }} />
                )}
              </div>
            </div>
          )
        )}
        {activeTab === 'cover-letter' && (
          isGeneratingCoverLetter && !coverLetterData ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="flex justify-center space-x-2 mb-6">
                  <div className="w-4 h-4 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-4 h-4 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-4 h-4 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <p className="theme-text-tertiary text-lg">Generating cover letter...</p>
              </div>
            </div>
          ) : (
            <div className="theme-card rounded-lg overflow-hidden relative">
              <div className="theme-bg-tertiary px-4 py-1 border-b theme-border-light flex justify-between items-center">
                <div className="flex-1"></div>
                <div className="flex gap-1">
                  <button
                    onClick={handleRegenerateCoverLetter}
                    disabled={isRegeneratingCoverLetter}
                    className="p-1 theme-text-secondary hover:theme-text-primary disabled:opacity-50 transition-colors"
                  >
                    {isRegeneratingCoverLetter ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div 
                className={`overflow-auto transition-opacity duration-300 ${
                  isRegeneratingCoverLetter ? 'opacity-30' : 'opacity-100'
                }`}
                style={{ 
                  transform: 'scale(0.6)',
                  transformOrigin: 'top center',
                  width: '166.67%', // Compensate for 0.6 scale
                  marginLeft: '-33.33%', // Center the scaled content
                  height: '166.67%' // Compensate for 0.6 scale
                }}
              >
                {coverLetterData && (
                  <div dangerouslySetInnerHTML={{ __html: coverLetterData.html }} />
                )}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}