'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Header from '@/components/header';
import ActionButton from '@/components/action-button';
import ThreeDotsLoader from '@/components/three-dots-loader';

interface SkillGapReport {
  missingSkills: string[];
  matchingSkills: string[];
}

interface PreviewData {
  html: string;
  data: any;
  jobDetails: {
    title: string;
    company: string;
  };
}

export default function NewResumePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  
  // Job description form states
  const [jobDescription, setJobDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);
  const [isRegeneratingResume, setIsRegeneratingResume] = useState(false);
  const [isRegeneratingCoverLetter, setIsRegeneratingCoverLetter] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [skillGapReport, setSkillGapReport] = useState<SkillGapReport | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [coverLetterData, setCoverLetterData] = useState<PreviewData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Check session and redirect if not authenticated
  useEffect(() => {
    if (session === null) {
      router.push('/');
      return;
    }
  }, [session, router]);

  // Check email verification status and redirect if not verified
  useEffect(() => {
    if (!session?.user?.email) return;
    
    const checkEmailVerification = async () => {
      try {
        const response = await fetch('/api/auth/check-verification');
        if (response.ok) {
          const data = await response.json();
          setEmailVerified(data.emailVerified);
          
          // If not verified, redirect to verification flow
          if (!data.emailVerified) {
            router.push('/');
            return;
          }
        }
      } catch (error) {
        console.error('Error checking verification status:', error);
      }
    };

    checkEmailVerification();
  }, [session, router]);

  // Job description handlers
  const handleAnalyze = async () => {
    if (!jobDescription.trim()) return;
    
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/analyze-skills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobDescription }),
      });

      if (response.ok) {
        const report = await response.json();
        setSkillGapReport(report);
      }
    } catch (error) {
      console.error('Error analyzing skills:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddSkill = async (skill: string) => {
    // Optimistically update the UI immediately
    if (skillGapReport) {
      setSkillGapReport({
        ...skillGapReport,
        missingSkills: skillGapReport.missingSkills.filter(s => s !== skill),
        matchingSkills: [...(skillGapReport.matchingSkills || []), skill]
      });
    }

    // Make API call in background
    try {
      const response = await fetch('/api/add-skill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ skill }),
      });

      if (!response.ok) {
        // Revert on error
        if (skillGapReport) {
          setSkillGapReport({
            ...skillGapReport,
            missingSkills: [...skillGapReport.missingSkills, skill],
            matchingSkills: skillGapReport.matchingSkills.filter(s => s !== skill)
          });
        }
      }
    } catch (error) {
      console.error('Error adding skill:', error);
      // Revert on error
      if (skillGapReport) {
        setSkillGapReport({
          ...skillGapReport,
          missingSkills: [...skillGapReport.missingSkills, skill],
          matchingSkills: skillGapReport.matchingSkills.filter(s => s !== skill)
        });
      }
    }
  };

  const handleGenerate = async () => {
    if (!jobDescription.trim()) return;
    
    setIsGenerating(true);
    try {
      // Generate both resume and cover letter previews in parallel
      const [resumeResponse, coverLetterResponse] = await Promise.all([
        fetch('/api/preview-resume', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ jobDescription }),
        }),
        fetch('/api/preview-cover-letter', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ jobDescription }),
        })
      ]);

      if (resumeResponse.ok && coverLetterResponse.ok) {
        const resumeResult = await resumeResponse.json();
        const coverLetterResult = await coverLetterResponse.json();
        setPreviewData(resumeResult);
        setCoverLetterData(coverLetterResult);
        setShowPreview(true);
      }
    } catch (error) {
      console.error('Error generating preview:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadResume = async () => {
    if (!jobDescription.trim()) return;
    
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobDescription }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'resume.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error generating resume:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadCoverLetter = async () => {
    if (!jobDescription.trim()) return;
    
    setIsGeneratingCoverLetter(true);
    try {
      const response = await fetch('/api/generate-cover-letter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobDescription }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'cover-letter.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error generating cover letter:', error);
    } finally {
      setIsGeneratingCoverLetter(false);
    }
  };

  const handleRegenerateResume = async () => {
    if (!jobDescription.trim()) return;
    
    setIsRegeneratingResume(true);
    try {
      const response = await fetch('/api/preview-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobDescription }),
      });

      if (response.ok) {
        const result = await response.json();
        setPreviewData(result);
      }
    } catch (error) {
      console.error('Error regenerating resume:', error);
    } finally {
      setIsRegeneratingResume(false);
    }
  };

  const handleRegenerateCoverLetter = async () => {
    if (!jobDescription.trim()) return;
    
    setIsRegeneratingCoverLetter(true);
    try {
      const response = await fetch('/api/preview-cover-letter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobDescription }),
      });

      if (response.ok) {
        const result = await response.json();
        setCoverLetterData(result);
      }
    } catch (error) {
      console.error('Error regenerating cover letter:', error);
    } finally {
      setIsRegeneratingCoverLetter(false);
    }
  };

  const handleBack = () => {
    setShowPreview(false);
    setPreviewData(null);
    setCoverLetterData(null);
    setJobDescription('');
    setSkillGapReport(null);
    setIsAnalyzing(false);
    setIsGenerating(false);
    setIsGeneratingCoverLetter(false);
    setIsRegeneratingResume(false);
    setIsRegeneratingCoverLetter(false);
  };

  // Show preview if generating or preview is available
  if (showPreview || isGenerating) {
    return (
      <div className="min-h-screen theme-bg-secondary">
        <Header 
          actions={
            <>
              <ActionButton
                onClick={handleGenerate}
                variant="ghost"
                busy={isGenerating}
              >
                Regenerate
              </ActionButton>
              <div className="border-l theme-border mx-2" />
              <ActionButton
                onClick={handleDownloadResume}
                variant="primary"
                busy={previewData ? isGenerating : false}
                disabled={!previewData}
              >
                Download Resume
              </ActionButton>
              <ActionButton
                onClick={handleDownloadCoverLetter}
                variant="secondary"
                busy={coverLetterData ? (isGeneratingCoverLetter || (isGenerating && !coverLetterData)) : false}
                disabled={!coverLetterData}
              >
                Download Cover Letter
              </ActionButton>
            </>
          }
        />

        {/* Preview Content */}
        <div className="max-w-7xl mx-auto p-6">
          <ActionButton
            onClick={handleBack}
            variant="ghost"
            className="mb-6"
          >
            ← Back
          </ActionButton>
          {isGenerating && (!previewData || !coverLetterData) ? (
            <div className="grid grid-cols-2 gap-6">
              {/* Resume Loading Pane */}
              <div className="theme-card rounded-lg overflow-hidden">
                <div className="theme-bg-tertiary px-4 py-2 border-b theme-border-light">
                  <h3 className="text-sm font-semibold theme-text-secondary">Resume</h3>
                </div>
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <ThreeDotsLoader className="mx-auto mb-4" />
                    <p className="theme-text-tertiary">Generating resume...</p>
                  </div>
                </div>
              </div>
              
              {/* Cover Letter Loading Pane */}
              <div className="theme-card rounded-lg overflow-hidden">
                <div className="theme-bg-tertiary px-4 py-2 border-b theme-border-light">
                  <h3 className="text-sm font-semibold theme-text-secondary">Cover Letter</h3>
                </div>
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <ThreeDotsLoader className="mx-auto mb-4" />
                    <p className="theme-text-tertiary">Generating cover letter...</p>
                  </div>
                </div>
              </div>
            </div>
          ) : previewData && coverLetterData ? (
            <div className="grid grid-cols-2 gap-6">
              {/* Resume Preview */}
              <div className="theme-card rounded-lg overflow-hidden">
                <div className="theme-bg-tertiary px-4 py-2 border-b theme-border-light flex justify-between items-center">
                  <h3 className="text-sm font-semibold theme-text-secondary">Resume</h3>
                  <ActionButton
                    onClick={handleRegenerateResume}
                    variant="ghost"
                    busy={isRegeneratingResume}
                    className="text-xs py-1 px-2"
                  >
                    Regenerate
                  </ActionButton>
                </div>
                <iframe
                  srcDoc={`
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <meta charset="utf-8">
                        <title>Resume Preview</title>
                        <script src="https://cdn.tailwindcss.com"></script>
                        <style>
                          body { 
                            font-family: 'Inter', sans-serif; 
                            margin: 0; 
                            padding: 0;
                            background: white;
                          }
                        </style>
                      </head>
                      <body>
                        ${previewData.html}
                      </body>
                    </html>
                  `}
                  className="w-full h-[800px] border-0"
                  title="Resume Preview"
                />
              </div>
              
              {/* Cover Letter Preview */}
              <div className="theme-card rounded-lg overflow-hidden">
                <div className="theme-bg-tertiary px-4 py-2 border-b theme-border-light flex justify-between items-center">
                  <h3 className="text-sm font-semibold theme-text-secondary">Cover Letter</h3>
                  <ActionButton
                    onClick={handleRegenerateCoverLetter}
                    variant="ghost"
                    busy={isRegeneratingCoverLetter}
                    className="text-xs py-1 px-2"
                  >
                    Regenerate
                  </ActionButton>
                </div>
                <iframe
                  srcDoc={`
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <meta charset="utf-8">
                        <title>Cover Letter Preview</title>
                        <script src="https://cdn.tailwindcss.com"></script>
                        <style>
                          body { 
                            font-family: 'Inter', sans-serif; 
                            margin: 0; 
                            padding: 0;
                            background: white;
                          }
                        </style>
                      </head>
                      <body>
                        ${coverLetterData.html}
                      </body>
                    </html>
                  `}
                  className="w-full h-[800px] border-0"
                  title="Cover Letter Preview"
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen theme-bg-gradient">
      <Header />
      <div className="max-w-4xl mx-auto p-8">
        <ActionButton
          onClick={() => router.push('/')}
          variant="ghost"
          className="mb-6"
        >
          ← Back
        </ActionButton>
        <div className="theme-card rounded-lg p-8">
          <div className="space-y-6">
            <div>
              <label htmlFor="jobDescription" className="block text-sm font-medium theme-text-secondary mb-2">
                Job Description
              </label>
              <textarea
                id="jobDescription"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                disabled={skillGapReport !== null}
                className={`w-full h-64 p-4 border theme-border rounded-lg theme-input focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none ${
                  skillGapReport ? 'cursor-not-allowed' : ''
                }`}
                placeholder="Paste the job description here..."
                spellCheck="false"
              />
            </div>

            {skillGapReport && (
              <div className="theme-bg-tertiary p-6 rounded-lg mb-6">
                <h3 className="text-lg font-semibold theme-text-primary mb-4">Skill Gap Analysis</h3>
                
                {skillGapReport.missingSkills && skillGapReport.missingSkills.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-md font-medium theme-text-secondary mb-2">Missing Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {skillGapReport.missingSkills.map((skill, index) => (
                        <ActionButton
                          key={index}
                          onClick={() => handleAddSkill(skill)}
                          variant="skill"
                        >
                          + {skill}
                        </ActionButton>
                      ))}
                    </div>
                  </div>
                )}

                {skillGapReport.matchingSkills && skillGapReport.matchingSkills.length > 0 && (
                  <div>
                    <h4 className="text-md font-medium theme-text-secondary mb-2">Matching Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {skillGapReport.matchingSkills.map((skill, index) => (
                        <span
                          key={index}
                          className="theme-skill-matching px-3 py-1 rounded-full text-sm"
                        >
                          ✓ {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Terms of Service Checkbox */}
            <div className="flex items-start gap-3 p-4 theme-bg-tertiary rounded-lg">
              <input
                type="checkbox"
                id="acceptTerms"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="acceptTerms" className="text-sm theme-text-secondary cursor-pointer">
                I accept the{' '}
                <span className="theme-text-primary hover:underline cursor-pointer">
                  Terms of Service and Privacy Policy
                </span>
                {' '}(required to continue)
              </label>
            </div>

            <div className="space-y-4">
              {!skillGapReport ? (
                <ActionButton
                  onClick={handleAnalyze}
                  disabled={!jobDescription.trim() || !acceptedTerms}
                  busy={isAnalyzing}
                  className="w-full py-3 px-6 justify-center"
                >
                  {isAnalyzing ? 'Analyzing Skills...' : 'Analyze Skill Gaps'}
                </ActionButton>
              ) : (
                <ActionButton
                  onClick={handleGenerate}
                  disabled={!acceptedTerms}
                  busy={isGenerating}
                  className="w-full py-3 px-6 justify-center"
                >
                  {isGenerating ? 'Generating Preview...' : 'Generate'}
                </ActionButton>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}