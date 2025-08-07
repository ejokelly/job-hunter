'use client';

import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useNavigation } from '@/app/providers/navigation-provider';
import { useUI } from '@/app/providers/ui-state-provider';
import { useState } from 'react';
import Brand from '@/pc/ui/brand';
import MobileHeader from './header';
import MobileHeroSection from './hero-section';
import MobileUploadSection from './upload-section';
import MobileAuthResumeUpload from './auth-resume-upload';
import { createUploadSuccessHandler, createUploadErrorHandler } from '@/pc/homepage/upload-handlers';

const ReactPageScroller = dynamic(() => import('react-page-scroller'), {
  ssr: false,
});

export default function MobileHomepage() {
  const { showLoginModal, closeLoginModal } = useUI();
  const { currentPage, setCurrentPage } = useNavigation();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAuthResumeUpload, setShowAuthResumeUpload] = useState(false);

  const handleUploadSuccess = createUploadSuccessHandler(router);
  const handleUploadError = createUploadErrorHandler();

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      if (response.ok) {
        setCodeSent(true);
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to send verification code');
      }
    } catch (error) {
      console.error('Error sending code:', error);
      alert('Error sending verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          code: verificationCode
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        // Refresh the page to reflect the new session
        window.location.reload();
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Invalid verification code');
      }
    } catch (error) {
      console.error('Error verifying code:', error);
      alert('Error verifying code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen theme-homepage-bg theme-homepage-text">
      <MobileHeader />
      
      <div className="snap-y snap-mandatory overflow-y-scroll" style={{ height: 'calc(100vh - 64px)' }}>
        {/* Hero Section */}
        <section className="h-full snap-start flex-shrink-0" style={{ height: 'calc(100vh - 64px)' }}>
          <MobileHeroSection />
        </section>
        
        {/* Upload Section */}
        <section className="h-full snap-start flex-shrink-0" style={{ height: 'calc(100vh - 64px)' }}>
          <MobileUploadSection 
            onUploadSuccess={handleUploadSuccess}
            onUploadError={handleUploadError}
          />
        </section>

        {/* Auth Resume Upload Section */}
        {showAuthResumeUpload && (
          <section className="h-full snap-start flex-shrink-0" style={{ height: 'calc(100vh - 64px)' }}>
            <MobileAuthResumeUpload />
          </section>
        )}
        
        {/* Real Pricing - Mobile optimized */}
        <section className="h-full snap-start flex-shrink-0 flex flex-col theme-homepage-bg px-4 py-6" style={{ height: 'calc(100vh - 64px)' }}>
          <div className="flex-1"></div>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-3 theme-text-primary">
              Choose Your Plan
            </h2>
            <p className="theme-text-secondary text-base leading-relaxed">
              Everyone starts free. When you run out of free generations, you'll automatically upgrade to Starter. Need more? Upgrade to Unlimited.
            </p>
          </div>
          
          <div className="space-y-6 flex-1 flex flex-col justify-center">
            {/* Free Plan */}
            <div className="rounded-xl p-4 theme-text-primary" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="text-center">
                <h3 className="font-semibold text-base mb-1">Free</h3>
                <div className="text-2xl font-bold mb-3">$0</div>
                <ul className="space-y-2">
                  <li className="flex items-center text-xs theme-text-secondary">
                    <div className="w-3 h-3 bg-green-600 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/>
                      </svg>
                    </div>
                    20 customized resumes/month
                  </li>
                  <li className="flex items-center text-xs theme-text-secondary">
                    <div className="w-3 h-3 bg-green-600 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/>
                      </svg>
                    </div>
                    PDF downloads
                  </li>
                </ul>
              </div>
            </div>
            
            {/* Starter Plan */}
            <div className="rounded-xl p-4 border-2 border-blue-500 relative" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-xs font-medium">
                  Most Popular
                </span>
              </div>
              <div className="text-center">
                <h3 className="font-semibold theme-text-primary text-base mb-1">Starter</h3>
                <div className="text-2xl font-bold theme-text-primary mb-3">$25<span className="text-sm font-normal">/month</span></div>
                <ul className="space-y-2">
                  <li className="flex items-center text-xs theme-text-secondary">
                    <div className="w-3 h-3 bg-green-600 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/>
                      </svg>
                    </div>
                    100 customized resumes/month
                  </li>
                  <li className="flex items-center text-xs theme-text-secondary">
                    <div className="w-3 h-3 bg-green-600 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/>
                      </svg>
                    </div>
                    PDF downloads
                  </li>
                  <li className="flex items-center text-xs theme-text-secondary">
                    <div className="w-3 h-3 bg-green-600 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/>
                      </svg>
                    </div>
                    Email support
                  </li>
                </ul>
              </div>
            </div>

            {/* Unlimited Plan */}
            <div className="rounded-xl p-4 theme-text-primary" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="text-center">
                <h3 className="font-semibold text-base mb-1">Unlimited</h3>
                <div className="text-2xl font-bold mb-3">$250<span className="text-sm font-normal">/month</span></div>
                <ul className="space-y-2">
                  <li className="flex items-center text-xs theme-text-secondary">
                    <div className="w-3 h-3 bg-green-600 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/>
                      </svg>
                    </div>
                    Unlimited customized resumes
                  </li>
                  <li className="flex items-center text-xs theme-text-secondary">
                    <div className="w-3 h-3 bg-green-600 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/>
                      </svg>
                    </div>
                    PDF downloads
                  </li>
                  <li className="flex items-center text-xs theme-text-secondary">
                    <div className="w-3 h-3 bg-green-600 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/>
                      </svg>
                    </div>
                    Priority email support
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Add How It Works with skill gap image */}
        <section className="h-full snap-start flex-shrink-0 flex flex-col theme-homepage-bg" style={{ height: 'calc(100vh - 64px)' }}>
          <div className="h-full flex flex-col">
            <div className="flex-1 flex flex-col justify-center px-4 py-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-4 theme-text-primary">
                  How It Works
                </h2>
                <p className="theme-text-secondary text-base leading-relaxed max-w-md mx-auto mb-6">
                  Three simple steps to get your perfect resume
                </p>
              </div>
              
              <div className="space-y-4 max-w-sm mx-auto mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-xs flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold theme-text-primary text-sm mb-1">Upload Your Resume</h3>
                    <p className="theme-text-secondary text-xs">Upload your current resume in PDF format</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-xs flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold theme-text-primary text-sm mb-1">AI Analysis</h3>
                    <p className="theme-text-secondary text-xs">Our AI extracts your skills and experience automatically</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-xs flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold theme-text-primary text-sm mb-1">Customize & Download</h3>
                    <p className="theme-text-secondary text-xs">Tailor your resume for specific jobs and download instantly</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Skill Gap Image - Bottom, wider than container */}
            <div className="relative overflow-hidden -mx-4">
              <div className="w-screen relative left-1/2 transform -translate-x-1/2">
                <Image 
                  alt="Skill gap analysis showing matched and missing skills for job requirements" 
                  width={904} 
                  height={595} 
                  className="w-full h-auto rounded-t-2xl shadow-2xl" 
                  src="/screenshots/skill-gap.png"
                  priority
                />
              </div>
            </div>
          </div>
        </section>
        
        {/* Simple Footer - Full viewport section */}
        <section className="h-full snap-start flex-shrink-0 flex items-center justify-center theme-homepage-bg border-t theme-border-light" style={{ height: 'calc(100vh - 64px)' }}>
          <div className="px-4 text-center">
            <div className="mb-6">
              <Brand />
            </div>
            <div className="flex justify-center gap-8 text-base theme-text-secondary mb-6">
              <button onClick={() => router.push('/privacy')} className="hover:theme-text-primary transition-colors">Privacy</button>
              <button onClick={() => router.push('/terms')} className="hover:theme-text-primary transition-colors">Terms</button>
              <button onClick={() => router.push('/careers')} className="hover:theme-text-primary transition-colors">Careers</button>
            </div>
            <p className="text-sm theme-text-tertiary">
              © 2025 resumelove. All rights reserved.
            </p>
          </div>
        </section>
      </div>
      
      {/* Login Modal with Apple-style full page design */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col">
          <div className="flex-1 flex flex-col justify-center px-8 py-12">
            <div className="text-left mb-8">
              <h1 className="text-3xl font-light mb-4">
                {codeSent ? 'Enter Verification Code' : 'Sign In'}
              </h1>
              {codeSent ? (
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                  We sent a codeword to <strong>{email}</strong>
                </p>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                  Enter your email to continue
                </p>
              )}
            </div>

            {!codeSent ? (
              <>
                <form className="space-y-6 max-w-sm w-full" onSubmit={handleSendCode}>
                  <div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email"
                      required
                      className="w-full py-4 px-4 bg-gray-50 dark:bg-gray-800 rounded-xl border-0 focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 transition-all text-lg"
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isLoading || !email.trim()}
                    className="w-full py-4 px-4 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 disabled:bg-blue-500/50 transition-colors text-lg"
                  >
                    {isLoading ? 'Sending Code...' : 'Send Code'}
                  </button>
                </form>
                
                {/* Divider */}
                <div className="flex items-center my-12 max-w-sm">
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                </div>
                
                {/* Upload Section */}
                <div className="max-w-sm w-full">
                  <p className="text-gray-500 dark:text-gray-400 text-lg mb-6">
                    or upload a resume to sign up
                  </p>
                  
                  <MobileAuthResumeUpload
                    onUploadSuccess={handleUploadSuccess}
                    onUploadError={handleUploadError}
                  />
                </div>
              </>
            ) : (
              <form className="space-y-6 max-w-sm w-full" onSubmit={handleVerifyCode}>
                <div>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="happy-tiger"
                    required
                    autoFocus
                    className="w-full py-4 px-4 bg-gray-50 dark:bg-gray-800 rounded-xl border-0 focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 transition-all text-lg text-center font-mono"
                  />
                </div>
                
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCodeSent(false);
                      setVerificationCode('');
                    }}
                    className="flex-1 py-4 px-4 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-lg"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !verificationCode.trim()}
                    className="flex-1 py-4 px-4 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 disabled:bg-blue-500/50 transition-colors text-lg"
                  >
                    {isLoading ? 'Verifying...' : 'Sign In'}
                  </button>
                </div>
              </form>
            )}
            
            <div className="text-left mt-8">
              <button
                type="button"
                onClick={closeLoginModal}
                className="text-blue-500 hover:text-blue-600 transition-colors text-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}