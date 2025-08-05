'use client';

import { useState, useEffect } from 'react';
import { Upload } from 'lucide-react';
import Image from 'next/image';
// Using custom auth system instead of next-auth
import { useRouter } from 'next/navigation';
import posthog from 'posthog-js';
import ActionButton from '@/components/action-button';
import ThreeDotsLoader from '@/components/three-dots-loader';
import Header from '@/components/header';
import Footer from '@/components/footer';
import ResumeUpload from '@/components/resume-upload';
import Brand from '@/components/brand';
import SubscriptionLimitWarning, { LimitExceededModal } from '@/components/subscription-limit-warning';

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

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const router = useRouter();
  const [jobDescription, setJobDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);
  const [isRegeneratingResume, setIsRegeneratingResume] = useState(false);
  const [isRegeneratingCoverLetter, setIsRegeneratingCoverLetter] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [coverLetterData, setCoverLetterData] = useState<PreviewData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [skillGapReport, setSkillGapReport] = useState<SkillGapReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Simple states for resume upload demo
  const [showUpload, setShowUpload] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [signInEmail, setSignInEmail] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [hasFileSelected, setHasFileSelected] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedToken, setVerifiedToken] = useState<string | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitInfo, setLimitInfo] = useState<{
    weeklyCount?: number
    weeklyLimit?: number
    monthlyCount?: number
    monthlyLimit?: number
    subscriptionStatus?: string
    upgradeToTier?: string
    upgradePrice?: number
    stripePriceId?: string
  } | null>(null);

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

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) return;
    
    posthog.capture('skill_analysis_started');
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
        posthog.capture('skill_analysis_completed', {
          missing_skills_count: report.missingSkills?.length || 0,
          matching_skills_count: report.matchingSkills?.length || 0
        });
      } else if (response.status === 429) {
        // Subscription limit exceeded - show upgrade modal
        const errorData = await response.json();
        setLimitInfo({ 
          weeklyCount: errorData.weeklyCount || 0,
          weeklyLimit: errorData.weeklyLimit || 15,
          monthlyCount: errorData.monthlyCount || 0,
          monthlyLimit: errorData.monthlyLimit || 100,
          subscriptionStatus: errorData.subscriptionStatus || 'free',
          upgradeToTier: errorData.upgradeToTier,
          upgradePrice: errorData.upgradePrice,
          stripePriceId: errorData.stripePriceId
        });
        setShowLimitModal(true);
      }
    } catch (error) {
      console.error('Error analyzing skills:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddSkill = async (skill: string) => {
    posthog.capture('skill_added', { skill: skill });
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
    
    posthog.capture('resume_generation_started');
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
        posthog.capture('resume_generation_completed', {
          has_resume: !!resumeResult,
          has_cover_letter: !!coverLetterResult
        });
      } else {
        // Check for rate limit errors
        if (resumeResponse.status === 429) {
          const errorData = await resumeResponse.json();
          setLimitInfo({ 
            weeklyCount: errorData.weeklyCount || 0,
            weeklyLimit: errorData.weeklyLimit || 15,
            monthlyCount: errorData.monthlyCount || 0,
            monthlyLimit: errorData.monthlyLimit || 100,
            subscriptionStatus: errorData.subscriptionStatus || 'free',
            upgradeToTier: errorData.upgradeToTier,
            upgradePrice: errorData.upgradePrice,
            stripePriceId: errorData.stripePriceId
          });
          setShowLimitModal(true);
        } else if (coverLetterResponse.status === 429) {
          const errorData = await coverLetterResponse.json();
          setLimitInfo({ 
            weeklyCount: errorData.weeklyCount || 0,
            weeklyLimit: errorData.weeklyLimit || 15,
            monthlyCount: errorData.monthlyCount || 0,
            monthlyLimit: errorData.monthlyLimit || 100,
            subscriptionStatus: errorData.subscriptionStatus || 'free',
            upgradeToTier: errorData.upgradeToTier,
            upgradePrice: errorData.upgradePrice,
            stripePriceId: errorData.stripePriceId
          });
          setShowLimitModal(true);
        }
      }
    } catch (error) {
      console.error('Error generating preview:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadResume = async () => {
    if (!jobDescription.trim()) return;
    
    posthog.capture('resume_download_started');
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
        posthog.capture('resume_download_completed', {
          file_type: 'pdf',
          download_method: 'generated'
        });
      } else if (response.status === 429) {
        const errorData = await response.json();
        setLimitInfo({ 
          weeklyCount: errorData.weeklyCount || 0,
          weeklyLimit: errorData.weeklyLimit || 15,
          monthlyCount: errorData.monthlyCount || 0,
          monthlyLimit: errorData.monthlyLimit || 100,
          subscriptionStatus: errorData.subscriptionStatus || 'free',
          upgradeToTier: errorData.upgradeToTier,
          upgradePrice: errorData.upgradePrice,
          stripePriceId: errorData.stripePriceId
        });
        setShowLimitModal(true);
      }
    } catch (error) {
      console.error('Error generating resume:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadCoverLetter = async () => {
    if (!jobDescription.trim()) return;
    
    posthog.capture('cover_letter_download_started');
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
        posthog.capture('cover_letter_download_completed', {
          file_type: 'pdf',
          download_method: 'generated'
        });
      } else if (response.status === 429) {
        const errorData = await response.json();
        setLimitInfo({ 
          weeklyCount: errorData.weeklyCount || 0,
          weeklyLimit: errorData.weeklyLimit || 15,
          monthlyCount: errorData.monthlyCount || 0,
          monthlyLimit: errorData.monthlyLimit || 100,
          subscriptionStatus: errorData.subscriptionStatus || 'free',
          upgradeToTier: errorData.upgradeToTier,
          upgradePrice: errorData.upgradePrice,
          stripePriceId: errorData.stripePriceId
        });
        setShowLimitModal(true);
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
        body: JSON.stringify({ jobDescription }),
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
    posthog.capture('back_button_clicked');
    setShowPreview(false);
    setPreviewData(null);
    setCoverLetterData(null);
    setShowForm(false);
    setJobDescription('');
    setSkillGapReport(null);
    setIsAnalyzing(false);
    setIsGenerating(false);
    setIsGeneratingCoverLetter(false);
    setIsRegeneratingResume(false);
    setIsRegeneratingCoverLetter(false);
    setShowUpload(false);
    setParsedData(null);
  };

  const handleUploadSuccess = async (userData: { userId: string; email: string; name: string; message: string; resumeId: string; sessionToken: string; jwtToken: string; emailVerified: boolean }) => {
    console.log('🔥🔥🔥 UPLOAD SUCCESS HANDLER CALLED!!! 🔥🔥🔥');
    console.log('🔥 Upload success, full data:', userData);
    
    // Create session so user stays logged in
    try {
      const sessionResponse = await fetch('/api/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userData.userId,
          email: userData.email,
          name: userData.name
        }),
      });

      if (sessionResponse.ok) {
        // Redirect to resume builder page
        window.location.href = `/resume/new`;
      } else {
        console.error('Failed to create session');
      }
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const handleSendCode = async () => {
    if (!signInEmail.trim()) return;
    
    posthog.capture('auth_code_requested', { email: signInEmail });
    setIsSigningIn(true);
    try {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: signInEmail
        }),
      });
      
      if (response.ok) {
        console.log('Verification code sent successfully');
        setCodeSent(true);
        posthog.capture('auth_code_sent', { email: signInEmail });
      } else {
        const errorData = await response.json();
        console.error('Error sending code:', errorData);
      }
    } catch (error) {
      console.error('Error sending code:', error);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) return;
    
    setIsVerifyingCode(true);
    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: signInEmail,
          code: verificationCode
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Code verified successfully, user signed in');
        setSession(data.user);
        posthog.capture('user_signed_in', { 
          email: signInEmail,
          user_id: data.user?.id 
        });
        posthog.identify(data.user?.id, { email: signInEmail });
        // Reset form state
        setCodeSent(false);
        setSignInEmail('');
        setVerificationCode('');
      } else {
        const errorData = await response.json();
        console.error('Code verification failed:', errorData);
        alert(errorData.error || 'Invalid code. Please try again.');
      }
    } catch (error) {
      console.error('Error verifying code:', error);
      alert('Error verifying code. Please try again.');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleUploadError = (error: string) => {
    console.log('Upload error:', error);
    // Reset file selection state so user can see the error message
    setHasFileSelected(false);
  };


  if (sessionLoading) {
    return (
      <div className="min-h-screen theme-bg-gradient flex items-center justify-center">
        <ThreeDotsLoader />
      </div>
    );
  }

  if (!showForm && !session) {
    return (
      <div className="h-screen w-screen relative overflow-hidden">
        {/* Header */}
        <Header />
        
        {/* Page Scroller */}
        <ReactPageScroller
          pageOnChange={handlePageChange}
          customPageNumber={currentPage}
          animationTimer={1000}
          animationTimerBuffer={100}
          transitionTimingFunction="cubic-bezier(0.25, 0.46, 0.45, 0.94)"
          containerHeight="100vh"
          containerWidth="100vw"
          blockScrollUp={false}
          blockScrollDown={false}
          renderAllPagesOnFirstRender={false}
        >
          {/* Page 1 - Hero Only */}
          <div className="h-screen w-screen flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8 theme-bg-gradient relative z-10">
            <div className="max-w-4xl w-full text-center">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold theme-text-primary mb-6 sm:mb-8 leading-tight px-2">
                <strong>We take</strong> the hard work out of creating resumes tailored for the job!
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl theme-text-secondary leading-relaxed max-w-3xl mx-auto px-4">
                Upload your resume, paste a job description, and get a customized resume and cover letter in minutes.
              </p>
            </div>
          </div>

          {/* Page 2 - Resume Upload */}
          <div className="h-screen w-screen flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8 theme-bg-gradient relative z-10">
            <div className="max-w-6xl w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              {/* Left Side - Upload Section */}
              <div className="space-y-6 lg:space-y-8">
                <div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold theme-text-primary mb-4 sm:mb-6 leading-tight">
                    Start by uploading your resume
                  </h2>
                  <p className="text-base sm:text-lg theme-text-secondary leading-relaxed">
                    We'll extract all your experience and skills, then help you customize it for each job application.
                  </p>
                </div>

                {/* Upload Section */}
                <div className="relative perspective-1000">
                  <div 
                    className={`
                      w-full transition-transform duration-700 transform-style-preserve-3d
                      ${hasFileSelected ? 'rotate-y-180' : ''}
                    `}
                  >
                    {/* Front Side - Upload Form */}
                    <div className="w-full backface-hidden">
                      <ResumeUpload 
                        onUploadSuccess={handleUploadSuccess}
                        onUploadError={handleUploadError}
                        onFileSelected={() => setHasFileSelected(true)}
                      />
                    </div>

                    {/* Back Side - Processing */}
                    <div className="absolute inset-0 w-full backface-hidden rotate-y-180">
                      <div className="theme-card rounded-lg p-8 h-full flex flex-col justify-center">
                        <div className="text-center space-y-6">
                          <p className="theme-text-secondary text-lg leading-relaxed">
                            We are currently extracting the data from your resume. Once that is done we can make it super easy to create a customized resume and cover letter for your job application!
                          </p>
                          <ThreeDotsLoader className="mx-auto" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side - Resume Screenshot */}
              <div className="flex justify-center lg:justify-end mt-8 lg:mt-0">
                <div className="w-full max-w-sm sm:max-w-md lg:max-w-full">
                  <Image 
                    src="/screenshots/resume.png" 
                    alt="Example of a customized resume showing technical skills and experience" 
                    width={600}
                    height={800}
                    className="w-full h-auto rounded-lg shadow-lg"
                    priority
                  />
                </div>
              </div>
            </div>
            </div>
          </div>

          {/* Page 3 - Skill Management */}
          <div className="h-screen w-screen flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8 theme-bg-gradient relative z-10">
            <div className="max-w-4xl w-full text-center space-y-6 sm:space-y-8">
            {/* Header */}
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold theme-text-primary leading-tight px-2">
              Smart Skill Management
            </h2>
            
            {/* Image */}
            <div className="flex justify-center px-4">
              <div className="w-full max-w-2xl">
                <Image 
                  src="/screenshots/skill-gap.png" 
                  alt="Skill gap analysis interface showing missing and matching skills with one-click selection" 
                  width={904}
                  height={595}
                  className="w-full h-auto rounded-lg shadow-lg"
                  priority
                />
              </div>
            </div>
            
            {/* Text */}
            <p className="text-base sm:text-lg md:text-xl theme-text-secondary leading-relaxed max-w-3xl mx-auto px-4">
              As you apply to more resumes, we keep track of the skills you selected. Not every hiring manager uses the same skills keywords the same way. We allow you to select the exact wording they ask for on each job, building a long list of your skills in many variations. Then when you apply, we those skills up front and bold them on your resume, improving your chance of matching the job.
            </p>
            </div>
          </div>

          {/* Page 4 - Value Proposition */}
          <div className="h-screen w-screen flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8 theme-bg-gradient relative z-10">
            <div className="max-w-5xl w-full">
            <div className="theme-card rounded-xl p-6 sm:p-8 md:p-12">
              <div className="text-center space-y-6 sm:space-y-8">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold theme-text-primary leading-tight px-2">
                  Stop sending the same resume to every job that is general and uninspiring.
                </h2>
                
                <div className="max-w-4xl mx-auto">
                  <p className="text-lg sm:text-xl theme-text-secondary leading-relaxed mb-4 sm:mb-6 px-2">
                    Instead let resumelove do the hard work of customizing your resume specifically for the skills the hiring manager is looking for!
                  </p>
                  <p className="text-base sm:text-lg theme-text-tertiary leading-relaxed px-2">
                    We use an ATS friendly resume template that is designed with data science to get the most views!
                  </p>
                </div>
                
                {/* Pricing Card */}
                <div className="theme-bg-tertiary rounded-lg p-6 sm:p-8 max-w-md mx-auto border theme-border">
                  <div className="text-center">
                    <div className="text-3xl sm:text-4xl md:text-5xl font-bold theme-text-primary mb-3">$25</div>
                    <div className="text-lg sm:text-xl theme-text-secondary mb-4">for 100 custom resumes a month</div>
                    <p className="text-sm sm:text-base theme-text-tertiary px-2">
                      Subscribe by uploading your resume and trying out resumelove
                    </p>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>
        </ReactPageScroller>

        <style jsx>{`
          .perspective-1000 {
            perspective: 1000px;
          }
          .transform-style-preserve-3d {
            transform-style: preserve-3d;
          }
          .backface-hidden {
            backface-visibility: hidden;
          }
          .rotate-y-180 {
            transform: rotateY(180deg);
          }
        `}</style>
      </div>
    );
  }

  if (!showForm && session) {
    return (
      <div className="min-h-screen theme-bg-gradient">
        <Header />
        <div className="flex items-center justify-center px-8 py-16" style={{ minHeight: 'calc(100vh - 80px)' }}>
          <div className="max-w-6xl w-full">
            {/* Hero Section */}
            <div className="text-center mb-20">
              <div className="mb-6 hidden md:block">
                <Brand className="!w-auto !flex !justify-center !items-center text-6xl" />
              </div>
              <h1 className="text-5xl md:text-6xl font-bold theme-text-primary mb-6 leading-tight">
                AI-Powered Resume Builder
              </h1>
              <p className="text-xl theme-text-secondary mb-8 max-w-3xl mx-auto leading-relaxed">
                Create tailored resumes and cover letters using AI that match job descriptions perfectly. Upload your resume and let our AI do the rest.
              </p>
              
              
              <div className="flex justify-center mb-20">
                <ActionButton
                  onClick={async () => {
                    posthog.capture('start_building_resume_clicked');
                    // Check subscription status and pass it to the next page
                    if (session?.id) {
                      try {
                        const response = await fetch('/api/subscription/status')
                        if (response.ok) {
                          const subscriptionData = await response.json()
                          // Store in sessionStorage to pass to next page
                          sessionStorage.setItem('subscriptionData', JSON.stringify(subscriptionData))
                        }
                      } catch (error) {
                        console.error('Error fetching subscription status:', error)
                      }
                    }
                    router.push('/resume/new')
                  }}
                  className="text-xl py-6 px-12 text-white theme-bg-accent hover:opacity-90 rounded-lg font-semibold shadow-lg"
                >
                  Start Building Your Resume
                </ActionButton>
              </div>
            </div>
            
            {/* How It Works */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 max-w-4xl mx-auto">
              <div>
                <h3 className="text-lg md:text-xl font-semibold theme-text-primary mb-3 md:mb-6">1. Upload Your Resume</h3>
                <p className="theme-text-secondary leading-relaxed text-sm md:text-base">
                  We will do the work to extract it - just drop your PDF and our AI handles the rest
                </p>
              </div>
              
              <div>
                <h3 className="text-lg md:text-xl font-semibold theme-text-primary mb-3 md:mb-6">2. Paste Job Description</h3>
                <p className="theme-text-secondary leading-relaxed text-sm md:text-base">
                  Paste in a job description of a position you want - we&apos;ll analyze what they&apos;re looking for
                </p>
              </div>
              
              <div>
                <h3 className="text-lg md:text-xl font-semibold theme-text-primary mb-3 md:mb-6">3. Address Skill Gaps</h3>
                <p className="theme-text-secondary leading-relaxed text-sm md:text-base">
                  We make it easy to address skill gaps - add missing skills with one click
                </p>
              </div>
              
              <div>
                <h3 className="text-lg md:text-xl font-semibold theme-text-primary mb-3 md:mb-6">4. Get Custom Documents</h3>
                <p className="theme-text-secondary leading-relaxed text-sm md:text-base">
                  You get a custom cover letter and resume with exactly the skills the hiring manager wants
                </p>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Show preview if generating or preview is available
  if (showPreview || isGenerating) {
    return (
      <div className="min-h-screen theme-bg-secondary">
        <Header 
          title="Document Preview"
          onBack={handleBack}
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
      <Header 
        title="Create Tailored Resume"
        onBack={handleBack}
      />
      <div className="max-w-4xl mx-auto p-8">
        <div className="theme-card rounded-lg p-8">

          <div className="space-y-6">
            {!skillGapReport && (
              <div>
                <label htmlFor="jobDescription" className="block text-sm font-medium theme-text-secondary mb-2">
                  Job Description
                </label>
                <textarea
                  id="jobDescription"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="w-full h-64 p-4 border theme-border rounded-lg theme-input focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  placeholder="Paste the job description here..."
                  spellCheck="false"
                />
              </div>
            )}

            {skillGapReport && (
              <div className="theme-bg-tertiary p-6 rounded-lg mb-6">
                <h3 className="text-lg font-semibold theme-text-primary mb-4">Skill Gap Analysis</h3>
                
                <div className="mb-6 p-4 theme-bg-secondary rounded-lg">
                  <p className="theme-text-secondary text-sm leading-relaxed">
                    We accumulate all the skills that hiring managers actually use in their posts. Select the ones that apply to you and we will add them to your profile. When generating your resume, we&apos;ll automatically select the closest matching skills from your profile that align with this specific job.
                  </p>
                </div>
                
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



            <div className="space-y-4">
              {!skillGapReport ? (
                <ActionButton
                  onClick={handleAnalyze}
                  disabled={!jobDescription.trim()}
                  busy={isAnalyzing}
                  className="w-full py-3 px-6 justify-center"
                >
                  {isAnalyzing ? 'Analyzing Skills...' : 'Analyze Skill Gaps'}
                </ActionButton>
              ) : (
                <ActionButton
                  onClick={handleGenerate}
                  disabled={false}
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

      {/* Limit Exceeded Modal */}
      {limitInfo && (
        <LimitExceededModal
          isOpen={showLimitModal}
          onClose={() => setShowLimitModal(false)}
          limitData={limitInfo}
        />
      )}
    </div>
  );
}
