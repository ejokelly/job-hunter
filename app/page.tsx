'use client';

import { useState, useEffect } from 'react';
import { Upload } from 'lucide-react';
// Using custom auth system instead of next-auth
import { useRouter } from 'next/navigation';
import ActionButton from '@/components/action-button';
import ThreeDotsLoader from '@/components/three-dots-loader';
import Header from '@/components/header';
import ResumeUpload from '@/components/resume-upload';
import Brand from '@/components/brand';

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
    
    // Use dedicated session creation API
    console.log('🔥 About to create session for:', userData.userId, userData.email);
    try {
      console.log('🔥 Making request to /api/create-session...');
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

      console.log('🔥 Session response status:', sessionResponse.status);
      const responseData = await sessionResponse.json();
      console.log('🔥 Session response data:', responseData);

      if (sessionResponse.ok) {
        console.log('🔥 Session created successfully!');
        
        // Check if cookie was actually set
        setTimeout(() => {
          console.log('🔥 All cookies after session creation:', document.cookie);
          // Force page reload to pick up session
          window.location.href = `/verify/${userData.resumeId}`;
        }, 100);
      } else {
        console.error('🔥 Failed to create session:', responseData);
      }
    } catch (error) {
      console.error('🔥 Error creating session:', error);
    }
  };

  const handleSendCode = async () => {
    if (!signInEmail.trim()) return;
    
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
    console.error('Upload error:', error);
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
      <div className="min-h-screen theme-bg-gradient">
        <Header />
        <div className="flex items-center justify-center p-8" style={{ minHeight: 'calc(100vh - 80px)' }}>
          <div className="max-w-6xl w-full">
            {/* Brand Header */}
            <div className="text-center mb-12">
              <h1 className="text-4xl theme-text-primary mb-4"><Brand /></h1>
            </div>

            {/* Main Content - Side by side on desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
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
                    <div className="theme-card rounded-lg p-8">
                      <div className="text-center mb-6">
                        <h3 className="text-xl font-medium theme-text-primary mb-2">No account? Start here</h3>
                        <p className="theme-text-secondary">Upload your resume to get started</p>
                      </div>
                      <ResumeUpload 
                        onUploadSuccess={handleUploadSuccess}
                        onUploadError={handleUploadError}
                        onFileSelected={() => setHasFileSelected(true)}
                      />
                    </div>
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

              {/* Sign In Section */}
              {!hasFileSelected && (
                <div className="theme-card rounded-lg p-8">
                  {!codeSent ? (
                    <>
                      <div className="text-center mb-6">
                        <h3 className="text-xl font-medium theme-text-primary mb-2">Already have an account?</h3>
                        <p className="theme-text-secondary">Enter your email to get a sign-in code</p>
                      </div>
                      
                      <div className="space-y-4">
                        <input
                          type="email"
                          value={signInEmail}
                          onChange={(e) => setSignInEmail(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && signInEmail.trim() && !isSigningIn) {
                              handleSendCode()
                            }
                          }}
                          className="w-full p-4 border theme-border rounded-lg theme-input focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="Enter your email"
                          disabled={isSigningIn}
                        />
                        <ActionButton
                          onClick={handleSendCode}
                          variant="outline"
                          className="w-full py-4 justify-center"
                          busy={isSigningIn}
                          disabled={!signInEmail.trim() || isSigningIn}
                        >
                          {isSigningIn ? 'Sending Code...' : 'Send Code'}
                        </ActionButton>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-center mb-6">
                        <h3 className="text-xl font-medium theme-text-primary mb-2">Enter Your Code</h3>
                        <p className="theme-text-secondary">
                          We sent a code to<br />
                          <span className="font-medium">{signInEmail}</span>
                        </p>
                      </div>
                      
                      <div className="space-y-4">
                        <input
                          type="text"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && verificationCode.trim() && !isVerifyingCode) {
                              handleVerifyCode()
                            }
                          }}
                          className="w-full p-4 border theme-border rounded-lg theme-input focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-center text-lg font-mono"
                          placeholder="happy-tiger"
                          disabled={isVerifyingCode}
                          autoFocus
                        />
                        <ActionButton
                          onClick={handleVerifyCode}
                          variant="primary"
                          className="w-full py-4 justify-center"
                          busy={isVerifyingCode}
                          disabled={!verificationCode.trim() || isVerifyingCode}
                        >
                          {isVerifyingCode ? 'Verifying...' : 'Sign In'}
                        </ActionButton>
                        <div className="flex gap-2">
                          <ActionButton
                            onClick={() => {
                              setCodeSent(false);
                              setVerificationCode('');
                            }}
                            variant="ghost"
                            className="flex-1 py-2 justify-center text-sm"
                          >
                            Try Different Email
                          </ActionButton>
                          <ActionButton
                            onClick={handleSendCode}
                            variant="ghost"
                            className="flex-1 py-2 justify-center text-sm"
                            busy={isSigningIn}
                            disabled={isSigningIn}
                          >
                            {isSigningIn ? 'Sending...' : 'Send New Code'}
                          </ActionButton>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Processing State */}
              {hasFileSelected && (
                <div className="theme-card rounded-lg p-8 flex items-center justify-center">
                  <div className="text-center">
                    <p className="theme-text-secondary text-lg">Processing your resume...</p>
                  </div>
                </div>
              )}
            </div>


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
        </div>
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
              <div className="mb-6">
                <Brand className="!w-auto !flex !justify-center !items-center text-6xl" />
              </div>
              <h1 className="text-5xl md:text-6xl font-bold theme-text-primary mb-6 leading-tight">
                AI-Powered Resume Builder
              </h1>
              <p className="text-xl theme-text-secondary mb-20 max-w-3xl mx-auto leading-relaxed">
                Create tailored resumes and cover letters using AI that match job descriptions perfectly. Upload your resume and let our AI do the rest.
              </p>
              
              <div className="flex justify-center mb-20">
                <ActionButton
                  onClick={() => router.push('/resume/new')}
                  className="text-xl py-6 px-12 text-white theme-bg-accent hover:opacity-90 rounded-lg font-semibold shadow-lg"
                >
                  Start Building Your Resume
                </ActionButton>
              </div>
            </div>
            
            {/* How It Works */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
              <div>
                <h3 className="text-xl font-semibold theme-text-primary mb-6">1. Upload Your Resume</h3>
                <p className="theme-text-secondary leading-relaxed text-base">
                  We will do the work to extract it - just drop your PDF and our AI handles the rest
                </p>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold theme-text-primary mb-6">2. Paste Job Description</h3>
                <p className="theme-text-secondary leading-relaxed text-base">
                  Paste in a job description of a position you want - we&apos;ll analyze what they&apos;re looking for
                </p>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold theme-text-primary mb-6">3. Address Skill Gaps</h3>
                <p className="theme-text-secondary leading-relaxed text-base">
                  We make it easy to address skill gaps - add missing skills with one click
                </p>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold theme-text-primary mb-6">4. Get Custom Documents</h3>
                <p className="theme-text-secondary leading-relaxed text-base">
                  You get a custom cover letter and resume with exactly the skills the hiring manager wants
                </p>
              </div>
            </div>
          </div>
        </div>
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
    </div>
  );
}
