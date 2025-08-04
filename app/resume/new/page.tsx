'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';
import ActionButton from '@/components/action-button';
import ThreeDotsLoader from '@/components/three-dots-loader';
import PageContainer from '@/components/page-container';
import PreviewPane from '@/components/preview-pane';
import { LimitExceededModal } from '@/components/subscription-limit-warning';

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
  const [session, setSession] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  
  // Job description form states
  const [jobDescription, setJobDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);
  const [isRegeneratingResume, setIsRegeneratingResume] = useState(false);
  const [isRegeneratingCoverLetter, setIsRegeneratingCoverLetter] = useState(false);
  const [isDownloadingResume, setIsDownloadingResume] = useState(false);
  const [isDownloadingCoverLetter, setIsDownloadingCoverLetter] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [skillGapReport, setSkillGapReport] = useState<SkillGapReport | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [coverLetterData, setCoverLetterData] = useState<PreviewData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitData, setLimitData] = useState<any>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);

  // Load session on component mount
  useEffect(() => {
    async function loadSession() {
      try {
        const response = await fetch('/api/auth/session')
        const data = await response.json()
        setSession(data.user || null)
      } catch (error) {
        console.error('Error loading session:', error)
        setSession(null)
      } finally {
        setSessionLoading(false)
      }
    }
    
    loadSession()
  }, [])

  // Check session and redirect if not authenticated
  useEffect(() => {
    if (sessionLoading) return;
    
    if (!session) {
      router.push('/');
      return;
    }
  }, [session, sessionLoading, router]);

  // Check for existing terms agreement
  useEffect(() => {
    const checkTermsAgreement = () => {
      // Check localStorage first
      const localAgreement = localStorage.getItem('termsAccepted');
      if (localAgreement) {
        setAcceptedTerms(true);
        return;
      }

      // Check cookie
      const cookieAgreement = document.cookie
        .split('; ')
        .find(row => row.startsWith('termsAccepted='));
      
      if (cookieAgreement) {
        setAcceptedTerms(true);
        // Sync to localStorage
        localStorage.setItem('termsAccepted', 'true');
      }
    };

    checkTermsAgreement();
  }, []);

  // Check subscription status on component mount
  useEffect(() => {
    async function checkSubscriptionStatus() {
      if (!session?.id) return;
      
      // First check if subscription data was passed from homepage (but skip if just subscribed)
      const justSubscribed = new URLSearchParams(window.location.search).get('success') === 'true';
      const cachedData = sessionStorage.getItem('subscriptionData');
      
      if (cachedData && !justSubscribed) {
        try {
          const status = JSON.parse(cachedData);
          setSubscriptionStatus(status);
          
          // If user cannot create resume, show modal immediately
          if (!status.canCreateResume) {
            setLimitData(status);
            setShowLimitModal(true);
          }
          // Clear the cached data after use
          sessionStorage.removeItem('subscriptionData');
          return;
        } catch (error) {
          console.error('Error parsing cached subscription data:', error);
        }
      }
      
      // Clear cached data if user just subscribed
      if (justSubscribed) {
        sessionStorage.removeItem('subscriptionData');
      }
      
      // Fallback to API call if no cached data
      try {
        const response = await fetch('/api/subscription/status');
        if (response.ok) {
          const status = await response.json();
          setSubscriptionStatus(status);
          
          // If user cannot create resume, show modal immediately
          if (!status.canCreateResume) {
            setLimitData(status);
            setShowLimitModal(true);
          }
        }
      } catch (error) {
        console.error('Error checking subscription status:', error);
      }
    }

    if (session) {
      checkSubscriptionStatus();
    }
  }, [session]);

  // Note: Email verification is handled by the verify page flow
  // Users only reach this page after verification is complete

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
      } else if (response.status === 429) {
        // Subscription limit exceeded
        const errorData = await response.json();
        setLimitData(errorData);
        setShowLimitModal(true);
      } else {
        console.error('Error analyzing skills:', response.statusText);
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
    
    setIsDownloadingResume(true);
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
      setIsDownloadingResume(false);
    }
  };

  const handleDownloadCoverLetter = async () => {
    if (!jobDescription.trim()) return;
    
    setIsDownloadingCoverLetter(true);
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
      setIsDownloadingCoverLetter(false);
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
        body: JSON.stringify({ jobDescription, isRegeneration: true }),
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
        body: JSON.stringify({ jobDescription, isRegeneration: true }),
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
        <Header />

        {/* Preview Content */}
        <div className="max-w-7xl mx-auto p-6">
          <div className="grid grid-cols-2 gap-6">
            <PreviewPane
              title="Resume"
              html={previewData?.html}
              onDownload={handleDownloadResume}
              onRegenerate={handleRegenerateResume}
              isRegenerating={isRegeneratingResume}
              isDownloading={isDownloadingResume}
              isLoading={isGenerating && !previewData}
              loadingText="Generating resume..."
            />
            
            <PreviewPane
              title="Cover Letter"
              html={coverLetterData?.html}
              onDownload={handleDownloadCoverLetter}
              onRegenerate={handleRegenerateCoverLetter}
              isRegenerating={isRegeneratingCoverLetter}
              isDownloading={isDownloadingCoverLetter}
              isLoading={isGenerating && !coverLetterData}
              loadingText="Generating cover letter..."
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen theme-bg-gradient">
      <Header />
      <PageContainer>
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

            {/* Terms of Service */}
            {skillGapReport ? (
              <div className="text-xs theme-text-tertiary">
                Agreed to the Terms of Service and Privacy Policy
              </div>
            ) : (
              <div className="flex items-start gap-2 p-4 theme-bg-tertiary rounded-lg">
                <input
                  type="checkbox"
                  id="acceptTerms"
                  checked={acceptedTerms}
                  onChange={async (e) => {
                    const accepted = e.target.checked;
                    setAcceptedTerms(accepted);
                    
                    if (accepted) {
                      const timestamp = new Date().toISOString();
                      
                      // Store in localStorage
                      localStorage.setItem('termsAccepted', 'true');
                      localStorage.setItem('termsAcceptedDate', timestamp);
                      
                      // Store in cookie (30 days)
                      const expires = new Date();
                      expires.setDate(expires.getDate() + 30);
                      document.cookie = `termsAccepted=true; expires=${expires.toUTCString()}; path=/`;
                      document.cookie = `termsAcceptedDate=${timestamp}; expires=${expires.toUTCString()}; path=/`;
                      
                      // Store in MongoDB
                      try {
                        await fetch('/api/save-terms-agreement', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ agreedAt: timestamp }),
                        });
                      } catch (error) {
                        console.error('Error saving terms agreement to database:', error);
                      }
                    }
                  }}
                  className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="acceptTerms" className="text-sm theme-text-secondary cursor-pointer">
                  I accept the{' '}
                  <span className="theme-text-primary hover:underline cursor-pointer">
                    Terms of Service and Privacy Policy
                  </span>
                </label>
              </div>
            )}

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
      </PageContainer>
      
      {/* Subscription Limit Modal */}
      <LimitExceededModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        limitData={limitData || {}}
      />
    </div>
  );
}