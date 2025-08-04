'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import posthog from 'posthog-js';
import Header from '@/components/header';
import ActionButton from '@/components/action-button';
import ThreeDotsLoader from '@/components/three-dots-loader';
import PageContainer from '@/components/page-container';
import PreviewPane from '@/components/preview-pane';
import SkillPill from '@/components/skill-pill';
import { LimitExceededModal } from '@/components/subscription-limit-warning';
import Footer from '@/components/footer';

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
  const [activeTab, setActiveTab] = useState<'resume' | 'cover-letter'>('resume');
  const [hasGeneratedCoverLetter, setHasGeneratedCoverLetter] = useState(false);

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

    // Load saved accent color
    const savedAccentColor = localStorage.getItem('accentColor')
    if (savedAccentColor) {
      document.documentElement.style.setProperty('--accent-color', savedAccentColor)
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
      // Generate only resume initially
      const resumeResponse = await fetch('/api/preview-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobDescription }),
      });

      console.log('Response status:', resumeResponse.status);
      
      if (resumeResponse.ok) {
        const resumeResult = await resumeResponse.json();
        setPreviewData(resumeResult);
        setShowPreview(true);
      } else if (resumeResponse.status === 429) {
        // Subscription limit exceeded
        console.log('429 response received, showing limit modal');
        try {
          const errorData = await resumeResponse.json();
          console.log('Error data:', errorData);
          console.log('upgradeToTier:', errorData.upgradeToTier);
          console.log('subscriptionStatus:', errorData.subscriptionStatus);
          setLimitData(errorData);
        } catch (e) {
          console.log('Failed to parse 429 response JSON, using default data');
          setLimitData({ message: 'Subscription limit exceeded' });
        }
        console.log('Setting showLimitModal to true');
        setShowLimitModal(true);
        console.log('showLimitModal state should now be true');
      } else {
        console.error('Error generating resume:', resumeResponse.statusText);
      }
    } catch (error) {
      console.error('Error generating preview:', error);
      console.error('Caught error, checking if it\'s a 429 issue');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateCoverLetter = async () => {
    if (!jobDescription.trim()) return;

    posthog.capture('cover_letter_generation_started', {
      is_first_generation: !hasGeneratedCoverLetter
    });
    setIsGeneratingCoverLetter(true);
    try {
      const response = await fetch('/api/preview-cover-letter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          jobDescription,
          isFirstGeneration: !hasGeneratedCoverLetter 
        }),
      });

      if (response.ok) {
        const coverLetterResult = await response.json();
        setCoverLetterData(coverLetterResult);
        setHasGeneratedCoverLetter(true);
        setActiveTab('cover-letter'); // Switch to cover letter tab on mobile
        posthog.capture('cover_letter_generation_completed', {
          is_first_generation: !hasGeneratedCoverLetter
        });
      } else if (response.status === 429) {
        // Subscription limit exceeded
        const errorData = await response.json();
        setLimitData(errorData);
        setShowLimitModal(true);
      } else {
        console.error('Error generating cover letter:', response.statusText);
      }
    } catch (error) {
      console.error('Error generating cover letter:', error);
    } finally {
      setIsGeneratingCoverLetter(false);
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

    posthog.capture('resume_regeneration_started');
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
        posthog.capture('resume_regeneration_completed');
      }
    } catch (error) {
      console.error('Error regenerating resume:', error);
    } finally {
      setIsRegeneratingResume(false);
    }
  };

  const handleRegenerateCoverLetter = async () => {
    if (!jobDescription.trim()) return;

    posthog.capture('cover_letter_regeneration_started');
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
        posthog.capture('cover_letter_regeneration_completed');
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
      <div className="min-h-screen flex flex-col">
        <Header />

        {/* Preview Content */}
        <div className="flex-1 flex flex-col p-4 lg:p-6 theme-bg-gradient">
          {/* Mobile Tabs - only show if cover letter exists */}
          {coverLetterData && (
            <div className="lg:hidden mb-4">
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
                  onClick={() => setActiveTab('cover-letter')}
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
          <div className="flex-1 lg:hidden">
            {coverLetterData ? (
              // Show tabs and tab content when cover letter exists
              <>
                {activeTab === 'resume' && (
                  <PreviewPane
                    title="Resume"
                    html={previewData?.html}
                    onDownload={handleDownloadResume}
                    onRegenerate={handleRegenerateResume}
                    isRegenerating={isRegeneratingResume}
                    isDownloading={isDownloadingResume}
                    isLoading={isGenerating && !previewData}
                    loadingText="Generating resume..."
                    actionButton={
                      <ActionButton
                        onClick={handleGenerateCoverLetter}
                        variant="ghost"
                        busy={isGeneratingCoverLetter}
                        className="text-xs px-2 py-1"
                      >
                        Regenerate Cover Letter
                      </ActionButton>
                    }
                  />
                )}
                {activeTab === 'cover-letter' && (
                  <PreviewPane
                    title="Cover Letter"
                    html={coverLetterData?.html}
                    onDownload={handleDownloadCoverLetter}
                    onRegenerate={handleRegenerateCoverLetter}
                    isRegenerating={isRegeneratingCoverLetter}
                    isDownloading={isDownloadingCoverLetter}
                    isLoading={false}
                    loadingText="Generating cover letter..."
                  />
                )}
              </>
            ) : (
              // Show only resume when no cover letter exists
              <PreviewPane
                title="Resume"
                html={previewData?.html}
                onDownload={handleDownloadResume}
                onRegenerate={handleRegenerateResume}
                isRegenerating={isRegeneratingResume}
                isDownloading={isDownloadingResume}
                isLoading={isGenerating && !previewData}
                loadingText="Generating resume..."
                actionButton={
                  <ActionButton
                    onClick={handleGenerateCoverLetter}
                    variant="ghost"
                    busy={isGeneratingCoverLetter}
                    className="text-xs px-2 py-1"
                  >
                    Generate Cover Letter
                  </ActionButton>
                }
              />
            )}
          </div>

          {/* Desktop Layout */}
          <div className="hidden lg:flex lg:items-center lg:justify-center lg:flex-1">
            {coverLetterData ? (
              // Two-column layout when cover letter exists
              <div className="grid grid-cols-2 gap-6 w-full max-w-7xl">
                <PreviewPane
                  title="Resume"
                  html={previewData?.html}
                  onDownload={handleDownloadResume}
                  onRegenerate={handleRegenerateResume}
                  isRegenerating={isRegeneratingResume}
                  isDownloading={isDownloadingResume}
                  isLoading={isGenerating && !previewData}
                  loadingText="Generating resume..."
                  actionButton={
                    <ActionButton
                      onClick={handleGenerateCoverLetter}
                      variant="ghost"
                      busy={isGeneratingCoverLetter}
                      className="text-xs px-2 py-1"
                    >
                      Regenerate Cover Letter
                    </ActionButton>
                  }
                />

                <PreviewPane
                  title="Cover Letter"
                  html={coverLetterData?.html}
                  onDownload={handleDownloadCoverLetter}
                  onRegenerate={handleRegenerateCoverLetter}
                  isRegenerating={isRegeneratingCoverLetter}
                  isDownloading={isDownloadingCoverLetter}
                  isLoading={false}
                  loadingText="Generating cover letter..."
                />
              </div>
            ) : (
              // Single resume layout when no cover letter exists - maintain paper ratio
              <div className="w-full max-w-2xl">
                <PreviewPane
                  title="Resume"
                  html={previewData?.html}
                  onDownload={handleDownloadResume}
                  onRegenerate={handleRegenerateResume}
                  isRegenerating={isRegeneratingResume}
                  isDownloading={isDownloadingResume}
                  isLoading={isGenerating && !previewData}
                  loadingText="Generating resume..."
                  actionButton={
                    <ActionButton
                      onClick={handleGenerateCoverLetter}
                      variant="ghost"
                      busy={isGeneratingCoverLetter}
                      className="text-xs px-2 py-1"
                    >
                      Generate Cover Letter
                    </ActionButton>
                  }
                />
              </div>
            )}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen theme-bg-gradient">
      <Header />
      <PageContainer>
        <div className="w-full">
          <div className="text-center mb-4 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold theme-text-primary mb-2">Create Your Resume</h1>
            {!skillGapReport && (
              <p className="theme-text-secondary text-sm md:text-base">Paste a job description to get a tailored resume and cover letter</p>
            )}
          </div>

          <div className="space-y-6 md:space-y-8">
              {!skillGapReport && (
                <div>
                  <label htmlFor="jobDescription" className="block text-base md:text-lg font-semibold theme-text-primary mb-2 md:mb-3">
                    📄 Job Description
                  </label>
                  <div className="relative">
                    <textarea
                      id="jobDescription"
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      className="w-full h-80 md:h-72 p-3 md:p-6 border-2 theme-border rounded-lg md:rounded-xl theme-input focus:ring-2 focus:ring-opacity-50 focus:border-opacity-50 resize-none transition-all duration-200 focus:shadow-lg"
                      style={{}}
                      placeholder="Paste the complete job description here...

Include role title, company, requirements, responsibilities, and qualifications for the best results."
                      spellCheck="false"
                    />
                  </div>
                </div>
              )}

              {skillGapReport && (
                <div className="theme-card p-4 md:p-8 rounded-xl">
                  <div className="flex items-center gap-3 mb-4 md:mb-6">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-base md:text-lg">🎯</span>
                    </div>
                    <div>
                      <h3 className="text-lg md:text-xl font-bold theme-text-primary">Skill Gap Analysis</h3>
                      <p className="text-xs md:text-sm theme-text-secondary">Review and optimize your skills for this role</p>
                    </div>
                  </div>

                  <div className="mb-6 p-4 theme-bg-secondary rounded-lg">
                    <p className="theme-text-secondary text-sm leading-relaxed">
                      We accumulate all the skills that hiring managers actually use in their posts. Select the ones that apply to you and we will add them to your profile. When generating your resume, we&apos;ll automatically select the closest matching skills from your profile that align with this specific job.
                    </p>
                  </div>

                  {skillGapReport.missingSkills && skillGapReport.missingSkills.length > 0 && (
                    <div className="mb-8">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="theme-text-accent font-medium">Missing Skills</span>
                        <span className="text-sm theme-text-tertiary">Click to add to your profile</span>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {skillGapReport.missingSkills.map((skill, index) => (
                          <SkillPill
                            key={index}
                            onClick={() => handleAddSkill(skill)}
                            variant="missing"
                          >
                            + {skill}
                          </SkillPill>
                        ))}
                      </div>
                    </div>
                  )}

                  {skillGapReport.matchingSkills && skillGapReport.matchingSkills.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="font-medium theme-text-primary">Matching Skills</span>
                        <span className="text-sm theme-text-tertiary">Great! These align with the job requirements</span>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {skillGapReport.matchingSkills.map((skill, index) => (
                          <SkillPill
                            key={index}
                            variant="matching"
                          >
                            ✓ {skill}
                          </SkillPill>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Terms of Service */}
              {skillGapReport ? (
                <div className="flex items-center gap-2 text-sm theme-text-tertiary theme-card p-3 rounded-lg">
                  <span className="theme-text-accent">✓</span>
                  Agreed to the Terms of Service and Privacy Policy
                </div>
              ) : (
                <div className="theme-card p-4 md:p-6 rounded-xl">
                  <div className="flex items-start gap-3">
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
                      className="mt-1 w-5 h-5 rounded border-2 border-gray-300 transition-colors"
                      style={{
                        accentColor: 'var(--accent-color)'
                      }}
                    />
                    <div>
                      <label htmlFor="acceptTerms" className="text-sm font-medium theme-text-primary cursor-pointer block mb-1">
                        📋 Terms & Privacy Agreement
                      </label>
                      <p className="text-sm theme-text-secondary">
                        I accept the{' '}
                        <span className="theme-text-accent hover:underline cursor-pointer font-medium">
                          Terms of Service and Privacy Policy
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4">
                {!skillGapReport ? (
                  <ActionButton
                    onClick={handleAnalyze}
                    disabled={!jobDescription.trim() || !acceptedTerms}
                    busy={isAnalyzing}
                    variant="primary"
                    className="w-full py-4 px-8 justify-center text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                  >
                    {isAnalyzing ? (
                      'Analyzing Skills...'
                    ) : (
                      <>
                        🔍 Analyze Skill Gaps
                      </>
                    )}
                  </ActionButton>
                ) : (
                  <div className="text-center">
                    <ActionButton
                      onClick={handleGenerate}
                      disabled={!acceptedTerms}
                      busy={isGenerating}
                      variant="primary"
                      className="w-full py-4 px-8 justify-center text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                    >
                      {isGenerating ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                          Generating Preview...
                        </>
                      ) : (
                        <>
                          Generate Resume
                        </>
                      )}
                    </ActionButton>
                    <p className="text-sm theme-text-tertiary mt-3">
                      This will create a tailored resume and cover letter based on your skills and the job requirements
                    </p>
                  </div>
                )}
              </div>

            <LimitExceededModal
              isOpen={showLimitModal}
              onClose={() => setShowLimitModal(false)}
              limitData={limitData || {}}
            />
          </div>
        </div>
      </PageContainer>
      <Footer />
    </div>
  );
}