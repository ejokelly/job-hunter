'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Mail, CheckCircle } from 'lucide-react';
import Header from '@/components/header';
import ActionButton from '@/components/action-button';
import ThreeDotsLoader from '@/components/three-dots-loader';
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

export default function VerifyPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  
  // Job description form states
  const [jobDescription, setJobDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [skillGapReport, setSkillGapReport] = useState<SkillGapReport | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [coverLetterData, setCoverLetterData] = useState<PreviewData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Check session and redirect if not authenticated
  useEffect(() => {
    console.log('🔍 Verify page - session check:', session, 'status:', status);
    
    // Only redirect if session is fully loaded and is null (not just undefined/loading)
    if (status === 'loading') {
      console.log('🔍 Session still loading...');
      return;
    }
    
    if (status === 'unauthenticated' || session === null) {
      console.log('🔍 No session found, redirecting to home');
      router.push('/');
      return;
    } 
    
    if (session) {
      console.log('🔍 Session found:', session);
    }
  }, [session, status, router]);

  // Check email verification status
  useEffect(() => {
    if (!session?.user?.email) return;
    
    const checkEmailVerification = async () => {
      console.log('Checking verification for resume:', params.resumeId);
      try {
        const response = await fetch(`/api/check-verification-by-resume/${params.resumeId}`);
        if (response.ok) {
          const data = await response.json();
          console.log('Verification check result:', data);
          setEmailVerified(data.emailVerified);
        }
      } catch (error) {
        console.error('Error checking verification status:', error);
      }
    };

    checkEmailVerification();
  }, [params.resumeId, session]);

  // Poll for verification status
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    console.log('Polling effect - emailVerified:', emailVerified, 'type:', typeof emailVerified);
    
    if (emailVerified === false) {
      console.log('Starting polling for verification...');
      interval = setInterval(async () => {
        console.log('Polling verification status...');
        try {
          const response = await fetch(`/api/check-verification-by-resume/${params.resumeId}`);
          if (response.ok) {
            const data = await response.json();
            console.log('Poll result:', data);
            if (data.emailVerified) {
              console.log('Email verified! Redirecting to resume form');
              setEmailVerified(true);
              clearInterval(interval);
              router.push('/resume/new');
            }
          }
        } catch (error) {
          console.error('Error polling verification status:', error);
        }
      }, 3000); // Poll every 3 seconds
    }

    return () => {
      if (interval) {
        console.log('Cleaning up polling interval');
        clearInterval(interval);
      }
    };
  }, [emailVerified]);

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

  const handleResendEmail = async () => {
    if (!session?.user?.email) return;
    
    setIsResending(true);
    setResendMessage('');
    
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: session.user.email
        }),
      });

      if (response.ok) {
        setResendMessage('Verification email sent! Check your inbox.');
      } else {
        setResendMessage('Failed to send email. Please try again.');
      }
    } catch (error) {
      console.error('Error resending email:', error);
      setResendMessage('Failed to send email. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen theme-bg-gradient">
      <Header />
      
      {/* Email Verification Overlay */}
      {!emailVerified && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md mx-4 text-center">
            <Mail className="w-16 h-16 mx-auto mb-6 theme-icon-primary" />
            <h2 className="text-xl font-bold theme-text-primary mb-4">Check Your Email</h2>
            <p className="theme-text-secondary mb-6">
              We've sent a verification link to your email address. Please click the link to verify your account and continue.
            </p>
            <p className="theme-text-tertiary text-sm mb-6">
              Don't see the email? Check your spam folder. We're checking automatically for verification...
            </p>
            
            {resendMessage && (
              <p className={`text-sm mb-4 ${resendMessage.includes('sent') ? 'text-green-600' : 'text-red-600'}`}>
                {resendMessage}
              </p>
            )}
            
            <div className="flex justify-center">
              <ActionButton
                onClick={handleResendEmail}
                busy={isResending}
                variant="ghost"
                className="text-sm py-2 px-4"
              >
                {isResending ? 'Sending...' : 'Send Again'}
              </ActionButton>
            </div>
          </div>
        </div>
      )}

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
                disabled={!emailVerified}
                className={`w-full h-64 p-4 border theme-border rounded-lg theme-input focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none ${
                  !emailVerified ? 'cursor-not-allowed opacity-50' : ''
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
                  disabled={!jobDescription.trim() || !emailVerified || !acceptedTerms}
                  busy={isAnalyzing}
                  className="w-full py-3 px-6 justify-center"
                >
                  {isAnalyzing ? 'Analyzing Skills...' : 'Analyze Skill Gaps'}
                </ActionButton>
              ) : (
                <ActionButton
                  onClick={handleGenerate}
                  disabled={!emailVerified || !acceptedTerms}
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