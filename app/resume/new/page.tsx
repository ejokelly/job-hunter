'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDevice } from '@/app/providers/device-provider';
import posthog from 'posthog-js';
import Header from '@/pc/auth/header';
import ActionButton from '@/pc/ui/action-button';
import ThreeDotsLoader from '@/pc/ui/three-dots-loader';
import Brand from '@/pc/ui/brand';
import PageContainer from '@/pc/layout/page-container';
import PreviewPane from '@/pc/resume/preview-pane';
import SkillPill from '@/pc/resume/skill-pill';
import { LimitExceededModal } from '@/pc/ui/subscription-limit-warning';
import Footer from '@/pc/layout/footer';
import MobileNewResumePage from '@/mobile/resume/new-resume-page';
import { useNotificationContext } from '@/app/providers/notification-provider';

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
  const { isMobile } = useDevice();
  const { showDownloadNotification } = useNotificationContext();
  const [session, setSession] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

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

    posthog.capture('skill_gap_analysis_started');
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
        posthog.capture('skill_gap_analysis_completed', {
          missing_skills_count: report.missingSkills?.length || 0,
          matching_skills_count: report.matchingSkills?.length || 0
        });
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
    if (!skillGapReport) return;

    // Capture original state before optimistic update
    const originalReport = { ...skillGapReport };
    
    // Optimistically update the UI immediately
    setSkillGapReport({
      ...skillGapReport,
      missingSkills: skillGapReport.missingSkills.filter(s => s !== skill),
      matchingSkills: [...(skillGapReport.matchingSkills || []), skill]
    });

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
        // Revert to original state on error
        setSkillGapReport(originalReport);
      } else {
        posthog.capture('skill_added_to_profile', {
          skill: skill,
          method: 'skill_gap_suggestion'
        });
      }
    } catch (error) {
      console.error('Error adding skill:', error);
      // Revert to original state on error
      setSkillGapReport(originalReport);
    }
  };

  const handleGenerate = async () => {
    if (!jobDescription.trim()) return;

    posthog.capture('resume_generation_started');
    setIsGenerating(true);
    try {
      // Generate resume and auto-download
      const resumeResponse = await fetch('/api/generate-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobDescription }),
      });

      console.log('Response status:', resumeResponse.status);
      
      if (resumeResponse.ok) {
        const result = await resumeResponse.json();
        
        // Set preview data
        setPreviewData(result);
        setShowPreview(true);
        
        // Auto-download the PDF
        if (result.pdf && result.pdf.buffer) {
          const pdfBuffer = new Uint8Array(result.pdf.buffer);
          const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = result.pdf.filename || 'resume.pdf';
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          
          // Show download notification
          console.log('🔔 DOWNLOAD NOTIFICATION TRIGGER: Initial resume generation', result.pdf.filename || 'resume.pdf');
          showDownloadNotification(result.pdf.filename || 'resume.pdf', 'resume');
        }
        
        posthog.capture('resume_generation_completed', {
          filename: result.pdf?.filename
        });
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
        console.error('Error generating resume:', resumeResponse.status, resumeResponse.statusText);
        try {
          const errorData = await resumeResponse.json();
          console.error('Error details:', errorData);
        } catch (e) {
          console.error('Could not parse error response:', e);
        }
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
      const response = await fetch('/api/generate-cover-letter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          jobDescription,
          isRegeneration: false
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setCoverLetterData(result);
        setHasGeneratedCoverLetter(true);
        setActiveTab('cover-letter'); // Switch to cover letter tab on mobile
        
        // Auto-download PDF
        if (result.pdf && result.pdf.buffer) {
          const pdfBuffer = new Uint8Array(result.pdf.buffer);
          const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = result.pdf.filename || 'cover-letter.pdf';
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          
          // Show download notification
          console.log('🔔 DOWNLOAD NOTIFICATION TRIGGER: Initial cover letter generation', result.pdf.filename || 'cover-letter.pdf');
          showDownloadNotification(result.pdf.filename || 'cover-letter.pdf', 'cover-letter');
        }
        
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



  const handleRegenerateResume = async () => {
    if (!jobDescription.trim()) return;

    posthog.capture('resume_regeneration_started');
    setIsRegeneratingResume(true);
    try {
      // Same call as generate - just pass isRegeneration flag
      const response = await fetch('/api/generate-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobDescription, isRegeneration: true }),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Set updated preview data
        setPreviewData(result);
        
        // Auto-download the regenerated PDF
        if (result.pdf && result.pdf.buffer) {
          const pdfBuffer = new Uint8Array(result.pdf.buffer);
          const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = result.pdf.filename || 'resume-regenerated.pdf';
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          
          // Show download notification
          console.log('🔔 DOWNLOAD NOTIFICATION TRIGGER: Resume regeneration', result.pdf.filename || 'resume-regenerated.pdf');
          showDownloadNotification(result.pdf.filename || 'resume-regenerated.pdf', 'resume');
        }
        
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
      const response = await fetch('/api/generate-cover-letter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobDescription, isRegeneration: true }),
      });

      if (response.ok) {
        const result = await response.json();
        setCoverLetterData(result);
        
        // Auto-download PDF on regenerate too
        if (result.pdf && result.pdf.buffer) {
          const pdfBuffer = new Uint8Array(result.pdf.buffer);
          const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = result.pdf.filename || 'cover-letter.pdf';
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          
          // Show download notification
          console.log('🔔 DOWNLOAD NOTIFICATION TRIGGER: Cover letter regeneration', result.pdf.filename || 'cover-letter.pdf');
          showDownloadNotification(result.pdf.filename || 'cover-letter.pdf', 'cover-letter');
        }
        
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
    // Mobile version with tabs
    if (isMobile) {
      return (
        <div className="h-screen flex flex-col">
          <Header />
          {isGenerating && !previewData ? (
            <div className="flex-1 flex items-center justify-center theme-bg-gradient">
              <div className="text-center">
                <ThreeDotsLoader />
                <h2 className="text-4xl font-light theme-text-primary mt-8 leading-tight">Generating resume...</h2>
              </div>
            </div>
          ) : (
            <MobileNewResumePage
              previewData={previewData}
              coverLetterData={coverLetterData}
              handleRegenerateResume={handleRegenerateResume}
              handleRegenerateCoverLetter={handleRegenerateCoverLetter}
              handleGenerateCoverLetter={handleGenerateCoverLetter}
              isRegeneratingResume={isRegeneratingResume}
              isRegeneratingCoverLetter={isRegeneratingCoverLetter}
              isGeneratingCoverLetter={isGeneratingCoverLetter}
              isGenerating={isGenerating}
            />
          )}
        </div>
      );
    }

    // Desktop version
    return (
      <div className="min-h-screen flex flex-col">
        <Header />

        {/* Desktop Layout */}
        <div className="flex-1 flex flex-col p-4 lg:p-6 theme-bg-gradient">
          <div className="hidden lg:flex lg:items-center lg:justify-center lg:flex-1">
            {coverLetterData ? (
              // Two-column layout when cover letter exists
              <div className="grid grid-cols-2 gap-6 w-full max-w-7xl">
                <PreviewPane
                  title="Resume"
                  html={previewData?.html}
                  onRegenerate={handleRegenerateResume}
                  isRegenerating={isRegeneratingResume}
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
                  onRegenerate={handleRegenerateCoverLetter}
                  isRegenerating={isRegeneratingCoverLetter}
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
                  onRegenerate={handleRegenerateResume}
                  isRegenerating={isRegeneratingResume}
                  isLoading={isGenerating && !previewData}
                  loadingText="Generating resume..."
                  actionButton={
                    !hasGeneratedCoverLetter ? (
                      <ActionButton
                        onClick={handleGenerateCoverLetter}
                        variant="ghost"
                        busy={isGeneratingCoverLetter}
                        className="text-xs px-2 py-1"
                      >
                        Generate Cover Letter
                      </ActionButton>
                    ) : null
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
      {isMobile ? (
        // Mobile Apple-style layout
        <div className="px-6 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-light theme-text-primary mb-4 text-left leading-tight">
              Tailor Your Resume
            </h1>
            {!skillGapReport && (
              <p className="theme-text-secondary text-lg text-left leading-relaxed">
                Paste a job description to get a tailored resume and cover letter
              </p>
            )}
          </div>

          <div className="space-y-6">
              {!skillGapReport && (
                <div>
                  <label htmlFor="jobDescription" className="block text-lg font-medium theme-text-primary mb-4 text-left">
                    Job Description
                  </label>
                  <div className="relative">
                    <textarea
                      id="jobDescription"
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      className="w-full h-96 p-4 bg-gray-50 dark:bg-gray-800 border-0 rounded-xl theme-text-primary placeholder-gray-400 focus:ring-2 focus:ring-blue-500 transition-all text-base resize-none"
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
      ) : (
        // Desktop layout
        <PageContainer>
          <div className="w-full">
            <div className="text-center mb-4 md:mb-8">
              <h1 className="text-2xl md:text-3xl font-bold theme-text-primary mb-2">Tailor Your Resume</h1>
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

                          localStorage.setItem('termsAccepted', 'true');
                          localStorage.setItem('termsAcceptedDate', timestamp);

                          const expires = new Date();
                          expires.setDate(expires.getDate() + 30);
                          document.cookie = `termsAccepted=true; expires=${expires.toUTCString()}; path=/`;
                          document.cookie = `termsAcceptedDate=${timestamp}; expires=${expires.toUTCString()}; path=/`;

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
      )}
      <Footer />
    </div>
  );
}