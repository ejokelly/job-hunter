'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';
import ActionButton from '@/components/action-button';
import ThreeDotsLoader from '@/components/three-dots-loader';
import PageContainer from '@/components/page-container';
import PreviewPane from '@/components/preview-pane';
import SkillPill from '@/components/skill-pill';
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
      <div className="min-h-screen theme-bg-secondary flex flex-col">
        <Header />

        {/* Preview Content */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="grid grid-cols-2 gap-6 max-w-7xl w-full">
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
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold theme-text-primary mb-2">Create Your Resume</h1>
            <p className="theme-text-secondary">Paste a job description to get a tailored resume and cover letter</p>
          </div>

          <div className="theme-card rounded-xl p-8 shadow-lg">
            <div className="space-y-8">
              <div>
                <label htmlFor="jobDescription" className="block text-lg font-semibold theme-text-primary mb-3">
                  📄 Job Description
                </label>
                <div className="relative">
                  <textarea
                    id="jobDescription"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    disabled={skillGapReport !== null}
                    className={`w-full h-72 p-6 border-2 theme-border rounded-xl theme-input focus:ring-2 focus:ring-opacity-50 focus:border-opacity-50 resize-none transition-all duration-200 ${skillGapReport ? 'cursor-not-allowed opacity-50' : 'focus:shadow-lg'
                      }`}
                    style={{}}
                    placeholder="Paste the complete job description here...

Include role title, company, requirements, responsibilities, and qualifications for the best results."
                    spellCheck="false"
                  />
                  {skillGapReport && (
                    <div className="absolute top-4 right-4 px-3 py-1 text-sm rounded-full theme-btn-primary">
                      ✓ Analyzed
                    </div>
                  )}
                </div>
              </div>

              {skillGapReport && (
                <div className="theme-card p-8 rounded-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-lg">🎯</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold theme-text-primary">Skill Gap Analysis</h3>
                      <p className="text-sm theme-text-secondary">Review and optimize your skills for this role</p>
                    </div>
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
                <div className="theme-card p-6 rounded-xl">
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
                          Generate Resume & Cover Letter
                        </>
                      )}
                    </ActionButton>
                    <p className="text-sm theme-text-tertiary mt-3">
                      This will create a tailored resume and cover letter based on your skills and the job requirements
                    </p>
                  </div>
                )}
              </div>
            </div>

            <LimitExceededModal
              isOpen={showLimitModal}
              onClose={() => setShowLimitModal(false)}
              limitData={limitData || {}}
            />
          </div>
        </div>
      </PageContainer>
    </div>
  );
}