'use client';

import { useState } from 'react';

interface LoginModalProps {
  onClose: () => void;
}

export default function LoginModal({ onClose }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-xl p-8 w-full max-w-md border border-gray-700 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">{codeSent ? 'Enter Verification Code' : 'Sign In'}</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
            </svg>
          </button>
        </div>

        {!codeSent ? (
          <form onSubmit={handleSendCode} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="Enter the email from your resume"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center whitespace-nowrap"
            >
              {isLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,4V2A10,10 0 0,1 22,12H20A8,8 0 0,0 12,4Z"/>
                  </svg>
                  Sending Code...
                </>
              ) : (
                'Send Code'
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-6">
            <div className="text-center mb-4">
              <p className="text-gray-300 text-sm">
                We sent a codeword to <strong>{email}</strong>
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Codeword
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && verificationCode.trim() && !isLoading) {
                    handleVerifyCode();
                  }
                }}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-center text-lg font-mono"
                placeholder="happy-tiger"
                autoFocus
                required
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setCodeSent(false);
                  setVerificationCode('');
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading || !verificationCode.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center whitespace-nowrap"
              >
                {isLoading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12,4V2A10,10 0 0,1 22,12H20A8,8 0 0,0 12,4Z"/>
                    </svg>
                    Verifying...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </form>
        )}

        {!codeSent && (
          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Don&apos;t have an account?{' '}
              <button 
                onClick={() => {
                  onClose();
                  // Scroll to upload section
                  setTimeout(() => {
                    document.getElementById('upload')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                Upload your resume to sign up
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}